/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import MAILCOW_VALIDATION from '@libs/mail/constants/mailcowValidation';
import Match from '@libs/common/decorators/match.decorator';

class CreateMailboxDto {
  @IsString()
  @MaxLength(MAILCOW_VALIDATION.LOCAL_PART_MAX_LENGTH)
  @Matches(MAILCOW_VALIDATION.LOCAL_PART_ALLOWED_REGEX)
  local_part: string;

  @IsString()
  @Matches(MAILCOW_VALIDATION.DOMAIN_REGEX)
  domain: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  @Max(MAILCOW_VALIDATION.QUOTA_MAX_MB)
  quota: number;

  @IsString()
  @MinLength(MAILCOW_VALIDATION.PASSWORD_MIN_LENGTH)
  @Matches(MAILCOW_VALIDATION.PASSWORD_COMPLEXITY_REGEX)
  password: string;

  @IsString()
  @Match('password')
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
  @ArrayMaxSize(MAILCOW_VALIDATION.MAX_TAGS)
  @IsString({ each: true })
  tags?: string[];
}

export default CreateMailboxDto;
