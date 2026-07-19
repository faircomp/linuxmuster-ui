/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';
import LinboImageInfoSidecarDto from './linbo-image-info-sidecar.dto';
import LinboImageFileDto from './linbo-image-file.dto';

class LinboImageManifestEntryDto {
  @ApiProperty({ example: 'debian13.qcow2' })
  name: string;

  @ApiProperty({ example: 'debian13.qcow2' })
  filename: string;

  @ApiProperty({ example: 'debian13' })
  base: string;

  @ApiProperty({ example: 'images/debian13/debian13.qcow2' })
  path: string;

  @ApiProperty({ description: 'Bytes (LMN may emit as string or number)', example: '3296013312' })
  size: string | number;

  @ApiProperty({ nullable: true, example: null })
  md5: string | null;

  @ApiProperty({ type: LinboImageInfoSidecarDto, nullable: true })
  info: LinboImageInfoSidecarDto | null;

  @ApiProperty({ example: 'debian13.qcow2 created by linbo_wrapper' })
  description: string;

  @ApiProperty({ type: [String], example: ['desc', 'info', 'torrent', 'postsync'] })
  extra_files: string[];

  @ApiProperty({ type: [LinboImageFileDto] })
  files: LinboImageFileDto[];

  @ApiProperty({ example: '2026-04-15T17:19:14.019393+00:00' })
  updatedAt: string;
}

export default LinboImageManifestEntryDto;
