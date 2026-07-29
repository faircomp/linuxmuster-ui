/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import dayjs from 'dayjs';
import type { CalendarEvent } from '@libs/calendar/types';
import MonthGrid from './MonthGrid';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

const APRIL_2026 = dayjs('2026-04-01');

const buildEvent = (overrides: Partial<CalendarEvent>): CalendarEvent =>
  ({
    uid: 'e1',
    calendarId: 'c1',
    summary: 'Field Trip',
    start: '2026-04-15',
    end: '2026-04-15',
    allDay: true,
    ...overrides,
  }) as CalendarEvent;

const cellFor = (markup: string, isoDay: string): string | undefined =>
  markup.split('role="gridcell"').find((segment) => segment.includes(`data-day="${isoDay}"`));

describe('MonthGrid', () => {
  it('renders 42 day cells for a month', () => {
    const markup = renderToStaticMarkup(
      <MonthGrid
        month={APRIL_2026}
        events={[]}
      />,
    );

    expect((markup.match(/role="gridcell"/g) || []).length).toBe(42);
  });

  it('starts the grid on the Monday before the first of the month and ends six weeks later', () => {
    const markup = renderToStaticMarkup(
      <MonthGrid
        month={APRIL_2026}
        events={[]}
      />,
    );

    expect(markup).toContain('data-day="2026-03-30"');
    expect(markup).toContain('data-day="2026-05-10"');
  });

  it('renders an event chip in the cell of its start day', () => {
    const markup = renderToStaticMarkup(
      <MonthGrid
        month={APRIL_2026}
        events={[buildEvent({ summary: 'Field Trip' })]}
      />,
    );

    expect(markup).toContain('Field Trip');
    expect(cellFor(markup, '2026-04-15')).toContain('Field Trip');
    expect(cellFor(markup, '2026-04-16')).not.toContain('Field Trip');
  });
});
