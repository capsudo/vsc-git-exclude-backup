const vscode = require('vscode');

const {
  OUTPUT_CHANNEL_NAME,
  PROJECTS_LIST_FILE_NAME,
  BACKUP_STATE_FILE_NAME,
  BACKUP_STATUS_DECORATIONS
} = require('./src/constants');
const { getExtensionConfiguration } = require('./src/config');
const { buildWorkspaceState } = require('./src/workspace-state');

let outputChannel;

// starts extension shell
// registers command shown in command palette
function activate(context) {
  outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);

  context.subscriptions.push(outputChannel);
  context.subscriptions.push(vscode.commands.registerCommand('gitExcludeBackup.showLoadedMessage', showLoadedMessage));

  outputChannel.appendLine('Git Exclude Backup extension shell activated.');
}

// shows basic command result and local workspace state summary
// proves extension activates, settings load, and workspace state builds
async function showLoadedMessage() {
  const extensionConfiguration = getExtensionConfiguration();
  const message = 'Git Exclude Backup extension shell is loaded.';

  outputChannel.appendLine(message);
  outputChannel.appendLine(`Backup repo: ${extensionConfiguration.backupRepositoryName}`);
  outputChannel.appendLine(`Backup branch: ${extensionConfiguration.backupBranch}`);
  outputChannel.appendLine(`Projects list file: ${PROJECTS_LIST_FILE_NAME}`);
  outputChannel.appendLine(`Backup state file: ${BACKUP_STATE_FILE_NAME}`);
  outputChannel.appendLine(`Known badges: ${Object.values(BACKUP_STATUS_DECORATIONS).map((decoration) => decoration.badge).join(' ')}`);

  await logWorkspaceStateSummaries(extensionConfiguration);

  vscode.window.showInformationMessage(message);
}

// logs workspace state for every open workspace folder
// ex: prints project id, managed file count, file statuses
async function logWorkspaceStateSummaries(extensionConfiguration) {
  const workspaceFolders = vscode.workspace.workspaceFolders || [];

  if (workspaceFolders.length === 0) {
    outputChannel.appendLine('No workspace folder open.');
    return;
  }

  for (const workspaceFolder of workspaceFolders) {
    const workspaceState = await buildWorkspaceState(workspaceFolder.uri.fsPath, extensionConfiguration);

    outputChannel.appendLine(`Workspace: ${workspaceFolder.uri.fsPath}`);
    outputChannel.appendLine(`Git root: ${workspaceState.gitRootDirectory || 'not a git repo'}`);
    outputChannel.appendLine(`Exclude file: ${workspaceState.excludeFilePath || 'none'}`);
    outputChannel.appendLine(`Project id: ${workspaceState.projectInfo ? workspaceState.projectInfo.id : 'none'}`);
    outputChannel.appendLine(`Managed files: ${workspaceState.managedFiles.length}`);

    for (const managedFile of workspaceState.managedFiles) {
      const statusEntry = workspaceState.statusMapByAbsolutePath.get(managedFile.absolutePath);
      outputChannel.appendLine(`- ${managedFile.relativePath}: ${statusEntry ? statusEntry.status : 'unknown'}`);
    }
  }
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
