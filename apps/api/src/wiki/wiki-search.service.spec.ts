/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import { WIKI_SEARCH_SCOPE } from '@libs/wiki/constants/wikiSearchScope';
import { WIKI_SEARCH_STATUS } from '@libs/wiki/constants/wikiSearchStatus';
import { UNAVAILABLE_SHARE_REASON } from '@libs/wiki/constants/unavailableShareReason';
import WEBDAV_SHARE_STATUS from '@libs/webdav/constants/webdavShareStatus';
import type WikiSearchRequestDto from '@libs/wiki/types/wikiSearchRequestDto';
import CustomHttpException from '../common/CustomHttpException';
import WikiSearchService, { resetHomeDirectoryCacheForTests } from './wiki-search.service';
import WikiFileproxySearchError from './errors/WikiFileproxySearchError';
import type WebdavSharesService from '../webdav/shares/webdav-shares.service';
import type WikiFileproxyClient from './wiki-fileproxy.client';
import type LmnApiService from '../lmnApi/lmnApi.service';

const buildHit = (path: string, score: number, mtime: number) => ({
  path,
  shareId: '',
  title: 'T',
  snippets: [],
  score,
  mtime,
});

const buildService = (shares: unknown[]) => {
  const webdavSharesService = {
    findAllWikiShares: jest.fn().mockResolvedValue(shares),
  };
  const wikiFileproxyClient = {
    search: jest.fn(),
  };
  const lmnApiService = {
    getLmnApiToken: jest.fn().mockResolvedValue('token'),
    getUser: jest.fn().mockResolvedValue({ homeDirectory: '\\\\server\\students\\alice' }),
  };
  const service = new WikiSearchService(
    webdavSharesService as unknown as WebdavSharesService,
    wikiFileproxyClient as unknown as WikiFileproxyClient,
    lmnApiService as unknown as LmnApiService,
  );
  return { service, webdavSharesService, wikiFileproxyClient, lmnApiService };
};

const request = (overrides: Partial<WikiSearchRequestDto>): WikiSearchRequestDto =>
  ({ query: 'q', scope: WIKI_SEARCH_SCOPE.ALL, page: 0, size: 10, ...overrides }) as WikiSearchRequestDto;

const expectStatus = async (promise: Promise<unknown>, status: HttpStatus) => {
  expect.assertions(2);
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(CustomHttpException);
    expect((error as CustomHttpException).getStatus()).toBe(status);
  }
};

beforeEach(() => {
  resetHomeDirectoryCacheForTests();
});

describe('WikiSearchService.search validation', () => {
  it('rejects a page beyond the max result window with 400', async () => {
    const { service } = buildService([]);

    await expectStatus(service.search(request({ page: 100, size: 10 }), 'alice', ['/teachers']), HttpStatus.BAD_REQUEST);
  });

  it('rejects scope=share without a shareId with 400', async () => {
    const { service } = buildService([{ displayName: 'ShareA', url: 'https://fp1/dav', sharePath: 'teams/a', status: WEBDAV_SHARE_STATUS.UP }]);

    await expectStatus(
      service.search(request({ scope: WIKI_SEARCH_SCOPE.SHARE }), 'alice', ['/teachers']),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('rejects scope=share for a share the user cannot access with 403', async () => {
    const { service } = buildService([{ displayName: 'ShareA', url: 'https://fp1/dav', sharePath: 'teams/a', status: WEBDAV_SHARE_STATUS.UP }]);

    await expectStatus(
      service.search(request({ scope: WIKI_SEARCH_SCOPE.SHARE, shareId: 'Unknown' }), 'alice', ['/teachers']),
      HttpStatus.FORBIDDEN,
    );
  });
});

describe('WikiSearchService.search scope=share', () => {
  it('reports UNAVAILABLE without querying fileproxy when the target share is down', async () => {
    const { service, wikiFileproxyClient } = buildService([
      { displayName: 'ShareA', url: 'https://fp1/dav', sharePath: 'teams/a', status: WEBDAV_SHARE_STATUS.DOWN },
    ]);

    const result = await service.search(
      request({ scope: WIKI_SEARCH_SCOPE.SHARE, shareId: 'ShareA' }),
      'alice',
      ['/teachers'],
    );

    expect(wikiFileproxyClient.search).not.toHaveBeenCalled();
    expect(result.status).toBe(WIKI_SEARCH_STATUS.UNAVAILABLE);
    expect(result.unavailableShares).toEqual([
      { shareId: 'ShareA', reason: UNAVAILABLE_SHARE_REASON.HEALTH_CHECK_DOWN },
    ]);
  });

  it('maps and returns owned hits with their frontend path and shareId', async () => {
    const { service, wikiFileproxyClient } = buildService([
      { displayName: 'ShareA', url: 'https://fp1/dav', sharePath: 'teams/a', status: WEBDAV_SHARE_STATUS.UP },
    ]);
    wikiFileproxyClient.search.mockResolvedValue({
      hits: [buildHit('/shares/teams/a/.wiki/page.md', 5, 100), buildHit('/shares/other/x.md', 9, 200)],
      total: 2,
      status: WIKI_SEARCH_STATUS.OK,
    });

    const result = await service.search(
      request({ scope: WIKI_SEARCH_SCOPE.SHARE, shareId: 'ShareA' }),
      'alice',
      ['/teachers'],
    );

    expect(result.status).toBe(WIKI_SEARCH_STATUS.OK);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]).toMatchObject({ shareId: 'ShareA', path: 'ShareA/page' });
  });

  it('reports UNAVAILABLE with a classified reason when fileproxy fails', async () => {
    const { service, wikiFileproxyClient } = buildService([
      { displayName: 'ShareA', url: 'https://fp1/dav', sharePath: 'teams/a', status: WEBDAV_SHARE_STATUS.UP },
    ]);
    wikiFileproxyClient.search.mockRejectedValue(new WikiFileproxySearchError(UNAVAILABLE_SHARE_REASON.TIMEOUT));

    const result = await service.search(
      request({ scope: WIKI_SEARCH_SCOPE.SHARE, shareId: 'ShareA' }),
      'alice',
      ['/teachers'],
    );

    expect(result.status).toBe(WIKI_SEARCH_STATUS.UNAVAILABLE);
    expect(result.unavailableShares).toEqual([{ shareId: 'ShareA', reason: UNAVAILABLE_SHARE_REASON.TIMEOUT }]);
  });
});

describe('WikiSearchService.search scope=all', () => {
  it('fans out over fileproxy groups and returns hits sorted by score', async () => {
    const { service, wikiFileproxyClient } = buildService([
      { displayName: 'ShareA', url: 'https://fp1/dav', sharePath: 'teams/a', status: WEBDAV_SHARE_STATUS.UP },
      { displayName: 'ShareB', url: 'https://fp2/dav', sharePath: 'teams/b', status: WEBDAV_SHARE_STATUS.UP },
    ]);
    wikiFileproxyClient.search
      .mockResolvedValueOnce({ hits: [buildHit('/shares/teams/a/.wiki/low.md', 1, 100)], total: 1, status: WIKI_SEARCH_STATUS.OK })
      .mockResolvedValueOnce({ hits: [buildHit('/shares/teams/b/.wiki/high.md', 9, 100)], total: 1, status: WIKI_SEARCH_STATUS.OK });

    const result = await service.search(request({ scope: WIKI_SEARCH_SCOPE.ALL }), 'alice', ['/teachers']);

    expect(result.status).toBe(WIKI_SEARCH_STATUS.OK);
    expect(result.total).toBe(2);
    expect(result.hits.map((hit) => hit.path)).toEqual(['ShareB/high', 'ShareA/low']);
  });

  it('degrades when one fileproxy group fails but another succeeds', async () => {
    const { service, wikiFileproxyClient } = buildService([
      { displayName: 'ShareA', url: 'https://fp1/dav', sharePath: 'teams/a', status: WEBDAV_SHARE_STATUS.UP },
      { displayName: 'ShareB', url: 'https://fp2/dav', sharePath: 'teams/b', status: WEBDAV_SHARE_STATUS.UP },
    ]);
    wikiFileproxyClient.search
      .mockResolvedValueOnce({ hits: [buildHit('/shares/teams/a/.wiki/ok.md', 3, 100)], total: 1, status: WIKI_SEARCH_STATUS.OK })
      .mockRejectedValueOnce(new WikiFileproxySearchError(UNAVAILABLE_SHARE_REASON.HTTP_5XX));

    const result = await service.search(request({ scope: WIKI_SEARCH_SCOPE.ALL }), 'alice', ['/teachers']);

    expect(result.status).toBe(WIKI_SEARCH_STATUS.DEGRADED);
    expect(result.hits).toHaveLength(1);
    expect(result.unavailableShares).toEqual([{ shareId: 'ShareB', reason: UNAVAILABLE_SHARE_REASON.HTTP_5XX }]);
  });

  it('returns OK with no hits when the user has no accessible wiki shares', async () => {
    const { service, wikiFileproxyClient } = buildService([]);

    const result = await service.search(request({ scope: WIKI_SEARCH_SCOPE.ALL }), 'alice', ['/teachers']);

    expect(wikiFileproxyClient.search).not.toHaveBeenCalled();
    expect(result.status).toBe(WIKI_SEARCH_STATUS.OK);
    expect(result.hits).toEqual([]);
  });
});

describe('WikiSearchService.classifyError', () => {
  it('extracts the reason from a WikiFileproxySearchError', () => {
    expect(WikiSearchService.classifyError(new WikiFileproxySearchError(UNAVAILABLE_SHARE_REASON.HTTP_4XX))).toBe(
      UNAVAILABLE_SHARE_REASON.HTTP_4XX,
    );
  });

  it('falls back to a connection error for unknown failures', () => {
    expect(WikiSearchService.classifyError(new Error('boom'))).toBe(UNAVAILABLE_SHARE_REASON.CONNECTION_ERROR);
  });
});
