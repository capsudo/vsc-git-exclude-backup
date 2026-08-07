const vscode = require('vscode');

const { BACKUP_STATUS_DECORATIONS } = require('./constants');

let fileDecorationProvider;
let fileDecorationProviderRegistration;

// creates provider used by VSC Explorer to show backup status badges
// getStatusEntryForUri returns { status, relativePath } for a file URI, or undefined
function createFileDecorationProvider(getStatusEntryForUri) {
  const onDidChangeFileDecorationsEmitter = new vscode.EventEmitter();

  return {
    onDidChangeFileDecorations: onDidChangeFileDecorationsEmitter.event,

    provideFileDecoration(uri) {
      const statusEntry = getStatusEntryForUri(uri);
      if (!statusEntry) {
        return undefined;
      }

      const decoration = BACKUP_STATUS_DECORATIONS[statusEntry.status];
      if (!decoration) {
        return undefined;
      }

      return {
        badge: decoration.badge,
        tooltip: decoration.tooltip,
        propagate: false
      };
    },

    refresh() {
      onDidChangeFileDecorationsEmitter.fire(undefined);
    },

    dispose() {
      onDidChangeFileDecorationsEmitter.dispose();
    }
  };
}

// Registers Explorer badge provider only when gitExcludeBackup.decorateExplorer is true
// decorateExplorer is passed in so this file does not read extension settings itself
function updateFileDecorationProviderRegistration(decorateExplorer, getStatusEntryForUri) {
  if (!decorateExplorer) {
    disposeFileDecorationProvider();
    return;
  }

  if (fileDecorationProviderRegistration) {
    return;
  }

  fileDecorationProvider = createFileDecorationProvider(getStatusEntryForUri);
  fileDecorationProviderRegistration = vscode.window.registerFileDecorationProvider(fileDecorationProvider);
}

// asks VSC Explorer to request fresh file decorations
// no-op when badges are disabled and provider is not registered
function refreshFileDecorationProvider() {
  if (fileDecorationProvider) {
    fileDecorationProvider.refresh();
  }
}

// removes Explorer badge provider
// used when extension unloads or when gitExcludeBackup.decorateExplorer becomes false
function disposeFileDecorationProvider() {
  if (fileDecorationProviderRegistration) {
    fileDecorationProviderRegistration.dispose();
    fileDecorationProviderRegistration = undefined;
  }

  if (fileDecorationProvider) {
    fileDecorationProvider.dispose();
    fileDecorationProvider = undefined;
  }
}

module.exports = {
  disposeFileDecorationProvider,
  refreshFileDecorationProvider,
  updateFileDecorationProviderRegistration
};
