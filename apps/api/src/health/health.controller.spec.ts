/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import HealthController from './health.controller';
import HealthService from './health.service';
import LocalhostGuard from '../common/guards/localhost.guard';
import controllerContractReflection from '../common/controllerContractReflection';

const mockHealthService = {
  checkEduApiResponding: jest.fn(),
  checkEduApiHealth: jest.fn(),
  getEduApiStats: jest.fn(),
};

describe(HealthController.name, () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('exposes the readiness route publicly behind the LocalhostGuard', () => {
      expect(controllerContractReflection.isRoutePublic(HealthController, 'readiness')).toBe(true);
      expect(controllerContractReflection.getRouteGuards(HealthController, 'readiness')).toContain(LocalhostGuard);
    });

    it('keeps the check and stats routes non-public', () => {
      expect(controllerContractReflection.isRoutePublic(HealthController, 'check')).toBe(false);
      expect(controllerContractReflection.isRoutePublic(HealthController, 'getStats')).toBe(false);
    });
  });
});
