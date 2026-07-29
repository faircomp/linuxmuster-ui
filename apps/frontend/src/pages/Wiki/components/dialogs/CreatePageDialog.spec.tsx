/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CreatePageDialog from './CreatePageDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/pages/Wiki/store/useWikiStore', () => ({
  default: (selector: (state: { createPage: () => void; isSaving: boolean }) => unknown) =>
    selector({ createPage: vi.fn(), isSaving: false }),
}));

vi.mock('@/components/ui/AdaptiveDialog', () => ({
  default: ({ title, body, footer }: { title: string; body: React.ReactNode; footer: React.ReactNode }) => (
    <div>
      <span>{title}</span>
      {body}
      {footer}
    </div>
  ),
}));

vi.mock('@/components/ui/DialogFooterButtons', () => ({
  default: ({ disableSubmit }: { disableSubmit?: boolean }) => (
    <button
      type="button"
      disabled={disableSubmit}
    >
      submit
    </button>
  ),
}));

vi.mock('@/components/shared/Input', () => ({
  default: () => <input />,
}));

vi.mock('@/components/ui/Checkbox', () => ({
  default: () => <input type="checkbox" />,
}));

describe('CreatePageDialog', () => {
  it('warns and disables submit when no location is selected', () => {
    const html = renderToStaticMarkup(
      <CreatePageDialog
        isOpen
        parentPath=""
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('wiki.dialog.noLocationSelected');
    expect(html).toContain('disabled');
  });

  it('shows the target location when a parent folder is selected', () => {
    const html = renderToStaticMarkup(
      <CreatePageDialog
        isOpen
        parentPath="MyShare"
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('wiki.dialog.location');
    expect(html).toContain('MyShare');
  });
});
