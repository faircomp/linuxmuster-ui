/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import AUTH_PATHS from '@libs/auth/constants/auth-paths';

const post = vi.fn();
const postResult = vi.fn<[], Promise<unknown>>();
vi.mock('@/api/eduApi', () => ({
  default: {
    post: (...args: unknown[]) => {
      post(...args);
      return postResult();
    },
  },
}));
vi.mock('@/utils/handleApiError', () => ({ default: vi.fn() }));
vi.mock('@libs/common/utils/delay', () => ({ default: () => Promise.resolve() }));

// eslint-disable-next-line import/first
import createUserSlice from './createUserSlice';

const buildSlice = () => {
  const set = vi.fn();
  return { slice: createUserSlice(set as never, (() => ({})) as never, {} as never), set };
};

describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revokes the refresh token on the server before signing out locally', async () => {
    postResult.mockResolvedValue({});
    const { slice, set } = buildSlice();

    await slice.logout('a-refresh-token');

    expect(post).toHaveBeenCalledWith(AUTH_PATHS.AUTH_LOGOUT_ENDPOINT, { refresh_token: 'a-refresh-token' });
    expect(set).toHaveBeenCalledWith({ isAuthenticated: false });
  });

  it('signs out locally even when the server call fails, so nobody is stuck signed in', async () => {
    postResult.mockRejectedValue(new Error('429'));
    const { slice, set } = buildSlice();

    await slice.logout('a-refresh-token');

    expect(set).toHaveBeenCalledWith({ isAuthenticated: false });
  });

  it('skips the server call when there is no refresh token to revoke', async () => {
    const { slice, set } = buildSlice();

    await slice.logout(undefined);

    expect(post).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({ isAuthenticated: false });
  });
});
