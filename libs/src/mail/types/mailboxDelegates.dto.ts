/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsArray, IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

class MailboxDelegatesDto {
  @IsString()
  @IsEmail()
  mailbox: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  encryptKey?: string;

  @IsArray()
  @IsEmail({}, { each: true })
  delegates: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sharedFolders?: string[];

  @IsOptional()
  @IsBoolean()
  hasStoredCredentials?: boolean;
}

export default MailboxDelegatesDto;
