/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import MobileAppController from './mobileApp.controller';
import MobileAppService from './mobileApp.service';
import controllerContractReflection from '../common/controllerContractReflection';

const mockMobileAppService = {
  getAppUserData: jest.fn(),
  getTotpInfo: jest.fn(),
};

const MOBILE_APP_ROUTES = ['getAppUserData', 'getTotpInfo'];

describe(MobileAppController.name, () => {
  let controller: MobileAppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MobileAppController],
      providers: [{ provide: MobileAppService, useValue: mockMobileAppService }],
    }).compile();

    controller = module.get<MobileAppController>(MobileAppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('relies on the global auth guard only (no class guard)', () => {
      expect(controllerContractReflection.getClassGuards(MobileAppController)).toHaveLength(0);
    });

    it('keeps every route non-public and without an extra route guard', () => {
      MOBILE_APP_ROUTES.forEach((route) => {
        expect(controllerContractReflection.isRoutePublic(MobileAppController, route)).toBe(false);
        expect(controllerContractReflection.getRouteGuards(MobileAppController, route)).toHaveLength(0);
      });
    });
  });
});
