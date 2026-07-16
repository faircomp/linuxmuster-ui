/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { FormEvent } from 'react';
import ChatMessage from '@libs/chat/types/chatMessage';

interface ChatAdapter {
  messages: ChatMessage[];
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (e?: FormEvent) => Promise<void>;
  isLoading: boolean;
  error?: Error | null;
}

export default ChatAdapter;
