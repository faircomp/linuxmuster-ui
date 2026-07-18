/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import MAILCOW_VALIDATION from '@libs/mail/constants/mailcowValidation';

class DeleteMailboxesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAILCOW_VALIDATION.MAX_ITEMS_PER_REQUEST)
  @IsString({ each: true })
  items: string[];
}

export default DeleteMailboxesDto;
