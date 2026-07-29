/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const WIKI_ERROR_MESSAGES = {
  INVALID_PATH: 'wiki.errors.invalidPath',
  INVALID_NAME: 'wiki.errors.invalidName',
  PAGE_NOT_FOUND: 'wiki.errors.pageNotFound',
  PAGE_ALREADY_EXISTS: 'wiki.errors.pageAlreadyExists',
  PAGE_CREATION_FAILED: 'wiki.errors.pageCreationFailed',
  PAGE_UPDATE_FAILED: 'wiki.errors.pageUpdateFailed',
  PAGE_DELETION_FAILED: 'wiki.errors.pageDeletionFailed',
  PAGE_ETAG_CONFLICT: 'wiki.errors.pageEtagConflict',
  PAGE_ETAG_MISSING: 'wiki.errors.pageEtagMissing',
  PAGE_TOO_LARGE: 'wiki.errors.pageTooLarge',
  FOLDER_NOT_FOUND: 'wiki.errors.folderNotFound',
  FOLDER_ALREADY_EXISTS: 'wiki.errors.folderAlreadyExists',
  FOLDER_CREATION_FAILED: 'wiki.errors.folderCreationFailed',
  FOLDER_DELETION_FAILED: 'wiki.errors.folderDeletionFailed',
  ACCESS_DENIED: 'wiki.errors.accessDenied',
  INVALID_SEARCH_PARAMS: 'wiki.errors.invalidSearchParams',
} as const;

export default WIKI_ERROR_MESSAGES;
