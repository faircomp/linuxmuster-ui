/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type { IConfig } from '@onlyoffice/document-editor-react';

interface SanitizeOptions {
  canWrite: boolean;
  username: string;
}

const sanitizeOnlyOfficeConfig = (
  clientConfig: IConfig | undefined,
  { canWrite, username }: SanitizeOptions,
): IConfig => {
  const base = clientConfig && typeof clientConfig === 'object' ? clientConfig : ({} as IConfig);
  const requestedEditMode = base.editorConfig?.mode === 'edit';
  const effectiveEdit = canWrite && requestedEditMode;

  return {
    document: {
      ...base.document,
      fileType: base.document?.fileType ?? '',
      key: base.document?.key ?? '',
      title: base.document?.title ?? '',
      url: base.document?.url ?? '',
      permissions: {
        chat: effectiveEdit,
        edit: effectiveEdit,
        comment: effectiveEdit,
        review: effectiveEdit,
        fillForms: effectiveEdit,
        modifyFilter: effectiveEdit,
        modifyContentControl: effectiveEdit,
        protect: effectiveEdit,
      },
    },
    documentType: base.documentType,
    editorConfig: {
      ...base.editorConfig,
      callbackUrl: base.editorConfig?.callbackUrl ?? '',
      mode: effectiveEdit ? 'edit' : 'view',
      user: {
        id: username,
        name: username,
      },
    },
    type: base.type,
    height: base.height,
    width: base.width,
  };
};

export default sanitizeOnlyOfficeConfig;
