/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';

class LinboDhcpIscExportResponseDto {
  @ApiProperty({ example: 'default-school' })
  school: string;

  @ApiProperty({ description: 'ISC DHCP subnet declarations (text block)' })
  subnets: string;

  @ApiProperty({ example: '2026-04-28T13:29:19+00:00' })
  subnetsUpdatedAt: string;

  @ApiProperty({ description: 'ISC DHCP host declarations (text block)' })
  devices: string;

  @ApiProperty({ example: '2026-04-28T13:29:19+00:00' })
  devicesUpdatedAt: string;
}

export default LinboDhcpIscExportResponseDto;
