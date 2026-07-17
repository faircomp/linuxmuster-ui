/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import resolveOwningShare, { stripSharesPrefix, normalizeSharePath } from './resolveOwningShare';

describe('stripSharesPrefix', () => {
  it('strips leading slashes and the shares/ prefix', () => {
    expect(stripSharesPrefix('/shares/MyShare/page')).toBe('MyShare/page');
  });
});

describe('normalizeSharePath', () => {
  it('trims surrounding slashes', () => {
    expect(normalizeSharePath('/foo/bar/')).toBe('foo/bar');
  });
});

describe('resolveOwningShare', () => {
  it('picks the share with the longest matching prefix', () => {
    const shares = [
      { displayName: 'Root', sharePath: '' },
      { displayName: 'Sub', sharePath: 'teams/a' },
    ];

    expect(resolveOwningShare('/shares/teams/a/page.md', shares)?.displayName).toBe('Sub');
  });

  it('returns null when no share matches the hit', () => {
    expect(resolveOwningShare('/shares/other/page', [{ displayName: 'X', sharePath: 'teams' }])).toBeNull();
  });

  it('lets an empty-prefix share own any hit', () => {
    expect(resolveOwningShare('/shares/anything/page', [{ displayName: 'Root', sharePath: '' }])?.displayName).toBe(
      'Root',
    );
  });
});
