/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ChatMessage from '@libs/chat/types/chatMessage';

interface ChatMessageSsePayload extends ChatMessage {
  groupName: string;
  conversationType: string;
}

export default ChatMessageSsePayload;
