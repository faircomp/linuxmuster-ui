/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import type { CalendarEvent } from '@libs/calendar/types';
import getDayEventLayout from '@libs/calendar/utils/getDayEventLayout';

const HOURS_PER_DAY = 24;
const HOUR_ROW_HEIGHT_REM = 3;

const HOURS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);

interface TimeGridProps {
  days: Dayjs[];
  events: CalendarEvent[];
}

const TimeGrid: React.FC<TimeGridProps> = ({ days, events }) => {
  const { t, i18n } = useTranslation();
  const columnHeight = `${HOURS_PER_DAY * HOUR_ROW_HEIGHT_REM}rem`;

  return (
    <div
      role="grid"
      aria-label={t('calendar.title')}
      className="flex flex-1 flex-col overflow-auto"
    >
      <div
        role="row"
        className="flex border-b border-ciGrey"
      >
        <div className="w-14 shrink-0" />
        {days.map((day) => (
          <div
            key={day.format('YYYY-MM-DD')}
            role="columnheader"
            className="flex-1 p-2 text-center text-sm font-semibold"
          >
            {day.toDate().toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric' })}
          </div>
        ))}
      </div>

      <div
        role="row"
        className="flex border-b border-ciGrey"
      >
        <div className="w-14 shrink-0 p-1 text-xs text-ciGrey">{t('calendar.allDay')}</div>
        {days.map((day) => (
          <div
            key={day.format('YYYY-MM-DD')}
            className="flex flex-1 flex-col gap-0.5 p-1"
          >
            {getDayEventLayout(events, day).allDayEvents.map((event) => (
              <div
                key={event.uid}
                className="truncate rounded px-1 text-xs font-medium"
                style={event.color ? { backgroundColor: event.color } : undefined}
                title={event.summary}
              >
                {event.summary}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex">
        <div className="w-14 shrink-0">
          {HOURS.map((hour) => (
            <div
              key={hour}
              data-hour={hour}
              className="h-12 text-right text-xs text-ciGrey"
            >
              {`${String(hour).padStart(2, '0')}:00`}
            </div>
          ))}
        </div>
        {days.map((day) => {
          const { positionedEvents } = getDayEventLayout(events, day);
          return (
            <div
              key={day.format('YYYY-MM-DD')}
              data-day-column={day.format('YYYY-MM-DD')}
              className="relative flex-1 border-l border-ciGrey"
              style={{ height: columnHeight }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-12 border-t border-ciGrey"
                />
              ))}
              {positionedEvents.map((positioned) => (
                <div
                  key={positioned.event.uid}
                  className={cn('absolute overflow-hidden rounded px-1 text-xs text-white')}
                  style={{
                    top: `${positioned.topPercent}%`,
                    height: `${positioned.heightPercent}%`,
                    left: `${(positioned.columnIndex / positioned.columnCount) * 100}%`,
                    width: `${100 / positioned.columnCount}%`,
                    backgroundColor: positioned.event.color ?? '#0081c6',
                  }}
                  title={positioned.event.summary}
                >
                  {`${dayjs(positioned.event.start).format('HH:mm')} ${positioned.event.summary}`}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeGrid;
