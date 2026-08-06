const vscode = require('vscode');

let outputChannel;

/**
 * Starts extension shell.
 * Example: registers command shown in command palette.
 */
function activate(context) {
  outputChannel = vscode.window.createOutputChannel('Git Exclude Backup');

  context.subscriptions.push(outputChannel);
  context.subscriptions.push(vscode.commands.registerCommand('gitExcludeBackup.showLoadedMessage', showLoadedMessage));

  outputChannel.appendLine('Git Exclude Backup extension shell activated.');
}

/**
 * Shows basic command result.
 * Example: command proves extension activates and command wiring works.
 */
function showLoadedMessage() {
  const message = 'Git Exclude Backup extension shell is loaded.';

  outputChannel.appendLine(message);
  vscode.window.showInformationMessage(message);
}

/**
 * Stops extension shell.
 * Example: VS Code calls this before unloading extension.
 */
function deactivate() {
  if (outputChannel) {
    outputChannel.appendLine('Git Exclude Backup extension shell deactivated.');
  }
}

module.exports = {
  activate,
  deactivate
};
