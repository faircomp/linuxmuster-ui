/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type JWTUser from '@libs/user/types/jwt/jwtUser';

jest.mock('fs', () => ({ readFileSync: jest.fn().mockReturnValue('public-key') }));

// eslint-disable-next-line import/first
import AuthGuard from './auth.guard';

const TOKEN = 'a.valid.token';
const USER = { preferred_username: 'alice', sid: 'session-id' } as JWTUser;

describe('AuthGuard session denylist', () => {
  const verifyAsync = jest.fn();
  const isSessionDenied = jest.fn();

  const buildGuard = (isPublic: boolean) => {
    const reflector = { get: jest.fn().mockReturnValue(isPublic) } as unknown as Reflector;
    return new AuthGuard({ verifyAsync } as never, reflector, { isSessionDenied } as never);
  };

  const buildContext = (request: Partial<Request>) =>
    ({
      getHandler: () => jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    verifyAsync.mockResolvedValue(USER);
    isSessionDenied.mockResolvedValue(false);
  });

  it('admits a valid token whose session is not denied', async () => {
    const request = { query: { token: TOKEN }, headers: {} } as unknown as Request;

    await expect(buildGuard(false).canActivate(buildContext(request))).resolves.toBe(true);
    expect(isSessionDenied).toHaveBeenCalledWith(USER.sid);
    expect(request.user).toBe(USER);
    expect(request.token).toBe(TOKEN);
  });

  it('rejects a valid token whose session was revoked', async () => {
    isSessionDenied.mockResolvedValue(true);
    const request = { query: { token: TOKEN }, headers: {} } as unknown as Request;

    await expect(buildGuard(false).canActivate(buildContext(request))).rejects.toThrow(
      expect.objectContaining({ status: HttpStatus.UNAUTHORIZED }) as unknown as Error,
    );
  });

  it('lets a public route continue anonymously when the session was revoked', async () => {
    isSessionDenied.mockResolvedValue(true);
    const request = { query: { token: TOKEN }, headers: {} } as unknown as Request;

    await expect(buildGuard(true).canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(request.token).toBeUndefined();
  });

  it('never writes the request token when verification failed on a public route', async () => {
    verifyAsync.mockRejectedValue(new Error('expired'));
    const request = { query: { token: TOKEN }, headers: {} } as unknown as Request;

    await expect(buildGuard(true).canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.token).toBeUndefined();
  });

  it('rejects a protected route without any token', async () => {
    const request = { query: {}, headers: {} } as unknown as Request;

    await expect(buildGuard(false).canActivate(buildContext(request))).rejects.toThrow(
      expect.objectContaining({ status: HttpStatus.UNAUTHORIZED }) as unknown as Error,
    );
  });
});
