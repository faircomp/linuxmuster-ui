/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Request } from 'express';
import COOKIE_DESCRIPTORS from '@libs/common/constants/cookieDescriptors';
import extractToken from './extractToken';

const buildRequest = (query: Record<string, string>, headers: Record<string, string>): Request =>
  ({ query, headers }) as unknown as Request;

describe('extractToken', () => {
  it('prefers the query parameter over header and cookie', () => {
    const request = buildRequest(
      { token: 'from-query' },
      { authorization: 'Bearer from-header', cookie: `${COOKIE_DESCRIPTORS.AUTH_TOKEN}=from-cookie` },
    );

    expect(extractToken(request)).toBe('from-query');
  });

  it('prefers the bearer header over the cookie', () => {
    const request = buildRequest(
      {},
      { authorization: 'Bearer from-header', cookie: `${COOKIE_DESCRIPTORS.AUTH_TOKEN}=from-cookie` },
    );

    expect(extractToken(request)).toBe('from-header');
  });

  it('falls through to the cookie for a non-bearer scheme', () => {
    const request = buildRequest(
      {},
      { authorization: 'Basic from-header', cookie: `${COOKIE_DESCRIPTORS.AUTH_TOKEN}=from-cookie` },
    );

    expect(extractToken(request)).toBe('from-cookie');
  });

  it.each([['Bearer'], ['bearer from-header'], ['Bearer  from-header']])(
    'falls through to the cookie for the malformed header %p',
    (authorization) => {
      const request = buildRequest({}, { authorization, cookie: `${COOKIE_DESCRIPTORS.AUTH_TOKEN}=from-cookie` });

      expect(extractToken(request)).toBe('from-cookie');
    },
  );

  it('returns an empty string when nothing carries a token', () => {
    expect(extractToken(buildRequest({}, {}))).toBe('');
  });
});
