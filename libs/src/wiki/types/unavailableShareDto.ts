/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { UNAVAILABLE_SHARE_REASON } from '../constants/unavailableShareReason';
import type UnavailableShareReason from '../constants/unavailableShareReason';

class UnavailableShareDto {
  @ApiProperty({ description: 'WebDAV share displayName' })
  @IsString()
  shareId: string;

  @ApiProperty({ enum: Object.values(UNAVAILABLE_SHARE_REASON) })
  @IsIn(Object.values(UNAVAILABLE_SHARE_REASON))
  reason: UnavailableShareReason;
}

export default UnavailableShareDto;
