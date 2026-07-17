/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const canonicalFileproxyOrigin = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host.toLowerCase()}`;
  } catch {
    return trimmed.replace(/\/$/, '');
  }
};

const groupSharesByFileproxy = <T extends { url?: string }>(
  shares: T[],
): Array<{ fileproxyUrl: string; shares: T[] }> => {
  const byUrl = new Map<string, T[]>();
  shares.forEach((share) => {
    const url = canonicalFileproxyOrigin(share.url ?? '');
    if (!url) {
      return;
    }
    const existing = byUrl.get(url);
    if (existing) {
      existing.push(share);
    } else {
      byUrl.set(url, [share]);
    }
  });
  return Array.from(byUrl.entries()).map(([fileproxyUrl, group]) => ({ fileproxyUrl, shares: group }));
};

export default groupSharesByFileproxy;
