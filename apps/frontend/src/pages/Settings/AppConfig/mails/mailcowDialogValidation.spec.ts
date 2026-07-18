/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import {
  canSubmitCreateMailbox,
  canSubmitEditMailbox,
  isValidLocalPart,
  isValidPassword,
  isValidPasswordChange,
  isValidQuota,
  passwordsMatch,
  type CreateMailboxFormValues,
  type EditMailboxFormValues,
} from './mailcowDialogValidation';

const validValues: CreateMailboxFormValues = {
  localPart: 'jane',
  domain: 'example.com',
  name: 'Jane Doe',
  quota: 1024,
  password: 'secret1!',
  passwordConfirmation: 'secret1!',
};

describe('mailcowDialogValidation', () => {
  describe('isValidLocalPart', () => {
    it('accepts allowed characters', () => {
      expect(isValidLocalPart('jane.doe_1+tag')).toBe(true);
    });

    it('rejects an empty value and forbidden characters', () => {
      expect(isValidLocalPart('')).toBe(false);
      expect(isValidLocalPart('jane@doe')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('requires the minimum length plus a digit and a special character', () => {
      expect(isValidPassword('secret1!')).toBe(true);
      expect(isValidPassword('short1!')).toBe(false);
      expect(isValidPassword('password')).toBe(false);
      expect(isValidPassword('password1')).toBe(false);
    });
  });

  describe('passwordsMatch', () => {
    it('is true only when both values are identical', () => {
      expect(passwordsMatch('secret1!', 'secret1!')).toBe(true);
      expect(passwordsMatch('secret1!', 'other1!')).toBe(false);
    });
  });

  describe('isValidQuota', () => {
    it('accepts integers within the allowed range', () => {
      expect(isValidQuota(1)).toBe(true);
      expect(isValidQuota(1024)).toBe(true);
    });

    it('rejects zero, non-integers and NaN', () => {
      expect(isValidQuota(0)).toBe(false);
      expect(isValidQuota(1.5)).toBe(false);
      expect(isValidQuota(Number.NaN)).toBe(false);
    });
  });

  describe('canSubmitCreateMailbox', () => {
    it('is true for a fully valid, non-saving form', () => {
      expect(canSubmitCreateMailbox(validValues, false)).toBe(true);
    });

    it('is false while saving', () => {
      expect(canSubmitCreateMailbox(validValues, true)).toBe(false);
    });

    it('is false on a password mismatch', () => {
      expect(canSubmitCreateMailbox({ ...validValues, passwordConfirmation: 'other1!' }, false)).toBe(false);
    });

    it('is false without a selected domain', () => {
      expect(canSubmitCreateMailbox({ ...validValues, domain: '' }, false)).toBe(false);
    });

    it('is false with an out-of-range quota', () => {
      expect(canSubmitCreateMailbox({ ...validValues, quota: 0 }, false)).toBe(false);
    });
  });

  describe('isValidPasswordChange', () => {
    it('is valid when no password change is requested', () => {
      expect(isValidPasswordChange('', '')).toBe(true);
    });

    it('requires a valid, matching password when a change is requested', () => {
      expect(isValidPasswordChange('secret1!', 'secret1!')).toBe(true);
      expect(isValidPasswordChange('secret1!', 'other1!')).toBe(false);
      expect(isValidPasswordChange('weak', 'weak')).toBe(false);
      expect(isValidPasswordChange('secret1!', '')).toBe(false);
    });
  });

  describe('canSubmitEditMailbox', () => {
    const validEdit: EditMailboxFormValues = { name: 'Jane', quota: 1024, password: '', passwordConfirmation: '' };

    it('is true for valid values without a password change', () => {
      expect(canSubmitEditMailbox(validEdit, false)).toBe(true);
    });

    it('is false while saving, with an empty name or an invalid quota', () => {
      expect(canSubmitEditMailbox(validEdit, true)).toBe(false);
      expect(canSubmitEditMailbox({ ...validEdit, name: '  ' }, false)).toBe(false);
      expect(canSubmitEditMailbox({ ...validEdit, quota: 0 }, false)).toBe(false);
    });

    it('is false when a requested password change is invalid', () => {
      expect(
        canSubmitEditMailbox({ ...validEdit, password: 'secret1!', passwordConfirmation: 'other1!' }, false),
      ).toBe(false);
    });
  });
});
