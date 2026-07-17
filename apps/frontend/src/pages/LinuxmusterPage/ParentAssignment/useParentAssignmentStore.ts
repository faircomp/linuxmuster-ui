/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import eduApi from '@/api/eduApi';
import handleApiError from '@/utils/handleApiError';
import i18n from '@/i18n';
import PARENT_CHILD_PAIRING_API_ENDPOINTS from '@libs/parent-child-pairing/constants/parentChildPairingApiEndpoints';
import PARENT_CHILD_PAIRING_QUERY_PARAMS from '@libs/parent-child-pairing/constants/parentChildPairingQueryParams';
import PARENT_CHILD_PAIRING_STATUS from '@libs/parent-child-pairing/constants/parentChildPairingStatus';
import PARENT_CHILD_PAIRING_STATUS_FILTER_ALL from '@libs/parent-child-pairing/constants/parentChildPairingStatusFilterAll';
import type ParentChildPairingDto from '@libs/parent-child-pairing/types/parentChildPairingDto';

interface ParentAssignmentStore {
  pairings: ParentChildPairingDto[];
  isLoading: boolean;
  statusFilter: string;
  selectedSchool: string;

  fetchPairings: () => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  setStatusFilter: (status: string) => void;
  setSelectedSchool: (school: string) => void;
}

const useParentAssignmentStore = create<ParentAssignmentStore>((set, get) => ({
  pairings: [],
  isLoading: false,
  statusFilter: PARENT_CHILD_PAIRING_STATUS.PENDING,
  selectedSchool: '',

  fetchPairings: async () => {
    set({ isLoading: true });
    try {
      const { statusFilter, selectedSchool } = get();
      const params: Record<string, string> = {};
      if (statusFilter !== PARENT_CHILD_PAIRING_STATUS_FILTER_ALL) {
        params[PARENT_CHILD_PAIRING_QUERY_PARAMS.STATUS] = statusFilter;
      }
      if (selectedSchool) {
        params[PARENT_CHILD_PAIRING_QUERY_PARAMS.SCHOOL] = selectedSchool;
      }
      const { data } = await eduApi.get<ParentChildPairingDto[]>(
        `${PARENT_CHILD_PAIRING_API_ENDPOINTS.BASE}/${PARENT_CHILD_PAIRING_API_ENDPOINTS.ALL}`,
        { params },
      );
      set({ pairings: data });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isLoading: false });
    }
  },

  updateStatus: async (id: string, status: string) => {
    try {
      await eduApi.patch(
        `${PARENT_CHILD_PAIRING_API_ENDPOINTS.BASE}/${id}/${PARENT_CHILD_PAIRING_API_ENDPOINTS.STATUS}`,
        {
          status,
        },
      );
      toast.success(i18n.t('parentChildPairing.statusUpdated'));
      await get().fetchPairings();
    } catch (error) {
      handleApiError(error, set);
    }
  },

  setStatusFilter: (statusFilter: string) => {
    set({ statusFilter });
    void get().fetchPairings();
  },

  setSelectedSchool: (selectedSchool: string) => {
    set({ selectedSchool });
    void get().fetchPairings();
  },
}));

export default useParentAssignmentStore;
