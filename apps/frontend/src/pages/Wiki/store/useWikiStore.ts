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
import eduApi from '@/api/eduApi';
import handleApiError from '@/utils/handleApiError';

const WIKI_SHARES_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.SHARES}`;
const WIKI_TREE_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.TREE}`;
const WIKI_PAGE_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.PAGE}`;
const WIKI_FOLDER_ENDPOINT = `${WIKI_ENDPOINTS.BASE}/${WIKI_ENDPOINTS.FOLDER}`;

interface WikiStore {
  shares: WebdavShareDto[];
  tree: WikiTreeChildDto[];
  currentPage: WikiPageDto | null;
  currentPageEtag: string | null;
  isLoadingShares: boolean;
  isLoadingTree: boolean;
  isLoadingPage: boolean;
  isSaving: boolean;
  error: string | null;

  fetchShares: () => Promise<void>;
  fetchTree: (path: string) => Promise<void>;
  fetchPage: (path: string) => Promise<WikiPageDto | null>;
  createPage: (dto: CreateWikiPageDto) => Promise<WikiPageDto | null>;
  updatePage: (path: string, content: string, etag: string | null) => Promise<WikiPageDto | null>;
  deletePage: (path: string) => Promise<void>;
  createFolder: (dto: CreateWikiFolderDto) => Promise<WikiFolderCreatedDto | null>;
  deleteFolder: (path: string) => Promise<void>;
}

const initialState = {
  shares: [],
  tree: [],
  currentPage: null,
  currentPageEtag: null,
  isLoadingShares: false,
  isLoadingTree: false,
  isLoadingPage: false,
  isSaving: false,
  error: null,
};

const useWikiStore = create<WikiStore>((set) => ({
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

  fetchTree: async (path) => {
    set({ isLoadingTree: true, error: null });
    try {
      const response = await eduApi.get<WikiTreeChildDto[]>(WIKI_TREE_ENDPOINT, { params: { path } });
      set({ tree: response.data });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isLoadingTree: false });
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
    } catch (error) {
      handleApiError(error, set);
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
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isSaving: false });
    }
  },
}));

export default useWikiStore;
