/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { HTTP_HEADERS, HttpMethods, RequestResponseContentType } from '@libs/common/types/http-methods';
import { WIKI_SEARCH_STATUS } from '@libs/wiki/constants/wikiSearchStatus';
import type WikiSearchStatus from '@libs/wiki/constants/wikiSearchStatus';
import { UNAVAILABLE_SHARE_REASON } from '@libs/wiki/constants/unavailableShareReason';
import type UnavailableShareReason from '@libs/wiki/constants/unavailableShareReason';
import WIKI_FILEPROXY_TIMEOUT_MS from '@libs/wiki/constants/wikiFileproxyTimeoutMs';
import type WikiSearchHitDto from '@libs/wiki/types/wikiSearchHitDto';
import type WikiSearchRequestDto from '@libs/wiki/types/wikiSearchRequestDto';
import UsersService from '../users/users.service';
import WikiFileproxySearchError from './errors/WikiFileproxySearchError';

interface RawFileproxyHit {
  path: string;
  share_id?: string;
  title: string;
  snippets?: string[];
  score: number;
  mtime: number;
  sort?: unknown[];
}

interface RawFileproxySearchResponse {
  hits?: RawFileproxyHit[];
  total?: number;
  status?: string;
  truncated?: boolean;
}

interface RawFileproxyListRow {
  path?: string;
  title?: string;
  mtime?: number;
}

export interface WikiFileproxySearchResult {
  hits: WikiSearchHitDto[];
  total: number;
  status: WikiSearchStatus;
  truncated?: boolean;
}

export type WikiTitleCache = Map<string, { title: string; mtime: number }>;

@Injectable()
class WikiFileproxyClient {
  // eslint-disable-next-line no-control-regex
  private static readonly FORBIDDEN_GROUP_TOKEN_CHARS = /[\x00-\x1f\x7f,]/;

  constructor(
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
  ) {}

  async search(
    fileproxyUrl: string,
    request: WikiSearchRequestDto,
    groups: string[],
    username: string,
  ): Promise<WikiFileproxySearchResult> {
    if (groups.length === 0) {
      return { hits: [], total: 0, status: WIKI_SEARCH_STATUS.OK };
    }
    const endpointUrl = `${WikiFileproxyClient.fileproxyBase(fileproxyUrl)}/wiki/search`;
    const body: { query: string; page?: number; size?: number } = { query: request.query };
    if (request.page !== undefined) {
      body.page = request.page;
    }
    if (request.size !== undefined) {
      body.size = request.size;
    }
    const headers = {
      ...(await this.buildAuthHeaders(username)),
      [HTTP_HEADERS.XEdulutionGroups]: WikiFileproxyClient.buildGroupsHeader(groups, username),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.request<RawFileproxySearchResponse>({
          method: HttpMethods.POST,
          url: endpointUrl,
          headers,
          data: body,
          timeout: WIKI_FILEPROXY_TIMEOUT_MS,
        }),
      );
      const { data } = response;
      const rawHits = Array.isArray(data.hits) ? data.hits : [];
      const hits: WikiSearchHitDto[] = rawHits.map((hit) => ({
        path: hit.path,
        shareId: hit.share_id ?? '',
        title: hit.title,
        snippets: Array.isArray(hit.snippets) ? hit.snippets : [],
        score: hit.score,
        mtime: hit.mtime,
        sort: Array.isArray(hit.sort) ? hit.sort : [],
      }));
      return {
        hits,
        total: data.total ?? 0,
        status: data.status === WIKI_SEARCH_STATUS.UNAVAILABLE ? WIKI_SEARCH_STATUS.UNAVAILABLE : WIKI_SEARCH_STATUS.OK,
        truncated: data.truncated,
      };
    } catch (error) {
      throw new WikiFileproxySearchError(WikiFileproxyClient.classifyError(error, endpointUrl, 'search'));
    }
  }

  async listByPrefix(
    fileproxyUrl: string,
    pathPrefix: string,
    groups: string[],
    username: string,
  ): Promise<WikiTitleCache> {
    if (groups.length === 0 || !pathPrefix) {
      return new Map();
    }
    const endpointUrl = `${WikiFileproxyClient.fileproxyBase(fileproxyUrl)}/wiki/list`;
    const headers = {
      ...(await this.buildAuthHeaders(username)),
      [HTTP_HEADERS.XEdulutionGroups]: WikiFileproxyClient.buildGroupsHeader(groups, username),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.request<RawFileproxyListRow[]>({
          method: HttpMethods.GET,
          url: endpointUrl,
          headers,
          params: { path_prefix: pathPrefix },
          timeout: WIKI_FILEPROXY_TIMEOUT_MS,
        }),
      );
      const map: WikiTitleCache = new Map();
      const rows = Array.isArray(response.data) ? response.data : [];
      rows.forEach((row) => {
        if (typeof row.path === 'string' && typeof row.title === 'string') {
          map.set(row.path, { title: row.title, mtime: typeof row.mtime === 'number' ? row.mtime : 0 });
        }
      });
      return map;
    } catch (error) {
      const err = error as { response?: { status?: number }; message?: string };
      Logger.warn(
        `[WikiFileproxy] list failed: GET ${endpointUrl} status=${err.response?.status ?? 'n/a'} message=${err.message ?? 'request failed'}`,
        WikiFileproxyClient.name,
      );
      return new Map();
    }
  }

  private async buildAuthHeaders(username: string): Promise<Record<string, string>> {
    const password = await this.usersService.getPassword(username);
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    return {
      [HTTP_HEADERS.ContentType]: RequestResponseContentType.APPLICATION_JSON,
      [HTTP_HEADERS.Authorization]: `Basic ${token}`,
    };
  }

  private static classifyError(error: unknown, endpointUrl: string, operation: string): UnavailableShareReason {
    const err = error as { response?: { status?: number }; code?: string; message?: string };
    const status = err.response?.status;
    let reason: UnavailableShareReason = UNAVAILABLE_SHARE_REASON.CONNECTION_ERROR;
    if (err.code === 'ECONNABORTED' || (err.message ?? '').toLowerCase().includes('timeout')) {
      reason = UNAVAILABLE_SHARE_REASON.TIMEOUT;
    } else if (typeof status === 'number' && status >= 500) {
      reason = UNAVAILABLE_SHARE_REASON.HTTP_5XX;
    } else if (typeof status === 'number' && status >= 400) {
      reason = UNAVAILABLE_SHARE_REASON.HTTP_4XX;
    }
    Logger.error(
      `[WikiFileproxy] ${operation} failed: POST ${endpointUrl} status=${status ?? 'n/a'} message=${err.message ?? 'request failed'}`,
      WikiFileproxyClient.name,
    );
    return reason;
  }

  private static buildGroupsHeader(groups: string[], username: string): string {
    const tokens = [...groups, username].filter((token) => token.length > 0);
    tokens.forEach((token) => {
      if (WikiFileproxyClient.FORBIDDEN_GROUP_TOKEN_CHARS.test(token)) {
        throw new Error(
          `X-Edulution-Groups token rejected: contains comma or control character (length=${token.length})`,
        );
      }
    });
    return tokens.join(',');
  }

  private static fileproxyBase(fileproxyUrl: string): string {
    try {
      const parsed = new URL(fileproxyUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return fileproxyUrl.replace(/\/$/, '');
    }
  }
}

export default WikiFileproxyClient;
