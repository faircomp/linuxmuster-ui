/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const MAIL_IMAP_FLAGS = {
  SEEN: '\\Seen',
  FLAGGED: '\\Flagged',
  DELETED: '\\Deleted',
  ANSWERED: '\\Answered',
  DRAFT: '\\Draft',
} as const;

export const MAIL_MAILBOX_FLAGS = {
  NOSELECT: '\\Noselect',
} as const;

export const MAIL_SPECIAL_USE = {
  INBOX: '\\Inbox',
  TRASH: '\\Trash',
  JUNK: '\\Junk',
  DRAFTS: '\\Drafts',
  SENT: '\\Sent',
  ARCHIVE: '\\Archive',
} as const;

export const MAIL_FOLDER_NAMES = {
  INBOX: 'INBOX',
  SENT: 'Sent',
  DRAFTS: 'Drafts',
  TRASH: 'Trash',
  JUNK: 'Junk',
  SPAM: 'Spam',
  ARCHIVE: 'Archive',
} as const;

export const SYSTEM_FOLDER_NAMES: readonly string[] = [
  MAIL_FOLDER_NAMES.INBOX,
  MAIL_FOLDER_NAMES.SENT,
  MAIL_FOLDER_NAMES.DRAFTS,
  MAIL_FOLDER_NAMES.TRASH,
  MAIL_FOLDER_NAMES.JUNK,
  MAIL_FOLDER_NAMES.SPAM,
  MAIL_FOLDER_NAMES.ARCHIVE,
];

export const MAIL_PATHS = {
  SHARED_PREFIX: 'Shared/',
  SHARED_ROOT: 'Shared',
  DELIMITER: '/',
} as const;

export default MAIL_IMAP_FLAGS;
