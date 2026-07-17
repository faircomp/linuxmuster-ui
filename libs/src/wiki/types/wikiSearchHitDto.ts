/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNumber, IsString } from 'class-validator';

class WikiSearchHitDto {
  @ApiProperty({ description: 'Frontend path: `<shareDisplayName>/<relativePath-without-.wiki-without-.md>`.' })
  @IsString()
  path: string;

  @ApiProperty()
  @IsString()
  shareId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  snippets: string[];

  @ApiProperty()
  @IsNumber()
  score: number;

  @ApiProperty({ description: 'Unix ms timestamp of last indexed modification' })
  @IsInt()
  mtime: number;

  @ApiProperty({
    description: 'Opaque search_after sort cursor returned by the fileproxy; forwarded verbatim on next page requests',
    type: [Object],
  })
  @IsArray()
  sort: unknown[];
}

export default WikiSearchHitDto;
