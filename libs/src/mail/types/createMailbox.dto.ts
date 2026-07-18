/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

class CreateMailboxDto {
  @IsString()
  local_part: string;

  @IsString()
  domain: string;

  @IsString()
  name: string;

  @IsInt()
  quota: number;

  @IsString()
  password: string;

  @IsString()
  password2: string;

  @IsInt()
  active: number;

  @IsInt()
  force_pw_update: number;

  @IsInt()
  tls_enforce_in: number;

  @IsInt()
  tls_enforce_out: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export default CreateMailboxDto;
