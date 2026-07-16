/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import ChatController from './chat.controller';
import ChatService from './chat.service';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chatMessage.schema';
import { ChatReadStatus, ChatReadStatusSchema } from './schemas/chatReadStatus.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: ChatReadStatus.name, schema: ChatReadStatusSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
class ChatModule {}

export default ChatModule;
