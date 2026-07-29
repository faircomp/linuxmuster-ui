/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { create } from 'zustand';
import WIKI_ENDPOINTS from '@libs/wiki/constants/wikiEndpoints';
import { HTTP_HEADERS } from '@libs/common/types/http-methods';
import type WebdavShareDto from '@libs/filesharing/types/webdavShareDto';
import type WikiTreeChildDto from '@libs/wiki/types/wikiTreeChildDto';
import type WikiPageDto from '@libs/wiki/types/wikiPageDto';
import type CreateWikiPageDto from '@libs/wiki/types/createWikiPageDto';
import type CreateWikiFolderDto from '@libs/wiki/types/createWikiFolderDto';
import type WikiFolderCreatedDto from '@libs/wiki/types/wikiFolderCreatedDto';
import type WikiSuccessDto from '@libs/wiki/types/wikiSuccessDto';
import type WikiSearchResponseDto from '@libs/wiki/types/wikiSearchResponseDto';
import type WikiSearchScope from '@libs/wiki/constants/wikiSearchScope';
import eduApi from '@/api/eduApi';
import handleApiError from '@/utils/handleApiError';

const WIKI_SHARES_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.SHARES}`;
const WIKI_TREE_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.TREE}`;
const WIKI_PAGE_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.PAGE}`;
const WIKI_FOLDER_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.FOLDER}`;
const WIKI_SEARCH_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.SEARCH}`;
const WIKI_SEARCH_PAGE_SIZE = 20;

interface WikiStore {
  shares: WebdavShareDto[];
  currentPage: WikiPageDto | null;
  currentPageEtag: string | null;
  treeVersion: number;
  searchResult: WikiSearchResponseDto | null;
  isLoadingShares: boolean;
  isLoadingPage: boolean;
  isSaving: boolean;
  isSearching: boolean;
  error: string | null;

  fetchShares: () => Promise<void>;
  search: (query: string, scope: WikiSearchScope, shareId?: string) => Promise<WikiSearchResponseDto | null>;
  fetchTree: (path: string) => Promise<WikiTreeChildDto[]>;
  fetchPage: (path: string) => Promise<WikiPageDto | null>;
  createPage: (dto: CreateWikiPageDto) => Promise<WikiPageDto | null>;
  updatePage: (path: string, content: string, etag: string | null) => Promise<WikiPageDto | null>;
  deletePage: (path: string) => Promise<boolean>;
  createFolder: (dto: CreateWikiFolderDto) => Promise<WikiFolderCreatedDto | null>;
  deleteFolder: (path: string) => Promise<boolean>;
  refreshTree: () => void;
}

const initialState = {
  shares: [],
  currentPage: null,
  currentPageEtag: null,
  treeVersion: 0,
  searchResult: null,
  isLoadingShares: false,
  isLoadingPage: false,
  isSaving: false,
  isSearching: false,
  error: null,
};

const useWikiStore = create<WikiStore>((set, get) => ({
  ...initialState,

  fetchShares: async () => {
    set({ isLoadingShares: true, error: null });
    try {
      const response = await eduApi.get<WebdavShareDto[]>(WIKI_SHARES_ENDPOINT);
      set({ shares: response.data });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isLoadingShares: false });
    }
  },

  search: async (query, scope, shareId) => {
    set({ isSearching: true, error: null });
    try {
      const response = await eduApi.post<WikiSearchResponseDto>(WIKI_SEARCH_ENDPOINT, {
        query,
        scope,
        shareId,
        page: 0,
        size: WIKI_SEARCH_PAGE_SIZE,
      });
      set({ searchResult: response.data });
      return response.data;
    } catch (error) {
      handleApiError(error, set);
      set({ searchResult: null });
      return null;
    } finally {
      set({ isSearching: false });
    }
  },

  fetchTree: async (path) => {
    set({ error: null });
    try {
      const response = await eduApi.get<WikiTreeChildDto[]>(WIKI_TREE_ENDPOINT, { params: { path } });
      return response.data;
    } catch (error) {
      handleApiError(error, set);
      return [];
    }
  },

  fetchPage: async (path) => {
    set({ isLoadingPage: true, error: null });
    try {
      const response = await eduApi.get<WikiPageDto>(WIKI_PAGE_ENDPOINT, { params: { path } });
      set({ currentPage: response.data, currentPageEtag: response.data.etag ?? null });
      return response.data;
    } catch (error) {
      handleApiError(error, set);
      return null;
    } finally {
      set({ isLoadingPage: false });
    }
  },

  createPage: async (dto) => {
    set({ isSaving: true, error: null });
    try {
      const response = await eduApi.post<WikiPageDto>(WIKI_PAGE_ENDPOINT, dto);
      return response.data;
    } catch (error) {
      handleApiError(error, set);
      return null;
    } finally {
      set({ isSaving: false });
    }
  },

  updatePage: async (path, content, etag) => {
    set({ isSaving: true, error: null });
    try {
      const response = await eduApi.put<WikiPageDto>(
        WIKI_PAGE_ENDPOINT,
        { content, etag: etag ?? undefined },
        { params: { path }, headers: etag ? { [HTTP_HEADERS.IfMatch]: etag } : undefined },
      );
      set({ currentPage: response.data, currentPageEtag: response.data.etag ?? null });
      return response.data;
    } catch (error) {
      handleApiError(error, set);
      return null;
    } finally {
      set({ isSaving: false });
    }
  },

  deletePage: async (path) => {
    set({ isSaving: true, error: null });
    try {
      await eduApi.delete<WikiSuccessDto>(WIKI_PAGE_ENDPOINT, { params: { path } });
      if (get().currentPage?.path === path) {
        set({ currentPage: null, currentPageEtag: null });
      }
      return true;
    } catch (error) {
      handleApiError(error, set);
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  createFolder: async (dto) => {
    set({ isSaving: true, error: null });
    try {
      const response = await eduApi.post<WikiFolderCreatedDto>(WIKI_FOLDER_ENDPOINT, dto);
      return response.data;
    } catch (error) {
      handleApiError(error, set);
      return null;
    } finally {
      set({ isSaving: false });
    }
  },

  deleteFolder: async (path) => {
    set({ isSaving: true, error: null });
    try {
      await eduApi.delete<WikiSuccessDto>(WIKI_FOLDER_ENDPOINT, { params: { path } });
      const openPath = get().currentPage?.path;
      if (openPath !== undefined && (openPath === path || openPath.startsWith(`${path}/`))) {
        set({ currentPage: null, currentPageEtag: null });
      }
      return true;
    } catch (error) {
      handleApiError(error, set);
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  refreshTree: () => set((state) => ({ treeVersion: state.treeVersion + 1 })),
}));

export default useWikiStore;
