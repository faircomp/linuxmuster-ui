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

vi.mock('./components/WikiPageView', () => ({
  default: () => null,
}));

describe('WikiPage', () => {
  it('lays out a labelled sidebar column next to the content pane', () => {
    const html = renderToStaticMarkup(<WikiPage />);

    expect(html).toContain('aria-label="wiki.sidebar"');
  });
});
