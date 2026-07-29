/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import LicenseController from './license.controller';
import LicenseService from './license.service';
import AdminGuard from '../common/guards/admin.guard';
import controllerContractReflection from '../common/controllerContractReflection';

const mockLicenseService = {
  getLicenseDetails: jest.fn(),
  signLicense: jest.fn(),
};

describe(LicenseController.name, () => {
  let controller: LicenseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LicenseController],
      providers: [
        { provide: LicenseService, useValue: mockLicenseService },
        { provide: CACHE_MANAGER, useValue: { get: jest.fn(), set: jest.fn() } },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LicenseController>(LicenseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('guards license signing with the AdminGuard', () => {
      expect(controllerContractReflection.getRouteGuards(LicenseController, 'signLicense')).toContain(AdminGuard);
    });

    it('leaves the cached license read without an AdminGuard and non-public', () => {
      expect(controllerContractReflection.getRouteGuards(LicenseController, 'getLicense')).not.toContain(AdminGuard);
      expect(controllerContractReflection.isRoutePublic(LicenseController, 'getLicense')).toBe(false);
    });
  });
});
