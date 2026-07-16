/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useRef, useEffect, KeyboardEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { Button, cn } from '@edulution-io/ui-kit';
import { Textarea } from '@/components/ui/Textarea';
import CHAT_MESSAGE_MAX_LENGTH from '@libs/chat/constants/chatMessageMaxLength';

const TEXTAREA_MAX_HEIGHT_PX = 120;

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e?: FormEvent) => Promise<void>;
  isLoading: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSubmit, isLoading, placeholder }) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        void onSubmit();
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      void onSubmit(e);
    }
  };

  const isDisabled = !value.trim() || isLoading;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-background/80 flex items-end gap-2 border-t p-4 backdrop-blur-sm"
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t('chat.inputPlaceholder')}
        className="max-h-30 min-h-10 flex-1 resize-none rounded-xl py-2"
        rows={1}
        maxLength={CHAT_MESSAGE_MAX_LENGTH}
        disabled={isLoading}
      />
      <Button
        type="submit"
        variant="btn-collaboration"
        size="icon"
        disabled={isDisabled}
        className={cn('h-10 w-10 shrink-0', isDisabled && 'opacity-50')}
      >
        <FontAwesomeIcon
          icon={faPaperPlane}
          className="h-4 w-4"
        />
      </Button>
    </form>
  );
};

export default ChatInput;
