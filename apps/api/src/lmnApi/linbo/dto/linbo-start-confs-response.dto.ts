/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import LinboStartConfDto from './linbo-start-conf.dto';

class LinboStartConfsResponseDto {
  @ApiProperty({ type: [LinboStartConfDto] })
  startConfs: LinboStartConfDto[];
}

export default LinboStartConfsResponseDto;
