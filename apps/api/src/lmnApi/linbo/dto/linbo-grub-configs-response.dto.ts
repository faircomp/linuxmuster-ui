/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import LinboGrubConfigDto from './linbo-grub-config.dto';

class LinboGrubConfigsResponseDto {
  @ApiProperty({ example: 'default-school' })
  school: string;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ type: [LinboGrubConfigDto] })
  configs: LinboGrubConfigDto[];
}

export default LinboGrubConfigsResponseDto;
