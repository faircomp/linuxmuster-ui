/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import type { Dayjs } from 'dayjs';
import type { CalendarEvent } from '@libs/calendar/types';
import TimeGrid from '@/pages/Calendar/TimeGrid';

interface DayGridProps {
  day: Dayjs;
  events: CalendarEvent[];
}

const DayGrid: React.FC<DayGridProps> = ({ day, events }) => (
  <TimeGrid
    days={[day.startOf('day')]}
    events={events}
  />
);

export default DayGrid;
