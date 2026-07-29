/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import extractTitleFromMarkdown from './extractTitleFromMarkdown';

describe('extractTitleFromMarkdown', () => {
  it('returns the first H1 heading text', () => {
    expect(extractTitleFromMarkdown('# My Title\n\nbody text')).toBe('My Title');
  });

  it('trims surrounding whitespace of the heading', () => {
    expect(extractTitleFromMarkdown('#   Spaced Title   \n')).toBe('Spaced Title');
  });

  it('returns null when there is no H1 (H2 is not a title)', () => {
    expect(extractTitleFromMarkdown('no heading here')).toBeNull();
    expect(extractTitleFromMarkdown('## Not an H1')).toBeNull();
  });

  it('returns null for empty content', () => {
    expect(extractTitleFromMarkdown('')).toBeNull();
  });
});
