/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ACTIVE_DOCUMENT_EDITOR } from '@libs/filesharing/constants/activeDocumentEditor';
import { FILE_PREVIEW_TYPE, FilePreviewType } from '@libs/filesharing/types/filePreviewType';

interface OfficeEditorAvailability {
  activeEditor: string;
  isCollaboraConfigured: boolean;
  isOnlyOfficeConfigured: boolean;
}

const resolveOfficeEditorPreviewType = ({
  activeEditor,
  isCollaboraConfigured,
  isOnlyOfficeConfigured,
}: OfficeEditorAvailability): FilePreviewType | null => {
  if (activeEditor === ACTIVE_DOCUMENT_EDITOR.COLLABORA && isCollaboraConfigured) {
    return FILE_PREVIEW_TYPE.COLLABORA;
  }
  if (isOnlyOfficeConfigured) {
    return FILE_PREVIEW_TYPE.ONLY_OFFICE;
  }
  return null;
};

export default resolveOfficeEditorPreviewType;
