/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const WIKI_SEARCH_STATUS = {
  OK: 'ok',
  UNAVAILABLE: 'unavailable',
  DEGRADED: 'degraded',
} as const;

type WikiSearchStatus = (typeof WIKI_SEARCH_STATUS)[keyof typeof WIKI_SEARCH_STATUS];

export { WIKI_SEARCH_STATUS };
export default WikiSearchStatus;
