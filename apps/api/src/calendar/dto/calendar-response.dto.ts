/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import CalendarShareBodyDto from './calendar-share-body.dto';

class CalendarResponseDto {
  @ApiProperty({ example: 'personal', description: 'Calendar identifier (CalDAV path segment)' })
  id: string;

  @ApiProperty({ example: 'My Calendar', description: 'Human-readable calendar name' })
  displayName: string;

  @ApiProperty({ example: 'primary', description: 'Calendar color (hex or token label)', required: false })
  color?: string;

  @ApiProperty({ example: 'Shared team events', description: 'Optional description', required: false })
  description?: string;

  @ApiProperty({ example: 'a-ctag-value', description: 'CalDAV ctag for change detection', required: false })
  ctag?: string;

  @ApiProperty({ example: false, description: 'True if the calendar is read-only for the current user' })
  readOnly: boolean;

  @ApiProperty({ example: false, description: 'True if the calendar is subscribed/shared rather than owned' })
  isSubscribed: boolean;

  @ApiProperty({ example: '/SOGo/dav/user/Calendar/personal/', description: 'CalDAV URL path' })
  url: string;

  @ApiProperty({
    type: [CalendarShareBodyDto],
    description: 'Users and groups the calendar is shared with',
    required: false,
  })
  shares?: CalendarShareBodyDto[];

  @ApiProperty({
    example: ['timetable'],
    description: 'Application-side metadata tags',
    type: [String],
    required: false,
  })
  tags?: string[];
}

export default CalendarResponseDto;
