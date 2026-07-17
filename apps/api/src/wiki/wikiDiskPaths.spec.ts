/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { buildPageDiskPath, buildWikiFolderDiskPath } from './wikiDiskPaths';
import WikiPathError from './WikiPathError';

describe('buildPageDiskPath', () => {
  it('maps a nested page to .wiki/<leaf>.md under its parent', () => {
    expect(buildPageDiskPath('folder/sub/page')).toBe('folder/sub/.wiki/page.md');
  });

  it('maps a share-root page to .wiki/<leaf>.md', () => {
    expect(buildPageDiskPath('page')).toBe('.wiki/page.md');
  });

  it('throws WikiPathError on an empty path', () => {
    expect(() => buildPageDiskPath('')).toThrow(WikiPathError);
  });

  it('throws WikiPathError on unsafe segments', () => {
    expect(() => buildPageDiskPath('folder/../x')).toThrow(WikiPathError);
  });
});

describe('buildWikiFolderDiskPath', () => {
  it('appends the .wiki folder to a parent path', () => {
    expect(buildWikiFolderDiskPath('folder/sub')).toBe('folder/sub/.wiki');
  });

  it('returns the bare .wiki folder at the share root', () => {
    expect(buildWikiFolderDiskPath('')).toBe('.wiki');
  });
});
