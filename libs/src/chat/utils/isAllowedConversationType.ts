/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ALLOWED_CONVERSATION_TYPES from '@libs/chat/constants/allowedConversationTypes';
import ConversationType from '@libs/chat/types/conversationType';

const isAllowedConversationType = (value: string): value is ConversationType =>
  ALLOWED_CONVERSATION_TYPES.includes(value as ConversationType);

export default isAllowedConversationType;
