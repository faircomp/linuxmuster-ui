/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ALLOWED_CHAT_SOPHOMORIX_TYPES from '@libs/chat/constants/allowedChatSophomorixTypes';
import AllowedChatSophomorixType from '@libs/chat/types/allowedChatSophomorixType';

const isAllowedChatSophomorixType = (value: string): value is AllowedChatSophomorixType =>
  ALLOWED_CHAT_SOPHOMORIX_TYPES.includes(value as AllowedChatSophomorixType);

export default isAllowedChatSophomorixType;
