/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

class WikiPageDto {
  @ApiProperty({ description: 'Frontend path: `<shareDisplayName>/<relativePath-without-.wiki-without-.md>`.' })
  @IsString()
  path: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  etag?: string | null;

  @ApiProperty()
  @IsInt()
  mtime: number;

  @ApiProperty({ description: 'True when this page is the parent folder index (.wiki/index.md).' })
  @IsBoolean()
  isIndex: boolean;
}

export default WikiPageDto;
