/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import SOPHOMORIX_GROUP_TYPES from '@libs/lmnApi/constants/sophomorixGroupTypes';
import SSE_MESSAGE_TYPE from '@libs/common/constants/sseMessageType';
import NOTIFICATION_SOURCE_TYPE from '@libs/notification/constants/notificationSourceType';
import JwtUser from '@libs/user/types/jwt/jwtUser';
import CustomHttpException from '../common/CustomHttpException';
import SseService from '../sse/sse.service';
import NotificationsService from '../notifications/notifications.service';
import GroupsService from '../groups/groups.service';
import { Conversation } from './schemas/conversation.schema';
import { ChatMessage } from './schemas/chatMessage.schema';
import { ChatReadStatus } from './schemas/chatReadStatus.schema';
import ChatService from './chat.service';

const GROUP_NAME = '07a';
const USERNAME = 'alice';
const CONVERSATION_TYPE = SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS;

const mockConversationModel = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  aggregate: jest.fn(),
};
const mockChatMessageModel = {
  create: jest.fn(),
  collection: { name: 'chatmessages' },
};
const mockChatReadStatusModel = {
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  collection: { name: 'chatreadstatuses' },
};
const mockCacheManager = { get: jest.fn() };
const mockSseService = { sendEventToUsers: jest.fn() };
const mockNotificationsService = { upsertNotificationForSource: jest.fn(), markNotificationReadBySource: jest.fn() };
const mockGroupsService = { getUserGroupsAndProjects: jest.fn() };

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(Conversation.name), useValue: mockConversationModel },
        { provide: getModelToken(ChatMessage.name), useValue: mockChatMessageModel },
        { provide: getModelToken(ChatReadStatus.name), useValue: mockChatReadStatusModel },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: SseService, useValue: mockSseService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: GroupsService, useValue: mockGroupsService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateAuthorizedConversation', () => {
    it('throws 404 when the group is not cached', async () => {
      expect.assertions(2);
      mockCacheManager.get.mockResolvedValue(null);

      try {
        await service.getOrCreateAuthorizedConversation(GROUP_NAME, CONVERSATION_TYPE, USERNAME);
      } catch (error) {
        expect(error).toBeInstanceOf(CustomHttpException);
        expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('throws 403 when the user is not a member of the group', async () => {
      expect.assertions(2);
      mockCacheManager.get.mockResolvedValue({ members: [{ username: 'someone-else' }] });

      try {
        await service.getOrCreateAuthorizedConversation(GROUP_NAME, CONVERSATION_TYPE, USERNAME);
      } catch (error) {
        expect(error).toBeInstanceOf(CustomHttpException);
        expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    });

    it('upserts and returns the conversation with its members for an authorized user', async () => {
      mockCacheManager.get.mockResolvedValue({ members: [{ username: USERNAME }, { username: 'bob' }] });
      const conversation = { id: 'conversation-1' };
      mockConversationModel.findOneAndUpdate.mockResolvedValue(conversation);

      const result = await service.getOrCreateAuthorizedConversation(GROUP_NAME, CONVERSATION_TYPE, USERNAME);

      expect(result.members).toEqual([USERNAME, 'bob']);
      expect(result.conversation).toBe(conversation);
      expect(mockConversationModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAuthorizedMessages', () => {
    it('returns an empty list when the conversation has no messages', async () => {
      mockCacheManager.get.mockResolvedValue({ members: [{ username: USERNAME }] });
      mockConversationModel.aggregate.mockResolvedValue([]);

      const result = await service.getAuthorizedMessages(GROUP_NAME, CONVERSATION_TYPE, USERNAME);

      expect(result).toEqual([]);
    });

    it('serializes each message createdAt to an ISO string', async () => {
      mockCacheManager.get.mockResolvedValue({ members: [{ username: USERNAME }] });
      const createdAt = new Date('2026-07-16T08:00:00.000Z');
      mockConversationModel.aggregate.mockResolvedValue([
        { messages: [{ id: 'message-1', role: 'user', content: 'hello', createdAt }] },
      ]);

      const result = await service.getAuthorizedMessages(GROUP_NAME, CONVERSATION_TYPE, USERNAME);

      expect(result).toEqual([{ id: 'message-1', role: 'user', content: 'hello', createdAt: createdAt.toISOString() }]);
    });
  });

  describe('getUnreadCounts', () => {
    it('returns an empty list when the user has no chat groups', async () => {
      mockGroupsService.getUserGroupsAndProjects.mockResolvedValue({ classes: [], projects: [], groups: [] });

      const result = await service.getUnreadCounts(USERNAME);

      expect(result).toEqual([]);
      expect(mockConversationModel.aggregate).not.toHaveBeenCalled();
    });

    it('aggregates unread counts across the user groups', async () => {
      mockGroupsService.getUserGroupsAndProjects.mockResolvedValue({
        classes: [{ name: GROUP_NAME, path: '/07a' }],
        projects: [],
        groups: [],
      });
      const counts = [{ groupName: GROUP_NAME, conversationType: CONVERSATION_TYPE, count: 3 }];
      mockConversationModel.aggregate.mockResolvedValue(counts);

      const result = await service.getUnreadCounts(USERNAME);

      expect(result).toEqual(counts);
      expect(mockConversationModel.aggregate).toHaveBeenCalledTimes(1);
    });
  });

  describe('getReadReceipts', () => {
    it('returns a null read status for every member when no conversation exists', async () => {
      mockCacheManager.get.mockResolvedValue({
        members: [{ username: USERNAME, firstName: 'Alice', lastName: 'Adams' }],
      });
      mockConversationModel.findOne.mockResolvedValue(null);

      const result = await service.getReadReceipts(CONVERSATION_TYPE, GROUP_NAME, USERNAME);

      expect(result).toEqual([{ username: USERNAME, firstName: 'Alice', lastName: 'Adams', readAt: null }]);
    });

    it('maps each member to their persisted read status', async () => {
      const readAt = new Date('2026-07-16T08:00:00.000Z');
      mockCacheManager.get.mockResolvedValue({
        members: [
          { username: USERNAME, firstName: 'Alice', lastName: 'Adams' },
          { username: 'bob', firstName: 'Bob', lastName: 'Brown' },
        ],
      });
      mockConversationModel.findOne.mockResolvedValue({ id: 'conversation-1' });
      mockChatReadStatusModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ username: USERNAME, readAt }]),
      });

      const result = await service.getReadReceipts(CONVERSATION_TYPE, GROUP_NAME, USERNAME);

      expect(result).toEqual([
        { username: USERNAME, firstName: 'Alice', lastName: 'Adams', readAt: readAt.toISOString() },
        { username: 'bob', firstName: 'Bob', lastName: 'Brown', readAt: null },
      ]);
    });
  });

  describe('sendMessage', () => {
    it('persists the message, broadcasts CHAT_NEW_MESSAGE and notifies recipients', async () => {
      const message = {
        conversationId: { toString: () => 'conversation-1' },
        content: 'hello',
        createdBy: USERNAME,
        createdByUserFirstName: 'Alice',
        createdByUserLastName: 'Adams',
        toJSON: () => ({ id: 'message-1', content: 'hello' }),
      };
      mockChatMessageModel.create.mockResolvedValue(message);
      mockConversationModel.findByIdAndUpdate.mockResolvedValue(undefined);
      mockNotificationsService.upsertNotificationForSource.mockResolvedValue(undefined);

      const currentUser = { preferred_username: USERNAME, given_name: 'Alice', family_name: 'Adams' } as JwtUser;

      const result = await service.sendMessage(
        'conversation-1',
        GROUP_NAME,
        CONVERSATION_TYPE,
        'hello',
        currentUser,
        [USERNAME, 'bob'],
      );

      expect(result).toBe(message);
      expect(mockSseService.sendEventToUsers).toHaveBeenCalledTimes(1);
      expect(mockSseService.sendEventToUsers).toHaveBeenCalledWith(
        ['bob'],
        expect.any(String),
        SSE_MESSAGE_TYPE.CHAT_NEW_MESSAGE,
      );
      expect(mockNotificationsService.upsertNotificationForSource).toHaveBeenCalledTimes(1);
    });

    it('does not notify when the sender is the only member', async () => {
      const message = {
        conversationId: { toString: () => 'conversation-1' },
        content: 'hello',
        createdBy: USERNAME,
        createdByUserFirstName: 'Alice',
        createdByUserLastName: 'Adams',
        toJSON: () => ({ id: 'message-1', content: 'hello' }),
      };
      mockChatMessageModel.create.mockResolvedValue(message);
      mockConversationModel.findByIdAndUpdate.mockResolvedValue(undefined);

      const currentUser = { preferred_username: USERNAME, given_name: 'Alice', family_name: 'Adams' } as JwtUser;

      await service.sendMessage('conversation-1', GROUP_NAME, CONVERSATION_TYPE, 'hello', currentUser, [USERNAME]);

      expect(mockSseService.sendEventToUsers).not.toHaveBeenCalled();
      expect(mockNotificationsService.upsertNotificationForSource).not.toHaveBeenCalled();
    });
  });

  describe('markChatAsRead', () => {
    it('upserts the read status, marks the source notification read and broadcasts to the other members', async () => {
      mockCacheManager.get.mockResolvedValue({ members: [{ username: USERNAME }, { username: 'bob' }] });
      mockConversationModel.findOne.mockResolvedValue({ id: 'conversation-1' });
      mockChatReadStatusModel.findOneAndUpdate.mockResolvedValue(undefined);
      mockNotificationsService.markNotificationReadBySource.mockResolvedValue(undefined);

      await service.markChatAsRead(CONVERSATION_TYPE, GROUP_NAME, USERNAME);

      expect(mockChatReadStatusModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      const [filter, , options] = mockChatReadStatusModel.findOneAndUpdate.mock.calls[0] as [
        { conversationId: string; username: string },
        unknown,
        { upsert: boolean },
      ];
      expect(filter).toEqual({ conversationId: 'conversation-1', username: USERNAME });
      expect(options.upsert).toBe(true);
      expect(mockNotificationsService.markNotificationReadBySource).toHaveBeenCalledWith(
        NOTIFICATION_SOURCE_TYPE.CHAT,
        `${CONVERSATION_TYPE}/${GROUP_NAME}`,
        USERNAME,
      );
      expect(mockSseService.sendEventToUsers).toHaveBeenCalledWith(
        ['bob'],
        expect.any(String),
        SSE_MESSAGE_TYPE.CHAT_READ_STATUS_UPDATED,
      );
    });

    it('returns early without side effects when the conversation does not exist', async () => {
      mockCacheManager.get.mockResolvedValue({ members: [{ username: USERNAME }] });
      mockConversationModel.findOne.mockResolvedValue(null);

      await service.markChatAsRead(CONVERSATION_TYPE, GROUP_NAME, USERNAME);

      expect(mockChatReadStatusModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mockNotificationsService.markNotificationReadBySource).not.toHaveBeenCalled();
    });
  });
});
