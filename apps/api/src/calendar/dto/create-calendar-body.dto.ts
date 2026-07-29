/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsHexColor, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import CalendarTag from '@libs/calendar/constants/calendarTag';
import CalendarShareBodyDto from './calendar-share-body.dto';

class CreateCalendarBodyDto {
  @ApiProperty({ example: 'Klasse 10a', description: 'Human-readable calendar name' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ example: 'Klassenkalender', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '#8fc046', description: 'Calendar color (hex)', required: false })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiProperty({ type: [CalendarShareBodyDto], description: 'Users and groups the calendar is shared with' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarShareBodyDto)
  shares: CalendarShareBodyDto[];

  @ApiPropertyOptional({
    description: 'Tag identifiers to assign to the calendar',
    enum: Object.values(CalendarTag),
    isArray: true,
    example: [CalendarTag.TIMETABLE],
  })
  @IsOptional()
  @IsArray()
  @IsIn(Object.values(CalendarTag), { each: true })
  tags?: string[];
}

export default CreateCalendarBodyDto;
