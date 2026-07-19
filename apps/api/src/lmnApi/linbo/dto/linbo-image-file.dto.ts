/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';

class LinboImageFileDto {
  @ApiProperty({ example: 'debian13.qcow2' })
  name: string;

  @ApiProperty({ description: 'Bytes (LMN may emit as string or number)', example: '3296013312' })
  size: string | number;

  @ApiProperty({ enum: ['image', 'extra_file'], example: 'image' })
  type: string;
}

export default LinboImageFileDto;
