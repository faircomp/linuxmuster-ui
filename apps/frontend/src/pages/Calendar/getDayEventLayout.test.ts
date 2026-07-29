/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import type { CalendarEvent } from '@libs/calendar/types';
import getDayEventLayout from '@libs/calendar/utils/getDayEventLayout';

const DAY = dayjs('2026-04-15');

const buildEvent = (overrides: Partial<CalendarEvent>): CalendarEvent =>
  ({
    uid: 'e',
    calendarId: 'c',
    summary: 's',
    start: '2026-04-15T00:00:00',
    end: '2026-04-15T01:00:00',
    allDay: false,
    ...overrides,
  }) as CalendarEvent;

describe('getDayEventLayout', () => {
  it('separates all-day events from timed events', () => {
    const layout = getDayEventLayout(
      [buildEvent({ uid: 'a', allDay: true, start: '2026-04-15' }), buildEvent({ uid: 'b' })],
      DAY,
    );

    expect(layout.allDayEvents.map((event) => event.uid)).toEqual(['a']);
    expect(layout.positionedEvents.map((positioned) => positioned.event.uid)).toEqual(['b']);
  });

  it('positions a timed event by its start minute and duration', () => {
    const layout = getDayEventLayout(
      [buildEvent({ uid: 'b', start: '2026-04-15T06:00:00', end: '2026-04-15T12:00:00' })],
      DAY,
    );

    expect(layout.positionedEvents[0].topPercent).toBe(25);
    expect(layout.positionedEvents[0].heightPercent).toBe(25);
    expect(layout.positionedEvents[0].columnCount).toBe(1);
  });

  it('lays overlapping events into separate columns', () => {
    const layout = getDayEventLayout(
      [
        buildEvent({ uid: 'b', start: '2026-04-15T09:00:00', end: '2026-04-15T10:00:00' }),
        buildEvent({ uid: 'c', start: '2026-04-15T09:30:00', end: '2026-04-15T10:30:00' }),
      ],
      DAY,
    );

    expect(layout.positionedEvents).toHaveLength(2);
    expect(layout.positionedEvents[0].columnCount).toBe(2);
    expect(layout.positionedEvents.map((positioned) => positioned.columnIndex).sort()).toEqual([0, 1]);
  });

  it('reuses a column for events that do not overlap', () => {
    const layout = getDayEventLayout(
      [
        buildEvent({ uid: 'b', start: '2026-04-15T09:00:00', end: '2026-04-15T10:00:00' }),
        buildEvent({ uid: 'c', start: '2026-04-15T10:00:00', end: '2026-04-15T11:00:00' }),
      ],
      DAY,
    );

    expect(layout.positionedEvents[0].columnCount).toBe(1);
    expect(layout.positionedEvents.every((positioned) => positioned.columnIndex === 0)).toBe(true);
  });
});
