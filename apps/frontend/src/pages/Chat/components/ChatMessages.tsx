/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useEffect, useRef } from 'react';
import type ChatMessage from '@libs/chat/types/chatMessage';
import useUserStore from '@/store/UserStore/useUserStore';
import CircleLoader from '@/components/ui/Loading/CircleLoader';
import ChatBubble from './ChatBubble';
import ChatEmptyState from './ChatEmptyState';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUserStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return <ChatEmptyState />;
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
      {messages.map((message) => (
        <ChatBubble
          key={message.id}
          message={message}
          isOwnMessage={message.createdBy === user?.username}
        />
      ))}
      {isLoading && (
        <div className="flex justify-center py-4">
          <CircleLoader />
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
