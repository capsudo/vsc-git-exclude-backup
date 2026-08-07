const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const { BACKUP_STATUS } = require('../src/constants');
const {
  buildWorkspaceState
} = require('../src/workspace-state');
const { runGitCommand } = require('../src/helpers');

const TEMPORARY_REPOSITORY_DIRECTORY_PREFIX = 'git-exclude-backup-test-dir-';

// This test
// 0. creates a temporary git repo
// 1. with various files and various exclusions (.git/info/exclude and .gitignore)
// 2. simulate extraBackupIgnoreGlobs option
// 3. buildWorkspaceState from this dir
// 4. check many things but three main tests are:
// - files listed in .git/info/exclude become managed files.
// - files listed only in .gitignore do not become managed files.
// - files excluded in extension settings (extraBackupIgnoreGlobs) stay managed but get ignoredFromBackup status.

async function main() {
  // 0. create temp dir
  const temporaryRepositoryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), TEMPORARY_REPOSITORY_DIRECTORY_PREFIX));

  try {
    // 0. git init
    await runGitCommand(temporaryRepositoryDirectory, ['init']);

    // 1. write required test files
    // /tmp/.../.gitignore file containing "*.cache" 
    await fs.writeFile(path.join(temporaryRepositoryDirectory, '.gitignore'), '*.cache\n');
    // /tmp/.../.git/info/exclude containing foo.env and bar.env
    await fs.writeFile(path.join(temporaryRepositoryDirectory, '.git', 'info', 'exclude'), 'foo.env\nbar.env\n');
    // /tmp/.../foo.env (containing some stuff, not used)
    await fs.writeFile(path.join(temporaryRepositoryDirectory, 'foo.env'), 'LOCAL=true\n');
    // /tmp/.../bar.env (containing some stuff, not used)
    await fs.writeFile(path.join(temporaryRepositoryDirectory, 'bar.env'), 'LOCAL=false\n');
    // /tmp/.../build.cache (containing some text)
    await fs.writeFile(path.join(temporaryRepositoryDirectory, 'build.cache'), 'ignored by gitignore only\n');
    // /tmp/.../visible.txt (containing some text)
    await fs.writeFile(path.join(temporaryRepositoryDirectory, 'visible.txt'), 'not ignored\n');

    // 2. pass conf with extraBackupIgnoreGlobs to simulate this setting defined in extension options
    const extensionConfiguration = {
      extraBackupIgnoreGlobs: ['bar.env']
    };

    // 3. inspect the dir and build workspace state
    const workspaceState = await buildWorkspaceState(temporaryRepositoryDirectory, extensionConfiguration);

    // 4. test workspaceState
    
    // managedFiles should contain only files listed in .git/info/exclude.
    // foo.env and bar.env are listed in .git/info/exclude.
    // build.cache is listed only through .gitignore, so it should not appear here.
    // visible.txt is not listed in any ignore file, so it should not appear here.
    const managedRelativePaths = workspaceState.managedFiles.map((managedFile) => managedFile.relativePath);
    assert.deepStrictEqual(managedRelativePaths, ['bar.env', 'foo.env']);

    // gitRootDirectory should match the real git repository root.
    // This matters because VSC can open a subfolder, but backup paths must be relative to repository root.
    assert.strictEqual(workspaceState.gitRootDirectory, temporaryRepositoryDirectory);

    // excludeFilePath should return the exact .git/info/exclude file path it used.
    // This helps later when showing debug messages or explaining why no managed files were found.
    assert.strictEqual(workspaceState.excludeFilePath, path.join(temporaryRepositoryDirectory, '.git', 'info', 'exclude'));

    // projectInfo.displayName should use the git repository folder name.
    // This is the human-readable project name that can appear in UI and backup listings.
    assert.strictEqual(workspaceState.projectInfo.displayName, path.basename(temporaryRepositoryDirectory));

    // projectInfo.id should start with a path-safe version of the repository folder name.
    // The id also contains a hash suffix, so projects with the same folder name still get different backup folders.
    assert.ok(workspaceState.projectInfo.id.startsWith(TEMPORARY_REPOSITORY_DIRECTORY_PREFIX));

    // Each managed file should include a sha256 hash of its current file content.
    // sha256 hashes are 64 hex characters and will later be used to detect changed files.
    assert.ok(workspaceState.managedFiles.every((managedFile) => managedFile.sha256.length === 64));

    // Status for managed files should be `new` - except for those excluded in extension settings
    // Note: `new` means those files will be backed up later unless GitHub already has the same hash.
    assert.strictEqual(
      workspaceState.statusMapByAbsolutePath.get(path.join(temporaryRepositoryDirectory, 'foo.env')).status,
      BACKUP_STATUS.new
    );
    // Status for managed file excluded in extension settings (extraBackupIgnoreGlobs) should be `ignoredFromBackup`
    assert.strictEqual(
      workspaceState.statusMapByAbsolutePath.get(path.join(temporaryRepositoryDirectory, 'bar.env')).status,
      BACKUP_STATUS.ignoredFromBackup
    );

    console.log('workspace-state test passed');
  } finally {
    await fs.rm(temporaryRepositoryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
