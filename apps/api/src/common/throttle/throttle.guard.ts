/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { HTTP_HEADERS } from '@libs/common/types/http-methods';
import CommonErrorMessages from '@libs/common/constants/common-error-messages';
import THROTTLE_METADATA_KEY from '@libs/common/constants/throttleMetadataKey';
import ThrottleConfig from '@libs/common/types/throttleConfig';
import CustomHttpException from '../CustomHttpException';

interface ThrottleEntry {
  count: number;
  expiresAt: number;
}

const throttleCache = new Map<string, ThrottleEntry>();
const MAX_CACHE_SIZE = 10_000;
const TARGET_SIZE_AFTER_CLEANUP = MAX_CACHE_SIZE * 0.9;
const EVICTION_CHECK_INTERVAL = 20;
let insertionCounter = 0;

const evictExpiredEntries = (): void => {
  const now = Date.now();
  throttleCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      throttleCache.delete(key);
    }
  });
  if (throttleCache.size <= MAX_CACHE_SIZE) {
    return;
  }
  const entries = Array.from(throttleCache.entries()).sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  const entriesToRemove = entries.slice(0, throttleCache.size - TARGET_SIZE_AFTER_CLEANUP);
  entriesToRemove.forEach(([key]) => throttleCache.delete(key));
};

@Injectable()
class ThrottleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.reflector.getAllAndOverride<ThrottleConfig | undefined>(THROTTLE_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!config) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const username = request.user?.preferred_username;

    let principal: string;
    if (username) {
      principal = username;
    } else if (config.byIp) {
      principal = `ip:${request.ip ?? 'unknown'}`;
    } else {
      return true;
    }

    const route = request.route as { path?: string } | undefined;
    const routePath = `${request.method}:${route?.path ?? request.path}`;
    const cacheKey = `${principal}:${routePath}`;
    const now = Date.now();
    const cached = throttleCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      if (cached.count >= config.limit) {
        const retryAfterSeconds = Math.ceil((cached.expiresAt - now) / 1000);
        response.setHeader(HTTP_HEADERS.XRateLimitLimit, config.limit);
        response.setHeader(HTTP_HEADERS.XRateLimitRemaining, 0);
        response.setHeader(HTTP_HEADERS.RetryAfter, retryAfterSeconds);
        throw new CustomHttpException(
          CommonErrorMessages.RATE_LIMIT_EXCEEDED,
          HttpStatus.TOO_MANY_REQUESTS,
          { principal, routePath },
          ThrottleGuard.name,
        );
      }
      cached.count += 1;
      response.setHeader(HTTP_HEADERS.XRateLimitLimit, config.limit);
      response.setHeader(HTTP_HEADERS.XRateLimitRemaining, config.limit - cached.count);
      return true;
    }

    insertionCounter += 1;
    if (insertionCounter % EVICTION_CHECK_INTERVAL === 0) {
      evictExpiredEntries();
    }
    throttleCache.set(cacheKey, { count: 1, expiresAt: now + config.ttl });
    response.setHeader(HTTP_HEADERS.XRateLimitLimit, config.limit);
    response.setHeader(HTTP_HEADERS.XRateLimitRemaining, config.limit - 1);
    return true;
  }
}

export default ThrottleGuard;
