/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import { HttpStatusCode } from 'axios';
import eduApi from '@/api/eduApi';
import handleApiError from '@/utils/handleApiError';
import i18n from '@/i18n';
import PARENT_CHILD_PAIRING_API_ENDPOINTS from '@libs/parent-child-pairing/constants/parentChildPairingApiEndpoints';
import type ParentChildPairingDto from '@libs/parent-child-pairing/types/parentChildPairingDto';
import type ParentChildPairingCodeResponseDto from '@libs/parent-child-pairing/types/parentChildPairingCodeResponseDto';

interface ParentChildPairingStore {
  pairingCodeResponse: ParentChildPairingCodeResponseDto | null;
  relationships: ParentChildPairingDto[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  fetchPairingCode: () => Promise<void>;
  refreshPairingCode: () => Promise<void>;
  submitPairingCode: (code: string) => Promise<boolean>;
  fetchRelationships: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  pairingCodeResponse: null,
  relationships: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

const useParentChildPairingStore = create<ParentChildPairingStore>((set) => ({
  ...initialState,

  fetchPairingCode: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await eduApi.get<ParentChildPairingCodeResponseDto>(
        `${PARENT_CHILD_PAIRING_API_ENDPOINTS.BASE}/${PARENT_CHILD_PAIRING_API_ENDPOINTS.CODE}`,
      );
      set({ pairingCodeResponse: data });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshPairingCode: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await eduApi.put<ParentChildPairingCodeResponseDto>(
        `${PARENT_CHILD_PAIRING_API_ENDPOINTS.BASE}/${PARENT_CHILD_PAIRING_API_ENDPOINTS.CODE}`,
      );
      set({ pairingCodeResponse: data });
      toast.success(i18n.t('usersettings.parentChildPairing.codeRefreshed'));
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isLoading: false });
    }
  },

  submitPairingCode: async (code: string) => {
    set({ isSubmitting: true, error: null });
    try {
      await eduApi.post(PARENT_CHILD_PAIRING_API_ENDPOINTS.BASE, { code });
      toast.success(i18n.t('usersettings.parentChildPairing.pairingSuccess'));
      set({ isSubmitting: false });
      return true;
    } catch (error) {
      set({ isSubmitting: false });
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === HttpStatusCode.Gone) {
        toast.error(i18n.t('usersettings.parentChildPairing.codeExpired'));
      } else {
        handleApiError(error, set);
      }
      return false;
    }
  },

  fetchRelationships: async () => {
    try {
      const { data } = await eduApi.get<ParentChildPairingDto[]>(
        `${PARENT_CHILD_PAIRING_API_ENDPOINTS.BASE}/${PARENT_CHILD_PAIRING_API_ENDPOINTS.RELATIONSHIPS}`,
      );
      set({ relationships: data });
    } catch (error) {
      handleApiError(error, set);
    }
  },

  reset: () => set(initialState),
}));

export default useParentChildPairingStore;
