/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WikiSidebar from './WikiSidebar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/pages/Wiki/store/useWikiStore', () => ({
  default: () => ({
    shares: [{ displayName: 'ShareA' }, { displayName: 'ShareB' }],
    fetchShares: vi.fn(),
    fetchTree: vi.fn(),
    fetchPage: vi.fn(),
    currentPage: null,
    treeVersion: 0,
  }),
}));

vi.mock('@/components/shared/DropdownMenu', () => ({
  default: ({ items }: { items: { label: string }[] }) => (
    <ul>
      {items.map((item) => (
        <li key={item.label}>{item.label}</li>
      ))}
    </ul>
  ),
}));

describe('WikiSidebar', () => {
  it('renders a tree node for each accessible wiki share', () => {
    const html = renderToStaticMarkup(<WikiSidebar />);

    expect(html).toContain('ShareA');
    expect(html).toContain('ShareB');
  });

  it('offers new-page and new-folder actions on folder nodes', () => {
    const html = renderToStaticMarkup(<WikiSidebar />);

    expect(html).toContain('wiki.menu.newPage');
    expect(html).toContain('wiki.menu.newFolder');
  });
});
