/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CHAT_USER_GROUPS_ENDPOINT, CHAT_CONVERSATIONS_ENDPOINT } from '@libs/chat/constants/chatApiEndpoints';
import CHAT_MESSAGES_DEFAULT_LIMIT from '@libs/chat/constants/chatMessagesDefaultLimit';
import SOPHOMORIX_GROUP_TYPES from '@libs/lmnApi/constants/sophomorixGroupTypes';
import CHAT_ROLES from '@libs/chat/constants/chatRoles';
import ChatMessage from '@libs/chat/types/chatMessage';
import UserChatGroups from '@libs/chat/types/userChatGroups';
import eduApi from '@/api/eduApi';
import useChatStore from './useChatStore';

vi.mock('@/api/eduApi', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedEduApi = eduApi as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

const GROUP_NAME = 'group-a';

const buildMessage = (id: string): ChatMessage => ({
  id,
  role: CHAT_ROLES.USER,
  content: 'hello',
  createdAt: '2026-07-16T00:00:00.000Z',
});

describe('useChatStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      messages: [],
      isLoading: false,
      isSending: false,
      error: null,
      currentConversationType: null,
      currentGroupName: null,
      userGroups: null,
      isLoadingGroups: false,
    });
  });

  it('fetchUserGroups requests the groups endpoint and stores the result', async () => {
    const userGroups: UserChatGroups = { classes: [{ name: '07a', path: '/07a' }], projects: [], groups: [] };
    mockedEduApi.get.mockResolvedValue({ data: userGroups });

    await useChatStore.getState().fetchUserGroups();

    expect(mockedEduApi.get).toHaveBeenCalledWith(CHAT_USER_GROUPS_ENDPOINT);
    expect(useChatStore.getState().userGroups).toEqual(userGroups);
    expect(useChatStore.getState().isLoadingGroups).toBe(false);
  });

  it('sendMessage posts to the conversation endpoint and appends the returned message', async () => {
    const message = buildMessage('m1');
    mockedEduApi.post.mockResolvedValue({ data: message });

    const result = await useChatStore.getState().sendMessage(SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS, GROUP_NAME, 'hello');

    expect(mockedEduApi.post).toHaveBeenCalledWith(
      `${CHAT_CONVERSATIONS_ENDPOINT}/${SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS}/${GROUP_NAME}/messages`,
      { content: 'hello' },
    );
    expect(result).toEqual(message);
    expect(useChatStore.getState().messages).toContainEqual(message);
  });

  it('fetchMessages loads the active conversation and stores the messages in reversed order', async () => {
    useChatStore.setState({ currentConversationType: SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS, currentGroupName: GROUP_NAME });
    mockedEduApi.get.mockResolvedValue({ data: [buildMessage('newest'), buildMessage('oldest')] });

    await useChatStore.getState().fetchMessages(SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS, GROUP_NAME);

    expect(mockedEduApi.get).toHaveBeenCalledWith(
      `${CHAT_CONVERSATIONS_ENDPOINT}/${SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS}/${GROUP_NAME}/messages`,
      { params: { limit: CHAT_MESSAGES_DEFAULT_LIMIT, offset: 0 } },
    );
    expect(useChatStore.getState().messages.map((message) => message.id)).toEqual(['oldest', 'newest']);
  });

  it('fetchMessages discards a stale response when the active conversation changed', async () => {
    useChatStore.setState({ currentConversationType: SOPHOMORIX_GROUP_TYPES.PROJECT, currentGroupName: GROUP_NAME });
    mockedEduApi.get.mockResolvedValue({ data: [buildMessage('stale')] });

    await useChatStore.getState().fetchMessages(SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS, GROUP_NAME);

    expect(mockedEduApi.get).toHaveBeenCalled();
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it('addMessage appends a message once and deduplicates by id', () => {
    const message = buildMessage('m1');

    useChatStore.getState().addMessage(message);
    useChatStore.getState().addMessage(message);

    expect(useChatStore.getState().messages).toHaveLength(1);
  });

  it('setCurrentConversation switches the conversation and clears loaded messages', () => {
    useChatStore.setState({ messages: [buildMessage('old')] });

    useChatStore.getState().setCurrentConversation(SOPHOMORIX_GROUP_TYPES.PROJECT, GROUP_NAME);

    const state = useChatStore.getState();
    expect(state.currentConversationType).toBe(SOPHOMORIX_GROUP_TYPES.PROJECT);
    expect(state.currentGroupName).toBe(GROUP_NAME);
    expect(state.messages).toEqual([]);
  });
});
