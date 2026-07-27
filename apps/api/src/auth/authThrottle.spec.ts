/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import THROTTLE_METADATA_KEY from '@libs/common/constants/throttleMetadataKey';
import { AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS } from '@libs/auth/constants/authThrottleConfig';
import type ThrottleConfig from '@libs/common/types/throttleConfig';
import ThrottleGuard from '../common/throttle/throttle.guard';
import AuthController from './auth.controller';

const reflector = new Reflector();

const readConfig = (method: keyof AuthController): ThrottleConfig | undefined =>
  reflector.get<ThrottleConfig>(THROTTLE_METADATA_KEY, AuthController.prototype[method] as never);

const buildContext = (ip: string) =>
  ({
    getHandler: () => AuthController.prototype.authenticate,
    getClass: () => AuthController,
    switchToHttp: () => ({
      getRequest: () => ({ ip, method: 'POST', path: '/auth', route: { path: '/auth' }, user: undefined }),
      getResponse: () => ({ setHeader: jest.fn() }),
    }),
  }) as unknown as ExecutionContext;

describe('public auth routes are throttled', () => {
  it.each([['authenticate'], ['getTotpInfo']] as const)('configures a throttle on %s', (method) => {
    const config = readConfig(method);

    expect(config).toBeDefined();
    expect(config?.limit).toBe(AUTH_THROTTLE_LIMIT);
    expect(config?.ttl).toBe(AUTH_THROTTLE_TTL_MS);
  });

  it('also throttles the login by username, so spraying from rotating addresses is bounded', () => {
    const config = readConfig('authenticate');

    expect(config?.byUsername).toBe(true);
    expect(config?.byIp).toBe(true);
  });

  it('blocks the same username after the limit even when every attempt comes from a new address', () => {
    const guard = new ThrottleGuard(reflector);
    const attempt = (ip: string) =>
      ({
        getHandler: () => AuthController.prototype.authenticate,
        getClass: () => AuthController,
        switchToHttp: () => ({
          getRequest: () => ({
            ip,
            method: 'POST',
            path: '/auth',
            route: { path: '/auth' },
            user: undefined,
            body: { username: 'sprayed-account' },
          }),
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
      }) as unknown as ExecutionContext;

    for (let i = 0; i < AUTH_THROTTLE_LIMIT; i += 1) {
      expect(guard.canActivate(attempt(`203.0.113.${100 + i}`))).toBe(true);
    }

    expect(() => guard.canActivate(attempt('203.0.113.200'))).toThrow();
  });

  it('throttles by IP, without which anonymous callers would pass unthrottled', () => {
    // The guard returns true immediately for anonymous requests unless byIp is set,
    // so byIp is what makes the login throttle effective at all.
    expect(readConfig('authenticate')?.byIp).toBe(true);
    expect(readConfig('getTotpInfo')?.byIp).toBe(true);
  });

  it('blocks an anonymous caller once the limit is exceeded', () => {
    const guard = new ThrottleGuard(reflector);
    const context = buildContext('203.0.113.9');

    for (let i = 0; i < AUTH_THROTTLE_LIMIT; i += 1) {
      expect(guard.canActivate(context)).toBe(true);
    }

    expect(() => guard.canActivate(context)).toThrow();
  });

  it('keeps a different source IP unaffected', () => {
    const guard = new ThrottleGuard(reflector);
    const noisy = buildContext('203.0.113.10');

    for (let i = 0; i < AUTH_THROTTLE_LIMIT; i += 1) {
      guard.canActivate(noisy);
    }

    expect(guard.canActivate(buildContext('203.0.113.11'))).toBe(true);
  });
});
