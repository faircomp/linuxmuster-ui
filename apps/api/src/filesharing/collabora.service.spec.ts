/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { BadRequestException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import CollaboraService from './collabora.service';
import CustomHttpException from '../common/CustomHttpException';

const WOPI_SECRET = 'test-wopi-secret';

const buildAppConfig = (secret?: string) => ({
  extendedOptions: secret ? { [ExtendedOptionKeys.COLLABORA_WOPI_SECRET]: secret } : {},
});

describe('CollaboraService', () => {
  let service: CollaboraService;
  const mockAppConfigService = { getAppConfigByName: jest.fn() };
  const mockWebdavService = { getClient: jest.fn() };
  const mockWebdavSharesService = { getWebdavShareFromCache: jest.fn() };
  const jwtService = new JwtService({});

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CollaboraService(
      mockAppConfigService as never,
      jwtService,
      mockWebdavService as never,
      mockWebdavSharesService as never,
    );
    mockAppConfigService.getAppConfigByName.mockResolvedValue(buildAppConfig(WOPI_SECRET));
  });

  describe('generateWopiToken / validateWopiToken', () => {
    it('produces a token that validates back to the original payload', async () => {
      const { accessToken, accessTokenTTL } = await service.generateWopiToken(
        'jane',
        '/webdav/doc.odt',
        'share-1',
        true,
      );

      expect(typeof accessToken).toBe('string');
      expect(accessTokenTTL).toBeGreaterThan(Date.now());

      const payload = await service.validateWopiToken(accessToken);
      expect(payload).toMatchObject({
        username: 'jane',
        filePath: '/webdav/doc.odt',
        share: 'share-1',
        canWrite: true,
      });
      expect(payload.jti).toBeTruthy();
      expect(payload.origin).toBeTruthy();
    });

    it('rejects a file path containing a parent segment', async () => {
      await expect(service.generateWopiToken('jane', '/webdav/../secret', 'share-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('getWopiSecret', () => {
    it('throws a server-error CustomHttpException when the secret is not configured', async () => {
      expect.assertions(2);
      mockAppConfigService.getAppConfigByName.mockResolvedValue(buildAppConfig());

      try {
        await service.getWopiSecret();
      } catch (error) {
        expect(error).toBeInstanceOf(CustomHttpException);
        expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  });

  describe('validateWopiToken', () => {
    it('throws an unauthorized CustomHttpException for a tampered token', async () => {
      expect.assertions(2);

      try {
        await service.validateWopiToken('not-a-valid-token');
      } catch (error) {
        expect(error).toBeInstanceOf(CustomHttpException);
        expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }
    });
  });
});
