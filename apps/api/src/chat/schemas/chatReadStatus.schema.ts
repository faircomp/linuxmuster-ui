/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Conversation } from './conversation.schema';

export type ChatReadStatusDocument = ChatReadStatus & Document;

@Schema({ timestamps: true, strict: true, collection: 'chatreadstatuses' })
export class ChatReadStatus {
  @Prop({ type: Types.ObjectId, ref: Conversation.name, required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  username: string;

  @Prop({ type: Date, required: true })
  readAt: Date;

  @Prop({ default: 1 })
  schemaVersion: number;
}

export const ChatReadStatusSchema = SchemaFactory.createForClass(ChatReadStatus);

ChatReadStatusSchema.index({ conversationId: 1, username: 1 }, { unique: true });

ChatReadStatusSchema.set('toJSON', {
  virtuals: true,
});
