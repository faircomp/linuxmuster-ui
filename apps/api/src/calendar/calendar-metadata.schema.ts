/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CalendarShareEntry, CalendarShareEntrySchema } from './calendar-share-entry.schema';

export type CalendarMetadataDocument = CalendarMetadata & Document;

@Schema({ timestamps: true })
export class CalendarMetadata {
  @Prop({ type: String, required: true, unique: true, index: true })
  calendarId: string;

  @Prop({ type: String, required: false })
  ownerUsername: string;

  @Prop({ type: [CalendarShareEntrySchema], default: [] })
  shares: CalendarShareEntry[];

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const CalendarMetadataSchema = SchemaFactory.createForClass(CalendarMetadata);
