/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import stripSlashes from '@libs/common/utils/stripSlashes';
import isSafeLeafName from '@libs/common/utils/isSafeLeafName';
import WIKI_CONSTANTS from '@libs/wiki/constants/wikiConstants';
import WikiPathError from './WikiPathError';

const assertSafeSegments = (segments: string[]): void => {
  segments.forEach((segment) => {
    if (!isSafeLeafName(segment)) {
      throw new WikiPathError(`unsafe path segment: ${segment}`);
    }
  });
};

export const buildPageDiskPath = (relativePath: string): string => {
  const clean = stripSlashes(relativePath);
  if (!clean) {
    throw new WikiPathError('page path is empty');
  }
  const segments = clean.split('/').filter(Boolean);
  assertSafeSegments(segments);
  const leaf = segments[segments.length - 1];
  const parent = segments.slice(0, -1).join('/');
  const base = parent ? `${parent}/` : '';
  return `${base}${WIKI_CONSTANTS.WIKI_FOLDER_NAME}/${leaf}${WIKI_CONSTANTS.MARKDOWN_EXTENSION}`;
};

export const buildWikiFolderDiskPath = (parentRelativePath: string): string => {
  const clean = stripSlashes(parentRelativePath);
  if (!clean) {
    return WIKI_CONSTANTS.WIKI_FOLDER_NAME;
  }
  const segments = clean.split('/').filter(Boolean);
  assertSafeSegments(segments);
  return `${segments.join('/')}/${WIKI_CONSTANTS.WIKI_FOLDER_NAME}`;
};
