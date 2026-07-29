/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import ALLOWED_CONVERSATION_TYPES from '@libs/chat/constants/allowedConversationTypes';
import { CHAT_ERROR_MESSAGES } from '@libs/chat/types/chatErrorMessages';
import CustomHttpException from '../../common/CustomHttpException';
import ValidateConversationTypePipe from './validateConversationType.pipe';

const INVALID_CONVERSATION_TYPE = 'not-a-conversation-type';

describe('ValidateConversationTypePipe', () => {
  const pipe = new ValidateConversationTypePipe();

  it.each([...ALLOWED_CONVERSATION_TYPES])('passes through the allowed conversation type "%s"', (conversationType) => {
    expect(pipe.transform(conversationType)).toBe(conversationType);
  });

  it('throws a 400 CustomHttpException for an unknown conversation type', () => {
    expect.assertions(3);

    try {
      pipe.transform(INVALID_CONVERSATION_TYPE);
    } catch (error) {
      expect(error).toBeInstanceOf(CustomHttpException);
      expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((error as CustomHttpException).getResponse()).toBe(CHAT_ERROR_MESSAGES.INVALID_GROUP_TYPE);
    }
  });
});
