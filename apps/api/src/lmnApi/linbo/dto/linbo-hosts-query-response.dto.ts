/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import LinboHostDto from './linbo-host.dto';

class LinboHostsQueryResponseDto {
  @ApiProperty({ type: [LinboHostDto] })
  hosts: LinboHostDto[];
}

export default LinboHostsQueryResponseDto;
