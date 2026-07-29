/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import {
  QR_LOGIN_SESSION_CACHE_PREFIX,
  QR_LOGIN_SESSION_TTL_MS,
  QR_LOGIN_SUBSCRIBER_TOKEN_BYTES,
} from '@libs/auth/constants/qrLoginSessionConfig';
import UUID_REGEX_PATTERN from '@libs/common/constants/uuidRegexPattern';
import mockCacheManager from '../common/cache-manager.mock';
import QrLoginSessionService from './qr-login-session.service';

const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const TOKEN = 'a'.repeat(QR_LOGIN_SUBSCRIBER_TOKEN_BYTES * 2);

describe('QrLoginSessionService', () => {
  const service = new QrLoginSessionService(mockCacheManager as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('mints a uuid session and a token of the configured byte length', async () => {
      const { sessionId, subscriberToken } = await service.create();

      expect(sessionId).toMatch(UUID_REGEX_PATTERN);
      expect(subscriberToken).toHaveLength(QR_LOGIN_SUBSCRIBER_TOKEN_BYTES * 2);
      expect(subscriberToken).toMatch(/^[0-9a-f]+$/);
    });

    it('stores only the token, under the prefixed key, for the configured lifetime', async () => {
      const { sessionId, subscriberToken } = await service.create();

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `${QR_LOGIN_SESSION_CACHE_PREFIX}${sessionId}`,
        { subscriberToken },
        QR_LOGIN_SESSION_TTL_MS,
      );
    });

    it('never mints the same session twice', async () => {
      const first = await service.create();
      const second = await service.create();

      expect(first.sessionId).not.toBe(second.sessionId);
      expect(first.subscriberToken).not.toBe(second.subscriberToken);
    });
  });

  describe('verifySubscriber', () => {
    it('accepts the token it handed out', async () => {
      mockCacheManager.get.mockResolvedValueOnce({ subscriberToken: TOKEN });

      await expect(service.verifySubscriber(SESSION_ID, TOKEN)).resolves.toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`${QR_LOGIN_SESSION_CACHE_PREFIX}${SESSION_ID}`);
    });

    it('rejects a different token of the same length', async () => {
      mockCacheManager.get.mockResolvedValueOnce({ subscriberToken: TOKEN });

      await expect(service.verifySubscriber(SESSION_ID, 'b'.repeat(TOKEN.length))).resolves.toBe(false);
    });

    it.each([[undefined], ['']])('rejects the missing token %p', async (token) => {
      mockCacheManager.get.mockResolvedValueOnce({ subscriberToken: TOKEN });

      await expect(service.verifySubscriber(SESSION_ID, token)).resolves.toBe(false);
    });

    it('rejects a session the cache does not know', async () => {
      mockCacheManager.get.mockResolvedValueOnce(undefined);

      await expect(service.verifySubscriber(SESSION_ID, TOKEN)).resolves.toBe(false);
    });
  });

  describe('consume', () => {
    it('deletes the session, so a captured code cannot be redeemed twice', async () => {
      mockCacheManager.get.mockResolvedValueOnce({ subscriberToken: TOKEN });

      await expect(service.consume(SESSION_ID)).resolves.toBe(true);
      expect(mockCacheManager.del).toHaveBeenCalledWith(`${QR_LOGIN_SESSION_CACHE_PREFIX}${SESSION_ID}`);
    });

    it('reports nothing to consume for an unknown session, without deleting', async () => {
      mockCacheManager.get.mockResolvedValueOnce(undefined);

      await expect(service.consume(SESSION_ID)).resolves.toBe(false);
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });
  });
});
