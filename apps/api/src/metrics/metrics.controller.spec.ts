/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import MetricsController from './metrics.controller';
import MetricsService from './metrics.service';
import AdminGuard from '../common/guards/admin.guard';
import controllerContractReflection from '../common/controllerContractReflection';

const mockMetricsService = { getMetrics: jest.fn() };

describe(MetricsController.name, () => {
  let controller: MetricsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: MetricsService, useValue: mockMetricsService }],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('guards the metrics route with the AdminGuard', () => {
      expect(controllerContractReflection.getRouteGuards(MetricsController, 'getMetrics')).toContain(AdminGuard);
    });

    it('does not expose the metrics route publicly', () => {
      expect(controllerContractReflection.isRoutePublic(MetricsController, 'getMetrics')).toBe(false);
    });
  });
});
