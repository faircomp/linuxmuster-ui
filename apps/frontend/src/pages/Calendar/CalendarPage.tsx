/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faPlus } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@edulution-io/ui-kit';
import type { CalendarEvent } from '@libs/calendar/types';
import CalendarView, { TCalendarView } from '@libs/calendar/constants/calendarView';
import buildCalendarMonthGrid, { DAYS_PER_WEEK } from '@libs/calendar/utils/buildCalendarMonthGrid';
import getWeekStart from '@libs/calendar/utils/getWeekStart';
import expandEventOccurrences from '@libs/calendar/utils/expandEventOccurrences';
import PageLayout from '@/components/structure/layout/PageLayout';
import { CalendarIcon } from '@/assets/icons';
import useCalendarStore from '@/pages/Calendar/useCalendarStore';
import MonthGrid from '@/pages/Calendar/MonthGrid';
import WeekGrid from '@/pages/Calendar/WeekGrid';
import DayGrid from '@/pages/Calendar/DayGrid';
import ViewSwitcher from '@/pages/Calendar/ViewSwitcher';
import EventDialog from '@/pages/Calendar/EventDialog';

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
  const { events, calendars, isLoading, fetchEvents, fetchCalendars } = useCalendarStore();
  const [view, setView] = useState<TCalendarView>(CalendarView.MONTH);
  const [anchorDate, setAnchorDate] = useState<Dayjs>(() => dayjs());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);
  const [defaultStart, setDefaultStart] = useState<string | undefined>(undefined);
  const [occurrenceStart, setOccurrenceStart] = useState<string | undefined>(undefined);

  const visibleEvents = useMemo(() => {
    const { from, to } = getFetchRange(view, anchorDate);
    return expandEventOccurrences(events, from.toDate(), to.toDate());
  }, [events, view, anchorDate]);

  const refetchEvents = useCallback(() => {
    const { from, to } = getFetchRange(view, anchorDate);
    void fetchEvents(from.toISOString(), to.toISOString());
  }, [view, anchorDate, fetchEvents]);

  useEffect(() => {
    refetchEvents();
  }, [refetchEvents]);

  useEffect(() => {
    void fetchCalendars();
  }, [fetchCalendars]);

  const openCreateDialog = (day?: Dayjs) => {
    setEditingEvent(undefined);
    setDefaultStart((day ?? anchorDate).startOf('day').toISOString());
    setOccurrenceStart(undefined);
    setIsDialogOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setDefaultStart(undefined);
    setOccurrenceStart(event.start);
    setIsDialogOpen(true);
  };

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openCreateDialog()}
            className={cn('flex items-center gap-1 rounded bg-primary px-3 py-1 text-sm')}
          >
            <FontAwesomeIcon icon={faPlus} />
            {t('calendar.newEvent')}
          </button>
          <ViewSwitcher
            value={view}
            onChange={setView}
          />
        </div>
      </div>
      {!isLoading && visibleEvents.length === 0 ? (
        <p className="py-2 text-sm text-ciGrey">{t('calendar.noEvents')}</p>
      ) : null}
      {view === CalendarView.MONTH ? (
        <MonthGrid
          month={anchorDate}
          events={visibleEvents}
          onSelectDay={openCreateDialog}
          onSelectEvent={openEditDialog}
        />
      ) : null}
      {view === CalendarView.WEEK ? (
        <WeekGrid
          anchorDate={anchorDate}
          events={visibleEvents}
          onSelectEvent={openEditDialog}
        />
      ) : null}
      {view === CalendarView.DAY ? (
        <DayGrid
          day={anchorDate}
          events={visibleEvents}
          onSelectEvent={openEditDialog}
        />
      ) : null}
      <EventDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        calendars={calendars}
        event={editingEvent}
        defaultStart={defaultStart}
        occurrenceStart={occurrenceStart}
        onSaved={refetchEvents}
      />
    </PageLayout>
  );
};

export default CalendarPage;
