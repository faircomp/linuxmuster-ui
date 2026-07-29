/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import stripSlashes from '@libs/common/utils/stripSlashes';
import isSafeLeafName from '@libs/common/utils/isSafeLeafName';
import WikiPathError from './WikiPathError';

const assertSafeSegments = (segments: string[], options: { rejectLeadingDot: boolean }): void => {
  segments.forEach((segment) => {
    if (!isSafeLeafName(segment)) {
      throw new WikiPathError(`unsafe path segment: ${segment}`);
    }
    if (options.rejectLeadingDot && segment.startsWith('.')) {
      throw new WikiPathError(`unsafe path segment: ${segment}`);
    }
  });
};

const resolveWikiPath = (path: string): { share: string; relativePath: string } => {
  const clean = stripSlashes(path ?? '');
  if (!clean) {
    throw new WikiPathError('wiki path is empty');
  }
  const segments = clean.split('/').filter(Boolean);
  const [share, ...rest] = segments;
  assertSafeSegments([share], { rejectLeadingDot: false });
  assertSafeSegments(rest, { rejectLeadingDot: true });
  return {
    share,
    relativePath: rest.join('/'),
  };
};

export const joinWikiPath = (share: string, relativePath: string): string => {
  const rel = stripSlashes(relativePath);
  return rel ? `${share}/${rel}` : share;
};

export default resolveWikiPath;
