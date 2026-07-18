/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import CalendarSharePermission from '@libs/calendar/constants/calendarSharePermission';
import CalendarShareSubjectType from '@libs/calendar/constants/calendarShareSubjectType';
import type { TCalendarSharePermission, TCalendarShareSubjectType } from '@libs/calendar/types';

class CalendarShareBodyDto {
  @ApiProperty({ example: 'jane.doe', description: 'Username of the user or path of the group' })
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ enum: Object.values(CalendarShareSubjectType), example: CalendarShareSubjectType.USER })
  @IsIn(Object.values(CalendarShareSubjectType))
  subjectType: TCalendarShareSubjectType;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  label: string;

  @ApiProperty({ enum: Object.values(CalendarSharePermission), example: CalendarSharePermission.VIEW })
  @IsIn(Object.values(CalendarSharePermission))
  permission: TCalendarSharePermission;
}

export default CalendarShareBodyDto;
