/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn } from 'class-validator';
import CalendarTag from '@libs/calendar/constants/calendarTag';

class CalendarTagsBodyDto {
  @ApiProperty({
    description: 'Tag identifiers to assign to the calendar',
    enum: Object.values(CalendarTag),
    isArray: true,
    example: [CalendarTag.TIMETABLE],
  })
  @IsArray()
  @IsIn(Object.values(CalendarTag), { each: true })
  tags: string[];
}

export default CalendarTagsBodyDto;
