/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import ChatType from '@libs/chat/types/chatType';
import ConversationType from '@libs/chat/types/conversationType';
import ALLOWED_CONVERSATION_TYPES from '@libs/chat/constants/allowedConversationTypes';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true, strict: true })
export class Conversation {
  @Prop({ type: String, required: true, index: true })
  type: ChatType;

  @Prop({ type: String, required: true })
  groupName: string;

  @Prop({ type: String, enum: ALLOWED_CONVERSATION_TYPES, required: true })
  conversationType: ConversationType;

  @Prop({ type: Date, index: true })
  lastMessageAt: Date;

  @Prop({ default: 1 })
  schemaVersion: number;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ groupName: 1, conversationType: 1 }, { unique: true });

ConversationSchema.set('toJSON', {
  virtuals: true,
});
