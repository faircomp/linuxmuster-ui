/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type ChatMessage from '@libs/chat/types/chatMessage';
import CHAT_ROLES from '@libs/chat/constants/chatRoles';
import ChatBubble from './ChatBubble';

const message: ChatMessage = {
  id: 'm1',
  role: CHAT_ROLES.USER,
  content: 'Hello world',
  createdAt: '2026-07-16T08:00:00.000Z',
  createdBy: 'alice',
  createdByUserFirstName: 'Alice',
  createdByUserLastName: 'Adams',
};

describe('ChatBubble', () => {
  it('aligns an own message to the end and hides the author name', () => {
    const html = renderToStaticMarkup(
      <ChatBubble
        message={message}
        isOwnMessage
      />,
    );

    expect(html).toContain('justify-end');
    expect(html).toContain('Hello world');
    expect(html).not.toContain('Alice');
  });

  it('aligns a foreign message to the start and shows the author name', () => {
    const html = renderToStaticMarkup(
      <ChatBubble
        message={message}
        isOwnMessage={false}
      />,
    );

    expect(html).toContain('justify-start');
    expect(html).toContain('Alice');
    expect(html).toContain('Adams');
  });
});
