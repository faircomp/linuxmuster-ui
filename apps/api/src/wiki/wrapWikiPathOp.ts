/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import WIKI_ERROR_MESSAGES from '@libs/wiki/constants/wikiErrorMessages';
import CustomHttpException from '../common/CustomHttpException';
import WikiPathError from './WikiPathError';

const wrapWikiPathOp = <T>(fn: () => T): T => {
  try {
    return fn();
  } catch (error) {
    if (error instanceof WikiPathError) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.INVALID_PATH, HttpStatus.BAD_REQUEST, {
        reason: error.message,
      });
    }
    throw error;
  }
};

export default wrapWikiPathOp;
