/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { joinWikiPath } from './resolveWikiPath';
import { stripSharesPrefix, normalizeSharePath } from './resolveOwningShare';

const fileproxyHitToFrontendPath = (hitPath: string, share: { sharePath?: string; displayName: string }): string => {
  const cleaned = stripSharesPrefix(hitPath);
  const prefix = normalizeSharePath(share.sharePath ?? '');
  let withoutShare = cleaned;
  if (prefix !== '') {
    const prefixWithSlash = `${prefix}/`;
    if (cleaned.toLowerCase().startsWith(prefixWithSlash.toLowerCase())) {
      withoutShare = cleaned.slice(prefixWithSlash.length);
    } else if (cleaned.toLowerCase() === prefix.toLowerCase()) {
      withoutShare = '';
    }
  }
  const withoutMd = withoutShare.replace(/\.md$/i, '');
  const withoutWiki = withoutMd.replace(/\.wiki\/([^/]+)$/i, '$1');
  return joinWikiPath(share.displayName, withoutWiki);
};

export default fileproxyHitToFrontendPath;
