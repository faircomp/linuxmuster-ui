/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';

class LinboGrubConfigDto {
  @ApiProperty({ example: 'debian-vdi' })
  id: string;

  @ApiProperty({ example: 'debian-vdi.cfg' })
  filename: string;

  @ApiProperty({ description: 'GRUB config file content', example: 'menuentry ...' })
  content: string;

  @ApiProperty({ example: '2026-04-15T18:45:45.688959+00:00' })
  updatedAt: string;
}

export default LinboGrubConfigDto;
