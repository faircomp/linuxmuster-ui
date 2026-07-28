/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type { ErrorContext } from 'react-oidc-context';
import AuthErrorMessages from '@libs/auth/constants/authErrorMessages';

const AUTH_ERROR_ACTION = {
  NONE: 'none',
  TOTP_REQUIRED: 'totpRequired',
  FORM_ERROR: 'formError',
} as const;

type AuthErrorAction =
  | { action: typeof AUTH_ERROR_ACTION.NONE }
  | { action: typeof AUTH_ERROR_ACTION.TOTP_REQUIRED }
  | { action: typeof AUTH_ERROR_ACTION.FORM_ERROR; messageKey: string };

const resolveAuthErrorAction = (authError: ErrorContext | undefined): AuthErrorAction => {
  if (!authError) {
    return { action: AUTH_ERROR_ACTION.NONE };
  }

  if (authError.message.includes('Invalid response Content-Type:')) {
    return { action: AUTH_ERROR_ACTION.FORM_ERROR, messageKey: 'auth.errors.EdulutionConnectionFailed' };
  }

  if (authError.message.includes('Token is not active')) {
    return { action: AUTH_ERROR_ACTION.FORM_ERROR, messageKey: 'auth.errors.tokenIsNotActive' };
  }

  if (authError.source?.includes('renewSilent') || authError.message.includes('No silent_redirect_uri configured')) {
    return { action: AUTH_ERROR_ACTION.FORM_ERROR, messageKey: 'auth.errors.TokenExpired' };
  }

  if (authError.message.includes(AuthErrorMessages.TotpMissing)) {
    return { action: AUTH_ERROR_ACTION.TOTP_REQUIRED };
  }

  return { action: AUTH_ERROR_ACTION.FORM_ERROR, messageKey: authError.message };
};

export { AUTH_ERROR_ACTION };

export default resolveAuthErrorAction;
