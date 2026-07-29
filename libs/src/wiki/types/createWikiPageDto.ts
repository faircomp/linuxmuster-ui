/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

class CreateWikiPageDto {
  @ApiProperty({
    description:
      'Parent folder path in form `<shareDisplayName>/<relativePath>`. Empty relative part creates the page at the share root.',
  })
  @IsString()
  parentPath: string;

  @ApiProperty({ description: 'Human-readable page title; written as the first # heading of the new page.' })
  @IsString()
  title: string;

  @ApiProperty({
    required: false,
    description:
      "When true, write the page as the parent folder's index (`<parent>/.wiki/index.md`) so clicking the folder in the tree opens this page. Fails with 409 if the folder already has an index page.",
  })
  @IsOptional()
  @IsBoolean()
  asIndex?: boolean;
}

export default CreateWikiPageDto;
