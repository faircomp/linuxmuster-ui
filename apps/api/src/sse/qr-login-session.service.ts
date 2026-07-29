/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { randomBytes, randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  QR_LOGIN_SESSION_CACHE_PREFIX,
  QR_LOGIN_SESSION_TTL_MS,
  QR_LOGIN_SUBSCRIBER_TOKEN_BYTES,
} from '@libs/auth/constants/qrLoginSessionConfig';
import compareSecretsConstantTime from '@libs/common/utils/compareSecretsConstantTime';
import type QrLoginSessionState from '@libs/auth/types/qrLoginSessionState';

@Injectable()
class QrLoginSessionService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  static buildCacheKey(sessionId: string): string {
    return `${QR_LOGIN_SESSION_CACHE_PREFIX}${sessionId}`;
  }

  async create(): Promise<{ sessionId: string; subscriberToken: string }> {
    const sessionId = randomUUID();
    const subscriberToken = randomBytes(QR_LOGIN_SUBSCRIBER_TOKEN_BYTES).toString('hex');

    await this.cacheManager.set(
      QrLoginSessionService.buildCacheKey(sessionId),
      { subscriberToken },
      QR_LOGIN_SESSION_TTL_MS,
    );

    return { sessionId, subscriberToken };
  }

  async verifySubscriber(sessionId: string, subscriberToken?: string): Promise<boolean> {
    const state = await this.cacheManager.get<QrLoginSessionState>(QrLoginSessionService.buildCacheKey(sessionId));

    if (!state || typeof subscriberToken !== 'string' || !subscriberToken) {
      return false;
    }

    return compareSecretsConstantTime(state.subscriberToken, subscriberToken);
  }

  async consume(sessionId: string): Promise<boolean> {
    const cacheKey = QrLoginSessionService.buildCacheKey(sessionId);
    const state = await this.cacheManager.get<QrLoginSessionState>(cacheKey);

    if (!state) {
      return false;
    }

    await this.cacheManager.del(cacheKey);
    return true;
  }
}

export default QrLoginSessionService;
