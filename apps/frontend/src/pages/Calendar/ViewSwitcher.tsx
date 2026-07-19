/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import CalendarView, { TCalendarView } from '@libs/calendar/constants/calendarView';

interface ViewSwitcherProps {
  value: TCalendarView;
  onChange: (view: TCalendarView) => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('calendar.title')}
      className="flex overflow-hidden rounded border border-ciGrey"
    >
      {Object.values(CalendarView).map((view) => (
        <button
          key={view}
          type="button"
          aria-pressed={view === value}
          onClick={() => onChange(view)}
          className={cn('px-3 py-1 text-sm', view === value ? 'bg-ciDarkGrey font-semibold' : 'hover:bg-ciDarkGrey')}
        >
          {t(`calendar.${view}`)}
        </button>
      ))}
    </div>
  );
};

export default ViewSwitcher;
