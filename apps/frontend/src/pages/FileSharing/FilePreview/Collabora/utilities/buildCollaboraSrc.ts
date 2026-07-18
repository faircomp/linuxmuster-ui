/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import WOPI from '@libs/filesharing/constants/wopi';

const COLLABORA_EDITOR_PATH = '/browser/dist/cool.html';

export const buildWopiSrc = (apiBaseUrl: string, fileId: string): string => `${apiBaseUrl}/${WOPI.BASE_PATH}/${fileId}`;

export const buildCollaboraEditorUrl = (collaboraUrl: string, wopiSrc: string): string =>
  `${collaboraUrl}${COLLABORA_EDITOR_PATH}?WOPISrc=${encodeURIComponent(wopiSrc)}`;
