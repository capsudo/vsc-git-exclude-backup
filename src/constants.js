const EXTENSION_ID = 'gitExcludeBackup';
const BACKUPS_SIDEBAR_VIEW_ID = 'gitExcludeBackup.backupsView';

const DEFAULT_BACKUP_REPOSITORY_NAME = 'git-exclude-backups';
const DEFAULT_BACKUP_BRANCH = 'master';

const PROJECTS_LIST_FILE_NAME = '_projects-list.json';
const BACKUP_STATE_FILE_NAME = '_backup-state.json';

const GITHUB_AUTH_PROVIDER_ID = 'github';
// repo scope is needed later to create and update private backup repository
const GITHUB_AUTH_SCOPES = Object.freeze(['repo']);
const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

const BACKUP_STATUS = Object.freeze({
  synced: 'synced',
  modified: 'modified',
  new: 'new',
  deleted: 'deleted',
  syncing: 'syncing',
  error: 'error',
  ignoredFromBackup: 'ignoredFromBackup'
});

const BACKUP_STATUS_DECORATIONS = Object.freeze({
  synced: { badge: '=', tooltip: 'synced' },
  modified: { badge: '≠', tooltip: 'changed since last backup' },
  new: { badge: '+', tooltip: 'never backed up' },
  deleted: { badge: '−', tooltip: 'backed up but deleted locally' },
  syncing: { badge: '↻', tooltip: 'backup running' },
  error: { badge: '!', tooltip: 'last backup failed' },
  ignoredFromBackup: { badge: '○', tooltip: 'ignored by extension settings' }
});

const BACKUP_STATUS_LABELS = Object.freeze({
  synced: 'synced',
  modified: 'modified',
  new: 'new',
  deleted: 'deleted',
  syncing: 'syncing',
  error: 'error',
  ignoredFromBackup: 'ignored from backup'
});

module.exports = {
  EXTENSION_ID,
  BACKUPS_SIDEBAR_VIEW_ID,
  DEFAULT_BACKUP_REPOSITORY_NAME,
  DEFAULT_BACKUP_BRANCH,
  PROJECTS_LIST_FILE_NAME,
  BACKUP_STATE_FILE_NAME,
  GITHUB_AUTH_PROVIDER_ID,
  GITHUB_AUTH_SCOPES,
  GITHUB_API_BASE_URL,
  GITHUB_API_VERSION,
  BACKUP_STATUS,
  BACKUP_STATUS_DECORATIONS,
  BACKUP_STATUS_LABELS
};
