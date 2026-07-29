/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type { AxiosInstance } from 'axios';
import { HttpStatus } from '@nestjs/common';
import { DirectoryFileDTO } from '@libs/filesharing/types/directoryFileDTO';
import CustomHttpException from '../common/CustomHttpException';
import WebdavService from './webdav.service';
import WebdavEtagConflictError from './errors/WebdavEtagConflictError';
import WebdavFileAlreadyExistsError from './errors/WebdavFileAlreadyExistsError';
import type UsersService from '../users/users.service';
import type WebdavSharesService from './shares/webdav-shares.service';

const buildService = () => {
  const request = jest.fn();
  const client = { request } as unknown as AxiosInstance;
  const webdavSharesService = {
    getWebdavShareFromCache: jest.fn().mockResolvedValue({ url: 'http://dav.example/', pathname: '/webdav/' }),
  };
  const service = new WebdavService(
    {} as unknown as UsersService,
    webdavSharesService as unknown as WebdavSharesService,
  );
  jest.spyOn(service, 'getClient').mockResolvedValue(client);
  return { service, request };
};

const axiosError = (status: number) => Object.assign(new Error('webdav error'), { isAxiosError: true, response: { status } });

describe('WebdavService.dropSelfReference', () => {
  it('drops the folder itself from PROPFIND entries but keeps children', () => {
    const entries = [
      { filePath: '/webdav/folder/' },
      { filePath: '/webdav/folder/child.md' },
    ] as DirectoryFileDTO[];

    const result = WebdavService.dropSelfReference(entries, 'http://dav.example/webdav/folder/');

    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe('/webdav/folder/child.md');
  });
});

describe('WebdavService.getFileContentWithRange', () => {
  it('reports truncated when the range covers less than the total size', async () => {
    const { service, request } = buildService();
    request.mockResolvedValueOnce({
      status: HttpStatus.PARTIAL_CONTENT,
      data: 'partial',
      headers: { etag: '"abc"', 'content-range': 'bytes 0-2047/10000' },
    });

    const result = await service.getFileContentWithRange('alice', '.wiki/page.md', 'MyShare', { rangeBytes: [0, 2047] });

    expect(result).toEqual({ content: 'partial', etag: '"abc"', mtime: 0, totalBytes: 10000, truncated: true });
  });

  it('maps a 404 to a NOT_FOUND CustomHttpException', async () => {
    expect.assertions(2);
    const { service, request } = buildService();
    request.mockRejectedValueOnce(axiosError(HttpStatus.NOT_FOUND));

    try {
      await service.getFileContentWithRange('alice', '.wiki/missing.md', 'MyShare');
    } catch (error) {
      expect(error).toBeInstanceOf(CustomHttpException);
      expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    }
  });
});

describe('WebdavService.putFileWithEtag', () => {
  it('throws WebdavEtagConflictError with the fresh server content on a 412 If-Match mismatch', async () => {
    expect.assertions(3);
    const { service, request } = buildService();
    request
      .mockResolvedValueOnce({ status: HttpStatus.PRECONDITION_FAILED, headers: {}, data: '' })
      .mockResolvedValueOnce({ status: HttpStatus.OK, data: 'server version', headers: { etag: '"server"' } });

    try {
      await service.putFileWithEtag('alice', '.wiki/page.md', 'MyShare', 'my content', { ifMatch: '"old"' });
    } catch (error) {
      expect(error).toBeInstanceOf(WebdavEtagConflictError);
      expect((error as WebdavEtagConflictError).currentEtag).toBe('"server"');
      expect((error as WebdavEtagConflictError).serverContent).toBe('server version');
    }
  });

  it('throws WebdavFileAlreadyExistsError on a 412 If-None-Match create conflict', async () => {
    expect.assertions(1);
    const { service, request } = buildService();
    request.mockResolvedValueOnce({ status: HttpStatus.PRECONDITION_FAILED, headers: {}, data: '' });

    try {
      await service.putFileWithEtag('alice', '.wiki/page.md', 'MyShare', 'my content', { ifNoneMatch: '*' });
    } catch (error) {
      expect(error).toBeInstanceOf(WebdavFileAlreadyExistsError);
    }
  });
});
