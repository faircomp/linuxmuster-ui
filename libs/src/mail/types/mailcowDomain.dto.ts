/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsString } from 'class-validator';

class MailcowDomainDto {
  @IsString()
  domain_name: string;
}

export default MailcowDomainDto;
