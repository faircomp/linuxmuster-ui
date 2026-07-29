/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import WIKI_ERROR_MESSAGES from '@libs/wiki/constants/wikiErrorMessages';

class WikiEtagConflictHttpException extends HttpException {
  constructor(currentEtag: string, serverContent: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: WIKI_ERROR_MESSAGES.PAGE_ETAG_CONFLICT,
        currentEtag,
        serverContent,
      },
      HttpStatus.CONFLICT,
    );
    Logger.warn(
      `HttpStatus: ${HttpStatus.CONFLICT}, Error: pageEtagConflict, Data: ${JSON.stringify({ currentEtag })}`,
      'wiki',
    );
  }
}

export default WikiEtagConflictHttpException;
