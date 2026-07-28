/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Secret, TOTP } from 'otpauth';
import AUTH_TOTP_CONFIG from '@libs/auth/constants/totp-config';
import AuthService from './auth.service';

describe('validateTotp across a window', () => {
  const secret = new Secret({ size: 20 }).base32;
  const totp = new TOTP({ ...AUTH_TOTP_CONFIG, label: 'alice', secret });

  afterEach(() => jest.useRealTimers());

  it('accepts a code at every second of its own window', () => {
    const base = 1_700_000_000;
    const windowStart = Math.floor(base / 30) * 30;
    jest.useFakeTimers().setSystemTime(windowStart * 1000);
    const code = totp.generate();

    const rejected: number[] = [];
    for (let offset = 0; offset < 30; offset += 1) {
      jest.setSystemTime((windowStart + offset) * 1000);
      if (AuthService.validateTotp(code, 'alice', secret) === null) rejected.push(offset);
    }

    expect(rejected).toEqual([]);
  });

  it('still accepts it one window later, and reports the counter it was minted for', () => {
    const base = 1_700_000_000;
    const windowStart = Math.floor(base / 30) * 30;
    jest.useFakeTimers().setSystemTime(windowStart * 1000);
    const code = totp.generate();
    const minted = Math.floor(windowStart / 30);

    jest.setSystemTime((windowStart + 30 + 5) * 1000);
    expect(AuthService.validateTotp(code, 'alice', secret)).toBe(minted);

    jest.setSystemTime((windowStart - 30 + 5) * 1000);
    expect(AuthService.validateTotp(code, 'alice', secret)).toBe(minted);
  });

  it('rejects it two windows later', () => {
    const base = 1_700_000_000;
    const windowStart = Math.floor(base / 30) * 30;
    jest.useFakeTimers().setSystemTime(windowStart * 1000);
    const code = totp.generate();

    jest.setSystemTime((windowStart + 60 + 5) * 1000);
    expect(AuthService.validateTotp(code, 'alice', secret)).toBeNull();
  });
});
