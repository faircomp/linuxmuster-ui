/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LinboUploadImageResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;

  @ApiProperty({ description: 'Number of bytes uploaded to LMN', example: 3296013312 })
  bytesUploaded: number;

  @ApiPropertyOptional({ description: 'Raw response body returned by the upstream complete endpoint' })
  upstream?: unknown;
}

export default LinboUploadImageResponseDto;
