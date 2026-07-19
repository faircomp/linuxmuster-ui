/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import SAFE_PATH_SEGMENT_PATTERN from '@libs/common/constants/safePathSegmentPattern';

@Injectable()
class SafePathSegmentPipe implements PipeTransform<unknown, string> {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  transform(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) {
      throw new BadRequestException('Path segment must be a non-empty string');
    }
    if (!SAFE_PATH_SEGMENT_PATTERN.test(value)) {
      throw new BadRequestException(
        'Path segment must not contain path separators, control characters or ".." sequences',
      );
    }
    return value;
  }
}

export default SafePathSegmentPipe;
