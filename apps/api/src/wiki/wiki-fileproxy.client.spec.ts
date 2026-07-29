/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { of, throwError } from 'rxjs';
import type { HttpService } from '@nestjs/axios';
import type WikiSearchRequestDto from '@libs/wiki/types/wikiSearchRequestDto';
import WikiFileproxyClient from './wiki-fileproxy.client';
import WikiFileproxySearchError from './errors/WikiFileproxySearchError';
import type UsersService from '../users/users.service';

const req = (query: string): WikiSearchRequestDto => ({ query, scope: 'all', page: 0, size: 10 }) as WikiSearchRequestDto;

const buildClient = () => {
  const httpService = { request: jest.fn() };
  const usersService = { getPassword: jest.fn().mockResolvedValue('secret') };
  const client = new WikiFileproxyClient(
    httpService as unknown as HttpService,
    usersService as unknown as UsersService,
  );
  return { client, httpService };
};

describe('WikiFileproxyClient.search', () => {
  it('short-circuits to an empty OK result when the user has no groups', async () => {
    const { client, httpService } = buildClient();

    const result = await client.search('http://fp.example/', req('term'), [], 'alice');

    expect(result).toEqual({ hits: [], total: 0, status: 'ok' });
    expect(httpService.request).not.toHaveBeenCalled();
  });

  it('normalizes fileproxy hits (share_id -> shareId, snippet/sort defaults)', async () => {
    const { client, httpService } = buildClient();
    httpService.request.mockReturnValue(
      of({
        data: {
          hits: [
            { path: 'MyShare/page', share_id: 'MyShare', title: 'Page', score: 1.5, mtime: 100, snippets: ['a'], sort: [1] },
          ],
          total: 1,
          status: 'ok',
        },
      }),
    );

    const result = await client.search('http://fp.example/', req('term'), ['/teachers'], 'alice');

    expect(result.total).toBe(1);
    expect(result.hits[0]).toEqual({
      path: 'MyShare/page',
      shareId: 'MyShare',
      title: 'Page',
      snippets: ['a'],
      score: 1.5,
      mtime: 100,
      sort: [1],
    });
  });

  it('classifies an aborted request as a timeout WikiFileproxySearchError', async () => {
    expect.assertions(1);
    const { client, httpService } = buildClient();
    httpService.request.mockReturnValue(throwError(() => ({ code: 'ECONNABORTED', message: 'timeout of 8000ms exceeded' })));

    try {
      await client.search('http://fp.example/', req('term'), ['/teachers'], 'alice');
    } catch (error) {
      expect((error as WikiFileproxySearchError).reason).toBe('timeout');
    }
  });

  it('classifies a 5xx response as http_5xx', async () => {
    expect.assertions(2);
    const { client, httpService } = buildClient();
    httpService.request.mockReturnValue(throwError(() => ({ response: { status: 503 }, message: 'server error' })));

    try {
      await client.search('http://fp.example/', req('term'), ['/teachers'], 'alice');
    } catch (error) {
      expect(error).toBeInstanceOf(WikiFileproxySearchError);
      expect((error as WikiFileproxySearchError).reason).toBe('http_5xx');
    }
  });

  it('rejects a group token containing a comma before any request (header-injection guard)', async () => {
    expect.assertions(2);
    const { client, httpService } = buildClient();

    try {
      await client.search('http://fp.example/', req('term'), ['legit,injected'], 'alice');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(httpService.request).not.toHaveBeenCalled();
    }
  });
});

describe('WikiFileproxyClient.listByPrefix', () => {
  it('builds a title cache from the fileproxy rows', async () => {
    const { client, httpService } = buildClient();
    httpService.request.mockReturnValue(of({ data: [{ path: '/shares/MyShare/page.md', title: 'Page', mtime: 100 }] }));

    const map = await client.listByPrefix('http://fp.example/', '/shares/MyShare/', ['/teachers'], 'alice');

    expect(map.get('/shares/MyShare/page.md')).toEqual({ title: 'Page', mtime: 100 });
  });

  it('degrades to an empty cache on error (soft failure)', async () => {
    const { client, httpService } = buildClient();
    httpService.request.mockReturnValue(throwError(() => ({ message: 'boom' })));

    const map = await client.listByPrefix('http://fp.example/', '/shares/MyShare/', ['/teachers'], 'alice');

    expect(map.size).toBe(0);
  });
});
