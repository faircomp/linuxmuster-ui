/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsNotEmpty, IsString } from 'class-validator';

class CreateSyncJobRequestDto {
  @IsString()
  @IsNotEmpty()
  mailProviderId: string;

  @IsString()
  @IsNotEmpty()
  user1: string;

  @IsString()
  @IsNotEmpty()
  password1: string;
}

export default CreateSyncJobRequestDto;
