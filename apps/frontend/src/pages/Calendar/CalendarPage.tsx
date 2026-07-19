/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@edulution-io/ui-kit';
import buildCalendarMonthGrid from '@libs/calendar/utils/buildCalendarMonthGrid';
import PageLayout from '@/components/structure/layout/PageLayout';
import { CalendarIcon } from '@/assets/icons';
import useCalendarStore from '@/pages/Calendar/useCalendarStore';
import MonthGrid from '@/pages/Calendar/MonthGrid';

const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const { events, isLoading, fetchEvents } = useCalendarStore();
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month'));

  useEffect(() => {
    const grid = buildCalendarMonthGrid(currentMonth);
    void fetchEvents(grid[0].toISOString(), grid[grid.length - 1].add(1, 'day').toISOString());
  }, [currentMonth, fetchEvents]);

  const goToPreviousMonth = () => setCurrentMonth((month) => month.subtract(1, 'month'));
  const goToNextMonth = () => setCurrentMonth((month) => month.add(1, 'month'));
  const goToToday = () => setCurrentMonth(dayjs().startOf('month'));

  const navButtonClassName = cn('rounded p-2 hover:bg-ciDarkGrey');

  return (
    <PageLayout nativeAppHeader={{ title: t('calendar.title'), iconSrc: CalendarIcon }}>
      <div className="flex items-center justify-between gap-2 py-2">
        <h2 className="text-lg font-semibold">
          {currentMonth.toDate().toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('calendar.previousMonth')}
            onClick={goToPreviousMonth}
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
            aria-label={t('calendar.nextMonth')}
            onClick={goToNextMonth}
            className={navButtonClassName}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>
      {!isLoading && events.length === 0 ? <p className="py-2 text-sm text-ciGrey">{t('calendar.noEvents')}</p> : null}
      <MonthGrid
        month={currentMonth}
        events={events}
      />
    </PageLayout>
  );
};

export default CalendarPage;
