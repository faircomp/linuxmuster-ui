/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import PARENT_CHILD_PAIRING_API_ENDPOINTS from '@libs/parent-child-pairing/constants/parentChildPairingApiEndpoints';
import PARENT_CHILD_PAIRING_STATUS from '@libs/parent-child-pairing/constants/parentChildPairingStatus';
import PARENT_CHILD_PAIRING_STATUS_FILTER_ALL from '@libs/parent-child-pairing/constants/parentChildPairingStatusFilterAll';
import eduApi from '@/api/eduApi';
import useParentAssignmentStore from './useParentAssignmentStore';

vi.mock('@/api/eduApi', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }));

const mockedEduApi = eduApi as unknown as { get: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn> };
const mockedToast = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

const { BASE, ALL, STATUS } = PARENT_CHILD_PAIRING_API_ENDPOINTS;
const ALL_PATH = `${BASE}/${ALL}`;

describe('useParentAssignmentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParentAssignmentStore.setState({
      pairings: [],
      isLoading: false,
      statusFilter: PARENT_CHILD_PAIRING_STATUS.PENDING,
      selectedSchool: '',
    });
    mockedEduApi.get.mockResolvedValue({ data: [] });
  });

  it('fetchPairings requests the ALL route with the status filter by default', async () => {
    await useParentAssignmentStore.getState().fetchPairings();

    expect(mockedEduApi.get).toHaveBeenCalledWith(ALL_PATH, { params: { status: PARENT_CHILD_PAIRING_STATUS.PENDING } });
  });

  it('fetchPairings omits the status param when the filter is ALL', async () => {
    useParentAssignmentStore.setState({ statusFilter: PARENT_CHILD_PAIRING_STATUS_FILTER_ALL });

    await useParentAssignmentStore.getState().fetchPairings();

    expect(mockedEduApi.get).toHaveBeenCalledWith(ALL_PATH, { params: {} });
  });

  it('fetchPairings adds the school param when a school is selected', async () => {
    useParentAssignmentStore.setState({ selectedSchool: 'agy' });

    await useParentAssignmentStore.getState().fetchPairings();

    expect(mockedEduApi.get).toHaveBeenCalledWith(ALL_PATH, {
      params: { status: PARENT_CHILD_PAIRING_STATUS.PENDING, school: 'agy' },
    });
  });

  it('updateStatus PATCHes the status route with the body and refetches the pairings', async () => {
    mockedEduApi.patch.mockResolvedValueOnce({ data: {} });

    await useParentAssignmentStore.getState().updateStatus('pairing-1', PARENT_CHILD_PAIRING_STATUS.ACCEPTED);

    expect(mockedEduApi.patch).toHaveBeenCalledWith(`${BASE}/pairing-1/${STATUS}`, {
      status: PARENT_CHILD_PAIRING_STATUS.ACCEPTED,
    });
    expect(mockedToast.success).toHaveBeenCalledWith('parentChildPairing.statusUpdated');
    expect(mockedEduApi.get).toHaveBeenCalledWith(ALL_PATH, { params: { status: PARENT_CHILD_PAIRING_STATUS.PENDING } });
  });
});
