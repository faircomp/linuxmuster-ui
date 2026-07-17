/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WIKI_SEARCH_STATUS } from '../constants/wikiSearchStatus';
import type WikiSearchStatus from '../constants/wikiSearchStatus';
import WikiSearchHitDto from './wikiSearchHitDto';
import UnavailableShareDto from './unavailableShareDto';

class WikiSearchResponseDto {
  @ApiProperty({ type: () => WikiSearchHitDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WikiSearchHitDto)
  hits: WikiSearchHitDto[];

  @ApiProperty()
  @IsInt()
  @Min(0)
  total: number;

  @ApiProperty({ enum: Object.values(WIKI_SEARCH_STATUS) })
  @IsIn(Object.values(WIKI_SEARCH_STATUS))
  status: WikiSearchStatus;

  @ApiProperty({ type: () => UnavailableShareDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnavailableShareDto)
  unavailableShares: UnavailableShareDto[];

  @ApiPropertyOptional({ description: 'True when the fileproxy hit its per-request result cap' })
  @IsOptional()
  @IsBoolean()
  truncated?: boolean;
}

export default WikiSearchResponseDto;
