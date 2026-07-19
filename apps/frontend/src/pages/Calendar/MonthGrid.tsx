/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import type { CalendarEvent } from '@libs/calendar/types';
import buildCalendarMonthGrid, { DAYS_IN_MONTH_GRID, DAYS_PER_WEEK } from '@libs/calendar/utils/buildCalendarMonthGrid';

const getEventsForDay = (events: CalendarEvent[], day: Dayjs): CalendarEvent[] =>
  events
    .filter((event) => dayjs(event.start).isSame(day, 'day'))
    .sort((first, second) => Number(second.allDay) - Number(first.allDay) || first.start.localeCompare(second.start));

interface MonthGridProps {
  month: Dayjs;
  events: CalendarEvent[];
}

const MonthGrid: React.FC<MonthGridProps> = ({ month, events }) => {
  const { t, i18n } = useTranslation();
  const cells = buildCalendarMonthGrid(month);
  const weeks = Array.from({ length: DAYS_IN_MONTH_GRID / DAYS_PER_WEEK }, (_, index) =>
    cells.slice(index * DAYS_PER_WEEK, index * DAYS_PER_WEEK + DAYS_PER_WEEK),
  );

  return (
    <div
      role="grid"
      aria-label={t('calendar.month')}
      className="flex flex-1 flex-col"
    >
      <div
        role="row"
        className="grid grid-cols-7"
      >
        {cells.slice(0, DAYS_PER_WEEK).map((day) => (
          <div
            key={day.format('YYYY-MM-DD')}
            role="columnheader"
            className="p-2 text-center text-sm font-semibold"
          >
            {day.toDate().toLocaleDateString(i18n.language, { weekday: 'short' })}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div
          key={week[0].format('YYYY-MM-DD')}
          role="row"
          className="grid flex-1 grid-cols-7"
        >
          {week.map((day) => {
            const dayEvents = getEventsForDay(events, day);
            const isCurrentMonth = day.isSame(month, 'month');
            return (
              <div
                key={day.format('YYYY-MM-DD')}
                role="gridcell"
                data-day={day.format('YYYY-MM-DD')}
                className={cn(
                  'flex min-h-24 flex-col gap-0.5 border border-ciGrey p-1',
                  !isCurrentMonth && 'opacity-40',
                )}
              >
                <div className="text-right text-xs">{day.date()}</div>
                {dayEvents.map((event) => (
                  <div
                    key={event.uid}
                    className={cn('truncate rounded px-1 text-xs', event.allDay && 'font-medium')}
                    style={event.color ? { backgroundColor: event.color } : undefined}
                    title={event.allDay ? `${t('calendar.allDay')}: ${event.summary}` : event.summary}
                  >
                    {event.allDay ? event.summary : `${dayjs(event.start).format('HH:mm')} ${event.summary}`}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default MonthGrid;
