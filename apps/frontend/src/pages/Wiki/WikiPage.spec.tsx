/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WikiPage from './WikiPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/structure/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./components/WikiSidebar', () => ({
  default: () => null,
}));

describe('WikiPage', () => {
  it('renders the empty-state hint and a labelled sidebar placeholder', () => {
    const html = renderToStaticMarkup(<WikiPage />);

    expect(html).toContain('wiki.empty.selectPageHint');
    expect(html).toContain('aria-label="wiki.sidebar"');
  });
});
