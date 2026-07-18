/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ACTIVE_DOCUMENT_EDITOR } from '@libs/filesharing/constants/activeDocumentEditor';

const FILESHARING_DOCKER_CONTAINERS = {
  [ACTIVE_DOCUMENT_EDITOR.ONLY_OFFICE]: 'edulution-onlyoffice',
  [ACTIVE_DOCUMENT_EDITOR.COLLABORA]: 'edulution-collabora',
} as const;

export default FILESHARING_DOCKER_CONTAINERS;
