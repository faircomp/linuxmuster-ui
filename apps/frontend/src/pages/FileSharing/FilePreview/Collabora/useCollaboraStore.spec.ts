/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import FileSharingApiEndpoints from '@libs/filesharing/types/fileSharingApiEndpoints';
import eduApi from '@/api/eduApi';
import useCollaboraStore from './useCollaboraStore';

vi.mock('@/api/eduApi', () => ({ default: { post: vi.fn() } }));
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }));

const mockedEduApi = eduApi as unknown as { post: ReturnType<typeof vi.fn> };

const TOKEN_PATH = `${FileSharingApiEndpoints.FILESHARING_ACTIONS}/${FileSharingApiEndpoints.COLLABORA_TOKEN}`;

describe('useCollaboraStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCollaboraStore.getState().reset();
  });

  it('posts the file path and share to the collabora-token route and stores the token', async () => {
    const tokenResponse = { accessToken: 'wopi-token', accessTokenTTL: 1000 };
    mockedEduApi.post.mockResolvedValueOnce({ data: tokenResponse });

    const result = await useCollaboraStore.getState().fetchCollaboraToken('/webdav/doc.odt', 'share-1');

    expect(mockedEduApi.post).toHaveBeenCalledWith(TOKEN_PATH, { filePath: '/webdav/doc.odt', share: 'share-1' });
    expect(result).toEqual(tokenResponse);
    expect(useCollaboraStore.getState().accessToken).toBe('wopi-token');
    expect(useCollaboraStore.getState().accessTokenTTL).toBe(1000);
  });

  it('returns null and resets loading when the request fails', async () => {
    mockedEduApi.post.mockRejectedValueOnce(new Error('boom'));

    const result = await useCollaboraStore.getState().fetchCollaboraToken('/webdav/doc.odt', 'share-1');

    expect(result).toBeNull();
    expect(useCollaboraStore.getState().accessToken).toBe('');
    expect(useCollaboraStore.getState().isLoading).toBe(false);
  });
});
