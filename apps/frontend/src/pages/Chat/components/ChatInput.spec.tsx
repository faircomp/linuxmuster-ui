/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CHAT_MESSAGE_MAX_LENGTH from '@libs/chat/constants/chatMessageMaxLength';
import ChatInput from './ChatInput';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const submitNoop = () => Promise.resolve();

describe('ChatInput', () => {
  it('caps the textarea at the chat message max length', () => {
    const html = renderToStaticMarkup(
      <ChatInput
        value="hi"
        onChange={vi.fn()}
        onSubmit={submitNoop}
        isLoading={false}
      />,
    );

    expect(html.toLowerCase()).toContain(`maxlength="${CHAT_MESSAGE_MAX_LENGTH}"`);
  });

  it('falls back to the placeholder translation when none is provided', () => {
    const html = renderToStaticMarkup(
      <ChatInput
        value=""
        onChange={vi.fn()}
        onSubmit={submitNoop}
        isLoading={false}
      />,
    );

    expect(html).toContain('chat.inputPlaceholder');
  });
});
