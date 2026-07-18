/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const MAILCOW_ACL_OPTIONS = {
  SPAM_ALIAS: 'spam_alias',
  TLS_POLICY: 'tls_policy',
  SPAM_SCORE: 'spam_score',
  SPAM_POLICY: 'spam_policy',
  DELIMITER_ACTION: 'delimiter_action',
  SYNCJOBS: 'syncjobs',
  EAS_RESET: 'eas_reset',
  SOGO_PROFILE_RESET: 'sogo_profile_reset',
  PUSHOVER: 'pushover',
  QUARANTINE: 'quarantine',
  QUARANTINE_ATTACHMENTS: 'quarantine_attachments',
  QUARANTINE_NOTIFICATION: 'quarantine_notification',
  QUARANTINE_CATEGORY: 'quarantine_category',
  APP_PASSWDS: 'app_passwds',
} as const;

export default MAILCOW_ACL_OPTIONS;
