/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import type { CalendarEvent } from '@libs/calendar/types';
import buildRRuleString, {
  parseRRuleString,
  EMPTY_RECURRENCE,
  RECURRENCE_FREQUENCY,
  RECURRENCE_END,
} from '@libs/calendar/utils/recurrenceRule';
import expandEventOccurrences from '@libs/calendar/utils/expandEventOccurrences';

describe('recurrenceRule', () => {
  it('round-trips a weekly rule with interval, byday and until', () => {
    const rrule = buildRRuleString({
      frequency: RECURRENCE_FREQUENCY.WEEKLY,
      interval: 2,
      byday: ['MO', 'WE'],
      end: RECURRENCE_END.UNTIL,
      until: '2026-07-01',
    });

    expect(rrule).toContain('FREQ=WEEKLY');
    expect(rrule).toContain('INTERVAL=2');
    expect(rrule).toContain('BYDAY=MO,WE');

    const parsed = parseRRuleString(rrule);
    expect(parsed.frequency).toBe(RECURRENCE_FREQUENCY.WEEKLY);
    expect(parsed.interval).toBe(2);
    expect(parsed.byday).toEqual(['MO', 'WE']);
    expect(parsed.end).toBe(RECURRENCE_END.UNTIL);
    expect(parsed.until).toBe('2026-07-01');
  });

  it('round-trips a daily rule with a count', () => {
    const rrule = buildRRuleString({
      frequency: RECURRENCE_FREQUENCY.DAILY,
      interval: 1,
      byday: [],
      end: RECURRENCE_END.COUNT,
      count: 5,
    });

    const parsed = parseRRuleString(rrule);
    expect(parsed.frequency).toBe(RECURRENCE_FREQUENCY.DAILY);
    expect(parsed.end).toBe(RECURRENCE_END.COUNT);
    expect(parsed.count).toBe(5);
  });

  it('returns an empty string for no recurrence and parses back to none', () => {
    expect(buildRRuleString(EMPTY_RECURRENCE)).toBe('');
    expect(parseRRuleString('').frequency).toBe(RECURRENCE_FREQUENCY.NONE);
    expect(parseRRuleString(undefined).frequency).toBe(RECURRENCE_FREQUENCY.NONE);
  });
});

const weekly: CalendarEvent = {
  uid: 'e1',
  calendarId: 'c1',
  summary: 'Weekly Math',
  start: '2026-04-20T08:00:00.000Z',
  end: '2026-04-20T08:45:00.000Z',
  allDay: false,
  rrule: 'FREQ=WEEKLY;BYDAY=MO',
};
const FROM = new Date('2026-04-19T00:00:00.000Z');
const TO = new Date('2026-05-11T00:00:00.000Z');

describe('expandEventOccurrences', () => {
  it('expands a weekly series across the window preserving duration', () => {
    const expanded = expandEventOccurrences([weekly], FROM, TO);

    expect(expanded.map((event) => event.start)).toEqual([
      '2026-04-20T08:00:00.000Z',
      '2026-04-27T08:00:00.000Z',
      '2026-05-04T08:00:00.000Z',
    ]);
    expect(expanded[0].end).toBe('2026-04-20T08:45:00.000Z');
    expect(expanded.every((event) => event.uid === 'e1')).toBe(true);
  });

  it('excludes exdates from the expansion', () => {
    const expanded = expandEventOccurrences([{ ...weekly, exdate: ['2026-04-27T08:00:00.000Z'] }], FROM, TO);

    expect(expanded.map((event) => event.start)).toEqual(['2026-04-20T08:00:00.000Z', '2026-05-04T08:00:00.000Z']);
  });

  it('passes non-recurring events through unchanged', () => {
    const single: CalendarEvent = {
      uid: 's1',
      calendarId: 'c1',
      summary: 'One-off',
      start: '2026-04-22T10:00:00.000Z',
      end: '2026-04-22T11:00:00.000Z',
      allDay: false,
    };

    expect(expandEventOccurrences([single], FROM, TO)).toEqual([single]);
  });
});
