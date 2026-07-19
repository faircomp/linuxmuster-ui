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
  onSelectEvent?: (event: CalendarEvent) => void;
}

const DayGrid: React.FC<DayGridProps> = ({ day, events, onSelectEvent }) => (
  <TimeGrid
    days={[day.startOf('day')]}
    events={events}
    onSelectEvent={onSelectEvent}
  />
);

export default DayGrid;
