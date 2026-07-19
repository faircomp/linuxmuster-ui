/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { BadRequestException } from '@nestjs/common';
import SafePathSegmentPipe from './safe-path-segment.pipe';

describe('SafePathSegmentPipe', () => {
  const pipe = new SafePathSegmentPipe();

  it('passes a valid path segment through unchanged', () => {
    expect(pipe.transform('win10')).toBe('win10');
    expect(pipe.transform('Windows 11 Pro')).toBe('Windows 11 Pro');
  });

  it.each([
    ['..', 'parent traversal'],
    ['a/b', 'forward slash separator'],
    ['a\\b', 'backslash separator'],
    [`a${String.fromCharCode(0)}b`, 'null control character'],
    ['.hidden', 'leading dot'],
    ['image..name', 'embedded dot-dot'],
    ['a'.repeat(201), 'too long'],
  ])('rejects %j (%s)', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('rejects an empty string as a non-empty-string error', () => {
    expect(() => pipe.transform('')).toThrow('Path segment must be a non-empty string');
  });

  it('rejects non-string input', () => {
    expect(() => pipe.transform(42)).toThrow(BadRequestException);
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });
});
