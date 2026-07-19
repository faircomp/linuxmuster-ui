/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const CalendarView = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
} as const;

export type TCalendarView = (typeof CalendarView)[keyof typeof CalendarView];

export default CalendarView;
