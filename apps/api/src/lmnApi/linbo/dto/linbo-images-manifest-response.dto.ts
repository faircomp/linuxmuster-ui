/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import LinboImageManifestEntryDto from './linbo-image-manifest-entry.dto';

class LinboImagesManifestResponseDto {
  @ApiProperty({ type: [LinboImageManifestEntryDto] })
  images: LinboImageManifestEntryDto[];
}

export default LinboImagesManifestResponseDto;
