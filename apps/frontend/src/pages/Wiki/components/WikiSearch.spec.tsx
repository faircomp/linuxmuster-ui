/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WIKI_SEARCH_STATUS } from '@libs/wiki/constants/wikiSearchStatus';
import { UNAVAILABLE_SHARE_REASON } from '@libs/wiki/constants/unavailableShareReason';
import type WikiSearchResponseDto from '@libs/wiki/types/wikiSearchResponseDto';
import WikiSearch from './WikiSearch';

const mockState: {
  search: () => void;
  searchResult: WikiSearchResponseDto | null;
  isSearching: boolean;
  currentPage: null;
  fetchPage: () => void;
} = {
  search: vi.fn(),
  searchResult: null,
  isSearching: false,
  currentPage: null,
  fetchPage: vi.fn(),
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/pages/Wiki/store/useWikiStore', () => ({
  default: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('@/components/shared/Input', () => ({
  default: () => <input />,
}));

describe('WikiSearch', () => {
  beforeEach(() => {
    mockState.searchResult = null;
  });

  it('renders result hits with their title and snippet', () => {
    mockState.searchResult = {
      hits: [
        { path: 'ShareA/page', shareId: 'ShareA', title: 'Found Page', snippets: ['a match'], score: 5, mtime: 1, sort: [] },
      ],
      total: 1,
      status: WIKI_SEARCH_STATUS.OK,
      unavailableShares: [],
    };

    const html = renderToStaticMarkup(<WikiSearch />);

    expect(html).toContain('Found Page');
    expect(html).toContain('a match');
  });

  it('shows the empty state when a successful search returns no hits', () => {
    mockState.searchResult = { hits: [], total: 0, status: WIKI_SEARCH_STATUS.OK, unavailableShares: [] };

    const html = renderToStaticMarkup(<WikiSearch />);

    expect(html).toContain('wiki.search.empty');
  });

  it('shows the unavailable banner and the share reason when search is unavailable', () => {
    mockState.searchResult = {
      hits: [],
      total: 0,
      status: WIKI_SEARCH_STATUS.UNAVAILABLE,
      unavailableShares: [{ shareId: 'ShareA', reason: UNAVAILABLE_SHARE_REASON.HEALTH_CHECK_DOWN }],
    };

    const html = renderToStaticMarkup(<WikiSearch />);

    expect(html).toContain('wiki.search.unavailable');
    expect(html).toContain('wiki.search.reasons.health_check_down');
  });

  it('shows the degraded banner when some shares could not be searched', () => {
    mockState.searchResult = {
      hits: [{ path: 'ShareA/p', shareId: 'ShareA', title: 'Hit', snippets: [], score: 1, mtime: 1, sort: [] }],
      total: 1,
      status: WIKI_SEARCH_STATUS.DEGRADED,
      unavailableShares: [{ shareId: 'ShareB', reason: UNAVAILABLE_SHARE_REASON.TIMEOUT }],
    };

    const html = renderToStaticMarkup(<WikiSearch />);

    expect(html).toContain('wiki.search.degraded');
    expect(html).toContain('wiki.search.reasons.timeout');
  });
});
