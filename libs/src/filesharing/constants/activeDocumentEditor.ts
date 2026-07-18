/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const ACTIVE_DOCUMENT_EDITOR = {
  ONLY_OFFICE: 'onlyoffice',
  COLLABORA: 'collabora',
} as const;

type ActiveDocumentEditor = (typeof ACTIVE_DOCUMENT_EDITOR)[keyof typeof ACTIVE_DOCUMENT_EDITOR];

export { ACTIVE_DOCUMENT_EDITOR };
export default ActiveDocumentEditor;
