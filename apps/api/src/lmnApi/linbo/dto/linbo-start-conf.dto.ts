/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';

class LinboStartConfDto {
  @ApiProperty({ example: 'debian-vdi' })
  id: string;

  @ApiProperty({ description: 'start.conf INI content', example: '[LINBO]\nServer = 10.0.0.1\n...' })
  content: string;

  @ApiProperty({ description: 'Content hash (sha256)', example: '26af7df9acbd3651...' })
  hash: string;

  @ApiProperty({ example: '2026-04-15T18:45:45.688959+00:00' })
  updatedAt: string;
}

export default LinboStartConfDto;
