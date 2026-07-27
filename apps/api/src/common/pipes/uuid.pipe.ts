/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import UUID_REGEX_PATTERN from '@libs/common/constants/uuidRegexPattern';
import CommonErrorMessages from '@libs/common/constants/common-error-messages';
import CustomHttpException from '../CustomHttpException';

@Injectable()
class UuidPipe implements PipeTransform<unknown, string> {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  transform(value: unknown): string {
    if (typeof value !== 'string' || !UUID_REGEX_PATTERN.test(value)) {
      throw new CustomHttpException(CommonErrorMessages.INVALID_REQUEST_DATA, HttpStatus.BAD_REQUEST);
    }
    return value;
  }
}

export default UuidPipe;
