/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import CustomHttpException from '../common/CustomHttpException';
import WikiPageService from './wiki-page.service';
import WebdavEtagConflictError from '../webdav/errors/WebdavEtagConflictError';
import WebdavFileAlreadyExistsError from '../webdav/errors/WebdavFileAlreadyExistsError';
import type WebdavService from '../webdav/webdav.service';
import type WebdavSharesService from '../webdav/shares/webdav-shares.service';

const buildService = () => {
  const webdavService = {
    getFileContentWithRange: jest.fn(),
    putFileWithEtag: jest.fn(),
    probeFile: jest.fn(),
    probeFolder: jest.fn().mockResolvedValue([]),
    createFolder: jest.fn().mockResolvedValue(undefined),
    deletePath: jest.fn(),
  };
  const webdavSharesService = {
    findAllWikiShares: jest.fn().mockResolvedValue([{ displayName: 'MyShare', url: 'http://dav.example/' }]),
  };
  const service = new WikiPageService(
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

describe('WikiPageService', () => {
  it('createPage slugifies the title, seeds an H1, and writes with If-None-Match', async () => {
    const { service, webdavService } = buildService();
    webdavService.putFileWithEtag.mockResolvedValue({ etag: '"new"', mtime: 123 });

    const result = await service.createPage('alice', ['/teachers'], 'MyShare', 'My New Page');

    expect(webdavService.putFileWithEtag).toHaveBeenCalledWith(
      'alice',
      '.wiki/My-New-Page.md',
      'MyShare',
      '# My New Page\n\n',
      { ifNoneMatch: '*' },
    );
    expect(result).toEqual(
      expect.objectContaining({ title: 'My New Page', content: '# My New Page\n\n', etag: '"new"', isIndex: false }),
    );
    expect(webdavService.createFolder).not.toHaveBeenCalled();
  });

  it('createPage creates the .wiki folder when it does not yet exist', async () => {
    const { service, webdavService } = buildService();
    webdavService.probeFolder.mockResolvedValue(null);
    webdavService.putFileWithEtag.mockResolvedValue({ etag: '"new"', mtime: 1 });

    await service.createPage('alice', ['/teachers'], 'MyShare', 'My New Page');

    expect(webdavService.createFolder).toHaveBeenCalledTimes(1);
    expect(webdavService.putFileWithEtag).toHaveBeenCalledTimes(1);
  });

  it('createPage maps an existing file to 409', async () => {
    const { service, webdavService } = buildService();
    webdavService.putFileWithEtag.mockRejectedValue(new WebdavFileAlreadyExistsError('.wiki/My-New-Page.md'));

    await expectStatus(service.createPage('alice', ['/teachers'], 'MyShare', 'My New Page'), HttpStatus.CONFLICT);
  });

  it('updatePage requires an ETag (428 Precondition Required)', async () => {
    const { service } = buildService();

    await expectStatus(
      service.updatePage('alice', ['/teachers'], 'MyShare/page', 'new content', undefined),
      HttpStatus.PRECONDITION_REQUIRED,
    );
  });

  it('updatePage propagates a WebdavEtagConflictError from the store', async () => {
    expect.assertions(1);
    const { service, webdavService } = buildService();
    webdavService.probeFile.mockResolvedValue({ etag: '"x"', lastModified: '' });
    webdavService.putFileWithEtag.mockRejectedValue(
      new WebdavEtagConflictError({ currentEtag: '"server"', serverContent: 'server body' }),
    );

    try {
      await service.updatePage('alice', ['/teachers'], 'MyShare/page', 'new content', '"old"');
    } catch (error) {
      expect(error).toBeInstanceOf(WebdavEtagConflictError);
    }
  });

  it('getPage rejects pages larger than the size cap with 413', async () => {
    const { service, webdavService } = buildService();
    webdavService.probeFile.mockResolvedValue({ etag: '"x"', lastModified: '' });
    webdavService.getFileContentWithRange.mockResolvedValue({
      content: 'partial',
      etag: '"x"',
      mtime: 0,
      truncated: true,
      totalBytes: 99_999_999,
    });

    await expectStatus(service.getPage('alice', ['/teachers'], 'MyShare/big'), HttpStatus.PAYLOAD_TOO_LARGE);
  });
});
