/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

class WikiSuccessDto {
  @ApiProperty({ type: Boolean, enum: [true] })
  @IsBoolean()
  success: boolean;
}

export default WikiSuccessDto;
