const vscode = require('vscode');

const {
  BACKUPS_SIDEBAR_VIEW_ID,
  PROJECTS_LIST_FILE_NAME,
  BACKUP_STATE_FILE_NAME,
  BACKUP_STATUS_DECORATIONS
} = require('./src/constants');
const { getExtensionConfiguration } = require('./src/config');
const { createSidebarViewProvider } = require('./src/sidebar-view-provider');
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
let sidebarViewProvider;
let extensionDisplayName;

// starts extension shell
// registers command shown in command palette
async function activate(context) {
  const extensionConfiguration = getExtensionConfiguration();
  extensionDisplayName = getExtensionDisplayName(context);

  outputChannel = vscode.window.createOutputChannel(extensionDisplayName);
  sidebarViewProvider = createSidebarViewProvider(getWorkspaceStatesByFolderPath);

  updateFileDecorationProviderRegistration(extensionConfiguration.decorateExplorer, getStatusEntryForUri);

  context.subscriptions.push(outputChannel);
  context.subscriptions.push(sidebarViewProvider);
  context.subscriptions.push(vscode.window.registerTreeDataProvider(BACKUPS_SIDEBAR_VIEW_ID, sidebarViewProvider));
  context.subscriptions.push({ dispose: disposeFileDecorationProvider });
  context.subscriptions.push(vscode.commands.registerCommand('gitExcludeBackup.refresh', refreshWorkspaceStateAndViews));
  context.subscriptions.push(vscode.commands.registerCommand('gitExcludeBackup.showLoadedMessage', showLoadedMessage));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(onExtensionConfigurationChanged));
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(refreshWorkspaceStateAndViews));

  outputChannel.appendLine(`${extensionDisplayName} extension shell activated.`);
  await refreshWorkspaceStateAndViews();
}

// shows basic command result and local workspace state summary
// proves extension activates, settings load, and workspace state builds
async function showLoadedMessage() {
  const extensionConfiguration = getExtensionConfiguration();
  const message = `${extensionDisplayName} extension shell is loaded.`;

  await refreshWorkspaceStateAndViews();

  outputChannel.appendLine(message);
  outputChannel.appendLine(`Backup repo: ${extensionConfiguration.backupRepositoryName}`);
  outputChannel.appendLine(`Backup branch: ${extensionConfiguration.backupBranch}`);
  outputChannel.appendLine(`Projects list file: ${PROJECTS_LIST_FILE_NAME}`);
  outputChannel.appendLine(`Backup state file: ${BACKUP_STATE_FILE_NAME}`);
  outputChannel.appendLine(`Known badges: ${Object.values(BACKUP_STATUS_DECORATIONS).map((decoration) => decoration.badge).join(' ')}`);

  logWorkspaceStateSummaries();

  vscode.window.showInformationMessage(message);
}

// rebuilds local workspace state, then refreshes Explorer badges and sidebar view
// ex: refresh command calls this after .git/info/exclude or managed files changed
async function refreshWorkspaceStateAndViews() {
  // 0. get extension options
  const extensionConfiguration = getExtensionConfiguration();

  // 1. refresh state. requires extraBackupIgnoreGlobs setting
  // Note: refreshWorkspaceStates stores workspace states in memory inside workspace-state.js
  await refreshWorkspaceStates(vscode.workspace.workspaceFolders || [], extensionConfiguration);

  // 2. Update backup badges in Explorer main view (tree)
  updateFileDecorationProviderRegistration(extensionConfiguration.decorateExplorer, getStatusEntryForUri);
  refreshFileDecorationProvider();

  // 3. Update the custom sidebar view
  // Note: this view can be moved in VSC workbench, but by default it is in left Sidebar, inside Explorer view container
  refreshSidebarViewProvider();
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
  if (!extensionConfigurationChangeAffectsCurrentStateOrViews(event)) {
    return;
  }

  refreshWorkspaceStateAndViews();
}

function refreshSidebarViewProvider() {
  if (sidebarViewProvider) {
    sidebarViewProvider.refresh();
  }
}

// returns true when changed setting can change current state, badges or sidebar view
// ex: extraBackupIgnoreGlobs changes ignoredFromBackup status; decorateExplorer enables/disables Explorer badges
function extensionConfigurationChangeAffectsCurrentStateOrViews(event) {
  return event.affectsConfiguration('gitExcludeBackup.extraBackupIgnoreGlobs') ||
    event.affectsConfiguration('gitExcludeBackup.decorateExplorer');
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
