/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import SAFE_PATH_SEGMENT_PATTERN from '@libs/common/constants/safePathSegmentPattern';

class LinboUploadImageBodyDto {
  @ApiProperty({ description: 'Image base name (folder)', example: 'debian13' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(SAFE_PATH_SEGMENT_PATTERN, {
    message: 'imageName must not contain path separators, control characters or ".." sequences',
  })
  imageName: string;

  @ApiProperty({ description: 'Filename inside the image folder', example: 'debian13.qcow2' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(SAFE_PATH_SEGMENT_PATTERN, {
    message: 'filename must not contain path separators, control characters or ".." sequences',
  })
  filename: string;
}

export default LinboUploadImageBodyDto;
