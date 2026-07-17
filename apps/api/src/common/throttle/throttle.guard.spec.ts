/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HTTP_HEADERS } from '@libs/common/types/http-methods';
import ThrottleConfig from '@libs/common/types/throttleConfig';
import CustomHttpException from '../CustomHttpException';
import ThrottleGuard from './throttle.guard';

const noop = () => undefined;

const makeContext = (
  config: ThrottleConfig | undefined,
  request: { user?: { preferred_username: string }; ip?: string; method?: string; path?: string },
) => {
  const headers: Record<string, string | number> = {};
  const response = {
    setHeader: jest.fn((key: string, value: string | number) => {
      headers[key] = value;
    }),
  };
  const req = {
    user: request.user,
    ip: request.ip,
    method: request.method ?? 'POST',
    route: { path: request.path ?? '/wiki/search' },
    path: request.path ?? '/wiki/search',
  };
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(config) };
  const context = {
    getHandler: () => noop,
    getClass: () => ThrottleGuard,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => response }),
  } as unknown as ExecutionContext;

  return { context, guard: new ThrottleGuard(reflector as unknown as Reflector), response, headers };
};

const CONFIG: ThrottleConfig = { limit: 2, ttl: 60_000, byIp: false };

describe('ThrottleGuard', () => {
  it('allows the request when no throttle metadata is present', () => {
    const { context, guard, response } = makeContext(undefined, { user: { preferred_username: 'no-config' } });

    expect(guard.canActivate(context)).toBe(true);
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it('counts requests per user and exposes the remaining budget', () => {
    const first = makeContext(CONFIG, { user: { preferred_username: 'counter' } });
    expect(first.guard.canActivate(first.context)).toBe(true);
    expect(first.headers[HTTP_HEADERS.XRateLimitRemaining]).toBe(1);

    const second = makeContext(CONFIG, { user: { preferred_username: 'counter' } });
    expect(second.guard.canActivate(second.context)).toBe(true);
    expect(second.headers[HTTP_HEADERS.XRateLimitRemaining]).toBe(0);
  });

  it('rejects a request beyond the limit with 429 and a Retry-After header', () => {
    const user = { preferred_username: 'limited' };
    const a = makeContext(CONFIG, { user });
    const b = makeContext(CONFIG, { user });
    a.guard.canActivate(a.context);
    b.guard.canActivate(b.context);

    const third = makeContext(CONFIG, { user });
    expect.assertions(4);
    try {
      third.guard.canActivate(third.context);
    } catch (error) {
      expect(error).toBeInstanceOf(CustomHttpException);
      expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(third.headers[HTTP_HEADERS.XRateLimitRemaining]).toBe(0);
      expect(third.headers[HTTP_HEADERS.RetryAfter]).toBeGreaterThan(0);
    }
  });

  it('skips throttling for an unauthenticated request when byIp is disabled', () => {
    const { context, guard, response } = makeContext(CONFIG, { ip: '9.9.9.9' });

    expect(guard.canActivate(context)).toBe(true);
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it('falls back to the client IP as principal when byIp is enabled', () => {
    const ipConfig: ThrottleConfig = { limit: 1, ttl: 60_000, byIp: true };
    const first = makeContext(ipConfig, { ip: '8.8.8.8', path: '/wiki/search-ip' });
    expect(first.guard.canActivate(first.context)).toBe(true);

    const second = makeContext(ipConfig, { ip: '8.8.8.8', path: '/wiki/search-ip' });
    expect.assertions(3);
    try {
      second.guard.canActivate(second.context);
    } catch (error) {
      expect(error).toBeInstanceOf(CustomHttpException);
      expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });
});
