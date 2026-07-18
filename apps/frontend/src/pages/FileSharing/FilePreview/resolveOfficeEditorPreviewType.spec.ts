/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import { ACTIVE_DOCUMENT_EDITOR } from '@libs/filesharing/constants/activeDocumentEditor';
import { FILE_PREVIEW_TYPE } from '@libs/filesharing/types/filePreviewType';
import resolveOfficeEditorPreviewType from './resolveOfficeEditorPreviewType';

describe('resolveOfficeEditorPreviewType', () => {
  it('selects collabora when it is the active editor and configured', () => {
    expect(
      resolveOfficeEditorPreviewType({
        activeEditor: ACTIVE_DOCUMENT_EDITOR.COLLABORA,
        isCollaboraConfigured: true,
        isOnlyOfficeConfigured: true,
      }),
    ).toBe(FILE_PREVIEW_TYPE.COLLABORA);
  });

  it('falls back to onlyoffice when collabora is active but not configured', () => {
    expect(
      resolveOfficeEditorPreviewType({
        activeEditor: ACTIVE_DOCUMENT_EDITOR.COLLABORA,
        isCollaboraConfigured: false,
        isOnlyOfficeConfigured: true,
      }),
    ).toBe(FILE_PREVIEW_TYPE.ONLY_OFFICE);
  });

  it('selects onlyoffice when it is the active editor', () => {
    expect(
      resolveOfficeEditorPreviewType({
        activeEditor: ACTIVE_DOCUMENT_EDITOR.ONLY_OFFICE,
        isCollaboraConfigured: true,
        isOnlyOfficeConfigured: true,
      }),
    ).toBe(FILE_PREVIEW_TYPE.ONLY_OFFICE);
  });

  it('returns null when no configured editor is available', () => {
    expect(
      resolveOfficeEditorPreviewType({
        activeEditor: ACTIVE_DOCUMENT_EDITOR.COLLABORA,
        isCollaboraConfigured: false,
        isOnlyOfficeConfigured: false,
      }),
    ).toBeNull();
  });
});
