/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import CalendarEventAttendeeDto from './calendar-event-attendee.dto';
import RecurrenceEditDto from './recurrence-edit.dto';
import CalendarEventBodyDto from './calendar-event-body.dto';

const errorProps = (errors: ValidationError[]) => errors.map((error) => error.property);

const validEvent = {
  uid: 'event-1',
  calendarId: 'personal',
  summary: 'Math 9a',
  start: '2026-04-20T08:00:00.000Z',
  end: '2026-04-20T08:45:00.000Z',
  allDay: false,
};

describe('CalendarEventAttendeeDto', () => {
  it('accepts an attendee with only an email', async () => {
    const dto = plainToInstance(CalendarEventAttendeeDto, { email: 'jane.doe@example.com' });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an attendee without an email', async () => {
    const dto = plainToInstance(CalendarEventAttendeeDto, { displayName: 'Jane' });

    expect(errorProps(await validate(dto))).toContain('email');
  });
});

describe('RecurrenceEditDto', () => {
  it('accepts a valid scope and ISO occurrence start', async () => {
    const dto = plainToInstance(RecurrenceEditDto, { scope: 'THIS', occurrenceStart: '2026-04-27T08:00:00.000Z' });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an unknown scope and a non-ISO occurrence start', async () => {
    const dto = plainToInstance(RecurrenceEditDto, { scope: 'BOGUS', occurrenceStart: 'not-a-date' });

    expect(errorProps(await validate(dto))).toEqual(expect.arrayContaining(['scope', 'occurrenceStart']));
  });
});

describe('CalendarEventBodyDto', () => {
  it('accepts a minimal valid event', async () => {
    const dto = plainToInstance(CalendarEventBodyDto, validEvent);

    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a fully populated valid event', async () => {
    const dto = plainToInstance(CalendarEventBodyDto, {
      ...validEvent,
      description: 'Chapter 5 exam',
      location: 'Room 102',
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE',
      classification: 'PUBLIC',
      transparency: 'OPAQUE',
      color: '#0081c6',
      attendees: [{ email: 'jane.doe@example.com' }],
      organizer: { email: 'teacher@example.com' },
      exdate: ['2026-04-22T08:00:00.000Z'],
      recurrenceEdit: { scope: 'ALL', occurrenceStart: '2026-04-27T08:00:00.000Z' },
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a non-ISO start, a non-boolean allDay, an unknown classification, a bad color, a bad exdate and an invalid attendee', async () => {
    const dto = plainToInstance(CalendarEventBodyDto, {
      uid: 'event-1',
      calendarId: 'personal',
      summary: 'Math 9a',
      start: 'not-a-date',
      end: '2026-04-20T08:45:00.000Z',
      allDay: 'nope',
      classification: 'SECRET',
      color: 'xyz',
      exdate: ['bad'],
      attendees: [{}],
    });

    expect(errorProps(await validate(dto))).toEqual(
      expect.arrayContaining(['start', 'allDay', 'classification', 'color', 'exdate', 'attendees']),
    );
  });

  it('rejects an invalid nested recurrenceEdit', async () => {
    const dto = plainToInstance(CalendarEventBodyDto, {
      ...validEvent,
      recurrenceEdit: { scope: 'BOGUS', occurrenceStart: 'not-a-date' },
    });

    expect(errorProps(await validate(dto))).toContain('recurrenceEdit');
  });
});
