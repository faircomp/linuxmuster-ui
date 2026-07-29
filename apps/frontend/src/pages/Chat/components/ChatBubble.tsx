/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import type ChatMessage from '@libs/chat/types/chatMessage';
import { cn } from '@edulution-io/ui-kit';
import formatIsoDateToLocaleString from '@libs/common/utils/Date/formatIsoDateToLocaleString';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwnMessage }) => (
  <div className={cn('flex w-full', isOwnMessage ? 'justify-end' : 'justify-start')}>
    <div
      className={cn(
        'max-w-[75%] rounded-2xl px-4 py-2',
        isOwnMessage ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-accent text-background',
      )}
    >
      <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
      <div className={cn('mt-1 flex items-center gap-2 text-xs', isOwnMessage ? 'justify-end' : 'justify-between')}>
        {!isOwnMessage && (
          <span className="font-medium opacity-70">
            {message.createdByUserFirstName} {message.createdByUserLastName}
          </span>
        )}
        <span className={isOwnMessage ? 'text-white/70' : 'text-muted-foreground'}>
          {formatIsoDateToLocaleString(message.createdAt)}
        </span>
      </div>
    </div>
  </div>
);

export default ChatBubble;
