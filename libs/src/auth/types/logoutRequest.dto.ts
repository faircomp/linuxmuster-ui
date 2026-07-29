/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsString, MinLength } from 'class-validator';

class LogoutRequestDto {
  @IsString()
  @MinLength(1)
  refresh_token: string;
}

export default LogoutRequestDto;
