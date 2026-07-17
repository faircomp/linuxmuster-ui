/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const WIKI_CONSTANTS = {
  WIKI_FOLDER_NAME: '.wiki',
  MARKDOWN_EXTENSION: '.md',
  INDEX_PAGE_SLUG: 'index',
  MAX_WIKI_PAGE_SIZE_BYTES: 5 * 1024 * 1024,
} as const;

export default WIKI_CONSTANTS;
