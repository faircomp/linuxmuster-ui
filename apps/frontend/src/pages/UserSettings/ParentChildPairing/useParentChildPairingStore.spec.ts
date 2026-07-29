/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import PARENT_CHILD_PAIRING_API_ENDPOINTS from '@libs/parent-child-pairing/constants/parentChildPairingApiEndpoints';
import type ParentChildPairingDto from '@libs/parent-child-pairing/types/parentChildPairingDto';
import eduApi from '@/api/eduApi';
import useParentChildPairingStore from './useParentChildPairingStore';

vi.mock('@/api/eduApi', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }));

const mockedEduApi = eduApi as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};
const mockedToast = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

const { BASE, CODE, RELATIONSHIPS } = PARENT_CHILD_PAIRING_API_ENDPOINTS;
const CODE_PATH = `${BASE}/${CODE}`;
const RELATIONSHIPS_PATH = `${BASE}/${RELATIONSHIPS}`;

describe('useParentChildPairingStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParentChildPairingStore.getState().reset();
  });

  it('fetchPairingCode requests the code endpoint and stores the response', async () => {
    const response = { code: 'ABCD1234', expiresAt: '2026-07-17T12:00:00.000Z' };
    mockedEduApi.get.mockResolvedValueOnce({ data: response });

    await useParentChildPairingStore.getState().fetchPairingCode();

    expect(mockedEduApi.get).toHaveBeenCalledWith(CODE_PATH);
    expect(useParentChildPairingStore.getState().pairingCodeResponse).toEqual(response);
  });

  it('refreshPairingCode PUTs the code endpoint, stores the response and toasts success', async () => {
    const response = { code: 'WXYZ5678', expiresAt: '2026-07-17T12:05:00.000Z' };
    mockedEduApi.put.mockResolvedValueOnce({ data: response });

    await useParentChildPairingStore.getState().refreshPairingCode();

    expect(mockedEduApi.put).toHaveBeenCalledWith(CODE_PATH);
    expect(useParentChildPairingStore.getState().pairingCodeResponse).toEqual(response);
    expect(mockedToast.success).toHaveBeenCalledWith('usersettings.parentChildPairing.codeRefreshed');
  });

  it('submitPairingCode POSTs the code and returns true on success', async () => {
    mockedEduApi.post.mockResolvedValueOnce({ data: {} });

    const result = await useParentChildPairingStore.getState().submitPairingCode('ABCD1234');

    expect(mockedEduApi.post).toHaveBeenCalledWith(BASE, { code: 'ABCD1234' });
    expect(result).toBe(true);
    expect(mockedToast.success).toHaveBeenCalledWith('usersettings.parentChildPairing.pairingSuccess');
  });

  it('submitPairingCode toasts codeExpired and returns false on a 410 Gone', async () => {
    mockedEduApi.post.mockRejectedValueOnce({ response: { status: 410 } });

    const result = await useParentChildPairingStore.getState().submitPairingCode('EXPIRED1');

    expect(result).toBe(false);
    expect(mockedToast.error).toHaveBeenCalledWith('usersettings.parentChildPairing.codeExpired');
  });

  it('fetchRelationships requests the enriched relationships endpoint (drift-fix)', async () => {
    const relationships: ParentChildPairingDto[] = [
      {
        id: 'p1',
        parent: 'mom',
        student: 'kid',
        school: 'agy',
        status: 'accepted',
        logs: [],
        createdAt: '',
        updatedAt: '',
      },
    ];
    mockedEduApi.get.mockResolvedValueOnce({ data: relationships });

    await useParentChildPairingStore.getState().fetchRelationships();

    expect(mockedEduApi.get).toHaveBeenCalledWith(RELATIONSHIPS_PATH);
    expect(useParentChildPairingStore.getState().relationships).toEqual(relationships);
  });
});
