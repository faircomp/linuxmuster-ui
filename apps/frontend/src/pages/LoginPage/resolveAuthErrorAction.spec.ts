/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, expect, it } from 'vitest';
import type { ErrorContext } from 'react-oidc-context';
import AuthErrorMessages from '@libs/auth/constants/authErrorMessages';
import resolveAuthErrorAction, { AUTH_ERROR_ACTION } from './resolveAuthErrorAction';

const errorWith = (message: string, source?: string) => ({ message, source }) as unknown as ErrorContext;

describe('resolveAuthErrorAction', () => {
  it('asks for the code when the server reports a missing one, instead of blaming the password', () => {
    expect(resolveAuthErrorAction(errorWith(AuthErrorMessages.TotpMissing))).toEqual({
      action: AUTH_ERROR_ACTION.TOTP_REQUIRED,
    });
  });

  it.each([[AuthErrorMessages.TotpInvalid], [AuthErrorMessages.TotpAlreadyUsed]])(
    'keeps %s on the form, so the user sees it in the code step',
    (message) => {
      expect(resolveAuthErrorAction(errorWith(message))).toEqual({
        action: AUTH_ERROR_ACTION.FORM_ERROR,
        messageKey: message,
      });
    },
  );

  it('leaves wrong credentials on the password field', () => {
    expect(resolveAuthErrorAction(errorWith('invalid_grant'))).toEqual({
      action: AUTH_ERROR_ACTION.FORM_ERROR,
      messageKey: 'invalid_grant',
    });
  });

  it('does nothing without an error', () => {
    expect(resolveAuthErrorAction(undefined)).toEqual({ action: AUTH_ERROR_ACTION.NONE });
  });

  it.each([
    ['Invalid response Content-Type: text/html', 'auth.errors.EdulutionConnectionFailed'],
    ['Token is not active', 'auth.errors.tokenIsNotActive'],
    ['No silent_redirect_uri configured', 'auth.errors.TokenExpired'],
  ])('maps the transport error %p to %p', (message, messageKey) => {
    expect(resolveAuthErrorAction(errorWith(message))).toEqual({
      action: AUTH_ERROR_ACTION.FORM_ERROR,
      messageKey,
    });
  });

  it('maps a silent renew failure by its source', () => {
    expect(resolveAuthErrorAction(errorWith('boom', 'renewSilent'))).toEqual({
      action: AUTH_ERROR_ACTION.FORM_ERROR,
      messageKey: 'auth.errors.TokenExpired',
    });
  });

  it('checks the transport errors before the code error, since a stale token is not a missing code', () => {
    expect(resolveAuthErrorAction(errorWith(`Token is not active ${AuthErrorMessages.TotpMissing}`))).toEqual({
      action: AUTH_ERROR_ACTION.FORM_ERROR,
      messageKey: 'auth.errors.tokenIsNotActive',
    });
  });
});
