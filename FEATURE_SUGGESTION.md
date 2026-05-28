# Feature Suggestions

## Conversation Tools

- Snooze messages until a chosen time.
- Pin or star important threads.
- Add private notes to threads.
- Schedule messages with send later.
- Add an undo send delay.

## Mailbox Productivity

- Saved searches and smart folders.
- Advanced search operators such as `from:`, `has:attachment`, and `before:`.
- Keyboard shortcut help overlay.
- Bulk archive or delete by sender.
- Auto-cleanup rules for old mail.

## Filters And Automation

- More filter actions: label, forward, auto-reply, delete, star.
- Multiple conditions per filter.
- Filter preview and test mode.
- Manual filter runs on existing mail.
- Rule import and export.

## Composer

- Markdown compose mode.
- Message templates and snippets.
- Improved attachment drag and drop.
- Recipient validation and warnings.
- Signature profiles.

## AI Features

- Reply draft suggestions.
- Tone rewrite options: concise, formal, friendly.
- Thread action extraction.
- A "What needs my reply?" inbox view.
- Attachment and document summarization.

## Contacts

- Contact groups.
- Recent recipients ranking.
- Contact detail page with message history.
- vCard or CSV import and export.
- Blocklist and allowlist.

## Notifications

- Per-mailbox notification settings.
- Quiet hours.
- Push notification actions such as archive or mark read.
- Desktop notification test and status UI.

## Security

- Local encrypted secret storage for IMAP and SMTP credentials.
- Session and device management.
- Audit log for settings changes.
- External image blocking controls.
- Attachment safety warnings.

## UX

- Resizable split panes.
- Theme support: light, dark, system.
- Density presets beyond compact mode.
- Mobile swipe actions.
- Offline read cache for recent messages.

## Admin And Operations

- Worker health dashboard.
- Queue status UI for IMAP and SMTP jobs.
- Manual resync mailbox button.
- Failed job retry button.
- Export and import app settings.

## Best Next Features For This Codebase

1. Queue health dashboard, because queues already exist in `imap_job`, `smtp_job`, and `sync_runtime`.
2. Saved searches, because `/api/messages?q=` already supports search.
3. Send later, because SMTP sending is already job-based.
4. Snooze, because messages already have mailbox/action plumbing.
5. Filter preview and manual run, because filters already exist but could be more useful.
