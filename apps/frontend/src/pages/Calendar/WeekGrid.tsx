/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import type { Dayjs } from 'dayjs';
import type { CalendarEvent } from '@libs/calendar/types';
import getWeekStart from '@libs/calendar/utils/getWeekStart';
import { DAYS_PER_WEEK } from '@libs/calendar/utils/buildCalendarMonthGrid';
import TimeGrid from '@/pages/Calendar/TimeGrid';

interface WeekGridProps {
  anchorDate: Dayjs;
  events: CalendarEvent[];
}

const WeekGrid: React.FC<WeekGridProps> = ({ anchorDate, events }) => {
  const weekStart = getWeekStart(anchorDate);
  const days = Array.from({ length: DAYS_PER_WEEK }, (_, index) => weekStart.add(index, 'day'));

  return (
    <TimeGrid
      days={days}
      events={events}
    />
  );
};

export default WeekGrid;
