/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import WIKI_ENDPOINTS from '@libs/wiki/constants/wikiEndpoints';
import { HTTP_HEADERS } from '@libs/common/types/http-methods';
import eduApi from '@/api/eduApi';
import useWikiStore from './useWikiStore';

vi.mock('@/api/eduApi', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedEduApi = eduApi as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const SHARES_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.SHARES}`;
const TREE_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.TREE}`;
const PAGE_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.PAGE}`;
const FOLDER_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.FOLDER}`;

describe('useWikiStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWikiStore.setState({
      shares: [],
      tree: [],
      currentPage: null,
      currentPageEtag: null,
      isLoadingShares: false,
      isLoadingTree: false,
      isLoadingPage: false,
      isSaving: false,
      error: null,
    });
  });

  it('fetchShares requests the shares endpoint and stores the result', async () => {
    mockedEduApi.get.mockResolvedValue({ data: [{ displayName: 'MyShare' }] });

    await useWikiStore.getState().fetchShares();

    expect(mockedEduApi.get).toHaveBeenCalledWith(SHARES_ENDPOINT);
    expect(useWikiStore.getState().shares).toEqual([{ displayName: 'MyShare' }]);
    expect(useWikiStore.getState().isLoadingShares).toBe(false);
  });

  it('fetchTree passes the path as a query param', async () => {
    mockedEduApi.get.mockResolvedValue({ data: [] });

    await useWikiStore.getState().fetchTree('MyShare/sub');

    expect(mockedEduApi.get).toHaveBeenCalledWith(TREE_ENDPOINT, { params: { path: 'MyShare/sub' } });
  });

  it('fetchPage carries the ETag from the response body', async () => {
    mockedEduApi.get.mockResolvedValue({ data: { path: 'MyShare/p', title: 'P', content: 'c', etag: 'v1' } });

    const page = await useWikiStore.getState().fetchPage('MyShare/p');

    expect(mockedEduApi.get).toHaveBeenCalledWith(PAGE_ENDPOINT, { params: { path: 'MyShare/p' } });
    expect(page?.etag).toBe('v1');
    expect(useWikiStore.getState().currentPageEtag).toBe('v1');
  });

  it('createPage posts the DTO to the page endpoint', async () => {
    const dto = { parentPath: 'MyShare', title: 'Hello' };
    mockedEduApi.post.mockResolvedValue({ data: { path: 'MyShare/hello', title: 'Hello', content: '', etag: 'v1' } });

    const result = await useWikiStore.getState().createPage(dto);

    expect(mockedEduApi.post).toHaveBeenCalledWith(PAGE_ENDPOINT, dto);
    expect(result?.path).toBe('MyShare/hello');
  });

  it('updatePage sends the ETag as an If-Match header and query path', async () => {
    mockedEduApi.put.mockResolvedValue({ data: { path: 'MyShare/p', title: 'P', content: 'x', etag: 'v2' } });

    await useWikiStore.getState().updatePage('MyShare/p', 'x', 'v1');

    expect(mockedEduApi.put).toHaveBeenCalledWith(
      PAGE_ENDPOINT,
      { content: 'x', etag: 'v1' },
      { params: { path: 'MyShare/p' }, headers: { [HTTP_HEADERS.IfMatch]: 'v1' } },
    );
    expect(useWikiStore.getState().currentPageEtag).toBe('v2');
  });

  it('updatePage omits the If-Match header when no ETag is known', async () => {
    mockedEduApi.put.mockResolvedValue({ data: { path: 'MyShare/p', title: 'P', content: 'x', etag: 'v1' } });

    await useWikiStore.getState().updatePage('MyShare/p', 'x', null);

    expect(mockedEduApi.put).toHaveBeenCalledWith(
      PAGE_ENDPOINT,
      { content: 'x', etag: undefined },
      { params: { path: 'MyShare/p' }, headers: undefined },
    );
  });

  it('deletePage deletes with the path query param', async () => {
    mockedEduApi.delete.mockResolvedValue({ data: { success: true } });

    await useWikiStore.getState().deletePage('MyShare/p');

    expect(mockedEduApi.delete).toHaveBeenCalledWith(PAGE_ENDPOINT, { params: { path: 'MyShare/p' } });
  });

  it('createFolder posts the DTO to the folder endpoint', async () => {
    const dto = { parentPath: 'MyShare', name: 'New' };
    mockedEduApi.post.mockResolvedValue({ data: { path: 'MyShare/New' } });

    await useWikiStore.getState().createFolder(dto);

    expect(mockedEduApi.post).toHaveBeenCalledWith(FOLDER_ENDPOINT, dto);
  });

  it('deleteFolder deletes with the path query param', async () => {
    mockedEduApi.delete.mockResolvedValue({ data: { success: true } });

    await useWikiStore.getState().deleteFolder('MyShare/sub');

    expect(mockedEduApi.delete).toHaveBeenCalledWith(FOLDER_ENDPOINT, { params: { path: 'MyShare/sub' } });
  });

  it('records an error and clears the loading flag when a request fails', async () => {
    mockedEduApi.get.mockRejectedValue(new Error('boom'));

    await useWikiStore.getState().fetchShares();

    expect(useWikiStore.getState().isLoadingShares).toBe(false);
    expect(useWikiStore.getState().error).not.toBeNull();
  });
});
