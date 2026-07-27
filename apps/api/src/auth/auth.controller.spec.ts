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
import controllerContractReflection from '../common/controllerContractReflection';
import AuthService from './auth.service';
import AuthController from './auth.controller';
import strictValidationPipe from '../common/pipes/strictValidationPipe';
import ThrottleGuard from '../common/throttle/throttle.guard';

const mockAuthService = {
  authconfig: jest.fn(),
  authenticateUser: jest.fn(),
  getQrCode: jest.fn(),
  setupTotp: jest.fn(),
  getTotpInfo: jest.fn(),
  disableTotp: jest.fn(),
  disableTotpForUser: jest.fn(),
  loginViaApp: jest.fn(),
  logout: jest.fn(),
};

const PUBLIC_ROUTES = ['authconfig', 'authenticate', 'getTotpInfo', 'loginViaApp', 'logout'];
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

    it('validates its body, so the route cannot be called without a refresh token', () => {
      const pipes = Reflect.getMetadata(PIPES_METADATA, AuthController.prototype.logout as never) as unknown[];

      expect(pipes).toHaveLength(1);
      expect(pipes[0]).toBe(strictValidationPipe);
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
  });
});
