/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import MAILCOW_VALIDATION from '@libs/mail/constants/mailcowValidation';

export interface CreateMailboxFormValues {
  localPart: string;
  domain: string;
  name: string;
  quota: number;
  password: string;
  passwordConfirmation: string;
}

export const isValidLocalPart = (localPart: string): boolean =>
  localPart.length > 0 &&
  localPart.length <= MAILCOW_VALIDATION.LOCAL_PART_MAX_LENGTH &&
  MAILCOW_VALIDATION.LOCAL_PART_ALLOWED_REGEX.test(localPart);

export const isValidPassword = (password: string): boolean =>
  password.length >= MAILCOW_VALIDATION.PASSWORD_MIN_LENGTH &&
  MAILCOW_VALIDATION.PASSWORD_COMPLEXITY_REGEX.test(password);

export const passwordsMatch = (password: string, passwordConfirmation: string): boolean =>
  password === passwordConfirmation;

export const isValidQuota = (quota: number): boolean =>
  Number.isInteger(quota) && quota >= 1 && quota <= MAILCOW_VALIDATION.QUOTA_MAX_MB;

export const canSubmitCreateMailbox = (values: CreateMailboxFormValues, isSaving: boolean): boolean =>
  !isSaving &&
  isValidLocalPart(values.localPart) &&
  values.domain !== '' &&
  values.name.trim() !== '' &&
  isValidQuota(values.quota) &&
  isValidPassword(values.password) &&
  passwordsMatch(values.password, values.passwordConfirmation);

export interface EditMailboxFormValues {
  name: string;
  quota: number;
  password: string;
  passwordConfirmation: string;
}

export const isPasswordChangeRequested = (password: string, passwordConfirmation: string): boolean =>
  password !== '' || passwordConfirmation !== '';

export const isValidPasswordChange = (password: string, passwordConfirmation: string): boolean =>
  !isPasswordChangeRequested(password, passwordConfirmation) ||
  (isValidPassword(password) && passwordsMatch(password, passwordConfirmation));

export const canSubmitEditMailbox = (values: EditMailboxFormValues, isSaving: boolean): boolean =>
  !isSaving &&
  values.name.trim() !== '' &&
  isValidQuota(values.quota) &&
  isValidPasswordChange(values.password, values.passwordConfirmation);

export const toggleAclValue = (selected: string[], value: string): string[] =>
  selected.includes(value) ? selected.filter((entry) => entry !== value) : [...selected, value];
