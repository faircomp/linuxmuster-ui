/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import axios from 'axios';
import MailsErrorMessages from '@libs/mail/constants/mails-error-messages';

const MAILCOW_ERROR_CODE_MAP: Record<string, MailsErrorMessages> = {
  password_complexity: MailsErrorMessages.MailcowPasswordComplexity,
  password_repeat: MailsErrorMessages.MailcowPasswordMismatch,
  password_empty: MailsErrorMessages.MailcowPasswordEmpty,
  username_invalid: MailsErrorMessages.MailcowUsernameInvalid,
  mailbox_invalid: MailsErrorMessages.MailcowUsernameInvalid,
  domain_invalid: MailsErrorMessages.MailcowDomainInvalid,
  domain_not_found: MailsErrorMessages.MailcowDomainNotFound,
  object_exists: MailsErrorMessages.MailcowObjectExists,
  max_mailbox_exceeded: MailsErrorMessages.MailcowMaxMailboxesExceeded,
  max_quota_in_use: MailsErrorMessages.MailcowQuotaExceeded,
  mailbox_quota_exceeds_domain_quota: MailsErrorMessages.MailcowQuotaExceeded,
  mailbox_quota_left_exceeded: MailsErrorMessages.MailcowQuotaExceeded,
  mailbox_defquota_exceeds_mailbox_quota: MailsErrorMessages.MailcowQuotaExceeded,
  access_denied: MailsErrorMessages.MailcowAccessDenied,
};

class MailcowValidationError extends Error {
  readonly codes: string[];

  constructor(codes: string[]) {
    super(codes.join(', '));
    this.name = 'MailcowValidationError';
    this.codes = codes;
  }
}

const extractCode = (msg: unknown): string => {
  if (Array.isArray(msg)) {
    return String(msg[0] ?? 'unknown_error');
  }
  return typeof msg === 'string' && msg !== '' ? msg : 'unknown_error';
};

export const assertMailcowSuccess = (data: unknown): void => {
  if (!Array.isArray(data)) {
    return;
  }
  const codes = data
    .filter((entry): entry is { type?: string; msg?: unknown } => typeof entry === 'object' && entry !== null)
    .filter((entry) => entry.type === 'danger' || entry.type === 'error')
    .map((entry) => extractCode(entry.msg));
  if (codes.length > 0) {
    throw new MailcowValidationError(codes);
  }
};

export const mapMailcowErrorCode = (error: unknown, fallback: MailsErrorMessages): MailsErrorMessages => {
  if (!(error instanceof MailcowValidationError)) {
    return fallback;
  }
  const matched = error.codes.find((code) => MAILCOW_ERROR_CODE_MAP[code] !== undefined);
  return matched ? MAILCOW_ERROR_CODE_MAP[matched] : fallback;
};

export const getMailcowErrorStatus = (error: unknown): HttpStatus => {
  if (error instanceof MailcowValidationError) {
    return HttpStatus.BAD_REQUEST;
  }
  if (axios.isAxiosError(error) && error.response) {
    const { status } = error.response;
    if (status >= 400 && status < 500) {
      return status;
    }
  }
  return HttpStatus.BAD_GATEWAY;
};

export default MailcowValidationError;
