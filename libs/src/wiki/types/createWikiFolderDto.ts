/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

class CreateWikiFolderDto {
  @ApiProperty({
    description: 'Parent folder path in form `<shareDisplayName>/<relativePath>`. Empty relative part = share root.',
  })
  @IsString()
  parentPath: string;

  @ApiProperty({ description: 'New folder name (leaf name, no slashes).' })
  @IsString()
  name: string;
}

export default CreateWikiFolderDto;
