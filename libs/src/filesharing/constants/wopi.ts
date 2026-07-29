/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const WOPI = {
  TOKEN_EXPIRY: '24h',
  TOKEN_TTL_MS: 86_400_000,
  BASE_PATH: 'wopi/files',
} as const;

export default WOPI;
