/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ChatRole from '@libs/chat/types/chatRole';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  createdBy?: string;
  createdByUserFirstName?: string;
  createdByUserLastName?: string;
}

export default ChatMessage;
