/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HTTP_HEADERS } from '@libs/common/types/http-methods';
import ThrottleConfig from '@libs/common/types/throttleConfig';
import MAX_THROTTLE_PRINCIPAL_LENGTH from '@libs/common/constants/maxThrottlePrincipalLength';
import CustomHttpException from '../CustomHttpException';
import ThrottleGuard from './throttle.guard';

const noop = () => undefined;

const makeContext = (
  config: ThrottleConfig | undefined,
  request: {
    user?: { preferred_username: string };
    ip?: string;
    method?: string;
    path?: string;
    body?: { username?: unknown };
  },
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
    body: request.body,
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

const CONFIG: ThrottleConfig = { limit: 2, ttl: 60_000, byIp: false, byUsername: false };
const BY_USERNAME: ThrottleConfig = { limit: 2, ttl: 60_000, byIp: false, byUsername: true };
const BY_BOTH: ThrottleConfig = { limit: 2, ttl: 60_000, byIp: true, byUsername: true };
const LOGIN_PATH = '/auth';

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
    const ipConfig: ThrottleConfig = { limit: 1, ttl: 60_000, byIp: true, byUsername: false };
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

  describe('multiple principals', () => {
    it('throttles the same username coming from different addresses', () => {
      const attempt = (ip: string) =>
        makeContext(BY_USERNAME, { ip, path: LOGIN_PATH, body: { username: 'spray-target' } });

      const first = attempt('198.51.100.1');
      expect(first.guard.canActivate(first.context)).toBe(true);
      const second = attempt('198.51.100.2');
      expect(second.guard.canActivate(second.context)).toBe(true);

      const third = attempt('198.51.100.3');
      expect(() => third.guard.canActivate(third.context)).toThrow(CustomHttpException);
    });

    it('normalises the username, so casing and padding share one budget', () => {
      const attempt = (username: string) =>
        makeContext(BY_USERNAME, { ip: '198.51.100.10', path: LOGIN_PATH, body: { username } });

      const first = attempt('  MixedCase  ');
      expect(first.guard.canActivate(first.context)).toBe(true);
      const second = attempt('mixedcase');
      expect(second.guard.canActivate(second.context)).toBe(true);

      const third = attempt('MIXEDCASE');
      expect(() => third.guard.canActivate(third.context)).toThrow(CustomHttpException);
    });

    it('blocks as soon as either the address or the username budget is exhausted', () => {
      const fromSharedIp = (username: string) =>
        makeContext(BY_BOTH, { ip: '198.51.100.20', path: LOGIN_PATH, body: { username } });

      const first = fromSharedIp('victim-a');
      expect(first.guard.canActivate(first.context)).toBe(true);
      const second = fromSharedIp('victim-b');
      expect(second.guard.canActivate(second.context)).toBe(true);

      const third = fromSharedIp('victim-c');
      expect(() => third.guard.canActivate(third.context)).toThrow(CustomHttpException);
    });

    it('reports the smallest remaining budget across the principals', () => {
      const one = makeContext(BY_BOTH, { ip: '198.51.100.30', path: LOGIN_PATH, body: { username: 'budget-a' } });
      expect(one.guard.canActivate(one.context)).toBe(true);
      expect(one.headers[HTTP_HEADERS.XRateLimitRemaining]).toBe(1);

      const two = makeContext(BY_BOTH, { ip: '198.51.100.30', path: LOGIN_PATH, body: { username: 'budget-b' } });
      expect(two.guard.canActivate(two.context)).toBe(true);
      expect(two.headers[HTTP_HEADERS.XRateLimitRemaining]).toBe(0);
    });

    it('lets an anonymous request pass when neither principal is configured', () => {
      const { context, guard, response } = makeContext(CONFIG, { ip: '198.51.100.40', path: LOGIN_PATH });

      expect(guard.canActivate(context)).toBe(true);
      expect(response.setHeader).not.toHaveBeenCalled();
    });

    it('ignores a non-string username instead of counting it', () => {
      const { context, guard, response } = makeContext(BY_USERNAME, {
        ip: '198.51.100.50',
        path: LOGIN_PATH,
        body: { username: { toString: () => 'evil' } },
      });

      expect(guard.canActivate(context)).toBe(true);
      expect(response.setHeader).not.toHaveBeenCalled();
    });

    it('caps the username length, so a caller cannot mint unbounded cache keys', () => {
      const prefix = `capped-${'x'.repeat(MAX_THROTTLE_PRINCIPAL_LENGTH)}`;
      const attempt = (suffix: string) =>
        makeContext(BY_USERNAME, { ip: '198.51.100.70', path: LOGIN_PATH, body: { username: `${prefix}${suffix}` } });

      const first = attempt('-one');
      expect(first.guard.canActivate(first.context)).toBe(true);
      const second = attempt('-two');
      expect(second.guard.canActivate(second.context)).toBe(true);

      const third = attempt('-three');
      expect(() => third.guard.canActivate(third.context)).toThrow(CustomHttpException);
    });

    it('prefers the authenticated username over anything in the body', () => {
      const { context, guard } = makeContext(BY_BOTH, {
        user: { preferred_username: 'authenticated-one' },
        ip: '198.51.100.60',
        path: LOGIN_PATH,
        body: { username: 'claimed-other' },
      });

      expect(guard.canActivate(context)).toBe(true);

      const asOther = makeContext(BY_USERNAME, {
        ip: '198.51.100.61',
        path: LOGIN_PATH,
        body: { username: 'claimed-other' },
      });
      expect(asOther.guard.canActivate(asOther.context)).toBe(true);
      const asOtherAgain = makeContext(BY_USERNAME, {
        ip: '198.51.100.62',
        path: LOGIN_PATH,
        body: { username: 'claimed-other' },
      });
      expect(asOtherAgain.guard.canActivate(asOtherAgain.context)).toBe(true);
      const blocked = makeContext(BY_USERNAME, {
        ip: '198.51.100.63',
        path: LOGIN_PATH,
        body: { username: 'claimed-other' },
      });
      expect(() => blocked.guard.canActivate(blocked.context)).toThrow(CustomHttpException);
    });
  });
});
