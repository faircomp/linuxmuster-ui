/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import CalendarSharePermission from '@libs/calendar/constants/calendarSharePermission';
import CalendarShareSubjectType from '@libs/calendar/constants/calendarShareSubjectType';
import type { TCalendarSharePermission, TCalendarShareSubjectType } from '@libs/calendar/types';

@Schema({ _id: false })
export class CalendarShareEntry {
  @Prop({ type: String, required: true })
  subjectId: string;

  @Prop({ type: String, required: true, default: CalendarShareSubjectType.USER })
  subjectType: TCalendarShareSubjectType;

  @Prop({ type: String, required: true, default: '' })
  label: string;

  @Prop({ type: String, required: true, default: CalendarSharePermission.VIEW })
  permission: TCalendarSharePermission;
}

export const CalendarShareEntrySchema = SchemaFactory.createForClass(CalendarShareEntry);
