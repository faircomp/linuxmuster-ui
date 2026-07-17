/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import CustomHttpException from '../common/CustomHttpException';
import WikiFolderService from './wiki-folder.service';
import type WebdavService from '../webdav/webdav.service';
import type WebdavSharesService from '../webdav/shares/webdav-shares.service';

const buildService = () => {
  const webdavService = {
    probeFolder: jest.fn(),
    createFolder: jest.fn().mockResolvedValue(undefined),
    deletePath: jest.fn().mockResolvedValue(undefined),
  };
  const webdavSharesService = {
    findAllWikiShares: jest.fn().mockResolvedValue([{ displayName: 'MyShare', url: 'http://dav.example/' }]),
  };
  const service = new WikiFolderService(
    webdavService as unknown as WebdavService,
    webdavSharesService as unknown as WebdavSharesService,
  );
  return { service, webdavService };
};

const expectStatus = async (promise: Promise<unknown>, status: HttpStatus) => {
  expect.assertions(2);
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(CustomHttpException);
    expect((error as CustomHttpException).getStatus()).toBe(status);
  }
};

describe('WikiFolderService.createFolder', () => {
  it('creates a new folder and returns its frontend path', async () => {
    const { service, webdavService } = buildService();
    webdavService.probeFolder.mockResolvedValue(null);

    const result = await service.createFolder('alice', ['/teachers'], 'MyShare', 'NewFolder');

    expect(webdavService.createFolder).toHaveBeenCalledWith('alice', '/', 'NewFolder', 'MyShare');
    expect(result).toEqual({ path: 'MyShare/NewFolder' });
  });

  it('rejects an existing folder with 409', async () => {
    const { service, webdavService } = buildService();
    webdavService.probeFolder.mockResolvedValue([]);

    await expectStatus(service.createFolder('alice', ['/teachers'], 'MyShare', 'NewFolder'), HttpStatus.CONFLICT);
  });

  it('rejects a reserved name with 400', async () => {
    const { service } = buildService();

    await expectStatus(service.createFolder('alice', ['/teachers'], 'MyShare', '.wiki'), HttpStatus.BAD_REQUEST);
  });
});

describe('WikiFolderService.deleteFolder', () => {
  it('deletes an existing folder recursively', async () => {
    const { service, webdavService } = buildService();
    webdavService.probeFolder.mockResolvedValue([]);

    await service.deleteFolder('alice', ['/teachers'], 'MyShare/subfolder');

    expect(webdavService.deletePath).toHaveBeenCalledWith('alice', 'subfolder', 'MyShare');
  });

  it('maps a non-existent folder to 404', async () => {
    const { service, webdavService } = buildService();
    webdavService.probeFolder.mockResolvedValue(null);

    await expectStatus(service.deleteFolder('alice', ['/teachers'], 'MyShare/gone'), HttpStatus.NOT_FOUND);
  });

  it('rejects deleting the share root (empty relative path) with 400', async () => {
    const { service } = buildService();

    await expectStatus(service.deleteFolder('alice', ['/teachers'], 'MyShare'), HttpStatus.BAD_REQUEST);
  });
});
