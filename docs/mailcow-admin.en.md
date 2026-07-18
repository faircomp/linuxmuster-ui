# Mailcow admin panel

The mailcow admin panel lets administrators manage mailcow mailboxes directly from edulution.

## Where to find it

Settings → App configuration → Mail → "Mailcow administration". The panel is only visible to administrators, because the whole app-configuration area is admin-only.

## What it does

- Lists the configured mail domains and all mailboxes (address, name, domain, storage, status).
- **Create** a mailbox: local part, domain, display name, storage quota (MB) and an initial password. The client validates the input against the same rules the API enforces (allowed local-part characters, password length and complexity, matching confirmation, quota bounds).
- **Edit** a mailbox: display name, quota and active state; the password is only changed when both password fields are filled.
- **Delete** a mailbox after a confirmation.
- **Permissions (ACL)**: manages the mailbox's user permissions. Mailcow does not return the current permissions, so the editor cannot show the actual state: all options start pre-selected and saving **overwrites** the mailbox's real permissions with the selected options. Review the selection before saving.

## Configuration

The API talks to mailcow through two environment variables on the API service:

- `MAILCOW_API_URL` — base URL of the mailcow instance.
- `MAILCOW_API_TOKEN` — mailcow API key (never commit this value).

## Notes

- The active toggle is two-state; editing a mailbox that is in mailcow's "incoming only" state normalises it to inactive.
- A mailbox with an unlimited quota (0) must be given a finite quota before it can be edited here.
- Mailbox delegates and shared mailboxes are not part of this panel yet.
