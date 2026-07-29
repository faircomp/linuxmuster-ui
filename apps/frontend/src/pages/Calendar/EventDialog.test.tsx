/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import type { CalendarEvent } from '@libs/calendar/types';
import buildEventFromForm, { buildFormValuesFromEvent } from './buildEventFromForm';
import type { EventFormValues } from './buildEventFromForm';
import getEventFormSchema from './getEventFormSchema';

const t = (key: string) => key;
const schema = getEventFormSchema(t);

const validValues: EventFormValues = {
  summary: 'Math',
  calendarId: 'c1',
  start: '2026-04-15T09:00',
  end: '2026-04-15T10:00',
  allDay: false,
  description: '',
  location: '',
  color: '',
  attendees: '',
};

describe('getEventFormSchema', () => {
  it('accepts a fully filled event', () => {
    expect(schema.safeParse(validValues).success).toBe(true);
  });

  it.each(['summary', 'calendarId', 'start', 'end'] as const)('requires the %s field', (field) => {
    expect(schema.safeParse({ ...validValues, [field]: '' }).success).toBe(false);
  });

  it('rejects an end that is before the start', () => {
    expect(schema.safeParse({ ...validValues, end: '2026-04-15T08:00' }).success).toBe(false);
  });
});

describe('buildEventFromForm', () => {
  it('maps form values to an event body with ISO timestamps and parsed attendees', () => {
    const body = buildEventFromForm({ ...validValues, attendees: 'a@example.com, b@example.com' });

    expect(body.uid).toBe('');
    expect(body.calendarId).toBe('c1');
    expect(body.summary).toBe('Math');
    expect(body.allDay).toBe(false);
    expect(body.start).toBe(new Date('2026-04-15T09:00').toISOString());
    expect(body.attendees).toEqual([{ email: 'a@example.com' }, { email: 'b@example.com' }]);
  });

  it('keeps the uid and etag when editing an existing event', () => {
    const existing = { uid: 'evt-1', etag: 'e-tag', calendarId: 'c1' } as CalendarEvent;
    const body = buildEventFromForm(validValues, existing);

    expect(body.uid).toBe('evt-1');
    expect(body.etag).toBe('e-tag');
  });

  it('drops empty optional fields', () => {
    const body = buildEventFromForm(validValues);

    expect(body.description).toBeUndefined();
    expect(body.location).toBeUndefined();
    expect(body.color).toBeUndefined();
    expect(body.attendees).toEqual([]);
  });
});

describe('buildFormValuesFromEvent', () => {
  it('prefills form values from an existing event', () => {
    const event = {
      uid: 'evt-1',
      calendarId: 'c1',
      summary: 'Standup',
      start: '2026-04-15T09:00:00',
      end: '2026-04-15T09:30:00',
      allDay: false,
      attendees: [{ email: 'a@example.com' }],
    } as CalendarEvent;

    const values = buildFormValuesFromEvent(event);

    expect(values.summary).toBe('Standup');
    expect(values.calendarId).toBe('c1');
    expect(values.attendees).toBe('a@example.com');
    expect(values.start).toBe('2026-04-15T09:00');
  });

  it('uses the default start when creating a new event', () => {
    const values = buildFormValuesFromEvent(undefined, '2026-05-01T08:00:00');

    expect(values.summary).toBe('');
    expect(values.calendarId).toBe('');
    expect(values.start).toBe('2026-05-01T08:00');
  });
});
