const vscode = require('vscode');

const {
  OUTPUT_CHANNEL_NAME,
  PROJECTS_LIST_FILE_NAME,
  BACKUP_STATE_FILE_NAME,
  BACKUP_STATUS_DECORATIONS
} = require('./src/constants');
const { getExtensionConfiguration } = require('./src/config');

let outputChannel;

// starts extension shell
// registers command shown in command palette
function activate(context) {
  outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);

  context.subscriptions.push(outputChannel);
  context.subscriptions.push(vscode.commands.registerCommand('gitExcludeBackup.showLoadedMessage', showLoadedMessage));

  outputChannel.appendLine('Git Exclude Backup extension shell activated.');
}

// shows basic command result
// proves extension activates and command wiring works
function showLoadedMessage() {
  const extensionConfiguration = getExtensionConfiguration();
  const message = 'Git Exclude Backup extension shell is loaded.';

  outputChannel.appendLine(message);
  outputChannel.appendLine(`Backup repo: ${extensionConfiguration.backupRepositoryName}`);
  outputChannel.appendLine(`Backup branch: ${extensionConfiguration.backupBranch}`);
  outputChannel.appendLine(`Projects list file: ${PROJECTS_LIST_FILE_NAME}`);
  outputChannel.appendLine(`Backup state file: ${BACKUP_STATE_FILE_NAME}`);
  outputChannel.appendLine(`Known badges: ${Object.values(BACKUP_STATUS_DECORATIONS).map((decoration) => decoration.badge).join(' ')}`);
  vscode.window.showInformationMessage(message);
}

// stops extension shell
// VSC calls this before unloading extension
function deactivate() {
  if (outputChannel) {
    outputChannel.appendLine('Git Exclude Backup extension shell deactivated.');
  }
}

module.exports = {
  activate,
  deactivate
};
