/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import CalendarSharePermission from '@libs/calendar/constants/calendarSharePermission';
import CalendarShareSubjectType from '@libs/calendar/constants/calendarShareSubjectType';

export type TCalendarSharePermission = (typeof CalendarSharePermission)[keyof typeof CalendarSharePermission];
export type TCalendarShareSubjectType = (typeof CalendarShareSubjectType)[keyof typeof CalendarShareSubjectType];

interface CalendarShare {
  subjectId: string;
  subjectType: TCalendarShareSubjectType;
  label: string;
  permission: TCalendarSharePermission;
}

export default CalendarShare;
