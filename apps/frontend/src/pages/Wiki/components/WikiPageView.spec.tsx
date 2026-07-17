/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type WikiPageDto from '@libs/wiki/types/wikiPageDto';
import WikiPageView from './WikiPageView';

const mockState: { currentPage: WikiPageDto | null } = { currentPage: null };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/pages/Wiki/store/useWikiStore', () => ({
  default: (selector: (state: { currentPage: WikiPageDto | null }) => unknown) => selector(mockState),
}));

vi.mock('@/components/ui/Renderer/MarkdownRenderer', () => ({
  default: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}));

describe('WikiPageView', () => {
  beforeEach(() => {
    mockState.currentPage = null;
  });

  it('shows the empty-state hint when no page is selected', () => {
    const html = renderToStaticMarkup(<WikiPageView />);

    expect(html).toContain('wiki.empty.selectPageHint');
    expect(html).not.toContain('data-testid="markdown"');
  });

  it('renders the selected page title, content, timestamp and an edit action', () => {
    mockState.currentPage = {
      path: 'MyShare/page',
      title: 'My Page Title',
      content: '# Body content',
      etag: 'v1',
      mtime: 1_700_000_000_000,
      isIndex: false,
    };

    const html = renderToStaticMarkup(<WikiPageView />);

    expect(html).toContain('My Page Title');
    expect(html).toContain('# Body content');
    expect(html).toContain('wiki.metadata.updatedAt');
    expect(html).toContain('wiki.actions.edit');
  });
});
