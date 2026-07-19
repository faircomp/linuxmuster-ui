/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@edulution-io/ui-kit';
import CalendarView, { TCalendarView } from '@libs/calendar/constants/calendarView';
import buildCalendarMonthGrid, { DAYS_PER_WEEK } from '@libs/calendar/utils/buildCalendarMonthGrid';
import getWeekStart from '@libs/calendar/utils/getWeekStart';
import PageLayout from '@/components/structure/layout/PageLayout';
import { CalendarIcon } from '@/assets/icons';
import useCalendarStore from '@/pages/Calendar/useCalendarStore';
import MonthGrid from '@/pages/Calendar/MonthGrid';
import WeekGrid from '@/pages/Calendar/WeekGrid';
import DayGrid from '@/pages/Calendar/DayGrid';
import ViewSwitcher from '@/pages/Calendar/ViewSwitcher';

const getFetchRange = (view: TCalendarView, anchorDate: Dayjs): { from: Dayjs; to: Dayjs } => {
  if (view === CalendarView.MONTH) {
    const grid = buildCalendarMonthGrid(anchorDate);
    return { from: grid[0], to: grid[grid.length - 1].add(1, 'day') };
  }
  if (view === CalendarView.WEEK) {
    const weekStart = getWeekStart(anchorDate);
    return { from: weekStart, to: weekStart.add(DAYS_PER_WEEK, 'day') };
  }
  const dayStart = anchorDate.startOf('day');
  return { from: dayStart, to: dayStart.add(1, 'day') };
};

const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const { events, isLoading, fetchEvents } = useCalendarStore();
  const [view, setView] = useState<TCalendarView>(CalendarView.MONTH);
  const [anchorDate, setAnchorDate] = useState<Dayjs>(() => dayjs());

  useEffect(() => {
    const { from, to } = getFetchRange(view, anchorDate);
    void fetchEvents(from.toISOString(), to.toISOString());
  }, [view, anchorDate, fetchEvents]);

  const goToPrevious = () => setAnchorDate((date) => date.subtract(1, view));
  const goToNext = () => setAnchorDate((date) => date.add(1, view));
  const goToToday = () => setAnchorDate(dayjs());

  const headerLabel = (() => {
    if (view === CalendarView.MONTH) {
      return anchorDate.toDate().toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
    }
    if (view === CalendarView.WEEK) {
      const weekStart = getWeekStart(anchorDate);
      const weekEnd = weekStart.add(DAYS_PER_WEEK - 1, 'day');
      const rangeOptions = { day: 'numeric', month: 'short' } as const;
      return `${weekStart.toDate().toLocaleDateString(i18n.language, rangeOptions)} – ${weekEnd
        .toDate()
        .toLocaleDateString(i18n.language, rangeOptions)}`;
    }
    return anchorDate.toDate().toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  })();

  const navButtonClassName = cn('rounded p-2 hover:bg-ciDarkGrey');

  return (
    <PageLayout nativeAppHeader={{ title: t('calendar.title'), iconSrc: CalendarIcon }}>
      <div className="flex flex-wrap items-center justify-between gap-2 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('calendar.previous')}
            onClick={goToPrevious}
            className={navButtonClassName}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className={cn('rounded px-3 py-1 text-sm hover:bg-ciDarkGrey')}
          >
            {t('calendar.today')}
          </button>
          <button
            type="button"
            aria-label={t('calendar.next')}
            onClick={goToNext}
            className={navButtonClassName}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
          <h2 className="text-lg font-semibold">{headerLabel}</h2>
        </div>
        <ViewSwitcher
          value={view}
          onChange={setView}
        />
      </div>
      {!isLoading && events.length === 0 ? <p className="py-2 text-sm text-ciGrey">{t('calendar.noEvents')}</p> : null}
      {view === CalendarView.MONTH ? (
        <MonthGrid
          month={anchorDate}
          events={events}
        />
      ) : null}
      {view === CalendarView.WEEK ? (
        <WeekGrid
          anchorDate={anchorDate}
          events={events}
        />
      ) : null}
      {view === CalendarView.DAY ? (
        <DayGrid
          day={anchorDate}
          events={events}
        />
      ) : null}
    </PageLayout>
  );
};

export default CalendarPage;
