const EXTENSION_ID = 'gitExcludeBackup';
const OUTPUT_CHANNEL_NAME = 'Git Exclude Backup';

const DEFAULT_BACKUP_REPOSITORY_NAME = 'git-exclude-backups';
const DEFAULT_BACKUP_BRANCH = 'master';

const PROJECTS_LIST_FILE_NAME = '_projects-list.json';
const BACKUP_STATE_FILE_NAME = '_backup-state.json';

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
  synced: { badge: '=', tooltip: 'Git Exclude Backup: synced with GitHub backup' },
  modified: { badge: '≠', tooltip: 'Git Exclude Backup: changed since last GitHub backup' },
  new: { badge: '+', tooltip: 'Git Exclude Backup: never backed up' },
  deleted: { badge: '−', tooltip: 'Git Exclude Backup: exists in backup but deleted locally' },
  syncing: { badge: '↻', tooltip: 'Git Exclude Backup: backup running' },
  error: { badge: '!', tooltip: 'Git Exclude Backup: last backup failed' },
  ignoredFromBackup: { badge: '○', tooltip: 'Git Exclude Backup: ignored by extension settings' }
});

module.exports = {
  EXTENSION_ID,
  OUTPUT_CHANNEL_NAME,
  DEFAULT_BACKUP_REPOSITORY_NAME,
  DEFAULT_BACKUP_BRANCH,
  PROJECTS_LIST_FILE_NAME,
  BACKUP_STATE_FILE_NAME,
  BACKUP_STATUS,
  BACKUP_STATUS_DECORATIONS
};
