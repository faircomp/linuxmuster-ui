/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

export const stripSharesPrefix = (hitPath: string): string => hitPath.replace(/^\/+/, '').replace(/^shares\//i, '');

export const normalizeSharePath = (sharePath: string): string => sharePath.replace(/^\/+/, '').replace(/\/+$/, '');

interface OwnableShare {
  matchSharePath?: string;
  sharePath?: string;
}

const getMatchSharePath = (share: OwnableShare): string => share.matchSharePath ?? share.sharePath ?? '';

const shareMatchesHit = (rel: string, prefix: string): boolean => {
  if (prefix === '') {
    return true;
  }
  const relLower = rel.toLowerCase();
  const prefixLower = prefix.toLowerCase();
  return relLower === prefixLower || relLower.startsWith(`${prefixLower}/`);
};

const resolveOwningShare = <T extends OwnableShare>(hitPath: string, shares: T[]): T | null => {
  const rel = stripSharesPrefix(hitPath);
  let owningShare: T | null = null;
  let owningPrefixLength = -1;
  shares.forEach((share) => {
    const prefix = normalizeSharePath(getMatchSharePath(share));
    if (!shareMatchesHit(rel, prefix)) {
      return;
    }
    if (prefix.length > owningPrefixLength) {
      owningShare = share;
      owningPrefixLength = prefix.length;
    }
  });
  return owningShare;
};

export default resolveOwningShare;
