/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const WIKI_SEARCH_SCOPE = {
  SHARE: 'share',
  ALL: 'all',
} as const;

type WikiSearchScope = (typeof WIKI_SEARCH_SCOPE)[keyof typeof WIKI_SEARCH_SCOPE];

export { WIKI_SEARCH_SCOPE };
export default WikiSearchScope;
