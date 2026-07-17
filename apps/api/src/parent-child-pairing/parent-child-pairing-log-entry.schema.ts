/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import PARENT_CHILD_PAIRING_LOG_ACTION from '@libs/parent-child-pairing/constants/parentChildPairingLogAction';

@Schema()
export class ParentChildPairingLogEntry {
  @Prop({ type: String, required: true, enum: Object.values(PARENT_CHILD_PAIRING_LOG_ACTION) })
  action: string;

  @Prop({ type: String, required: true })
  performedBy: string;

  @Prop({ type: Date, required: true, default: () => new Date() })
  timestamp: Date;

  @Prop({ type: String })
  details: string;
}

export const ParentChildPairingLogEntrySchema = SchemaFactory.createForClass(ParentChildPairingLogEntry);
