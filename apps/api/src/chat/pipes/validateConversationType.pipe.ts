/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { CHAT_ERROR_MESSAGES } from '@libs/chat/types/chatErrorMessages';
import ConversationType from '@libs/chat/types/conversationType';
import isAllowedConversationType from '@libs/chat/utils/isAllowedConversationType';
import CustomHttpException from '../../common/CustomHttpException';

@Injectable()
class ValidateConversationTypePipe implements PipeTransform<string, ConversationType> {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  transform(value: string): ConversationType {
    if (!isAllowedConversationType(value)) {
      throw new CustomHttpException(CHAT_ERROR_MESSAGES.INVALID_GROUP_TYPE, HttpStatus.BAD_REQUEST);
    }

    return value;
  }
}

export default ValidateConversationTypePipe;
