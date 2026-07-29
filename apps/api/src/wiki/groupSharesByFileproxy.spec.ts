/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import groupSharesByFileproxy from './groupSharesByFileproxy';

describe('groupSharesByFileproxy', () => {
  it('groups shares by their canonical (case-insensitive host) fileproxy origin', () => {
    const groups = groupSharesByFileproxy([
      { url: 'https://fp1.example/dav/a' },
      { url: 'https://FP1.example/dav/b' },
      { url: 'https://fp2.example/dav/c' },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.fileproxyUrl === 'https://fp1.example')?.shares).toHaveLength(2);
  });

  it('drops shares without a usable URL', () => {
    expect(groupSharesByFileproxy([{ url: '' }])).toHaveLength(0);
  });
});
