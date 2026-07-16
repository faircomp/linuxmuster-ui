/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { useState, useCallback, useEffect, FormEvent } from 'react';
import ChatAdapter from '@/pages/Chat/types/chatAdapter';
import ConversationType from '@libs/chat/types/conversationType';
import GroupTypeLocation from '@libs/chat/types/groupTypeLocation';
import { CHAT_GROUP_TYPE_LOCATIONS } from '@libs/chat/constants/chatPaths';
import SOPHOMORIX_GROUP_TYPES from '@libs/lmnApi/constants/sophomorixGroupTypes';
import GENERIC_CHAT_GROUP_TYPE from '@libs/chat/constants/genericChatGroupType';
import useChatStore from '@/store/useChatStore';

const locationToConversationType: Record<GroupTypeLocation, ConversationType> = {
  [CHAT_GROUP_TYPE_LOCATIONS.CLASSES]: SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS,
  [CHAT_GROUP_TYPE_LOCATIONS.PROJECTS]: SOPHOMORIX_GROUP_TYPES.PROJECT,
  [CHAT_GROUP_TYPE_LOCATIONS.GROUPS]: GENERIC_CHAT_GROUP_TYPE,
};

const useGroupChat = (groupName: string, groupTypeLocation: GroupTypeLocation): ChatAdapter => {
  const [input, setInput] = useState('');
  const { messages, isLoading, isSending, error, fetchMessages, sendMessage, setCurrentConversation } = useChatStore();

  const conversationType = locationToConversationType[groupTypeLocation];

  useEffect(() => {
    setCurrentConversation(conversationType, groupName);
    void fetchMessages(conversationType, groupName);
  }, [conversationType, groupName, setCurrentConversation, fetchMessages]);

  const handleSubmit = useCallback(
    async (e?: FormEvent): Promise<void> => {
      e?.preventDefault();

      if (!input.trim() || isSending) return;

      const messageContent = input.trim();
      setInput('');

      await sendMessage(conversationType, groupName, messageContent);
    },
    [input, isSending, conversationType, groupName, sendMessage],
  );

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading: isLoading || isSending,
    error: error ? new Error(error) : null,
  };
};

export default useGroupChat;
