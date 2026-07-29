/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * SPDX-FileCopyrightText: 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  DiskHealthIndicator,
  HealthCheckService,
  HttpHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import HealthService from './health.service';
import WebdavSharesService from '../webdav/shares/webdav-shares.service';

const BUILD_INFO = {
  version: '2.0.0',
  commitSha: 'deadbeef',
  buildDate: '2026-07-16',
  buildNumber: '42',
};

const mockConfigService = {
  get: jest.fn((key: keyof typeof BUILD_INFO) => BUILD_INFO[key]),
};

describe(HealthService.name, () => {
  let service: HealthService;
  let healthCheck: jest.Mock;

  beforeEach(async () => {
    healthCheck = jest.fn().mockResolvedValue({ status: 'ok', info: {}, error: {}, details: {} });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: HealthCheckService, useValue: { check: healthCheck } },
        { provide: MongooseHealthIndicator, useValue: { pingCheck: jest.fn() } },
        { provide: HttpHealthIndicator, useValue: { pingCheck: jest.fn() } },
        { provide: DiskHealthIndicator, useValue: { checkStorage: jest.fn() } },
        { provide: HttpService, useValue: {} },
        { provide: WebdavSharesService, useValue: { findAllWebdavServers: jest.fn(), updateWebdavShare: jest.fn() } },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('build metadata', () => {
    it('enriches checkEduApiResponding with the four build-metadata fields', async () => {
      const result = await service.checkEduApiResponding();
      expect(result).toMatchObject({
        status: 'ok',
        version: '2.0.0',
        commitSha: 'deadbeef',
        buildDate: '2026-07-16',
        buildNumber: '42',
      });
    });

    it('enriches checkEduApiHealth and getEduApiStats too', async () => {
      expect(await service.checkEduApiHealth()).toMatchObject({ commitSha: 'deadbeef', buildNumber: '42' });
      expect(await service.getEduApiStats()).toMatchObject({ commitSha: 'deadbeef', buildNumber: '42' });
    });
  });

  describe('getThresholdPercent (module-scoped EDUI_DISK_SPACE_THRESHOLD)', () => {
    const originalThreshold = process.env.EDUI_DISK_SPACE_THRESHOLD;

    afterAll(() => {
      if (originalThreshold === undefined) {
        delete process.env.EDUI_DISK_SPACE_THRESHOLD;
      } else {
        process.env.EDUI_DISK_SPACE_THRESHOLD = originalThreshold;
      }
    });

    const thresholdWith = (value?: string): number => {
      let result = 0;
      jest.isolateModules(() => {
        if (value === undefined) {
          delete process.env.EDUI_DISK_SPACE_THRESHOLD;
        } else {
          process.env.EDUI_DISK_SPACE_THRESHOLD = value;
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        const reloadedModule = require('./health.service') as { default: { getThresholdPercent(): number } };
        result = reloadedModule.default.getThresholdPercent();
      });
      return result;
    };

    it('accepts a valid ratio', () => {
      expect(thresholdWith('0.8')).toBe(0.8);
    });

    it('falls back to 0.95 for out-of-range and non-numeric values', () => {
      expect(thresholdWith('-0.1')).toBe(0.95);
      expect(thresholdWith('1.5')).toBe(0.95);
      expect(thresholdWith('abc')).toBe(0.95);
      expect(thresholdWith(undefined)).toBe(0.95);
    });
  });
});
