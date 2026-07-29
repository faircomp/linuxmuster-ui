/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PIPES_METADATA } from '@nestjs/common/constants';
import THROTTLE_METADATA_KEY from '@libs/common/constants/throttleMetadataKey';
import { AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS } from '@libs/auth/constants/authThrottleConfig';
import type ThrottleConfig from '@libs/common/types/throttleConfig';
import AuthenticateRequestDto from '@libs/auth/types/authenticateRequest.dto';
import TotpSetupBodyDto from '@libs/auth/types/totpSetupBody.dto';
import LogoutRequestDto from '@libs/auth/types/logoutRequest.dto';
import LoginQrSseDto from '@libs/auth/types/loginQrSse.dto';
import {
  QR_LOGIN_COOKIE_PATH,
  QR_LOGIN_SESSION_TTL_MS,
  QR_LOGIN_TOKEN_COOKIE_PREFIX,
} from '@libs/auth/constants/qrLoginSessionConfig';
import controllerContractReflection from '../common/controllerContractReflection';
import AuthService from './auth.service';
import AuthController from './auth.controller';
import strictValidationPipe from '../common/pipes/strictValidationPipe';
import whitelistValidationPipe from '../common/pipes/whitelistValidationPipe';
import ThrottleGuard from '../common/throttle/throttle.guard';

const mockAuthService = {
  authconfig: jest.fn(),
  authenticateUser: jest.fn(),
  getQrCode: jest.fn(),
  setupTotp: jest.fn(),
  disableTotp: jest.fn(),
  disableTotpForUser: jest.fn(),
  loginViaApp: jest.fn(),
  logout: jest.fn(),
  createQrLoginSession: jest.fn(),
};

const PUBLIC_ROUTES = ['authconfig', 'authenticate', 'createQrLoginSession', 'loginViaApp', 'logout'];
const PROTECTED_ROUTES = ['getQrCode', 'setupTotp', 'disableTotp', 'disableTotpForUser'];

describe(AuthController.name, () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CACHE_MANAGER, useValue: { get: jest.fn(), set: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('logout route', () => {
    it('delegates the refresh token and the bearer session to the service', async () => {
      const session = { preferred_username: 'alice', sid: 'session-id' } as never;

      await controller.logout({ refresh_token: 'a-refresh-token' }, session);

      expect(mockAuthService.logout).toHaveBeenCalledWith('a-refresh-token', session);
    });

    it('is throttled by ip, without which an anonymous caller could hammer keycloak', () => {
      const config = new Reflector().get<ThrottleConfig>(
        THROTTLE_METADATA_KEY,
        AuthController.prototype.logout as never,
      );

      expect(config?.limit).toBe(AUTH_THROTTLE_LIMIT);
      expect(config?.ttl).toBe(AUTH_THROTTLE_TTL_MS);
      expect(config?.byIp).toBe(true);
      expect(controllerContractReflection.getRouteGuards(AuthController, 'logout')).toContain(ThrottleGuard);
    });
  });

  describe('body validation contract', () => {
    it.each([
      ['authenticate', whitelistValidationPipe],
      ['setupTotp', strictValidationPipe],
      ['logout', strictValidationPipe],
    ] as const)('runs %s through the expected validation pipe', (route, expected) => {
      const pipes = Reflect.getMetadata(PIPES_METADATA, AuthController.prototype[route] as never) as unknown[];

      expect(pipes).toContain(expected);
    });

    it.each([
      ['authenticate', 0, AuthenticateRequestDto],
      ['setupTotp', 1, TotpSetupBodyDto],
      ['logout', 0, LogoutRequestDto],
      ['loginViaApp', 0, LoginQrSseDto],
    ] as const)('binds the %s body to its dto, which validation silently skips otherwise', (route, index, dto) => {
      const paramTypes = Reflect.getMetadata('design:paramtypes', AuthController.prototype, route) as unknown[];

      expect(paramTypes[index]).toBe(dto);
    });

    it.each([
      ['loginViaApp', { username: 'alice', password: 'geheim' }, false],
      ['loginViaApp', { username: 'alice', password: 'geheim', deviceId: 'x' }, true],
      ['loginViaApp', { username: '', password: 'geheim' }, true],
    ] as const)(
      'validates the %s body against the metatype the runtime actually sees',
      async (route, body, rejects) => {
        const [metatype] = Reflect.getMetadata('design:paramtypes', AuthController.prototype, route) as unknown[];
        const validated = strictValidationPipe.transform(body, { type: 'body', metatype: metatype as never });

        await (rejects ? expect(validated).rejects.toThrow() : expect(validated).resolves.toBeDefined());
      },
    );

    it('keeps the login on the stripping pipe, since a rejecting one would break every login', () => {
      const pipes = Reflect.getMetadata(PIPES_METADATA, AuthController.prototype.authenticate as never) as unknown[];

      expect(pipes).not.toContain(strictValidationPipe);
    });
  });

  describe('qr login session route', () => {
    const SESSION = { sessionId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', subscriberToken: 'a'.repeat(64) };

    const buildResponse = () => ({ cookie: jest.fn() });

    beforeEach(() => {
      mockAuthService.createQrLoginSession.mockResolvedValue(SESSION);
    });

    it('never puts the subscriber token in the body, only in the cookie', async () => {
      const res = buildResponse();

      const result = await controller.createQrLoginSession(res as never);

      expect(result).toEqual({ sessionId: SESSION.sessionId });
      expect(JSON.stringify(result)).not.toContain(SESSION.subscriberToken);
    });

    it('binds the cookie to the sse path and keeps it away from scripts and other sites', async () => {
      const res = buildResponse();

      await controller.createQrLoginSession(res as never);

      const [name, value, options] = res.cookie.mock.calls[0] as [string, string, Record<string, unknown>];
      expect(name).toBe(`${QR_LOGIN_TOKEN_COOKIE_PREFIX}${SESSION.sessionId}`);
      expect(value).toBe(SESSION.subscriberToken);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.path).toBe(QR_LOGIN_COOKIE_PATH);
      expect(options.maxAge).toBe(QR_LOGIN_SESSION_TTL_MS);
    });

    it('is throttled by ip, since it hands out a session to anyone who asks', () => {
      const config = new Reflector().get<ThrottleConfig>(
        THROTTLE_METADATA_KEY,
        AuthController.prototype.createQrLoginSession as never,
      );

      expect(config?.byIp).toBe(true);
      expect(controllerContractReflection.getRouteGuards(AuthController, 'createQrLoginSession')).toContain(
        ThrottleGuard,
      );
    });
  });

  describe('auth bypass contract', () => {
    it('opts exactly the expected routes out of authentication via @Public', () => {
      PUBLIC_ROUTES.forEach((route) => {
        expect(controllerContractReflection.isRoutePublic(AuthController, route)).toBe(true);
      });
    });

    it('keeps the sensitive TOTP/QR routes protected by the global auth guard', () => {
      PROTECTED_ROUTES.forEach((route) => {
        expect(controllerContractReflection.isRoutePublic(AuthController, route)).toBe(false);
      });
    });

    it('has no public route beyond the listed ones, so a new handler cannot slip past unnoticed', () => {
      const allRoutes = Object.getOwnPropertyNames(AuthController.prototype).filter((name) => name !== 'constructor');
      const publicRoutes = allRoutes.filter((route) =>
        controllerContractReflection.isRoutePublic(AuthController, route),
      );

      expect(publicRoutes.sort()).toEqual([...PUBLIC_ROUTES].sort());
    });

    it('covers every handler between the two lists, so neither can go stale', () => {
      const allRoutes = Object.getOwnPropertyNames(AuthController.prototype).filter((name) => name !== 'constructor');

      expect(allRoutes.sort()).toEqual([...PUBLIC_ROUTES, ...PROTECTED_ROUTES].sort());
    });
  });
});
