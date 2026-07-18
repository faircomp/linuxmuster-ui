/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import IcalMapper, { MappedCalendarEvent } from './ical.mapper';

const baseEvent = (): MappedCalendarEvent => ({
  uid: 'series-1',
  calendarId: 'personal',
  summary: 'Weekly Math',
  start: '2026-04-20T08:00:00.000Z',
  end: '2026-04-20T08:45:00.000Z',
  allDay: false,
  rrule: 'FREQ=WEEKLY;BYDAY=MO',
});

describe('IcalMapper — core mapping', () => {
  it('round-trips an event through serialize and parse', () => {
    const ics = IcalMapper.serializeEventToIcs(baseEvent());
    const parsed = IcalMapper.parseIcsToEvent(ics, 'personal');

    expect(parsed).not.toBeNull();
    expect(parsed?.uid).toBe('series-1');
    expect(parsed?.summary).toBe('Weekly Math');
    expect(parsed?.start).toBe('2026-04-20T08:00:00.000Z');
    expect(parsed?.end).toBe('2026-04-20T08:45:00.000Z');
    expect(parsed?.allDay).toBe(false);
    expect(parsed?.rrule).toContain('FREQ=WEEKLY');
    expect(parsed?.calendarId).toBe('personal');
  });

  it('extracts the uid and returns null for invalid ics', () => {
    const ics = IcalMapper.serializeEventToIcs(baseEvent());

    expect(IcalMapper.extractUid(ics)).toBe('series-1');
    expect(IcalMapper.extractUid('this is not an ics')).toBeNull();
  });

  it('maps attendees, classification, transparency and color', () => {
    const ics = IcalMapper.serializeEventToIcs({
      ...baseEvent(),
      rrule: undefined,
      classification: 'PRIVATE',
      transparency: 'TRANSPARENT',
      color: '#0081c6',
      attendees: [{ email: 'jane@example.com', displayName: 'Jane', role: 'REQ-PARTICIPANT', status: 'ACCEPTED' }],
    });
    const parsed = IcalMapper.parseIcsToEvent(ics, 'personal');

    expect(parsed?.classification).toBe('PRIVATE');
    expect(parsed?.transparency).toBe('TRANSPARENT');
    expect(parsed?.color).toBe('#0081c6');
    expect(parsed?.attendees).toEqual([
      { email: 'jane@example.com', displayName: 'Jane', role: 'REQ-PARTICIPANT', status: 'ACCEPTED' },
    ]);
  });

  it('treats an all-day event as date-only', () => {
    const ics = IcalMapper.serializeEventToIcs({
      ...baseEvent(),
      rrule: undefined,
      allDay: true,
      start: '2026-04-20T00:00:00.000Z',
      end: '2026-04-21T00:00:00.000Z',
    });
    const parsed = IcalMapper.parseIcsToEvent(ics, 'personal');

    expect(parsed?.allDay).toBe(true);
    expect(parsed?.start).toBe('2026-04-20T00:00:00.000Z');
  });
});

describe('IcalMapper — time helpers', () => {
  it('subtracts one second in occurrenceBeforeIso', () => {
    expect(IcalMapper.occurrenceBeforeIso('2026-04-27T08:00:00.000Z')).toBe('2026-04-27T07:59:59.000Z');
  });

  it('formats a compact UTC string', () => {
    expect(IcalMapper.formatIcalUtcString('2026-07-01T00:00:00.000Z')).toBe('20260701T000000Z');
  });

  it('round-trips a UTC time', () => {
    const time = IcalMapper.toIcalTime('2026-04-20T08:00:00.000Z', false);

    expect(IcalMapper.icalTimeToIso(time)).toBe('2026-04-20T08:00:00.000Z');
  });
});

describe('IcalMapper — recurrence scope THIS (single occurrence)', () => {
  it('excludes the occurrence from the series via addExdate', () => {
    const ics = IcalMapper.serializeEventToIcs(baseEvent());
    const updated = IcalMapper.addExdate(ics, '2026-04-27T08:00:00.000Z');
    const parsed = IcalMapper.parseIcsToEvent(updated, 'personal');

    expect(parsed?.exdate).toContain('2026-04-27T08:00:00.000Z');
  });

  it('adds an override with a recurrence-id via upsertOccurrenceOverride', () => {
    const ics = IcalMapper.serializeEventToIcs(baseEvent());
    const edited: MappedCalendarEvent = { ...baseEvent(), summary: 'Moved Math', rrule: undefined };
    const updated = IcalMapper.upsertOccurrenceOverride(ics, '2026-04-27T08:00:00.000Z', edited);
    const parsed = IcalMapper.parseIcsToEvent(updated, 'personal');

    expect(parsed?.overrides).toHaveLength(1);
    expect(parsed?.overrides?.[0].recurrenceId).toBe('2026-04-27T08:00:00.000Z');
    expect(parsed?.overrides?.[0].fields.summary).toBe('Moved Math');
  });
});

describe('IcalMapper — recurrence scope ALL (full series)', () => {
  it('updates the base series in place via applyFullSeriesEdit', () => {
    const ics = IcalMapper.serializeEventToIcs(baseEvent());
    const edit: MappedCalendarEvent = { ...baseEvent(), summary: 'Renamed Series' };
    const updated = IcalMapper.applyFullSeriesEdit(ics, edit);
    const parsed = IcalMapper.parseIcsToEvent(updated, 'personal');

    expect(parsed?.summary).toBe('Renamed Series');
    expect(parsed?.uid).toBe('series-1');
    expect(parsed?.rrule).toContain('FREQ=WEEKLY');
  });
});

describe('IcalMapper — recurrence scope THIS_AND_FOLLOWING (clip + fork)', () => {
  const splitIso = '2026-05-04T08:00:00.000Z';
  const splitMs = new Date(splitIso).getTime();

  it('bounds the original series with UNTIL via clipRrule', () => {
    const ics = IcalMapper.serializeEventToIcs(baseEvent());
    const untilIso = IcalMapper.occurrenceBeforeIso(splitIso);
    const clipped = IcalMapper.clipRrule(ics, untilIso, splitMs);
    const parsed = IcalMapper.parseIcsToEvent(clipped, 'personal');

    expect(parsed?.rrule).toContain('UNTIL=');
    expect(parsed?.rrule).toContain('FREQ=WEEKLY');
  });

  it('starts a new series with the new uid and the edit via buildForkedSeriesIcs', () => {
    const ics = IcalMapper.serializeEventToIcs(baseEvent());
    const edit: MappedCalendarEvent = {
      ...baseEvent(),
      summary: 'Forked Series',
      start: splitIso,
      end: '2026-05-04T08:45:00.000Z',
    };
    const forked = IcalMapper.buildForkedSeriesIcs(ics, splitMs, 'series-2', edit);
    const parsed = IcalMapper.parseIcsToEvent(forked, 'personal');

    expect(parsed?.uid).toBe('series-2');
    expect(parsed?.summary).toBe('Forked Series');
    expect(parsed?.rrule).toContain('FREQ=WEEKLY');
  });
});
