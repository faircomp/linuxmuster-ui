/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const MAIL_DEFAULT_PORTS = {
  IMAP_SSL: 993,
  SMTP_SUBMISSION: 587,
  SMTPS_IMPLICIT_TLS: 465,
} as const;

export default MAIL_DEFAULT_PORTS;
