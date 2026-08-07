const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const { BACKUP_STATUS } = require('./constants');
const {
  fileExists,
  findGitRootDirectory,
  normalizeToPosixPath,
  runGitCommand,
  statOrUndefined
} = require('./helpers');

// workspace state object:
// - gitRootDirectory: might be needed because VSC workspace can be opened from repo subfolder
// - excludeFilePath: can be useful later for debug messages and empty-state messages
// - projectInfo: stable project info used later for backup repo path
// - managedFiles: files that need to be backed up (excluded files that actually exist on disk)
// - statusMapByAbsolutePath: lookup for current file status, used later by Explorer decoration
// ex:
// {
//   gitRootDirectory: "/path/to/project",
//   excludeFilePath: "/path/to/project/.git/info/exclude",
//   projectInfo: {
//     id: "foo-bar-a1b2c3d4e5",
//     displayName: "Foo Bar",
//     remoteOriginUrl: "git@github.com:user/foo-bar.git"
//   },
//   managedFiles: [
//     {
//       relativePath: ".env",
//       absolutePath: "/path/to/project/.env",
//       size: 28,
//       sha256: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
//     }
//   ],
//   statusMapByAbsolutePath: Map {
//     "/path/to/project/.env" => { status: "new", relativePath: ".env" }
//   }
// }

// returns workspace state object
// needed because VSC workspace can be opened from repo subfolder
async function buildWorkspaceState(workspaceDirectory, extensionConfiguration = {}) {

  // 1. get git root dir
  const gitRootDirectory = await findGitRootDirectory(workspaceDirectory);
  // return empty workspace state if current workspace is not a git repo
  if (!gitRootDirectory) {
    return {
      gitRootDirectory: undefined,
      excludeFilePath: undefined,
      projectInfo: undefined,
      managedFiles: [],
      statusMapByAbsolutePath: new Map()
    };
  }

  // 2. build project identity from repo dir and optional remote url
  const projectInfo = await buildProjectIdentity(gitRootDirectory);

  // 3. check if .git/info/exclude exists
  const excludeFilePath = getGitInfoExcludeFilePath(gitRootDirectory);
  const excludeFileExists = await fileExists(excludeFilePath);
  if (!excludeFileExists) {
    return {
      gitRootDirectory,
      excludeFilePath,
      projectInfo,
      managedFiles: [],
      statusMapByAbsolutePath: new Map()
    };
  }

  // 4. list files excluded from .git/info/exclude and keep only files that exist on disk
  const managedFiles = await listManagedFilesFromGitInfoExclude(gitRootDirectory, excludeFilePath);

  // 5. add current backup status for each managed file
  const statusMapByAbsolutePath = buildStatusMapByAbsolutePath(managedFiles, extensionConfiguration.extraBackupIgnoreGlobs || []);

  return {
    gitRootDirectory,
    excludeFilePath,
    projectInfo,
    managedFiles,
    statusMapByAbsolutePath
  };
}

// returns stable project identity used later in backup repo path
async function buildProjectIdentity(gitRootDirectory) {

  // 1. use repo dir name for human-readable display name
  const displayName = path.basename(gitRootDirectory);

  // 2. use remote origin when available so same repo gets same id from different local folders
  const remoteOriginUrl = await getGitRemoteOriginUrl(gitRootDirectory);
  const identitySourceText = remoteOriginUrl || gitRootDirectory;

  // 3. add short hash to avoid collisions between projects with same folder name
  const identityHash = crypto.createHash('sha256').update(identitySourceText).digest('hex').slice(0, 10);

  return {
    id: `${sanitizePathSegment(displayName)}-${identityHash}`,
    displayName,
    remoteOriginUrl
  };
}

// returns git remote origin url if set
// ex: git@github.com:user/foo-project.git
async function getGitRemoteOriginUrl(gitRootDirectory) {
  try {
    const remoteOriginUrl = await runGitCommand(gitRootDirectory, ['config', '--get', 'remote.origin.url']);
    return remoteOriginUrl.trim() || undefined;
  } catch (_error) {
    return undefined;
  }
}

// returns .git/info/exclude file path for given git root dir
// ex: /path/to/project/.git/info/exclude
function getGitInfoExcludeFilePath(gitRootDirectory) {
  return path.join(gitRootDirectory, '.git', 'info', 'exclude');
}

// returns files excluded by .git/info/exclude that actually exist on disk
// ex: [{ relativePath: ".env", absolutePath: "/path/to/project/.env" }, ...]
async function listManagedFilesFromGitInfoExclude(gitRootDirectory, excludeFilePath) {

  // 1. run command to list files excluded from .git/info/exclude
  const gitLsFilesOutput = await runGitCommand(gitRootDirectory, [
    'ls-files',
    '--others',
    '--ignored',
    `--exclude-from=${excludeFilePath}`,
    '-z'
  ]);

  // 2. parse output
  const managedFiles = [];
  const ignoredRelativePaths = gitLsFilesOutput.split('\0').filter(Boolean);

  // 3. keep paths that actually exist on disk and are files
  for (const ignoredRelativePath of ignoredRelativePaths) {
    const absolutePath = path.join(gitRootDirectory, ignoredRelativePath);
    const fileStat = await statOrUndefined(absolutePath);

    if (fileStat && fileStat.isFile()) {
      managedFiles.push({
        relativePath: normalizeToPosixPath(ignoredRelativePath),
        absolutePath,
        size: fileStat.size,
        sha256: await getFileSha256(absolutePath)
      });
    }
  }

  managedFiles.sort((leftFile, rightFile) => leftFile.relativePath.localeCompare(rightFile.relativePath));

  return managedFiles;
}

// returns status map keyed by absolute file path
// ex: Map { "/path/to/project/.env" => { status: "new", relativePath: ".env" } }
function buildStatusMapByAbsolutePath(managedFiles, extraBackupIgnoreGlobs) {
  const statusMapByAbsolutePath = new Map();

  for (const managedFile of managedFiles) {
    const status = matchesAnySimpleGlob(managedFile.relativePath, extraBackupIgnoreGlobs)
      ? BACKUP_STATUS.ignoredFromBackup
      : BACKUP_STATUS.new;

    statusMapByAbsolutePath.set(managedFile.absolutePath, {
      status,
      relativePath: managedFile.relativePath
    });
  }

  return statusMapByAbsolutePath;
}

// returns sha256 hash for file content
// ex: "2cf24dba5fb0a..."
async function getFileSha256(absolutePath) {
  const fileBuffer = await fs.readFile(absolutePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// returns true if relative path matches any simple glob
// ex: ".private/foo.bar" matches ".private/*"
function matchesAnySimpleGlob(relativePath, globPatterns) {
  for (const globPattern of globPatterns || []) {
    if (matchesSimpleGlob(relativePath, globPattern)) {
      return true;
    }
  }

  return false;
}

// returns true if text matches simple * and ? glob
// ex: ".private/foo.bar" matches ".private/*"
function matchesSimpleGlob(text, globPattern) {
  const escapedPattern = String(globPattern)
    .split('**')
    .map((globPart) => escapeRegExp(globPart).replaceAll('\\*', '[^/]*').replaceAll('\\?', '[^/]'))
    .join('.*');

  return new RegExp(`^${escapedPattern}$`).test(text);
}

// escapes regexp special characters
// ex: "." becomes "\\."
function escapeRegExp(value) {
  return String(value).replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

// returns path-safe text for backup repo folder name
// ex: "Foo Project!" becomes "foo-project"
function sanitizePathSegment(value) {
  const safeValue = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return safeValue || 'project';
}

module.exports = {
  buildWorkspaceState,
  buildProjectIdentity,
  buildStatusMapByAbsolutePath,
  getGitInfoExcludeFilePath,
  getGitRemoteOriginUrl,
  listManagedFilesFromGitInfoExclude,
  matchesAnySimpleGlob
};
