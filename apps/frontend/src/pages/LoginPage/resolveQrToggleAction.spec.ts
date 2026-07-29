/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, expect, it } from 'vitest';
import resolveQrToggleAction, { QR_TOGGLE_ACTION } from './resolveQrToggleAction';

describe('resolveQrToggleAction', () => {
  it('asks the server for a session when opening the qr code, rather than inventing one', () => {
    expect(resolveQrToggleAction(false, false)).toBe(QR_TOGGLE_ACTION.REQUEST_SESSION);
  });

  it('just hides an open qr code, without spending another session', () => {
    expect(resolveQrToggleAction(false, true)).toBe(QR_TOGGLE_ACTION.HIDE);
  });

  it('cancels the code step first, whatever the qr state is', () => {
    expect(resolveQrToggleAction(true, false)).toBe(QR_TOGGLE_ACTION.CANCEL_TOTP);
    expect(resolveQrToggleAction(true, true)).toBe(QR_TOGGLE_ACTION.CANCEL_TOTP);
  });
});
