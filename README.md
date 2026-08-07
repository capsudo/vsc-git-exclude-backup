# Git Exclude Backup

VSC (VS Code/VSCodium) extension that backs up private files listed by `.git/info/exclude`, using the GitHub account currently signed in to VSC.

## What It Does

- [x] Loads as a VSC extension.
- [x] Provides initial settings for backup repository, branch, ignore globs, auto-backup and Explorer decoration.
- [x] Detects files ignored by current Git repository using `.git/info/exclude`.
- [x] Builds local workspace state with project identity, file hashes and initial backup status.
- [ ] Provides commands to back up listed files.
- [ ] Automatically backs up listed files (if modified) after each push.
- [ ] Shows badges for backup status in VSC Explorer.
- [ ] Shows a global `Git Exclude Backups` tree in Explorer.

## How Files Are Backed Up

Files are stored, grouped by project, in a private repo on your GitHub account. Default name is `git-exclude-backups`.

Default GitHub structure:

```text
git-exclude-backups/
  _projects-list.json
  my-project-a1b2c3d4e5/
    _backup-state.json
    .env
    .private/foo.bar
```

## Badges

| Badge | Meaning |
| --- | --- |
| `=` | Local file matches last GitHub backup |
| `≠` | Local file changed since last GitHub backup |
| `+` | File was never backed up |
| `−` | File exists in backup but was deleted locally |
| `↻` | Backup is running |
| `!` | Last backup failed |
| `○` | File is ignored by extension settings |

Hover a decorated file in Explorer to see the full status text.

## Settings

- `gitExcludeBackup.backupRepositoryName`: GitHub repository name. Default: `git-exclude-backups`.
- `gitExcludeBackup.backupBranch`: Branch used in backup repository. Default: `master`.
- `gitExcludeBackup.extraBackupIgnoreGlobs`: Extra patterns for managed files that should not be backed up.
- `gitExcludeBackup.backupAfterDetectedPush`: Run backup after detected push. Default: `true`.
- `gitExcludeBackup.decorateExplorer`: Show Explorer badges. Default: `true`.

## Notes

- By default, `.git/info/exclude` is used to list files to back up. `.gitignore` is not used because it often contains cache/build files that do not need backup.

- Backup structure (on private repo) was chosen so it's easy to browse on GitHub. Projects files are stored at root under their project directory, `_projects-list.json` stores projects metadata but each project has its own `_backup-state.json`, so backing up one project does not rewrite one large global state file. It also helps in case of a corrupted state so only one project is affected. `_` prefix is used so those metadata files appear first in GitHub file listings and are less likely to conflict with project files.
