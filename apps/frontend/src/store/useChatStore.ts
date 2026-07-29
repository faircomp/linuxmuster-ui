/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { create } from 'zustand';
import ChatMessage from '@libs/chat/types/chatMessage';
import ConversationType from '@libs/chat/types/conversationType';
import UserChatGroups from '@libs/chat/types/userChatGroups';
import ChatUnreadCount from '@libs/chat/types/chatUnreadCount';
import {
  CHAT_USER_GROUPS_ENDPOINT,
  CHAT_UNREAD_COUNTS_ENDPOINT,
  CHAT_CONVERSATIONS_ENDPOINT,
} from '@libs/chat/constants/chatApiEndpoints';
import CHAT_MESSAGES_DEFAULT_LIMIT from '@libs/chat/constants/chatMessagesDefaultLimit';
import eduApi from '@/api/eduApi';
import handleApiError from '@/utils/handleApiError';

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  currentConversationType: ConversationType | null;
  currentGroupName: string | null;
  userGroups: UserChatGroups | null;
  isLoadingGroups: boolean;
  unreadCounts: ChatUnreadCount[];

  fetchUserGroups: () => Promise<void>;
  fetchUnreadCounts: () => Promise<void>;
  markConversationAsRead: (conversationType: ConversationType, groupName: string) => Promise<void>;
  fetchMessages: (
    conversationType: ConversationType,
    groupName: string,
    limit?: number,
    offset?: number,
  ) => Promise<void>;
  sendMessage: (conversationType: ConversationType, groupName: string, content: string) => Promise<ChatMessage | null>;
  setCurrentConversation: (conversationType: ConversationType, groupName: string) => void;
  addMessage: (message: ChatMessage) => void;
}

const initialState = {
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  currentConversationType: null,
  currentGroupName: null,
  userGroups: null,
  isLoadingGroups: false,
  unreadCounts: [],
};

const useChatStore = create<ChatStore>((set, get) => ({
  ...initialState,

  fetchUserGroups: async () => {
    if (get().isLoadingGroups) return;

    set({ isLoadingGroups: true, error: null });

    try {
      const response = await eduApi.get<UserChatGroups>(CHAT_USER_GROUPS_ENDPOINT);
      set({ userGroups: response.data });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isLoadingGroups: false });
    }
  },

  fetchUnreadCounts: async () => {
    try {
      const response = await eduApi.get<ChatUnreadCount[]>(CHAT_UNREAD_COUNTS_ENDPOINT);
      set({ unreadCounts: response.data });
    } catch (error) {
      handleApiError(error, set);
    }
  },

  markConversationAsRead: async (conversationType, groupName) => {
    set((state) => ({
      unreadCounts: state.unreadCounts.filter(
        (unread) => !(unread.conversationType === conversationType && unread.groupName === groupName),
      ),
    }));

    try {
      const endpoint = `${CHAT_CONVERSATIONS_ENDPOINT}/${conversationType}/${encodeURIComponent(groupName)}/read`;
      await eduApi.post(endpoint);
    } catch (error) {
      handleApiError(error, set);
    }
  },

  fetchMessages: async (conversationType, groupName, limit = CHAT_MESSAGES_DEFAULT_LIMIT, offset = 0) => {
    set({ isLoading: true, error: null });

    try {
      const endpoint = `${CHAT_CONVERSATIONS_ENDPOINT}/${conversationType}/${encodeURIComponent(groupName)}/messages`;
      const response = await eduApi.get<ChatMessage[]>(endpoint, {
        params: { limit, offset },
      });

      const { currentConversationType, currentGroupName } = get();
      if (currentConversationType !== conversationType || currentGroupName !== groupName) return;

      const messages = [...response.data].reverse();

      set({ messages });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (conversationType, groupName, content) => {
    set({ isSending: true, error: null });

    try {
      const endpoint = `${CHAT_CONVERSATIONS_ENDPOINT}/${conversationType}/${encodeURIComponent(groupName)}/messages`;
      const response = await eduApi.post<ChatMessage>(endpoint, { content });

      const newMessage = response.data;

      set((state) => ({
        messages: [...state.messages, newMessage],
      }));

      return newMessage;
    } catch (error) {
      handleApiError(error, set);
      return null;
    } finally {
      set({ isSending: false });
    }
  },

  setCurrentConversation: (conversationType, groupName) => {
    const { currentConversationType, currentGroupName } = get();

    if (currentConversationType !== conversationType || currentGroupName !== groupName) {
      set({
        currentConversationType: conversationType,
        currentGroupName: groupName,
        messages: [],
      });
    }
  },

  addMessage: (message) => {
    set((state) => {
      const exists = state.messages.some((existingMessage) => existingMessage.id === message.id);
      if (exists) return state;
      return { messages: [...state.messages, message] };
    });
  },
}));

export default useChatStore;
