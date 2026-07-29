/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ALLOWED_CONVERSATION_TYPES from '@libs/chat/constants/allowedConversationTypes';

type ConversationType = (typeof ALLOWED_CONVERSATION_TYPES)[number];

export default ConversationType;
