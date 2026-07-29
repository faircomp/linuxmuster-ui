/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';

class LinboHostDto {
  @ApiProperty({ example: 'pc01' })
  hostname: string;

  @ApiProperty({ example: '52:54:00:1a:2b:3c' })
  mac: string;

  @ApiProperty({ required: false, example: '10.0.0.51' })
  ip?: string;

  @ApiProperty({ required: false, example: 'classroom' })
  group?: string;

  @ApiProperty({ required: false, example: 'lab1' })
  room?: string;

  @ApiProperty({ required: false, example: 'default-school' })
  school?: string;

  @ApiProperty({ required: false, example: 'classroom-studentcomputer' })
  sophomorixRole?: string;

  @ApiProperty({ required: false, example: '' })
  sophomorixComment?: string;

  @ApiProperty({ required: false, description: 'PXE flag as string ("0" / "1" / "2"…)', example: '1' })
  pxeFlag?: string;

  @ApiProperty({ required: false, description: 'Whether PXE boot is enabled', example: true })
  pxeEnabled?: boolean;

  @ApiProperty({ required: false, example: '' })
  officeKey?: string;

  @ApiProperty({ required: false, example: '' })
  windowsKey?: string;

  @ApiProperty({ required: false, example: '' })
  dhcpOptions?: string;

  @ApiProperty({ required: false, example: '' })
  options?: string;
}

export default LinboHostDto;
