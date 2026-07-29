/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { create } from 'zustand';
import eduApi from '@/api/eduApi';
import handleApiError from '@/utils/handleApiError';
import FileSharingApiEndpoints from '@libs/filesharing/types/fileSharingApiEndpoints';
import type CollaboraTokenResponseDto from '@libs/filesharing/types/collaboraTokenResponseDto';

type CollaboraStore = {
  accessToken: string;
  accessTokenTTL: number;
  isLoading: boolean;
  error: Error | null;
  fetchCollaboraToken: (filePath: string, share: string) => Promise<CollaboraTokenResponseDto | null>;
  reset: () => void;
};

const initialState = {
  accessToken: '',
  accessTokenTTL: 0,
  isLoading: false,
  error: null,
};

const useCollaboraStore = create<CollaboraStore>((set) => ({
  ...initialState,
  reset: () => set(initialState),

  fetchCollaboraToken: async (filePath, share) => {
    set({ isLoading: true });
    try {
      const { data } = await eduApi.post<CollaboraTokenResponseDto>(
        `${FileSharingApiEndpoints.FILESHARING_ACTIONS}/${FileSharingApiEndpoints.COLLABORA_TOKEN}`,
        { filePath, share },
      );
      set({ accessToken: data.accessToken, accessTokenTTL: data.accessTokenTTL });
      return data;
    } catch (error) {
      handleApiError(error, set);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useCollaboraStore;
