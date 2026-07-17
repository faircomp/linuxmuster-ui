/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import WIKI_CONSTANTS from '../constants/wikiConstants';

class UpdateWikiPageDto {
  @ApiProperty({ description: 'New markdown content; the first # heading becomes the page title.' })
  @IsString()
  @MaxLength(WIKI_CONSTANTS.MAX_WIKI_PAGE_SIZE_BYTES)
  content: string;

  @ApiProperty({ required: false, description: 'ETag for optimistic concurrency; also accepted via If-Match header.' })
  @IsOptional()
  @IsString()
  etag?: string;
}

export default UpdateWikiPageDto;
