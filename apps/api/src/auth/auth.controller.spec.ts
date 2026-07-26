/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import AuthController from './auth.controller';
import AuthService from './auth.service';
import controllerContractReflection from '../common/controllerContractReflection';

const mockAuthService = {
  authconfig: jest.fn(),
  authenticateUser: jest.fn(),
  getQrCode: jest.fn(),
  setupTotp: jest.fn(),
  getTotpInfo: jest.fn(),
  disableTotp: jest.fn(),
  disableTotpForUser: jest.fn(),
  loginViaApp: jest.fn(),
};

const PUBLIC_ROUTES = ['authconfig', 'authenticate', 'getTotpInfo', 'loginViaApp'];
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
