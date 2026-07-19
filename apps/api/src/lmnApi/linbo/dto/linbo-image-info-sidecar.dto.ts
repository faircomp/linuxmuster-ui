/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';

class LinboImageInfoSidecarDto {
  @ApiProperty({ required: false })
  timestamp?: string;

  @ApiProperty({ required: false })
  image?: string;

  @ApiProperty({ required: false })
  imagesize?: string;

  @ApiProperty({ required: false })
  partition?: string;

  @ApiProperty({ required: false })
  partitionsize?: string;
}

export default LinboImageInfoSidecarDto;
