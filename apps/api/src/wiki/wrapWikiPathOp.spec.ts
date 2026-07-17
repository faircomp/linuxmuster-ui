/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import wrapWikiPathOp from './wrapWikiPathOp';
import WikiPathError from './WikiPathError';
import CustomHttpException from '../common/CustomHttpException';

describe('wrapWikiPathOp', () => {
  it('returns the function result when it succeeds', () => {
    expect(wrapWikiPathOp(() => 'ok')).toBe('ok');
  });

  it('maps a WikiPathError to a 400 CustomHttpException', () => {
    expect.assertions(2);
    try {
      wrapWikiPathOp(() => {
        throw new WikiPathError('bad segment');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CustomHttpException);
      expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('rethrows non-WikiPathError errors unchanged', () => {
    const other = new Error('boom');
    expect(() =>
      wrapWikiPathOp(() => {
        throw other;
      }),
    ).toThrow(other);
  });
});
