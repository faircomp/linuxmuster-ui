/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { WIKI_SEARCH_SCOPE } from '../constants/wikiSearchScope';
import type WikiSearchScope from '../constants/wikiSearchScope';

class WikiSearchRequestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1024)
  query: string;

  @ApiProperty({ enum: Object.values(WIKI_SEARCH_SCOPE) })
  @IsIn(Object.values(WIKI_SEARCH_SCOPE))
  scope: WikiSearchScope;

  @ApiPropertyOptional({ description: 'Required when scope === "share": the share displayName to search within.' })
  @IsOptional()
  @IsString()
  shareId?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  page: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(100)
  size: number;
}

export default WikiSearchRequestDto;
