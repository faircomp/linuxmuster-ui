/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601 } from 'class-validator';
import RecurrenceEditScope from '@libs/calendar/constants/recurrenceEditScope';
import type { TRecurrenceEditScope } from '@libs/calendar/types';

class RecurrenceEditDto {
  @ApiProperty({ enum: Object.values(RecurrenceEditScope) })
  @IsIn(Object.values(RecurrenceEditScope))
  scope: TRecurrenceEditScope;

  @ApiProperty({ example: '2026-04-27T08:00:00.000Z' })
  @IsISO8601()
  occurrenceStart: string;
}

export default RecurrenceEditDto;
