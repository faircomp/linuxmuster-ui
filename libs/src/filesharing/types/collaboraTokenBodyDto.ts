/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsString } from 'class-validator';

class CollaboraTokenBodyDto {
  @IsString()
  filePath: string;

  @IsString()
  share: string;
}

export default CollaboraTokenBodyDto;
