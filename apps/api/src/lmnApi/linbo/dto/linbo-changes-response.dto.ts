/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';

class LinboChangesResponseDto {
  @ApiProperty({ type: [String] })
  allConfigIds: string[];

  @ApiProperty({ type: [String] })
  allHostMacs: string[];

  @ApiProperty({ type: [String] })
  allStartConfIds: string[];

  @ApiProperty({ type: [String] })
  configsChanged: string[];

  @ApiProperty({ type: [String] })
  deletedHosts: string[];

  @ApiProperty({ type: [String] })
  deletedStartConfs: string[];

  @ApiProperty()
  dhcpChanged: boolean;

  @ApiProperty({ type: [String] })
  hostsChanged: string[];

  @ApiProperty({ description: 'Cursor for next delta fetch (unix timestamp)', example: '1745847600' })
  nextCursor: string;

  @ApiProperty({ type: [String] })
  startConfsChanged: string[];
}

export default LinboChangesResponseDto;
