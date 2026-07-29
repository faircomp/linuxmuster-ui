/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

class CalendarEventAttendeeDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ example: 'REQ-PARTICIPANT', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: 'NEEDS-ACTION', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

export default CalendarEventAttendeeDto;
