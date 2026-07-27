/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import EDU_API_ROOT from '@libs/common/constants/eduApiRoot';
import SSE_EDU_API_ENDPOINTS from '@libs/sse/constants/sseEndpoints';
import AUTH_PATHS from '@libs/auth/constants/auth-paths';

export const QR_LOGIN_SESSION_TTL_MS = 3 * 60 * 1000;

export const QR_LOGIN_SESSION_CACHE_PREFIX = 'qr-login-session:';

export const QR_LOGIN_SUBSCRIBER_TOKEN_BYTES = 32;

export const QR_LOGIN_TOKEN_COOKIE_PREFIX = 'qr-login-token-';

export const QR_LOGIN_COOKIE_PATH = `/${EDU_API_ROOT}/${SSE_EDU_API_ENDPOINTS.SSE}/${AUTH_PATHS.AUTH_ENDPOINT}`;
