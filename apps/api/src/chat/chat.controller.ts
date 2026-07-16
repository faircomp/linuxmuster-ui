/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import APPS from '@libs/appconfig/constants/apps';
import CreateMessageDto from '@libs/chat/types/createMessageDto';
import ConversationType from '@libs/chat/types/conversationType';
import UserChatGroups from '@libs/chat/types/userChatGroups';
import ChatUnreadCount from '@libs/chat/types/chatUnreadCount';
import ChatReadReceipt from '@libs/chat/types/chatReadReceipt';
import type ChatMessageResponse from '@libs/chat/types/chatMessage';
import CHAT_MESSAGES_DEFAULT_LIMIT from '@libs/chat/constants/chatMessagesDefaultLimit';
import { SORT_DIRECTION } from '@libs/common/constants/sortDirection';
import type SortDirection from '@libs/common/constants/sortDirection';
import JwtUser from '@libs/user/types/jwt/jwtUser';
import GetCurrentUser from '../common/decorators/getCurrentUser.decorator';
import GroupsService from '../groups/groups.service';
import ChatService from './chat.service';
import ValidateConversationTypePipe from './pipes/validateConversationType.pipe';
import { ChatMessageDocument } from './schemas/chatMessage.schema';

@ApiTags(APPS.CHAT)
@ApiBearerAuth()
@Controller(APPS.CHAT)
class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly groupsService: GroupsService,
  ) {}

  @ApiOperation({ summary: 'List the chat groups, classes and projects the current user belongs to' })
  @Get('groups')
  async getUserGroups(@GetCurrentUser() currentUser: JwtUser): Promise<UserChatGroups> {
    return this.groupsService.getUserGroupsAndProjects(currentUser.preferred_username);
  }

  @ApiOperation({ summary: 'Get unread message counts per conversation for the current user' })
  @Get('unread-counts')
  async getUnreadCounts(@GetCurrentUser() currentUser: JwtUser): Promise<ChatUnreadCount[]> {
    return this.chatService.getUnreadCounts(currentUser.preferred_username);
  }

  @ApiOperation({ summary: 'Get read receipts for every member of a group conversation' })
  @Get('conversations/:conversationType/:groupName/read-status')
  async getReadReceipts(
    @Param('conversationType', ValidateConversationTypePipe) conversationType: ConversationType,
    @Param('groupName') groupName: string,
    @GetCurrentUser() currentUser: JwtUser,
  ): Promise<ChatReadReceipt[]> {
    return this.chatService.getReadReceipts(conversationType, groupName, currentUser.preferred_username);
  }

  @ApiOperation({ summary: 'Fetch paginated messages for a group conversation the current user has access to' })
  @Get('conversations/:conversationType/:groupName/messages')
  async getMessages(
    @Param('conversationType', ValidateConversationTypePipe) conversationType: ConversationType,
    @Param('groupName') groupName: string,
    @GetCurrentUser() currentUser: JwtUser,
    @Query('limit', new DefaultValuePipe(CHAT_MESSAGES_DEFAULT_LIMIT), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('sort', new DefaultValuePipe(SORT_DIRECTION.ASC), new ParseEnumPipe(SORT_DIRECTION)) sort: SortDirection,
    @Query('before') before?: string,
  ): Promise<ChatMessageResponse[]> {
    return this.chatService.getAuthorizedMessages(
      groupName,
      conversationType,
      currentUser.preferred_username,
      limit,
      offset,
      sort,
      before,
    );
  }

  @ApiOperation({ summary: 'Send a new message to a group conversation the current user has access to' })
  @Post('conversations/:conversationType/:groupName/messages')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async sendMessage(
    @Param('conversationType', ValidateConversationTypePipe) conversationType: ConversationType,
    @Param('groupName') groupName: string,
    @Body() dto: CreateMessageDto,
    @GetCurrentUser() currentUser: JwtUser,
  ): Promise<ChatMessageResponse> {
    const { conversation, members } = await this.chatService.getOrCreateAuthorizedConversation(
      groupName,
      conversationType,
      currentUser.preferred_username,
    );

    const message = await this.chatService.sendMessage(
      String(conversation.id),
      groupName,
      conversationType,
      dto.content,
      currentUser,
      members,
    );

    return ChatController.toChatMessageResponse(message);
  }

  private static toChatMessageResponse(doc: ChatMessageDocument): ChatMessageResponse {
    return {
      id: String(doc.id),
      role: doc.role,
      content: doc.content,
      createdAt: doc.createdAt.toISOString(),
      createdBy: doc.createdBy,
      createdByUserFirstName: doc.createdByUserFirstName,
      createdByUserLastName: doc.createdByUserLastName,
    };
  }
}

export default ChatController;
