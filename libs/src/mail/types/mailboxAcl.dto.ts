/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsObject, IsString, ValidateNested } from 'class-validator';
import MAILCOW_VALIDATION from '@libs/mail/constants/mailcowValidation';
import MailboxAclAttrDto from './mailboxAclAttr.dto';

class MailboxAclDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAILCOW_VALIDATION.MAX_ITEMS_PER_REQUEST)
  @IsString({ each: true })
  items: string[];

  @IsObject()
  @ValidateNested()
  @Type(() => MailboxAclAttrDto)
  attr: MailboxAclAttrDto;
}

export default MailboxAclDto;
