/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import PARENT_CHILD_PAIRING_STATUS from '@libs/parent-child-pairing/constants/parentChildPairingStatus';
import type ParentChildPairingStatusType from '@libs/parent-child-pairing/types/parentChildPairingStatusType';
import {
  ParentChildPairingLogEntry,
  ParentChildPairingLogEntrySchema,
} from './parent-child-pairing-log-entry.schema';

export type ParentChildPairingDocument = ParentChildPairing & Document;

@Schema({ timestamps: true })
export class ParentChildPairing {
  @Prop({ type: String, required: true })
  parent: string;

  @Prop({ type: String, required: true })
  student: string;

  @Prop({ type: String, required: true })
  school: string;

  @Prop({ type: String, required: true, default: PARENT_CHILD_PAIRING_STATUS.PENDING })
  status: ParentChildPairingStatusType;

  @Prop({ type: [ParentChildPairingLogEntrySchema], default: [] })
  logs: ParentChildPairingLogEntry[];

  @Prop({ type: Number, default: 1 })
  schemaVersion: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ParentChildPairingSchema = SchemaFactory.createForClass(ParentChildPairing);

ParentChildPairingSchema.index({ parent: 1, student: 1 }, { unique: true });

ParentChildPairingSchema.set('toJSON', {
  virtuals: true,
});
