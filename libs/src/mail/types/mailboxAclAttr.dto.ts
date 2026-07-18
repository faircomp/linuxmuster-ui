/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsArray, IsString } from 'class-validator';

class MailboxAclAttrDto {
  @IsArray()
  @IsString({ each: true })
  user_acl: string[];
}

export default MailboxAclAttrDto;
