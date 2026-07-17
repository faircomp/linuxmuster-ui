/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const WIKI_SEARCH_THROTTLE_CONFIG = {
  LIMIT: 60,
  TTL_MS: 60_000,
} as const;

export default WIKI_SEARCH_THROTTLE_CONFIG;
