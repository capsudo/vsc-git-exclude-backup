const path = require('path');

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
// - managedFiles: files that need to be backed up (excluded files that actually exist on disk)

// returns workspace state object
// ex: { gitRootDirectory: "/path/to/project", excludeFilePath: "/path/to/project/.git/info/exclude", managedFiles: [{ relativePath: ".env", absolutePath: "/path/to/project/.env" }, ...] }
// needed because VSC workspace can be opened from repo subfolder
async function buildWorkspaceState(workspaceDirectory) {

  // 1. get git root dir
  const gitRootDirectory = await findGitRootDirectory(workspaceDirectory);
  // return empty workspace state if current workspace is not a git repo
  if (!gitRootDirectory) {
    return {
      gitRootDirectory: undefined,
      excludeFilePath: undefined,
      managedFiles: []
    };
  }

  // 2. check if .git/info/exclude exists
  const excludeFilePath = getGitInfoExcludeFilePath(gitRootDirectory);
  const excludeFileExists = await fileExists(excludeFilePath);
  if (!excludeFileExists) {
    return {
      gitRootDirectory,
      excludeFilePath,
      managedFiles: []
    };
  }

  // 3. list files excluded from .git/info/exclude and keep only files that exist on disk
  const managedFiles = await listManagedFilesFromGitInfoExclude(gitRootDirectory, excludeFilePath);

  return {
    gitRootDirectory,
    excludeFilePath,
    managedFiles
  };
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

  // 3. for each file, check if it exists on disk and if so add it to managed files
  for (const ignoredRelativePath of ignoredRelativePaths) {
    const absolutePath = path.join(gitRootDirectory, ignoredRelativePath);
    const fileStat = await statOrUndefined(absolutePath);

    if (fileStat && fileStat.isFile()) {
      managedFiles.push({
        relativePath: normalizeToPosixPath(ignoredRelativePath),
        absolutePath
      });
    }
  }

  managedFiles.sort((leftFile, rightFile) => leftFile.relativePath.localeCompare(rightFile.relativePath));

  return managedFiles;
}

module.exports = {
  buildWorkspaceState,
  getGitInfoExcludeFilePath,
  listManagedFilesFromGitInfoExclude
};
