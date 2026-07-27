/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import UuidPipe from './uuid.pipe';

describe('UuidPipe', () => {
  const pipe = new UuidPipe();

  it('passes a valid uuid through unchanged', () => {
    const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('accepts an uppercase uuid, since the pattern is case insensitive', () => {
    const uuid = '3F2504E0-4F89-41D3-9A0C-0305E82C3301';

    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it.each([
    [''],
    ['abc'],
    ['../etc/passwd'],
    ['3f2504e0-4f89-41d3-9a0c-0305e82c330'],
    ['xx3f2504e0-4f89-41d3-9a0c-0305e82c3301yy'],
    [['3f2504e0-4f89-41d3-9a0c-0305e82c3301']],
    [undefined],
    [null],
    [42],
  ])('rejects %p with a bad request', (value) => {
    expect(() => pipe.transform(value)).toThrow(
      expect.objectContaining({ status: HttpStatus.BAD_REQUEST }) as unknown as Error,
    );
  });
});
