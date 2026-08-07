const path = require('path');
const vscode = require('vscode');

const {
  BACKUP_STATUS_DECORATIONS,
  BACKUP_STATUS_LABELS
} = require('./constants');

// creates TreeDataProvider for Git Exclude Backups sidebar view
// getWorkspaceStatesByFolderPath returns Map { "/path/to/project" => workspaceStateObject }
function createSidebarViewProvider(getWorkspaceStatesByFolderPath) {
  const onDidChangeTreeDataEmitter = new vscode.EventEmitter();

  return {
    onDidChangeTreeData: onDidChangeTreeDataEmitter.event,

    getChildren(element) {
      if (!element) {
        return getProjectSidebarNodes(getWorkspaceStatesByFolderPath());
      }

      if (element.kind === 'project') {
        return getManagedFileSidebarNodes(element.workspaceState);
      }

      return [];
    },

    getTreeItem(element) {
      if (element.kind === 'message') {
        return getMessageSidebarItem(element);
      }

      if (element.kind === 'project') {
        return getProjectSidebarItem(element);
      }

      return getManagedFileSidebarItem(element);
    },

    refresh() {
      onDidChangeTreeDataEmitter.fire(undefined);
    },

    dispose() {
      onDidChangeTreeDataEmitter.dispose();
    }
  };
}

// stores one sidebar row with data needed later by getTreeItem and getChildren
// ex: row of kind "file" stores managed file and status entry
class SidebarViewNode {
  constructor(kind, label, options = {}) {
    this.kind = kind;
    this.label = label;
    this.workspaceFolderPath = options.workspaceFolderPath;
    this.workspaceState = options.workspaceState;
    this.managedFile = options.managedFile;
    this.statusEntry = options.statusEntry;
  }
}

////////// Project nodes (root) //////////////////

// returns root sidebar rows, one row per workspace folder
// ex: Map with project workspace returns project row named "project"
function getProjectSidebarNodes(workspaceStatesByFolderPath) {
  const workspaceStateEntries = Array.from(workspaceStatesByFolderPath.entries());

  if (workspaceStateEntries.length === 0) {
    return [new SidebarViewNode('message', 'No workspace state loaded')];
  }

  return workspaceStateEntries
    .map(([workspaceFolderPath, workspaceState]) => new SidebarViewNode('project', getProjectLabel(workspaceFolderPath, workspaceState), {
      workspaceFolderPath,
      workspaceState
    }))
    .sort((leftNode, rightNode) => leftNode.label.localeCompare(rightNode.label));
}

// item shown at root for each project listed = project label + description
// ex: "Foo Project" then in smaller "2 managed files"
function getProjectSidebarItem(element) {
  const workspaceState = element.workspaceState;
  const managedFilesCount = workspaceState.managedFiles.length;
  const treeItem = new vscode.TreeItem(element.label, getProjectCollapsibleState(workspaceState));

  treeItem.description = getProjectDescription(workspaceState, managedFilesCount);
  treeItem.iconPath = new vscode.ThemeIcon('repo');
  treeItem.tooltip = getProjectTooltip(element.workspaceFolderPath, workspaceState, managedFilesCount);

  return treeItem;
}

// returns project label for sidebar root row
// uses projectInfo.displayName when repo was found, otherwise uses last part of workspace folder path
// ex: workspace folder path "/path/to/foo-project" returns "foo-project" when projectInfo is missing
function getProjectLabel(workspaceFolderPath, workspaceState) {
  if (workspaceState.projectInfo && workspaceState.projectInfo.displayName) {
    return workspaceState.projectInfo.displayName;
  }

  return path.basename(workspaceFolderPath);
}

// short project status shown after project name
// ex: "1 managed file", "3 managed files", or "not a Git repository"
function getProjectDescription(workspaceState, managedFilesCount) {
  if (!workspaceState.gitRootDirectory) {
    return 'not a Git repository';
  }

  if (managedFilesCount === 1) {
    return '1 managed file';
  }

  return `${managedFilesCount} managed files`;
}

// returns project hover text
// ex: includes project id, git root and managed files count
function getProjectTooltip(workspaceFolderPath, workspaceState, managedFilesCount) {
  if (!workspaceState.gitRootDirectory) {
    return `Workspace folder: ${workspaceFolderPath}`;
  }

  return [
    `Project: ${workspaceState.projectInfo.displayName}`,
    `Project id: ${workspaceState.projectInfo.id}`,
    `Git root: ${workspaceState.gitRootDirectory}`,
    `Managed files: ${managedFilesCount}`
  ].join('\n');
}

// expanded if project = Git repo with managed files, collapsed if project empty
// ex: Git repo with 2 managed files opens expanded
function getProjectCollapsibleState(workspaceState) {
  if (!workspaceState.gitRootDirectory || workspaceState.managedFiles.length === 0) {
    return vscode.TreeItemCollapsibleState.Collapsed;
  }

  return vscode.TreeItemCollapsibleState.Expanded;
}

////////// File nodes (children, inside Project nodes) //////////////////

// returns file rows for one project row
// ex: workspace state with .env returns file row named ".env"
function getManagedFileSidebarNodes(workspaceState) {
  if (!workspaceState.gitRootDirectory) {
    return [new SidebarViewNode('message', 'No Git repository found')];
  }

  if (workspaceState.managedFiles.length === 0) {
    return [new SidebarViewNode('message', 'No existing files matched by .git/info/exclude')];
  }

  return workspaceState.managedFiles.map((managedFile) => {
    const statusEntry = workspaceState.statusMapByAbsolutePath.get(managedFile.absolutePath);

    return new SidebarViewNode('file', managedFile.relativePath, {
      managedFile,
      statusEntry
    });
  });
}

// managed file sidebar item shown under project
// ex: label ".env", description "+ new", click opens file
function getManagedFileSidebarItem(element) {
  const managedFile = element.managedFile;
  const statusEntry = element.statusEntry;
  const statusDecoration = statusEntry ? BACKUP_STATUS_DECORATIONS[statusEntry.status] : undefined;
  const statusLabel = statusEntry ? BACKUP_STATUS_LABELS[statusEntry.status] : undefined;
  const treeItem = new vscode.TreeItem(managedFile.relativePath, vscode.TreeItemCollapsibleState.None);

  treeItem.description = statusDecoration ? `${statusDecoration.badge} ${statusLabel}` : 'unknown';
  treeItem.iconPath = new vscode.ThemeIcon('file');
  treeItem.resourceUri = vscode.Uri.file(managedFile.absolutePath);
  treeItem.tooltip = getManagedFileTooltip(managedFile, statusDecoration);
  treeItem.command = {
    command: 'vscode.open',
    title: 'Open File',
    arguments: [vscode.Uri.file(managedFile.absolutePath)]
  };

  return treeItem;
}

// what is shown when current sidebar row has no children
// ex: "No Git repository found"
function getMessageSidebarItem(element) {
  const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);

  treeItem.iconPath = new vscode.ThemeIcon('info');

  return treeItem;
}

// returns managed file hover text
// ex: includes relative path, file size and backup status meaning
function getManagedFileTooltip(managedFile, statusDecoration) {
  return [
    `File: ${managedFile.relativePath}`,
    `Size: ${managedFile.size} bytes`,
    `Status: ${statusDecoration ? statusDecoration.tooltip : 'unknown'}`
  ].join('\n');
}

module.exports = {
  createSidebarViewProvider
};
