/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ApiProperty } from '@nestjs/swagger';

class LinboServerInfoResponseDto {
  @ApiProperty({ example: '10.0.0.1' })
  serverip: string;

  @ApiProperty({ example: 'server' })
  servername: string;

  @ApiProperty({ example: 'linuxmuster.lan' })
  domainname: string;

  @ApiProperty({ example: 'LINUXMUSTER.LAN' })
  realm: string;

  @ApiProperty({ example: 'LINUXMUSTER' })
  sambadomain: string;

  @ApiProperty({ example: 'DC=linuxmuster,DC=lan' })
  basedn: string;

  @ApiProperty({ example: '10.0.0.254' })
  gateway: string;

  @ApiProperty({ example: '10.0.0.254' })
  firewallip: string;

  @ApiProperty({ example: '10.0.0.0' })
  network: string;

  @ApiProperty({ example: '255.255.255.0' })
  netmask: string;

  @ApiProperty({ example: 24 })
  bitmask: number;

  @ApiProperty({ example: '10.0.0.255' })
  broadcast: string;

  @ApiProperty({ type: [String], example: ['default-school', 'agy', 'cgs'] })
  schools: string[];
}

export default LinboServerInfoResponseDto;
