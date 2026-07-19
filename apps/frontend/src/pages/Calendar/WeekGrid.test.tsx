/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import dayjs from 'dayjs';
import type { CalendarEvent } from '@libs/calendar/types';
import WeekGrid from './WeekGrid';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

const ANCHOR = dayjs('2026-04-15');

describe('WeekGrid', () => {
  it('renders seven day columns', () => {
    const markup = renderToStaticMarkup(
      <WeekGrid
        anchorDate={ANCHOR}
        events={[]}
      />,
    );

    expect((markup.match(/data-day-column=/g) || []).length).toBe(7);
  });

  it('renders 24 hour rows', () => {
    const markup = renderToStaticMarkup(
      <WeekGrid
        anchorDate={ANCHOR}
        events={[]}
      />,
    );

    expect((markup.match(/data-hour=/g) || []).length).toBe(24);
  });

  it('starts the week on Monday and ends on Sunday', () => {
    const markup = renderToStaticMarkup(
      <WeekGrid
        anchorDate={ANCHOR}
        events={[]}
      />,
    );

    expect(markup).toContain('data-day-column="2026-04-13"');
    expect(markup).toContain('data-day-column="2026-04-19"');
  });

  it('renders a timed event in the week', () => {
    const event = {
      uid: 'e1',
      calendarId: 'c1',
      summary: 'Standup',
      start: '2026-04-15T09:00:00',
      end: '2026-04-15T09:30:00',
      allDay: false,
    } as CalendarEvent;

    const markup = renderToStaticMarkup(
      <WeekGrid
        anchorDate={ANCHOR}
        events={[event]}
      />,
    );

    expect(markup).toContain('Standup');
  });
});
