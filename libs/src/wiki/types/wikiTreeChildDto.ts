/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { WIKI_NODE_TYPE } from '../constants/wikiNodeType';
import type WikiNodeType from '../constants/wikiNodeType';

class WikiTreeChildDto {
  @ApiProperty({ enum: Object.values(WIKI_NODE_TYPE) })
  @IsString()
  type: WikiNodeType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  path: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasChildren?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  mtime?: number;

  @ApiProperty({
    required: false,
    description: 'Folders only: true when an index page exists at `<folder>/.wiki/index.md`.',
  })
  @IsOptional()
  @IsBoolean()
  hasIndex?: boolean;
}

export default WikiTreeChildDto;
