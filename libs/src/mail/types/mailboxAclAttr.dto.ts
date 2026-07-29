/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ArrayMaxSize, IsArray, IsString } from 'class-validator';
import MAILCOW_VALIDATION from '@libs/mail/constants/mailcowValidation';

class MailboxAclAttrDto {
  @IsArray()
  @ArrayMaxSize(MAILCOW_VALIDATION.USER_ACL_VALUES.length)
  @IsString({ each: true })
  user_acl: string[];
}

export default MailboxAclAttrDto;
