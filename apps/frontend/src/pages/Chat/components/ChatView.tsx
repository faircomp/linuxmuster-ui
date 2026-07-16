/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type ChatAdapter from '@/pages/Chat/types/chatAdapter';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

interface ChatViewProps {
  adapter: ChatAdapter;
  title?: string;
}

const ChatView: React.FC<ChatViewProps> = ({ adapter, title }) => {
  const { t } = useTranslation();
  const { messages, input, setInput, handleSubmit, isLoading, error } = adapter;

  return (
    <div className="flex h-full flex-col pb-2">
      {title && (
        <div className="border-b border-muted px-4 py-3">
          <h3 className="font-semibold text-background">{title}</h3>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 mx-4 mt-4 rounded-lg p-3 text-sm text-destructive">
          {t('chat.error')}: {error.message}
        </div>
      )}

      <ChatMessages
        messages={messages}
        isLoading={isLoading}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatView;
