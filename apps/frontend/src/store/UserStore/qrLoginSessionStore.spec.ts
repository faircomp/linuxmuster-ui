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

// eslint-disable-next-line import/first
import createQrCodeSlice from './createQrCodeSlice';

const buildSlice = () => {
  const set = vi.fn();
  return createQrCodeSlice(set as never, (() => ({})) as never, {} as never);
};

describe('createQrLoginSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the server for a session instead of inventing one locally', async () => {
    postResult.mockResolvedValue({ data: { sessionId: 'server-side-id' } });

    await expect(buildSlice().createQrLoginSession()).resolves.toBe('server-side-id');
    expect(post).toHaveBeenCalledWith(`${AUTH_PATHS.AUTH_ENDPOINT}/${AUTH_PATHS.AUTH_QR_SESSION}`);
  });

  it('yields nothing when the server refuses, so no qr code is shown', async () => {
    postResult.mockRejectedValue(new Error('429'));

    await expect(buildSlice().createQrLoginSession()).resolves.toBeUndefined();
  });
});
