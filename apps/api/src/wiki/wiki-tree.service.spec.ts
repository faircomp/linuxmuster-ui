/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ContentType from '@libs/filesharing/types/contentType';
import { WIKI_NODE_TYPE } from '@libs/wiki/constants/wikiNodeType';
import type { DirectoryFileDTO } from '@libs/filesharing/types/directoryFileDTO';
import WikiTreeService from './wiki-tree.service';
import type WebdavService from '../webdav/webdav.service';
import type WebdavSharesService from '../webdav/shares/webdav-shares.service';

const entry = (filename: string, type: ContentType, lastmod?: string): DirectoryFileDTO =>
  ({ filename, type, lastmod, filePath: '', etag: '' }) as DirectoryFileDTO;

const buildService = () => {
  const webdavService = {
    getFilesAtPath: jest.fn(),
    probeFolder: jest.fn(),
    probeFile: jest.fn(),
    getFileContentWithRange: jest.fn(),
  };
  const webdavSharesService = {
    findAllWikiShares: jest.fn().mockResolvedValue([{ displayName: 'MyShare', url: 'http://dav.example/' }]),
  };
  const service = new WikiTreeService(
    webdavService as unknown as WebdavService,
    webdavSharesService as unknown as WebdavSharesService,
  );
  return { service, webdavService };
};

describe('WikiTreeService.listChildren', () => {
  it('merges folders (with hasIndex) and pages (with titles), hides .wiki, and sorts folders before pages', async () => {
    const { service, webdavService } = buildService();
    webdavService.getFilesAtPath.mockResolvedValue([
      entry('subfolder', ContentType.DIRECTORY, 'Mon, 01 Jan 2026 00:00:00 GMT'),
      entry('.wiki', ContentType.DIRECTORY),
    ]);
    webdavService.probeFolder.mockResolvedValue([
      entry('page1.md', ContentType.FILE, 'Mon, 01 Jan 2026 00:00:00 GMT'),
      entry('index.md', ContentType.FILE),
    ]);
    webdavService.probeFile.mockResolvedValue({ etag: '"idx"', lastModified: 'Mon, 01 Jan 2026 00:00:00 GMT' });
    webdavService.getFileContentWithRange.mockImplementation((_username: string, relativePath: string) =>
      Promise.resolve({
        content: relativePath.includes('subfolder') ? '# Sub Index' : '# Page One',
        etag: '',
        mtime: 0,
        totalBytes: null,
        truncated: false,
      }),
    );

    const result = await service.listChildren('alice', ['/teachers'], 'MyShare');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({ type: WIKI_NODE_TYPE.FOLDER, name: 'Sub Index', hasIndex: true }),
    );
    expect(result[1]).toEqual(expect.objectContaining({ type: WIKI_NODE_TYPE.PAGE, name: 'Page One' }));
    expect(result.some((child) => child.name === '.wiki')).toBe(false);
  });

  it('reports hasIndex false when the folder has no index page', async () => {
    const { service, webdavService } = buildService();
    webdavService.getFilesAtPath.mockResolvedValue([entry('subfolder', ContentType.DIRECTORY, 'lastmod')]);
    webdavService.probeFolder.mockResolvedValue([]);
    webdavService.probeFile.mockResolvedValue(null);

    const result = await service.listChildren('alice', ['/teachers'], 'MyShare');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ type: WIKI_NODE_TYPE.FOLDER, name: 'subfolder', hasIndex: false }),
    );
  });
});
