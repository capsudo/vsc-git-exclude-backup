const vscode = require('vscode');

const {
  EXTENSION_ID,
  DEFAULT_BACKUP_REPOSITORY_NAME,
  DEFAULT_BACKUP_BRANCH
} = require('./constants');

/**
 * Returns extension settings from VSC.
 * Example: returns pref object { backupBranch: "master" }.
 */
function getGitExcludeBackupConfiguration() {
  const configuration = vscode.workspace.getConfiguration(EXTENSION_ID);

  return {
    backupRepositoryName: configuration.get('backupRepositoryName', DEFAULT_BACKUP_REPOSITORY_NAME),
    backupBranch: configuration.get('backupBranch', DEFAULT_BACKUP_BRANCH),
    extraBackupIgnoreGlobs: configuration.get('extraBackupIgnoreGlobs', []),
    backupAfterDetectedPush: configuration.get('backupAfterDetectedPush', true),
    decorateExplorer: configuration.get('decorateExplorer', true)
  };
}

module.exports = {
  getGitExcludeBackupConfiguration
};
