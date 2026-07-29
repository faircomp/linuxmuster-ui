/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const PARENT_CHILD_PAIRING_CACHE_CONFIG = {
  CODE_KEY_PREFIX: 'parent-child-pairing:code:',
  USER_KEY_PREFIX: 'parent-child-pairing:user:',
  CODE_LENGTH: 8,
  CODE_TTL_MS: 300_000,
} as const;

export default PARENT_CHILD_PAIRING_CACHE_CONFIG;
