/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type { Dayjs } from 'dayjs';
import { DAYS_PER_WEEK } from '@libs/calendar/utils/buildCalendarMonthGrid';

const getWeekStart = (date: Dayjs): Dayjs => {
  const offsetToMonday = (date.day() + 6) % DAYS_PER_WEEK;
  return date.startOf('day').subtract(offsetToMonday, 'day');
};

export default getWeekStart;
