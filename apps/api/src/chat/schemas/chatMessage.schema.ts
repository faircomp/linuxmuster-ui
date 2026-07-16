/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import ChatRole from '@libs/chat/types/chatRole';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true, strict: true })
export class ChatMessage {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, required: true })
  role: ChatRole;

  @Prop({ type: String, required: true })
  createdBy: string;

  @Prop({ type: String })
  createdByUserFirstName: string;

  @Prop({ type: String })
  createdByUserLastName: string;

  @Prop({ default: 1 })
  schemaVersion: number;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });
ChatMessageSchema.index({ conversationId: 1, createdBy: 1, createdAt: -1 });

ChatMessageSchema.set('toJSON', {
  virtuals: true,
});
