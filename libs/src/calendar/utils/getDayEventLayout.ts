/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import dayjs, { Dayjs } from 'dayjs';
import type { CalendarEvent } from '@libs/calendar/types';

const MINUTES_PER_DAY = 1440;

export interface PositionedCalendarEvent {
  event: CalendarEvent;
  topPercent: number;
  heightPercent: number;
  columnIndex: number;
  columnCount: number;
}

export interface DayEventLayout {
  allDayEvents: CalendarEvent[];
  positionedEvents: PositionedCalendarEvent[];
}

const minutesFromMidnight = (iso: string, dayStart: Dayjs): number =>
  Math.min(MINUTES_PER_DAY, Math.max(0, dayjs(iso).diff(dayStart, 'minute')));

const getDayEventLayout = (events: CalendarEvent[], day: Dayjs): DayEventLayout => {
  const dayStart = day.startOf('day');
  const isOnDay = (event: CalendarEvent) => dayjs(event.start).isSame(day, 'day');

  const allDayEvents = events.filter((event) => event.allDay && isOnDay(event));

  const timedEvents = events
    .filter((event) => !event.allDay && isOnDay(event))
    .sort((first, second) => first.start.localeCompare(second.start));

  const columnEndMinutes: number[] = [];
  const withColumns = timedEvents.map((event) => {
    const startMinute = minutesFromMidnight(event.start, dayStart);
    const endMinute = Math.max(startMinute + 1, minutesFromMidnight(event.end, dayStart));
    let columnIndex = columnEndMinutes.findIndex((endMinuteOfColumn) => endMinuteOfColumn <= startMinute);
    if (columnIndex === -1) {
      columnIndex = columnEndMinutes.length;
    }
    columnEndMinutes[columnIndex] = endMinute;
    return { event, startMinute, endMinute, columnIndex };
  });

  const columnCount = Math.max(1, columnEndMinutes.length);

  const positionedEvents = withColumns.map(({ event, startMinute, endMinute, columnIndex }) => ({
    event,
    topPercent: (startMinute / MINUTES_PER_DAY) * 100,
    heightPercent: ((endMinute - startMinute) / MINUTES_PER_DAY) * 100,
    columnIndex,
    columnCount,
  }));

  return { allDayEvents, positionedEvents };
};

export default getDayEventLayout;
