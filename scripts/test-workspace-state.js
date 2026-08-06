const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const {
  buildWorkspaceState
} = require('../src/workspace-state');
const { runGitCommand } = require('../src/helpers');

// tests workspace-state local scan against temporary git repo
// Proves .gitignore files are not managed
async function main() {
  const temporaryRepositoryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'git-exclude-backup-scanner-'));

  try {
    await runGitCommand(temporaryRepositoryDirectory, ['init']);
    await fs.mkdir(path.join(temporaryRepositoryDirectory, '.private'));
    await fs.writeFile(path.join(temporaryRepositoryDirectory, '.gitignore'), '*.cache\n');
    await fs.writeFile(path.join(temporaryRepositoryDirectory, '.git', 'info', 'exclude'), 'private.env\n.private/\n');
    await fs.writeFile(path.join(temporaryRepositoryDirectory, 'private.env'), 'secret=true\n');
    await fs.writeFile(path.join(temporaryRepositoryDirectory, '.private', 'foo.bar'), 'private note\n');
    await fs.writeFile(path.join(temporaryRepositoryDirectory, 'build.cache'), 'ignored by gitignore only\n');
    await fs.writeFile(path.join(temporaryRepositoryDirectory, 'visible.txt'), 'not ignored\n');

    const workspaceState = await buildWorkspaceState(temporaryRepositoryDirectory);
    const managedRelativePaths = workspaceState.managedFiles.map((managedFile) => managedFile.relativePath);

    assert.deepStrictEqual(managedRelativePaths, ['.private/foo.bar', 'private.env']);
    assert.strictEqual(workspaceState.gitRootDirectory, temporaryRepositoryDirectory);
    assert.strictEqual(workspaceState.excludeFilePath, path.join(temporaryRepositoryDirectory, '.git', 'info', 'exclude'));

    console.log('workspace-state test passed');
  } finally {
    await fs.rm(temporaryRepositoryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
