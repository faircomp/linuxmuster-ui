/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { useState, useCallback, useEffect, useRef, FormEvent } from 'react';
import ChatAdapter from '@/pages/Chat/types/chatAdapter';
import ChatMessageSsePayload from '@libs/chat/types/chatMessageSsePayload';
import ConversationType from '@libs/chat/types/conversationType';
import GroupTypeLocation from '@libs/chat/types/groupTypeLocation';
import { CHAT_GROUP_TYPE_LOCATIONS } from '@libs/chat/constants/chatPaths';
import SOPHOMORIX_GROUP_TYPES from '@libs/lmnApi/constants/sophomorixGroupTypes';
import GENERIC_CHAT_GROUP_TYPE from '@libs/chat/constants/genericChatGroupType';
import SSE_MESSAGE_TYPE from '@libs/common/constants/sseMessageType';
import useChatStore from '@/store/useChatStore';
import useUserStore from '@/store/UserStore/useUserStore';
import useSseEventListener from '@/hooks/useSseEventListener';

const locationToConversationType: Record<GroupTypeLocation, ConversationType> = {
  [CHAT_GROUP_TYPE_LOCATIONS.CLASSES]: SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS,
  [CHAT_GROUP_TYPE_LOCATIONS.PROJECTS]: SOPHOMORIX_GROUP_TYPES.PROJECT,
  [CHAT_GROUP_TYPE_LOCATIONS.GROUPS]: GENERIC_CHAT_GROUP_TYPE,
};

const useGroupChat = (groupName: string, groupTypeLocation: GroupTypeLocation): ChatAdapter => {
  const [input, setInput] = useState('');
  const {
    messages,
    isLoading,
    isSending,
    error,
    fetchMessages,
    sendMessage,
    setCurrentConversation,
    addMessage,
    markConversationAsRead,
  } = useChatStore();
  const { user } = useUserStore();
  const currentUsername = user?.username;

  const conversationType = locationToConversationType[groupTypeLocation];

  const groupNameRef = useRef(groupName);
  const conversationTypeRef = useRef(conversationType);

  useEffect(() => {
    groupNameRef.current = groupName;
    conversationTypeRef.current = conversationType;
  }, [groupName, conversationType]);

  useEffect(() => {
    setCurrentConversation(conversationType, groupName);
    void fetchMessages(conversationType, groupName);
    void markConversationAsRead(conversationType, groupName);
  }, [conversationType, groupName, setCurrentConversation, fetchMessages, markConversationAsRead]);

  const handleNewMessage = useCallback(
    (e: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(e.data) as ChatMessageSsePayload;

        if (payload.groupName !== groupNameRef.current || payload.conversationType !== conversationTypeRef.current) {
          return;
        }

        if (payload.createdBy === currentUsername) {
          return;
        }

        addMessage(payload);
      } catch (err) {
        console.error('Failed to parse SSE chat message', err);
      }
    },
    [currentUsername, addMessage],
  );

  useSseEventListener(SSE_MESSAGE_TYPE.CHAT_NEW_MESSAGE, handleNewMessage, { enabled: true });

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
