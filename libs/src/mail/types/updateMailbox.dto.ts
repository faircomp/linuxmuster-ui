/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import UpdateMailboxAttrDto from './updateMailboxAttr.dto';

class UpdateMailboxDto {
  @IsArray()
  @IsString({ each: true })
  items: string[];

  @ValidateNested()
  @Type(() => UpdateMailboxAttrDto)
  attr: UpdateMailboxAttrDto;
}

export default UpdateMailboxDto;
