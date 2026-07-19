/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';

class LinboHealthResponseDto {
  @ApiProperty({ description: 'Subsystem status', enum: ['ok', 'degraded'], example: 'ok' })
  status: string;

  @ApiProperty({ description: 'Whether devices.csv is present and readable', example: true })
  devicesCSV: boolean;

  @ApiProperty({ description: 'Whether /srv/linbo exists', example: true })
  linboDir: boolean;

  @ApiProperty({ description: 'Number of start.conf files found', example: 2 })
  startConfs: number;

  @ApiProperty({ description: 'Number of GRUB config IDs found', example: 4 })
  grubConfigs: number;
}

export default LinboHealthResponseDto;
