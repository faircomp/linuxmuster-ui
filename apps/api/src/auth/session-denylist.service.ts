/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import REVOKED_SESSION_CACHE_KEY_PREFIX from '@libs/auth/constants/revokedSessionCacheKeyPrefix';
import MILLISECONDS_PER_SECOND from '@libs/common/constants/millisecondsPerSecond';

@Injectable()
class SessionDenylistService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  static getCacheKey(sid: string): string {
    return `${REVOKED_SESSION_CACHE_KEY_PREFIX}${sid}`;
  }

  async denySession(sid?: string, exp?: number): Promise<boolean> {
    if (!sid || !exp) {
      return true;
    }

    const remainingLifetimeMs = exp * MILLISECONDS_PER_SECOND - Date.now();
    if (remainingLifetimeMs <= 0) {
      return true;
    }

    try {
      await this.cacheManager.set(SessionDenylistService.getCacheKey(sid), true, remainingLifetimeMs);
      return true;
    } catch (error) {
      Logger.error(`Failed to deny session ${sid}: ${(error as Error).message}`, SessionDenylistService.name);
      return false;
    }
  }

  async isSessionDenied(sid?: string): Promise<boolean> {
    if (!sid) {
      return false;
    }

    try {
      return (await this.cacheManager.get(SessionDenylistService.getCacheKey(sid))) === true;
    } catch (error) {
      Logger.error(
        `Failed to read the session denylist for ${sid}: ${(error as Error).message}`,
        SessionDenylistService.name,
      );
      return false;
    }
  }
}

export default SessionDenylistService;
