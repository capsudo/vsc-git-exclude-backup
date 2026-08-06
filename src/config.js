const vscode = require('vscode');

const {
  EXTENSION_ID,
  DEFAULT_BACKUP_REPOSITORY_NAME,
  DEFAULT_BACKUP_BRANCH
} = require('./constants');

// returns extension settings from VSC
// ex: { backupRepositoryName: "git-exclude-backups", backupBranch: "master", extraBackupIgnoreGlobs: [] }
function getExtensionConfiguration() {
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
  getExtensionConfiguration
};
