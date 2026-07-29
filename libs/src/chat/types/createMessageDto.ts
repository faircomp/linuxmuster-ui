/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import CHAT_MESSAGE_MAX_LENGTH from '@libs/chat/constants/chatMessageMaxLength';

class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(CHAT_MESSAGE_MAX_LENGTH)
  content: string;
}

export default CreateMessageDto;
