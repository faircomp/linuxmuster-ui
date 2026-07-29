/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import SOPHOMORIX_GROUP_TYPES from '@libs/lmnApi/constants/sophomorixGroupTypes';
import GENERIC_CHAT_GROUP_TYPE from '@libs/chat/constants/genericChatGroupType';

const ALLOWED_CONVERSATION_TYPES = [
  SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS,
  SOPHOMORIX_GROUP_TYPES.PROJECT,
  GENERIC_CHAT_GROUP_TYPE,
] as const;

export default ALLOWED_CONVERSATION_TYPES;
