/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

class LinboBatchMacsDto {
  @ApiProperty({
    description: 'List of MAC addresses to query (max 500)',
    type: [String],
    example: ['52:54:00:1a:2b:3c', '52:54:00:4d:5e:6f'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  macs: string[];
}

export default LinboBatchMacsDto;
