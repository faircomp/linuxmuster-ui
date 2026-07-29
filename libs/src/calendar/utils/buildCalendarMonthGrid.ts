/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type { Dayjs } from 'dayjs';

export const DAYS_IN_MONTH_GRID = 42;

export const DAYS_PER_WEEK = 7;

const buildCalendarMonthGrid = (month: Dayjs): Dayjs[] => {
  const firstOfMonth = month.startOf('month');
  const offsetToMonday = (firstOfMonth.day() + 6) % DAYS_PER_WEEK;
  const gridStart = firstOfMonth.subtract(offsetToMonday, 'day');
  return Array.from({ length: DAYS_IN_MONTH_GRID }, (_, index) => gridStart.add(index, 'day'));
};

export default buildCalendarMonthGrid;
