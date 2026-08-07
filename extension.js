const vscode = require('vscode');

const {
  OUTPUT_CHANNEL_NAME,
  PROJECTS_LIST_FILE_NAME,
  BACKUP_STATE_FILE_NAME,
  BACKUP_STATUS_DECORATIONS
} = require('./src/constants');
const { getExtensionConfiguration } = require('./src/config');
const {
  disposeFileDecorationProvider,
  refreshFileDecorationProvider,
  updateFileDecorationProviderRegistration
} = require('./src/file-decoration-provider');
const {
  getStatusEntryForUri,
  getWorkspaceStatesByFolderPath,
  refreshWorkspaceStates
} = require('./src/workspace-state');

let outputChannel;
let extensionDisplayName;

// starts extension shell
// registers command shown in command palette
function activate(context) {
  const extensionConfiguration = getExtensionConfiguration();
  extensionDisplayName = getExtensionDisplayName(context);

  outputChannel = vscode.window.createOutputChannel(extensionDisplayName);
  updateFileDecorationProviderRegistration(extensionConfiguration.decorateExplorer, getStatusEntryForUri);

  context.subscriptions.push(outputChannel);
  context.subscriptions.push({ dispose: disposeFileDecorationProvider });
  context.subscriptions.push(vscode.commands.registerCommand('gitExcludeBackup.showLoadedMessage', showLoadedMessage));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(onExtensionConfigurationChanged));

  outputChannel.appendLine('Git Exclude Backup extension shell activated.');
}

// shows basic command result and local workspace state summary
// proves extension activates, settings load, and workspace state builds
async function showLoadedMessage() {
  const extensionConfiguration = getExtensionConfiguration();
  const message = `${extensionDisplayName} extension shell is loaded.`;

  outputChannel.appendLine(message);
  outputChannel.appendLine(`Backup repo: ${extensionConfiguration.backupRepositoryName}`);
  outputChannel.appendLine(`Backup branch: ${extensionConfiguration.backupBranch}`);
  outputChannel.appendLine(`Projects list file: ${PROJECTS_LIST_FILE_NAME}`);
  outputChannel.appendLine(`Backup state file: ${BACKUP_STATE_FILE_NAME}`);
  outputChannel.appendLine(`Known badges: ${Object.values(BACKUP_STATUS_DECORATIONS).map((decoration) => decoration.badge).join(' ')}`);

  // refreshWorkspaceStates stores workspace states in memory inside workspace-state.js
  await refreshWorkspaceStates(vscode.workspace.workspaceFolders || [], extensionConfiguration);
  updateFileDecorationProviderRegistration(extensionConfiguration.decorateExplorer, getStatusEntryForUri);
  refreshFileDecorationProvider();

  logWorkspaceStateSummaries();

  vscode.window.showInformationMessage(message);
}

// logs workspace state for every open workspace folder
// ex: prints project id, managed file count, file statuses
function logWorkspaceStateSummaries() {
  const workspaceFolders = vscode.workspace.workspaceFolders || [];

  if (workspaceFolders.length === 0) {
    outputChannel.appendLine('No workspace folder open.');
    return;
  }

  for (const workspaceFolder of workspaceFolders) {
    const workspaceStatesByFolderPath = getWorkspaceStatesByFolderPath();
    const workspaceState = workspaceStatesByFolderPath.get(workspaceFolder.uri.fsPath);

    outputChannel.appendLine(`Workspace: ${workspaceFolder.uri.fsPath}`);
    outputChannel.appendLine(`Git root: ${workspaceState && workspaceState.gitRootDirectory ? workspaceState.gitRootDirectory : 'not a git repo'}`);
    outputChannel.appendLine(`Exclude file: ${workspaceState && workspaceState.excludeFilePath ? workspaceState.excludeFilePath : 'none'}`);
    outputChannel.appendLine(`Project id: ${workspaceState && workspaceState.projectInfo ? workspaceState.projectInfo.id : 'none'}`);
    outputChannel.appendLine(`Managed files: ${workspaceState ? workspaceState.managedFiles.length : 0}`);

    for (const managedFile of workspaceState ? workspaceState.managedFiles : []) {
      const statusEntry = workspaceState.statusMapByAbsolutePath.get(managedFile.absolutePath);
      outputChannel.appendLine(`- ${managedFile.relativePath}: ${statusEntry ? statusEntry.status : 'unknown'}`);
    }
  }
}

function onExtensionConfigurationChanged(event) {
  if (!event.affectsConfiguration('gitExcludeBackup.decorateExplorer')) {
    return;
  }

  const extensionConfiguration = getExtensionConfiguration();

  updateFileDecorationProviderRegistration(extensionConfiguration.decorateExplorer, getStatusEntryForUri);
  refreshFileDecorationProvider();
}

// returns extension display name from package.json loaded by VSC
function getExtensionDisplayName(context) {
  return context.extension.packageJSON.displayName || context.extension.packageJSON.name;
}

// stops extension shell
// VSC calls this before unloading extension
function deactivate() {
  if (outputChannel) {
    outputChannel.appendLine(`${extensionDisplayName} extension shell deactivated.`);
  }
  disposeFileDecorationProvider();
}

module.exports = {
  activate,
  deactivate
};
