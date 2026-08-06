const childProcess = require('child_process');
const fs = require('fs/promises');
const path = require('path');

// returns git root directory for workspace path
// ex: /path/to/project/subfolder returns /path/to/project
async function findGitRootDirectory(workspaceDirectory) {
  try {
    const gitRootDirectory = await runGitCommand(workspaceDirectory, ['rev-parse', '--show-toplevel']);
    return gitRootDirectory.trim();
  } catch (_error) {
    return undefined;
  }
}

// runs git command and returns stdout
// ex: runGitCommand("/path/to/project", ["status", "--short"])
function runGitCommand(workingDirectory, gitArguments) {
  return new Promise((resolve, reject) => {
    childProcess.execFile('git', gitArguments, { cwd: workingDirectory }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
        return;
      }

      resolve(stdout);
    });
  });
}

// returns true when path exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

// returns fs stat or undefined if file missing
async function statOrUndefined(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (_error) {
    return undefined;
  }
}

// converts OS path separators to slash
// ex: Windows path becomes a/b style
function normalizeToPosixPath(filePath) {
  return String(filePath).split(path.sep).join('/');
}

module.exports = {
  findGitRootDirectory,
  runGitCommand,
  fileExists,
  statOrUndefined,
  normalizeToPosixPath
};
