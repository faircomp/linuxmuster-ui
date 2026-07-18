/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';

class CalendarEventResponseDto {
  @ApiProperty({ example: 'event-123-uid', description: 'CalDAV UID of the event' })
  uid: string;

  @ApiProperty({ example: 'personal', description: 'Parent calendar id' })
  calendarId: string;

  @ApiProperty({ example: 'etag-abc', description: 'CalDAV ETag for optimistic concurrency', required: false })
  etag?: string;

  @ApiProperty({ example: 'Math 9a', description: 'Event summary/title' })
  summary: string;

  @ApiProperty({ example: 'Chapter 5 exam', description: 'Event description', required: false })
  description?: string;

  @ApiProperty({ example: 'Room 102', description: 'Event location', required: false })
  location?: string;

  @ApiProperty({ example: '2026-04-20T08:00:00.000Z', description: 'ISO8601 start timestamp' })
  start: string;

  @ApiProperty({ example: '2026-04-20T08:45:00.000Z', description: 'ISO8601 end timestamp' })
  end: string;

  @ApiProperty({ example: false, description: 'True if the event has no time component (all-day)' })
  allDay: boolean;

  @ApiProperty({
    example: 'FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20260701T000000Z',
    description: 'Raw iCalendar RRULE string; expand on the client via rrule.js',
    required: false,
  })
  rrule?: string;

  @ApiProperty({ example: '#0081c6', description: 'RFC 7986 VEVENT color (hex)', required: false })
  color?: string;
}

export default CalendarEventResponseDto;
