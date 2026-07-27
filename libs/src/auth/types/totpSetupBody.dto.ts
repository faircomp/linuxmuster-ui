/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsString, MinLength } from 'class-validator';

class TotpSetupBodyDto {
  @IsString()
  @MinLength(1)
  totp: string;

  @IsString()
  @MinLength(1)
  secret: string;
}

export default TotpSetupBodyDto;
