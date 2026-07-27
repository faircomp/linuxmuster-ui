/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import path from 'node:path';
import { BadRequestException } from '@nestjs/common';
import WHITEBOARD_FILES_PATH from '@libs/whiteboard/constants/whiteboardFilesPath';
import ValidatePathPipe from '../common/pipes/validatePath.pipe';

const pipe = new ValidatePathPipe(WHITEBOARD_FILES_PATH);
const base = path.resolve(WHITEBOARD_FILES_PATH);

const staysInsideBase = (value: string | string[]): boolean => {
  const resolved = path.resolve(base, pipe.transform(value) as string);
  return resolved === base || resolved.startsWith(base + path.sep);
};

describe('whiteboard asset path validation', () => {
  it('passes a plain asset filename through unchanged', () => {
    expect(pipe.transform('drawing.png')).toBe('drawing.png');
  });

  it.each([
    ['parent traversal', '../../edulution.pem'],
    ['deep traversal', '../../../../../../etc/passwd'],
    ['absolute path', '/etc/passwd'],
    ['traversal behind a valid segment', 'room/../../../data/edulution.pem'],
  ])('keeps %s inside the whiteboard directory', (_label, value) => {
    expect(staysInsideBase(value)).toBe(true);
  });

  it('keeps a traversal split across path segments inside the directory', () => {
    expect(staysInsideBase(['..', '..', 'edulution.pem'])).toBe(true);
  });

  it('rejects an empty filename', () => {
    expect(() => pipe.transform('   ')).toThrow(BadRequestException);
  });
});
