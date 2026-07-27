/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import REVOKED_SESSION_CACHE_KEY_PREFIX from '@libs/auth/constants/revokedSessionCacheKeyPrefix';
import MILLISECONDS_PER_SECOND from '@libs/common/constants/millisecondsPerSecond';
import mockCacheManager from '../common/cache-manager.mock';
import SessionDenylistService from './session-denylist.service';

const SID = 'session-id';
const KEY = `${REVOKED_SESSION_CACHE_KEY_PREFIX}${SID}`;

describe('SessionDenylistService', () => {
  const service = new SessionDenylistService(mockCacheManager as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('denySession', () => {
    it('does nothing when there is no session id', async () => {
      await expect(service.denySession(undefined, 1)).resolves.toBe(true);
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('does nothing when there is no expiry', async () => {
      await expect(service.denySession(SID, undefined)).resolves.toBe(true);
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('does not store an already expired session', async () => {
      const expiredSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND) - 60;

      await expect(service.denySession(SID, expiredSeconds)).resolves.toBe(true);
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('stores the session for its remaining lifetime', async () => {
      const expiresInSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND) + 300;

      await expect(service.denySession(SID, expiresInSeconds)).resolves.toBe(true);

      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
      const [key, value, ttl] = mockCacheManager.set.mock.calls[0] as [string, boolean, number];
      expect(key).toBe(KEY);
      expect(value).toBe(true);
      expect(ttl).toBeGreaterThan(290 * MILLISECONDS_PER_SECOND);
      expect(ttl).toBeLessThanOrEqual(300 * MILLISECONDS_PER_SECOND);
    });

    it('reports failure when the cache write throws', async () => {
      mockCacheManager.set.mockRejectedValueOnce(new Error('redis down'));

      await expect(service.denySession(SID, Math.floor(Date.now() / MILLISECONDS_PER_SECOND) + 300)).resolves.toBe(
        false,
      );
    });
  });

  describe('isSessionDenied', () => {
    it('is false without a session id, without touching the cache', async () => {
      await expect(service.isSessionDenied(undefined)).resolves.toBe(false);
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });

    it('is true for a denied session', async () => {
      mockCacheManager.get.mockResolvedValueOnce(true);

      await expect(service.isSessionDenied(SID)).resolves.toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith(KEY);
    });

    it('is false for a session the cache does not know', async () => {
      mockCacheManager.get.mockResolvedValueOnce(undefined);

      await expect(service.isSessionDenied(SID)).resolves.toBe(false);
    });

    it('fails open when the cache read throws, so an outage does not lock everyone out', async () => {
      mockCacheManager.get.mockRejectedValueOnce(new Error('redis down'));

      await expect(service.isSessionDenied(SID)).resolves.toBe(false);
    });
  });
});
