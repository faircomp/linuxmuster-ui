/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import AUTH_GRANT_TYPES from '@libs/auth/constants/authGrantTypes';

class AuthenticateRequestDto {
  @IsIn(Object.values(AUTH_GRANT_TYPES))
  grant_type: string;

  @ValidateIf((dto: AuthenticateRequestDto) => dto.grant_type === AUTH_GRANT_TYPES.PASSWORD)
  @IsString()
  @MinLength(1)
  username: string;

  @ValidateIf((dto: AuthenticateRequestDto) => dto.grant_type === AUTH_GRANT_TYPES.PASSWORD)
  @IsString()
  @MinLength(1)
  password: string;

  @ValidateIf((dto: AuthenticateRequestDto) => dto.grant_type === AUTH_GRANT_TYPES.REFRESH_TOKEN)
  @IsString()
  @MinLength(1)
  refresh_token: string;

  @IsOptional()
  @IsString()
  scope?: string;
}

export default AuthenticateRequestDto;
