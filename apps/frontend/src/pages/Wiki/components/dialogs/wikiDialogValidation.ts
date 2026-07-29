/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import WIKI_CONSTANTS from '@libs/wiki/constants/wikiConstants';

export const isReservedIndexTitle = (title: string, asIndex: boolean): boolean =>
  !asIndex && title.trim().toLowerCase() === WIKI_CONSTANTS.INDEX_PAGE_SLUG;

export const canSubmitCreatePage = (parentPath: string, title: string, asIndex: boolean, isSaving: boolean): boolean =>
  parentPath !== '' && title.trim() !== '' && !isReservedIndexTitle(title, asIndex) && !isSaving;

export const canSubmitCreateFolder = (parentPath: string, name: string, isSaving: boolean): boolean =>
  parentPath !== '' && name.trim() !== '' && !isSaving;
