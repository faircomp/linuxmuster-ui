/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import CHAT_TYPES from '@libs/chat/constants/chatTypes';
import CHAT_ROLES from '@libs/chat/constants/chatRoles';
import CHAT_MESSAGES_DEFAULT_LIMIT from '@libs/chat/constants/chatMessagesDefaultLimit';
import { CHAT_ERROR_MESSAGES } from '@libs/chat/types/chatErrorMessages';
import ConversationType from '@libs/chat/types/conversationType';
import type ChatMessageResponse from '@libs/chat/types/chatMessage';
import type ChatUnreadCount from '@libs/chat/types/chatUnreadCount';
import type ChatReadReceipt from '@libs/chat/types/chatReadReceipt';
import { SORT_DIRECTION } from '@libs/common/constants/sortDirection';
import type SortDirection from '@libs/common/constants/sortDirection';
import { GROUP_WITH_MEMBERS_CACHE_KEY } from '@libs/groups/constants/cacheKeys';
import SOPHOMORIX_GROUP_TYPES from '@libs/lmnApi/constants/sophomorixGroupTypes';
import GENERIC_CHAT_GROUP_TYPE from '@libs/chat/constants/genericChatGroupType';
import PROJECTS_PREFIX from '@libs/lmnApi/constants/prefixes/projectsPrefix';
import SSE_MESSAGE_TYPE from '@libs/common/constants/sseMessageType';
import PUSH_NOTIFICATION_CHANNEL_ID from '@libs/notification/constants/pushNotificationChannelId';
import NOTIFICATION_TYPE from '@libs/notification/constants/notificationType';
import NOTIFICATION_SOURCE_TYPE from '@libs/notification/constants/notificationSourceType';
import type GroupWithMembers from '@libs/groups/types/groupWithMembers';
import JwtUser from '@libs/user/types/jwt/jwtUser';
import CustomHttpException from '../common/CustomHttpException';
import NotificationsService from '../notifications/notifications.service';
import SseService from '../sse/sse.service';
import GroupsService from '../groups/groups.service';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { ChatMessage, ChatMessageDocument } from './schemas/chatMessage.schema';
import { ChatReadStatus, ChatReadStatusDocument } from './schemas/chatReadStatus.schema';

type AggregatedChatMessage = Omit<ChatMessageResponse, 'createdAt'> & { createdAt: Date };

@Injectable()
class ChatService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(ChatReadStatus.name) private chatReadStatusModel: Model<ChatReadStatusDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly sseService: SseService,
    private readonly notificationsService: NotificationsService,
    private readonly groupsService: GroupsService,
  ) {}

  private static readonly CACHE_PATH_PREFIX: Record<ConversationType, string> = {
    [SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS]: '/',
    [SOPHOMORIX_GROUP_TYPES.PROJECT]: PROJECTS_PREFIX,
    [GENERIC_CHAT_GROUP_TYPE]: '/',
  };

  private async getVerifiedGroup(
    groupName: string,
    conversationType: ConversationType,
    username: string,
  ): Promise<GroupWithMembers> {
    const cachePath = `${ChatService.CACHE_PATH_PREFIX[conversationType]}${groupName}`;
    const group = await this.cacheManager.get<GroupWithMembers>(`${GROUP_WITH_MEMBERS_CACHE_KEY}-${cachePath}`);

    if (!group) {
      throw new CustomHttpException(
        CHAT_ERROR_MESSAGES.GROUP_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { groupName, conversationType },
        ChatService.name,
      );
    }

    if (!group.members?.some((member) => member.username === username)) {
      throw new CustomHttpException(
        CHAT_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
        { groupName, conversationType },
        ChatService.name,
      );
    }

    return group;
  }

  private async verifyGroupAccess(
    groupName: string,
    conversationType: ConversationType,
    username: string,
  ): Promise<string[]> {
    const group = await this.getVerifiedGroup(groupName, conversationType, username);
    return group.members.map((member) => member.username);
  }

  async getOrCreateAuthorizedConversation(
    groupName: string,
    conversationType: ConversationType,
    username: string,
  ): Promise<{ conversation: ConversationDocument; members: string[] }> {
    const members = await this.verifyGroupAccess(groupName, conversationType, username);

    if (members.length === 0) {
      throw new CustomHttpException(
        CHAT_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
        { groupName, conversationType },
        ChatService.name,
      );
    }

    const conversation = await this.conversationModel.findOneAndUpdate(
      { type: CHAT_TYPES.GROUP, groupName, conversationType },
      {
        $setOnInsert: {
          type: CHAT_TYPES.GROUP,
          groupName,
          conversationType,
        },
      },
      { upsert: true, new: true },
    );

    return { conversation, members };
  }

  async getAuthorizedMessages(
    groupName: string,
    conversationType: ConversationType,
    username: string,
    limit: number = CHAT_MESSAGES_DEFAULT_LIMIT,
    offset: number = 0,
    sort: SortDirection = SORT_DIRECTION.ASC,
    before?: string,
  ): Promise<ChatMessageResponse[]> {
    await this.verifyGroupAccess(groupName, conversationType, username);

    const beforeDate = before ? new Date(before) : null;
    const validBefore = beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : null;

    const conversations = await this.conversationModel.aggregate<{ messages: AggregatedChatMessage[] }>([
      {
        $match: {
          type: CHAT_TYPES.GROUP,
          groupName,
          conversationType,
        },
      },
      { $limit: 1 },
      {
        $lookup: {
          from: this.chatMessageModel.collection.name,
          let: { conversationId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$conversationId' }, { $toString: '$$conversationId' }],
                },
                ...(validBefore ? { createdAt: { $lt: validBefore } } : {}),
              },
            },
            { $sort: { createdAt: sort === SORT_DIRECTION.ASC ? 1 : -1 } },
            { $skip: offset },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                id: { $toString: '$_id' },
                role: 1,
                content: 1,
                createdAt: 1,
                createdBy: 1,
                createdByUserFirstName: 1,
                createdByUserLastName: 1,
              },
            },
          ],
          as: 'messages',
        },
      },
      {
        $project: {
          _id: 0,
          messages: 1,
        },
      },
    ]);

    return (conversations[0]?.messages ?? []).map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    }));
  }

  async sendMessage(
    conversationId: string,
    groupName: string,
    conversationType: ConversationType,
    content: string,
    currentUser: JwtUser,
    members: string[],
  ): Promise<ChatMessageDocument> {
    let message: ChatMessageDocument;

    try {
      message = await this.chatMessageModel.create({
        conversationId,
        content,
        role: CHAT_ROLES.USER,
        createdBy: currentUser.preferred_username,
        createdByUserFirstName: currentUser.given_name,
        createdByUserLastName: currentUser.family_name,
      });
    } catch (error) {
      throw new CustomHttpException(
        CHAT_ERROR_MESSAGES.MESSAGE_SEND_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
        { conversationId, error: error instanceof Error ? error.message : 'Unknown error' },
        ChatService.name,
      );
    }

    try {
      await this.conversationModel.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() });
    } catch (error) {
      Logger.error(`Failed to update lastMessageAt for conversation ${conversationId}: ${error}`, ChatService.name);
    }

    try {
      await this.notifyGroupMembers(members, groupName, conversationType, message);
    } catch (error) {
      Logger.error(`Failed to notify group members for conversation ${conversationId}: ${error}`, ChatService.name);
    }

    return message;
  }

  async getUnreadCounts(username: string): Promise<ChatUnreadCount[]> {
    const { classes, projects, groups } = await this.groupsService.getUserGroupsAndProjects(username);

    const allowedConversations = [
      ...classes.map((group) => ({ groupName: group.name, conversationType: SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS })),
      ...projects.map((group) => ({ groupName: group.name, conversationType: SOPHOMORIX_GROUP_TYPES.PROJECT })),
      ...groups.map((group) => ({ groupName: group.name, conversationType: GENERIC_CHAT_GROUP_TYPE })),
    ];

    if (allowedConversations.length === 0) {
      return [];
    }

    return this.conversationModel.aggregate<ChatUnreadCount>([
      { $match: { type: CHAT_TYPES.GROUP, $or: allowedConversations } },
      {
        $lookup: {
          from: this.chatReadStatusModel.collection.name,
          let: { conversationId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$conversationId', '$$conversationId'] }, { $eq: ['$username', username] }],
                },
              },
            },
            { $project: { _id: 0, readAt: 1 } },
          ],
          as: 'readStatus',
        },
      },
      {
        $lookup: {
          from: this.chatMessageModel.collection.name,
          let: {
            conversationId: '$_id',
            readAt: { $ifNull: [{ $arrayElemAt: ['$readStatus.readAt', 0] }, null] },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$conversationId'] },
                    { $ne: ['$createdBy', username] },
                    { $or: [{ $eq: ['$$readAt', null] }, { $gt: ['$createdAt', '$$readAt'] }] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'unread',
        },
      },
      {
        $project: {
          _id: 0,
          groupName: 1,
          conversationType: 1,
          count: { $ifNull: [{ $arrayElemAt: ['$unread.count', 0] }, 0] },
        },
      },
      { $match: { count: { $gt: 0 } } },
    ]);
  }

  async getReadReceipts(
    conversationType: ConversationType,
    groupName: string,
    username: string,
  ): Promise<ChatReadReceipt[]> {
    const { members } = await this.getVerifiedGroup(groupName, conversationType, username);

    const conversation = await this.conversationModel.findOne({ groupName, conversationType });

    if (!conversation) {
      return members.map((member) => ({
        username: member.username,
        firstName: member.firstName,
        lastName: member.lastName,
        readAt: null,
      }));
    }

    const memberUsernames = members.map((member) => member.username);
    const statuses = await this.chatReadStatusModel
      .find({ conversationId: conversation.id, username: { $in: memberUsernames } })
      .exec();
    const statusMap = new Map(statuses.map((status) => [status.username, status.readAt.toISOString()]));

    return members.map((member) => ({
      username: member.username,
      firstName: member.firstName,
      lastName: member.lastName,
      readAt: statusMap.get(member.username) ?? null,
    }));
  }

  async markChatAsRead(conversationType: ConversationType, groupName: string, username: string): Promise<void> {
    const members = await this.verifyGroupAccess(groupName, conversationType, username);

    const conversation = await this.conversationModel.findOne({ groupName, conversationType });

    if (!conversation) {
      return;
    }

    await this.chatReadStatusModel.findOneAndUpdate(
      { conversationId: conversation.id, username },
      { $set: { readAt: new Date() } },
      { upsert: true },
    );

    const sourceId = `${conversationType}/${groupName}`;
    await this.notificationsService.markNotificationReadBySource(NOTIFICATION_SOURCE_TYPE.CHAT, sourceId, username);

    const recipients = members.filter((member) => member !== username);

    if (recipients.length > 0) {
      const payload = JSON.stringify({ conversationType, groupName, username });

      try {
        this.sseService.sendEventToUsers(recipients, payload, SSE_MESSAGE_TYPE.CHAT_READ_STATUS_UPDATED);
      } catch {
        Logger.warn(`Could not send read status SSE for ${conversationType}/${groupName}`, ChatService.name);
      }
    }
  }

  private async notifyGroupMembers(
    members: string[],
    groupName: string,
    conversationType: ConversationType,
    message: ChatMessageDocument,
  ): Promise<void> {
    const recipients = members.filter((member) => member !== message.createdBy);

    if (recipients.length === 0) {
      return;
    }

    const payload = { ...message.toJSON(), groupName, conversationType };
    this.sseService.sendEventToUsers(recipients, JSON.stringify(payload), SSE_MESSAGE_TYPE.CHAT_NEW_MESSAGE);

    const sourceId = `${conversationType}/${groupName}`;

    await this.notificationsService.upsertNotificationForSource(
      recipients,
      {
        title: groupName,
        subtitle: `${message.createdByUserFirstName} ${message.createdByUserLastName}`,
        body: message.content,
        channelId: PUSH_NOTIFICATION_CHANNEL_ID.CHAT,
        data: { groupName, conversationType, conversationId: message.conversationId.toString() },
      },
      message.createdBy,
      {
        type: NOTIFICATION_TYPE.USER,
        sourceType: NOTIFICATION_SOURCE_TYPE.CHAT,
        sourceId,
        title: groupName,
        pushNotification: `${message.createdByUserFirstName} ${message.createdByUserLastName}: ${message.content}`,
        createdBy: message.createdBy,
      },
    );
  }
}

export default ChatService;
