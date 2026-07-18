/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import MailboxAclAttrDto from './mailboxAclAttr.dto';

class MailboxAclDto {
  @IsArray()
  @IsString({ each: true })
  items: string[];

  @ValidateNested()
  @Type(() => MailboxAclAttrDto)
  attr: MailboxAclAttrDto;
}

export default MailboxAclDto;
