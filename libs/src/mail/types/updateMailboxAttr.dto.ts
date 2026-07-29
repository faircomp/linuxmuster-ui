/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import MAILCOW_VALIDATION from '@libs/mail/constants/mailcowValidation';

class UpdateMailboxAttrDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  quota?: number;

  @IsOptional()
  @IsInt()
  active?: number;

  @IsOptional()
  @IsInt()
  force_pw_update?: number;

  @IsOptional()
  @IsInt()
  sogo_access?: number;

  @IsOptional()
  @IsInt()
  imap_access?: number;

  @IsOptional()
  @IsInt()
  pop3_access?: number;

  @IsOptional()
  @IsInt()
  smtp_access?: number;

  @IsOptional()
  @IsInt()
  tls_enforce_in?: number;

  @IsOptional()
  @IsInt()
  tls_enforce_out?: number;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  password2?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAILCOW_VALIDATION.MAX_TAGS)
  @IsString({ each: true })
  tags?: string[];
}

export default UpdateMailboxAttrDto;
