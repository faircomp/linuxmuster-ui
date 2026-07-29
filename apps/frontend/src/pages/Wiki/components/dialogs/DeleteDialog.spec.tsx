/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WIKI_NODE_TYPE } from '@libs/wiki/constants/wikiNodeType';
import DeleteDialog from './DeleteDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/pages/Wiki/store/useWikiStore', () => ({
  default: (selector: (state: { deletePage: () => void; deleteFolder: () => void; isSaving: boolean }) => unknown) =>
    selector({ deletePage: vi.fn(), deleteFolder: vi.fn(), isSaving: false }),
}));

vi.mock('@/components/ui/DeleteConfirmationDialog', () => ({
  default: ({
    titleTranslationKey,
    messageTranslationKey,
  }: {
    titleTranslationKey: string;
    messageTranslationKey: string;
  }) => (
    <div>
      <span>{titleTranslationKey}</span>
      <span>{messageTranslationKey}</span>
    </div>
  ),
}));

describe('DeleteDialog', () => {
  it('uses the page-specific confirmation copy for a page node', () => {
    const html = renderToStaticMarkup(
      <DeleteDialog
        isOpen
        path="MyShare/page"
        nodeType={WIKI_NODE_TYPE.PAGE}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('wiki.dialog.delete.pageTitle');
    expect(html).toContain('wiki.dialog.delete.pageMessage');
  });

  it('uses the folder-specific confirmation copy for a folder node', () => {
    const html = renderToStaticMarkup(
      <DeleteDialog
        isOpen
        path="MyShare/sub"
        nodeType={WIKI_NODE_TYPE.FOLDER}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('wiki.dialog.delete.folderTitle');
    expect(html).toContain('wiki.dialog.delete.folderMessage');
  });
});
