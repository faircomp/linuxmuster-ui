/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { ErrorContext } from 'react-oidc-context';
import type { UseFormReturn } from 'react-hook-form';
import AuthErrorMessages from '@libs/auth/constants/authErrorMessages';
import useAuthErrorHandler from './useAuthErrorHandler';

const toastError = vi.fn();
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('sonner', () => ({
  toast: {
    error: (message: string) => {
      toastError(message);
    },
  },
}));

type FormValues = { password: string };

const renderHandler = (authError: ErrorContext | undefined, showQrCode: boolean) => {
  const setError = vi.fn();
  const clearErrors = vi.fn();
  const onTotpRequired = vi.fn();
  const form = { setError, clearErrors } as unknown as UseFormReturn<FormValues>;

  const Probe = () => {
    useAuthErrorHandler(authError, form, showQrCode, onTotpRequired);
    return null;
  };

  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(<Probe />);
  });
  act(() => {
    root.unmount();
  });

  return { setError, onTotpRequired };
};

const errorWith = (message: string) => ({ message, source: undefined }) as unknown as ErrorContext;

describe('useAuthErrorHandler wiring', () => {
  it('calls back for the code step instead of putting an error on the password field', () => {
    toastError.mockClear();

    const { setError, onTotpRequired } = renderHandler(errorWith(AuthErrorMessages.TotpMissing), false);

    expect(onTotpRequired).toHaveBeenCalledTimes(1);
    expect(setError).not.toHaveBeenCalled();
  });

  it('does not toast the missing code in the qr flow, since the code step replaces it', () => {
    toastError.mockClear();

    const { onTotpRequired } = renderHandler(errorWith(AuthErrorMessages.TotpMissing), true);

    expect(onTotpRequired).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('puts an invalid code on the form and leaves the callback alone', () => {
    toastError.mockClear();

    const { setError, onTotpRequired } = renderHandler(errorWith(AuthErrorMessages.TotpInvalid), false);

    expect(onTotpRequired).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith('password', { message: AuthErrorMessages.TotpInvalid });
  });

  it('toasts a form error while the qr code is shown', () => {
    toastError.mockClear();

    renderHandler(errorWith('invalid_grant'), true);

    expect(toastError).toHaveBeenCalledWith('invalid_grant');
  });
});
