/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import FileSharingErrorMessage from '@libs/filesharing/types/fileSharingErrorMessage';
import WopiController from './wopi.controller';
import CustomHttpException from '../common/CustomHttpException';
import controllerContractReflection from '../common/controllerContractReflection';

const buildTokenData = (canWrite: boolean) => ({
  username: 'jane',
  filePath: '/webdav/doc.odt',
  share: 'share-1',
  canWrite,
  origin: 'http://localhost',
  jti: 'jti-1',
});

const buildResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
    end: jest.fn(),
    headersSent: false,
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('WopiController', () => {
  let controller: WopiController;
  const mockCollaboraService = { validateWopiToken: jest.fn(), getFileStat: jest.fn() };
  const mockWebdavService = { getClient: jest.fn(), uploadFile: jest.fn() };
  const mockWebdavSharesService = { getWebdavShareFromCache: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WopiController(
      mockCollaboraService as never,
      mockWebdavService as never,
      mockWebdavSharesService as never,
    );
  });

  describe('auth contract', () => {
    it('marks every WOPI route as public (token auth only)', () => {
      ['checkFileInfo', 'getFile', 'putFile'].forEach((route) => {
        expect(controllerContractReflection.isRoutePublic(WopiController, route)).toBe(true);
      });
    });
  });

  describe('checkFileInfo', () => {
    it('returns the WOPI CheckFileInfo payload for a valid token', async () => {
      mockCollaboraService.validateWopiToken.mockResolvedValue(buildTokenData(true));
      mockCollaboraService.getFileStat.mockResolvedValue({
        filename: 'doc.odt',
        etag: 'etag-1',
        size: 123,
        lastmod: '2026-01-01T00:00:00Z',
      });
      const res = buildResponse();

      await controller.checkFileInfo('file-1', 'valid-token', res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ BaseFileName: 'doc.odt', Size: 123, UserId: 'jane', UserCanWrite: true }),
      );
    });

    it('propagates the unauthorized error for an invalid token', async () => {
      mockCollaboraService.validateWopiToken.mockRejectedValue(
        new CustomHttpException(FileSharingErrorMessage.WopiTokenInvalid, HttpStatus.UNAUTHORIZED),
      );
      const res = buildResponse();

      await expect(controller.checkFileInfo('file-1', 'bad', res as unknown as Response)).rejects.toBeInstanceOf(
        CustomHttpException,
      );
    });
  });

  describe('putFile', () => {
    it('forbids writing with a read-only token', async () => {
      mockCollaboraService.validateWopiToken.mockResolvedValue(buildTokenData(false));
      const res = buildResponse();

      await controller.putFile('valid-token', {} as unknown as Request, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockWebdavService.uploadFile).not.toHaveBeenCalled();
    });

    it('uploads the request stream and returns the last modified time for a writable token', async () => {
      mockCollaboraService.validateWopiToken.mockResolvedValue(buildTokenData(true));
      mockWebdavSharesService.getWebdavShareFromCache.mockResolvedValue({ url: 'https://dav', pathname: '/webdav/' });
      mockWebdavService.uploadFile.mockResolvedValue(undefined);
      const req = { headers: {} } as unknown as Request;
      const res = buildResponse();

      await controller.putFile('valid-token', req, res as unknown as Response);

      expect(mockWebdavService.uploadFile).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });
});
