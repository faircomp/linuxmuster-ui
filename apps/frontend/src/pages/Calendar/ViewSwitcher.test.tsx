/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CalendarView from '@libs/calendar/constants/calendarView';
import ViewSwitcher from './ViewSwitcher';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ViewSwitcher', () => {
  it('renders a button for every calendar view', () => {
    const markup = renderToStaticMarkup(
      <ViewSwitcher
        value={CalendarView.MONTH}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('calendar.month');
    expect(markup).toContain('calendar.week');
    expect(markup).toContain('calendar.day');
    expect((markup.match(/<button/g) || []).length).toBe(3);
  });

  it('marks exactly the active view as pressed', () => {
    const markup = renderToStaticMarkup(
      <ViewSwitcher
        value={CalendarView.WEEK}
        onChange={vi.fn()}
      />,
    );

    expect((markup.match(/aria-pressed="true"/g) || []).length).toBe(1);
  });
});
