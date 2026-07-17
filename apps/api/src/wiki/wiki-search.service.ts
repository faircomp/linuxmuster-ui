/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import WebdavShareDto from '@libs/filesharing/types/webdavShareDto';
import WIKI_ERROR_MESSAGES from '@libs/wiki/constants/wikiErrorMessages';
import { WIKI_SEARCH_SCOPE } from '@libs/wiki/constants/wikiSearchScope';
import { WIKI_SEARCH_STATUS } from '@libs/wiki/constants/wikiSearchStatus';
import type WikiSearchStatus from '@libs/wiki/constants/wikiSearchStatus';
import { UNAVAILABLE_SHARE_REASON } from '@libs/wiki/constants/unavailableShareReason';
import type UnavailableShareReason from '@libs/wiki/constants/unavailableShareReason';
import WEBDAV_SHARE_STATUS from '@libs/webdav/constants/webdavShareStatus';
import type WikiSearchRequestDto from '@libs/wiki/types/wikiSearchRequestDto';
import type WikiSearchResponseDto from '@libs/wiki/types/wikiSearchResponseDto';
import type WikiSearchHitDto from '@libs/wiki/types/wikiSearchHitDto';
import type UnavailableShareDto from '@libs/wiki/types/unavailableShareDto';
import runWithConcurrencyCap from '@libs/common/utils/runWithConcurrencyCap';
import CustomHttpException from '../common/CustomHttpException';
import WebdavSharesService from '../webdav/shares/webdav-shares.service';
import LmnApiService from '../lmnApi/lmnApi.service';
import WikiFileproxyClient from './wiki-fileproxy.client';
import WikiFileproxySearchError from './errors/WikiFileproxySearchError';
import resolveOwningShare, { normalizeSharePath } from './resolveOwningShare';
import fileproxyHitToFrontendPath from './fileproxyHitToFrontendPath';
import groupSharesByFileproxy from './groupSharesByFileproxy';
import resolveTemplatedShareSharePath, { TemplatableShare } from './resolveTemplatedShareSharePath';

const MAX_RESULT_WINDOW = 1000;
const PER_FILEPROXY_CAP = 100;
const FILEPROXY_FAN_OUT_CONCURRENCY = 6;
const HOME_DIR_CACHE_TTL_MS = 5 * 60 * 1000;

const homeDirectoryCache = new Map<string, { homeDirectory: string; expiresAt: number }>();

export const resetHomeDirectoryCacheForTests = (): void => {
  homeDirectoryCache.clear();
};

const isTemplatedShare = (share: TemplatableShare): boolean =>
  normalizeSharePath(share.sharePath ?? '') === '' && (share.pathVariables ?? []).length > 0;

type AccessibleWikiShare = WebdavShareDto & { matchSharePath: string };

@Injectable()
class WikiSearchService {
  constructor(
    private readonly webdavSharesService: WebdavSharesService,
    private readonly wikiFileproxyClient: WikiFileproxyClient,
    private readonly lmnApiService: LmnApiService,
  ) {}

  async search(request: WikiSearchRequestDto, username: string, userGroups: string[]): Promise<WikiSearchResponseDto> {
    if (request.page * request.size >= MAX_RESULT_WINDOW) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.INVALID_SEARCH_PARAMS, HttpStatus.BAD_REQUEST, {
        reason: 'page beyond max_result_window',
        page: request.page,
        size: request.size,
      });
    }

    const shares = await this.webdavSharesService.findAllWikiShares(userGroups);
    const accessibleShares = await this.resolveAccessibleShares(shares, username);

    if (request.scope === WIKI_SEARCH_SCOPE.SHARE) {
      return this.searchInShare(request, username, userGroups, accessibleShares);
    }
    return this.searchAll(request, username, userGroups, accessibleShares);
  }

  private async resolveAccessibleShares(shares: WebdavShareDto[], username: string): Promise<AccessibleWikiShare[]> {
    if (!shares.some(isTemplatedShare)) {
      return shares.map((share) => ({ ...share, matchSharePath: share.sharePath ?? '' }));
    }

    const homeDirectory = await this.resolveHomeDirectory(username);
    return shares.reduce<AccessibleWikiShare[]>((accumulator, share) => {
      if (!isTemplatedShare(share)) {
        accumulator.push({ ...share, matchSharePath: share.sharePath ?? '' });
        return accumulator;
      }

      const matchSharePath = resolveTemplatedShareSharePath(share, homeDirectory);
      if (matchSharePath === '') {
        Logger.warn(
          `[WikiSearch] excluding unresolved templated share '${share.displayName}' for user '${username}'`,
          WikiSearchService.name,
        );
        return accumulator;
      }

      accumulator.push({ ...share, matchSharePath });
      return accumulator;
    }, []);
  }

  private async resolveHomeDirectory(username: string): Promise<string> {
    const cached = homeDirectoryCache.get(username);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.homeDirectory;
    }

    let homeDirectory = '';
    try {
      const lmnApiToken = await this.lmnApiService.getLmnApiToken(username);
      const user = await this.lmnApiService.getUser(lmnApiToken, username);
      homeDirectory = user.homeDirectory;
    } catch {
      homeDirectory = '';
    }

    homeDirectoryCache.set(username, { homeDirectory, expiresAt: Date.now() + HOME_DIR_CACHE_TTL_MS });
    return homeDirectory;
  }

  private async searchInShare(
    request: WikiSearchRequestDto,
    username: string,
    userGroups: string[],
    shares: AccessibleWikiShare[],
  ): Promise<WikiSearchResponseDto> {
    if (!request.shareId) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.INVALID_SEARCH_PARAMS, HttpStatus.BAD_REQUEST, {
        reason: 'shareId is required when scope=share',
      });
    }

    const target = shares.find((share) => share.displayName === request.shareId);
    if (!target) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.ACCESS_DENIED, HttpStatus.FORBIDDEN, {
        share: request.shareId,
      });
    }

    if (target.status === WEBDAV_SHARE_STATUS.DOWN) {
      return {
        hits: [],
        total: 0,
        status: WIKI_SEARCH_STATUS.UNAVAILABLE,
        unavailableShares: [{ shareId: target.displayName, reason: UNAVAILABLE_SHARE_REASON.HEALTH_CHECK_DOWN }],
      };
    }

    try {
      const fetchSize = Math.min(request.size * (request.page + 1), PER_FILEPROXY_CAP);
      const result = await this.wikiFileproxyClient.search(
        target.url,
        { ...request, size: fetchSize, page: 0 },
        userGroups,
        username,
      );

      const filteredHits: WikiSearchHitDto[] = result.hits
        .filter((hit) => resolveOwningShare(hit.path, [target]) !== null)
        .map((hit) => ({
          ...hit,
          shareId: target.displayName,
          path: fileproxyHitToFrontendPath(hit.path, target),
        }));

      const start = request.page * request.size;
      const paged = filteredHits.slice(start, start + request.size);
      return {
        hits: paged,
        total: result.total,
        status: result.status,
        unavailableShares: [],
        truncated: result.truncated,
      };
    } catch (error) {
      const reason = WikiSearchService.classifyError(error);
      return {
        hits: [],
        total: 0,
        status: WIKI_SEARCH_STATUS.UNAVAILABLE,
        unavailableShares: [{ shareId: target.displayName, reason }],
      };
    }
  }

  private async searchAll(
    request: WikiSearchRequestDto,
    username: string,
    userGroups: string[],
    shares: AccessibleWikiShare[],
  ): Promise<WikiSearchResponseDto> {
    if (shares.length === 0) {
      return { hits: [], total: 0, status: WIKI_SEARCH_STATUS.OK, unavailableShares: [] };
    }

    const groups = groupSharesByFileproxy(shares);
    if (groups.length === 0) {
      return { hits: [], total: 0, status: WIKI_SEARCH_STATUS.OK, unavailableShares: [] };
    }

    const perGroupSize = Math.min(request.size * (request.page + 1), PER_FILEPROXY_CAP);
    const upGroups: Array<{ fileproxyUrl: string; shares: AccessibleWikiShare[] }> = [];
    const shortCircuited: UnavailableShareDto[] = [];
    groups.forEach((group) => {
      const allDown = group.shares.every((share) => share.status === WEBDAV_SHARE_STATUS.DOWN);
      if (allDown) {
        group.shares.forEach((share) => {
          shortCircuited.push({ shareId: share.displayName, reason: UNAVAILABLE_SHARE_REASON.HEALTH_CHECK_DOWN });
        });
      } else {
        upGroups.push(group);
      }
    });

    const taskFns = upGroups.map(
      (group) => async () =>
        this.wikiFileproxyClient.search(group.fileproxyUrl, { ...request, size: perGroupSize, page: 0 }, userGroups, username),
    );
    const settled = await runWithConcurrencyCap(taskFns, FILEPROXY_FAN_OUT_CONCURRENCY);

    const allHits: WikiSearchHitDto[] = [];
    const unavailableShares: UnavailableShareDto[] = [...shortCircuited];
    let sumTotals = 0;
    let fulfilledCount = 0;
    let truncated = false;
    settled.forEach((result, index) => {
      const group = upGroups[index];
      if (result.status === 'fulfilled') {
        fulfilledCount += 1;
        const { value } = result;
        value.hits.forEach((hit) => {
          const owningShare = resolveOwningShare(hit.path, group.shares);
          if (!owningShare) {
            return;
          }
          allHits.push({
            ...hit,
            shareId: owningShare.displayName,
            path: fileproxyHitToFrontendPath(hit.path, owningShare),
          });
        });
        sumTotals += value.total;
        if (value.truncated) {
          truncated = true;
        }
      } else {
        const reason = WikiSearchService.classifyError(result.reason);
        group.shares.forEach((share) => {
          unavailableShares.push({ shareId: share.displayName, reason });
        });
        Logger.warn(`[WikiSearch] fan-out failure on ${group.fileproxyUrl}: ${reason}`, WikiSearchService.name);
      }
    });

    allHits.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.mtime !== a.mtime) {
        return b.mtime - a.mtime;
      }
      return a.path.localeCompare(b.path);
    });

    const start = request.page * request.size;
    const paged = allHits.slice(start, start + request.size);

    let status: WikiSearchStatus;
    if (upGroups.length > 0 && fulfilledCount === 0) {
      status = WIKI_SEARCH_STATUS.UNAVAILABLE;
    } else if (unavailableShares.length > 0) {
      status = WIKI_SEARCH_STATUS.DEGRADED;
    } else {
      status = WIKI_SEARCH_STATUS.OK;
    }

    return { hits: paged, total: sumTotals, status, unavailableShares, truncated: truncated || undefined };
  }

  static classifyError(error: unknown): UnavailableShareReason {
    if (error instanceof WikiFileproxySearchError) {
      return error.reason;
    }
    return UNAVAILABLE_SHARE_REASON.CONNECTION_ERROR;
  }
}

export default WikiSearchService;
