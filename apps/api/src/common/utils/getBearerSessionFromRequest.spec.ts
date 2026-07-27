/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Request } from 'express';
import type JWTUser from '@libs/user/types/jwt/jwtUser';
import getBearerSessionFromRequest from './getBearerSessionFromRequest';

const USER = { preferred_username: 'alice', sid: 'session-id' } as JWTUser;
const TOKEN = 'a.verified.token';

const buildRequest = (authorization?: string, token?: string): Request =>
  ({ headers: authorization ? { authorization } : {}, token, user: USER }) as unknown as Request;

describe('getBearerSessionFromRequest', () => {
  it('returns the session when the header token is the one the guard verified', () => {
    expect(getBearerSessionFromRequest(buildRequest(`Bearer ${TOKEN}`, TOKEN))).toBe(USER);
  });

  it('returns nothing when the header carries a different token than the guard verified', () => {
    expect(getBearerSessionFromRequest(buildRequest(`Bearer someone-elses-token`, TOKEN))).toBeUndefined();
  });

  it('returns nothing when the token only arrived as a query parameter', () => {
    expect(getBearerSessionFromRequest(buildRequest(undefined, TOKEN))).toBeUndefined();
  });

  it('returns nothing for a non-bearer scheme', () => {
    expect(getBearerSessionFromRequest(buildRequest(`Basic ${TOKEN}`, TOKEN))).toBeUndefined();
  });

  it('returns nothing without an authorization header', () => {
    expect(getBearerSessionFromRequest(buildRequest())).toBeUndefined();
  });
});
