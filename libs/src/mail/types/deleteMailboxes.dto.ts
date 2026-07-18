/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsArray, IsString } from 'class-validator';

class DeleteMailboxesDto {
  @IsArray()
  @IsString({ each: true })
  items: string[];
}

export default DeleteMailboxesDto;
