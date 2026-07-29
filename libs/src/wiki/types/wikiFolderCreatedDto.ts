/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

class WikiFolderCreatedDto {
  @ApiProperty({ description: 'Frontend path of the newly created folder.' })
  @IsString()
  path: string;
}

export default WikiFolderCreatedDto;
