/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import SOPHOMORIX_GROUP_TYPES from '@libs/lmnApi/constants/sophomorixGroupTypes';
import { SORT_DIRECTION } from '@libs/common/constants/sortDirection';
import CreateMessageDto from '@libs/chat/types/createMessageDto';
import JwtUser from '@libs/user/types/jwt/jwtUser';
import controllerContractReflection from '../common/controllerContractReflection';
import ChatService from './chat.service';
import GroupsService from '../groups/groups.service';
import ChatController from './chat.controller';

const CURRENT_USER = { preferred_username: 'alice', given_name: 'Alice', family_name: 'Adams' } as JwtUser;
const GROUP_NAME = '07a';
const CONVERSATION_TYPE = SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS;

const mockChatService = {
  getUnreadCounts: jest.fn(),
  getReadReceipts: jest.fn(),
  getAuthorizedMessages: jest.fn(),
  getOrCreateAuthorizedConversation: jest.fn(),
  sendMessage: jest.fn(),
  markChatAsRead: jest.fn(),
};
const mockGroupsService = { getUserGroupsAndProjects: jest.fn() };

describe('ChatController', () => {
  let controller: ChatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
        { provide: GroupsService, useValue: mockGroupsService },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegation', () => {
    it('getUserGroups delegates to GroupsService for the current user', async () => {
      const groups = { classes: [], projects: [], groups: [] };
      mockGroupsService.getUserGroupsAndProjects.mockResolvedValue(groups);

      await expect(controller.getUserGroups(CURRENT_USER)).resolves.toBe(groups);
      expect(mockGroupsService.getUserGroupsAndProjects).toHaveBeenCalledWith('alice');
    });

    it('getUnreadCounts delegates to ChatService for the current user', async () => {
      await controller.getUnreadCounts(CURRENT_USER);

      expect(mockChatService.getUnreadCounts).toHaveBeenCalledWith('alice');
    });

    it('getReadReceipts delegates with conversationType, groupName and username', async () => {
      await controller.getReadReceipts(CONVERSATION_TYPE, GROUP_NAME, CURRENT_USER);

      expect(mockChatService.getReadReceipts).toHaveBeenCalledWith(CONVERSATION_TYPE, GROUP_NAME, 'alice');
    });

    it('markAsRead delegates to markChatAsRead with the current username', async () => {
      await controller.markAsRead(CONVERSATION_TYPE, GROUP_NAME, CURRENT_USER);

      expect(mockChatService.markChatAsRead).toHaveBeenCalledWith(CONVERSATION_TYPE, GROUP_NAME, 'alice');
    });

    it('getMessages delegates the pagination arguments to getAuthorizedMessages', async () => {
      await controller.getMessages(CONVERSATION_TYPE, GROUP_NAME, CURRENT_USER, 50, 0, SORT_DIRECTION.ASC, undefined);

      expect(mockChatService.getAuthorizedMessages).toHaveBeenCalledWith(
        GROUP_NAME,
        CONVERSATION_TYPE,
        'alice',
        50,
        0,
        SORT_DIRECTION.ASC,
        undefined,
      );
    });

    it('sendMessage creates the conversation, sends and maps the response', async () => {
      const conversation = { id: 'conversation-1' };
      mockChatService.getOrCreateAuthorizedConversation.mockResolvedValue({
        conversation,
        members: ['alice', 'bob'],
      });
      const createdAt = new Date('2026-07-16T08:00:00.000Z');
      mockChatService.sendMessage.mockResolvedValue({
        id: 'message-1',
        role: 'user',
        content: 'hello',
        createdAt,
        createdBy: 'alice',
        createdByUserFirstName: 'Alice',
        createdByUserLastName: 'Adams',
      });

      const result = await controller.sendMessage(
        CONVERSATION_TYPE,
        GROUP_NAME,
        { content: 'hello' } as CreateMessageDto,
        CURRENT_USER,
      );

      expect(mockChatService.getOrCreateAuthorizedConversation).toHaveBeenCalledWith(
        GROUP_NAME,
        CONVERSATION_TYPE,
        'alice',
      );
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        'conversation-1',
        GROUP_NAME,
        CONVERSATION_TYPE,
        'hello',
        CURRENT_USER,
        ['alice', 'bob'],
      );
      expect(result).toEqual({
        id: 'message-1',
        role: 'user',
        content: 'hello',
        createdAt: createdAt.toISOString(),
        createdBy: 'alice',
        createdByUserFirstName: 'Alice',
        createdByUserLastName: 'Adams',
      });
    });
  });

  describe('auth contract', () => {
    it.each(['getUserGroups', 'getUnreadCounts', 'getReadReceipts', 'markAsRead', 'getMessages', 'sendMessage'])(
      'keeps %s behind the global JWT guard (not public)',
      (route) => {
        expect(controllerContractReflection.isRoutePublic(ChatController, route)).toBe(false);
      },
    );
  });
});
