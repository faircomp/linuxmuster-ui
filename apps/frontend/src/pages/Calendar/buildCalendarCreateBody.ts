/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type { CalendarCreateBody, CalendarShare } from '@libs/calendar/types';
import CalendarTag from '@libs/calendar/constants/calendarTag';

export interface CalendarFormValues {
  displayName: string;
  description?: string;
  color?: string;
  isTimetable: boolean;
  shares: CalendarShare[];
}

const buildCalendarCreateBody = (values: CalendarFormValues): CalendarCreateBody => ({
  displayName: values.displayName,
  description: values.description || undefined,
  color: values.color || undefined,
  tags: values.isTimetable ? [CalendarTag.TIMETABLE] : [],
  shares: values.shares.filter((share) => share.subjectId.trim().length > 0),
});

export default buildCalendarCreateBody;
