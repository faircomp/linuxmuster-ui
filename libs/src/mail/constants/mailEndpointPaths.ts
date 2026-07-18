/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const MAIL_ENDPOINT_PATHS = {
  MAILBOXES: 'mailboxes',
  MESSAGES: 'messages',
  OUTBOX: 'outbox',
  DRAFTS: 'drafts',
  STATUS: 'status',
  DESTINATION: 'destination',
  ATTACHMENTS: 'attachments',
  SYNC_JOBS: 'sync-jobs',
  PROVIDER_CONFIG: 'provider-config',
  PUBLIC: 'public',
  MAILCOW_MAILBOXES: 'mailcow-mailboxes',
  ACL: 'acl',
  DELEGATES: 'delegates',
  FOLDERS: 'folders',
  DOMAINS: 'domains',
  RECIPIENTS: 'recipients',
  SEARCH: 'search',
} as const;

export default MAIL_ENDPOINT_PATHS;
