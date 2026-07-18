/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsHexColor, IsIn, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';
import CalendarEventClassification from '@libs/calendar/constants/calendarEventClassification';
import CalendarEventTransparency from '@libs/calendar/constants/calendarEventTransparency';
import type { TCalendarEventClassification, TCalendarEventTransparency } from '@libs/calendar/types';
import CalendarEventAttendeeDto from './calendar-event-attendee.dto';
import RecurrenceEditDto from './recurrence-edit.dto';

class CalendarEventBodyDto {
  @ApiProperty({ example: 'event-123-uid', description: 'CalDAV UID; empty when creating a new event' })
  @IsString()
  uid: string;

  @ApiProperty({ example: 'personal', description: 'Parent calendar id' })
  @IsString()
  calendarId: string;

  @ApiProperty({ example: 'Math 9a', description: 'Event summary/title' })
  @IsString()
  summary: string;

  @ApiProperty({ example: 'Chapter 5 exam', description: 'Event description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Room 102', description: 'Event location', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: '2026-04-20T08:00:00.000Z', description: 'ISO8601 start timestamp' })
  @IsISO8601()
  start: string;

  @ApiProperty({ example: '2026-04-20T08:45:00.000Z', description: 'ISO8601 end timestamp' })
  @IsISO8601()
  end: string;

  @ApiProperty({ example: false, description: 'True if the event has no time component' })
  @IsBoolean()
  allDay: boolean;

  @ApiProperty({
    example: 'FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20260701T000000Z',
    description: 'Raw iCalendar RRULE string',
    required: false,
  })
  @IsOptional()
  @IsString()
  rrule?: string;

  @ApiProperty({ enum: Object.values(CalendarEventClassification), required: false })
  @IsOptional()
  @IsIn(Object.values(CalendarEventClassification))
  classification?: TCalendarEventClassification;

  @ApiProperty({ enum: Object.values(CalendarEventTransparency), required: false })
  @IsOptional()
  @IsIn(Object.values(CalendarEventTransparency))
  transparency?: TCalendarEventTransparency;

  @ApiProperty({ example: '#0081c6', description: 'RFC 7986 VEVENT color (hex)', required: false })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiProperty({ type: [CalendarEventAttendeeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarEventAttendeeDto)
  attendees?: CalendarEventAttendeeDto[];

  @ApiProperty({ type: CalendarEventAttendeeDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CalendarEventAttendeeDto)
  organizer?: CalendarEventAttendeeDto;

  @ApiProperty({ example: ['2026-04-22T08:00:00.000Z'], required: false })
  @IsOptional()
  @IsArray()
  @IsISO8601({}, { each: true })
  exdate?: string[];

  @ApiProperty({ type: RecurrenceEditDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceEditDto)
  recurrenceEdit?: RecurrenceEditDto;
}

export default CalendarEventBodyDto;
