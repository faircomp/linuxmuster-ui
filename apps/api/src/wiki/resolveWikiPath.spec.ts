/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import resolveWikiPath, { joinWikiPath } from './resolveWikiPath';
import WikiPathError from './WikiPathError';

describe('resolveWikiPath', () => {
  it('splits a path into share and relativePath', () => {
    expect(resolveWikiPath('MyShare/folder/page')).toEqual({ share: 'MyShare', relativePath: 'folder/page' });
  });

  it('strips surrounding slashes and yields an empty relativePath at the share root', () => {
    expect(resolveWikiPath('/MyShare/')).toEqual({ share: 'MyShare', relativePath: '' });
  });

  it('throws WikiPathError on an empty or slash-only path', () => {
    expect(() => resolveWikiPath('')).toThrow(WikiPathError);
    expect(() => resolveWikiPath('///')).toThrow(WikiPathError);
  });

  it('throws WikiPathError on traversal segments', () => {
    expect(() => resolveWikiPath('MyShare/../secret')).toThrow(WikiPathError);
  });

  it('rejects a leading dot in relative segments (hidden files)', () => {
    expect(() => resolveWikiPath('MyShare/.wiki')).toThrow(WikiPathError);
  });

  it('rejects unsafe filename characters', () => {
    expect(() => resolveWikiPath('MyShare/a<b')).toThrow(WikiPathError);
  });
});

describe('joinWikiPath', () => {
  it('joins share and relativePath', () => {
    expect(joinWikiPath('MyShare', 'folder/page')).toBe('MyShare/folder/page');
  });

  it('returns just the share when relativePath is empty', () => {
    expect(joinWikiPath('MyShare', '')).toBe('MyShare');
  });

  it('strips slashes from relativePath', () => {
    expect(joinWikiPath('MyShare', '/folder/')).toBe('MyShare/folder');
  });
});
