/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import hasControlChars from '@libs/common/utils/hasControlChars';
import INVALID_FILENAME_CHARACTERS from '@libs/common/constants/invalidFilenameCharacters';

const isSafeLeafName = (name: string): boolean => {
  if (!name) {
    return false;
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed === '.' || trimmed === '..') {
    return false;
  }
  if (trimmed.endsWith('.')) {
    return false;
  }
  if (hasControlChars(trimmed)) {
    return false;
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return false;
  }
  return !Array.from(trimmed).some((char) => INVALID_FILENAME_CHARACTERS.includes(char));
};

export default isSafeLeafName;
