/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import dayjs from 'dayjs';
import type { CalendarEvent } from '@libs/calendar/types';
import type CalendarEventAttendee from '@libs/calendar/types/calendarEventAttendee';

const LOCAL_INPUT_FORMAT = 'YYYY-MM-DDTHH:mm';

export interface EventFormValues {
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  color?: string;
  calendarId: string;
  attendees?: string;
  rrule?: string;
}

const parseAttendees = (raw?: string): CalendarEventAttendee[] =>
  (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((email) => ({ email }));

export const buildFormValuesFromEvent = (event?: CalendarEvent, defaultStart?: string): EventFormValues => {
  const start = event?.start ?? defaultStart ?? dayjs().startOf('hour').toISOString();
  const end = event?.end ?? dayjs(start).add(1, 'hour').toISOString();
  return {
    summary: event?.summary ?? '',
    description: event?.description ?? '',
    location: event?.location ?? '',
    start: dayjs(start).format(LOCAL_INPUT_FORMAT),
    end: dayjs(end).format(LOCAL_INPUT_FORMAT),
    allDay: event?.allDay ?? false,
    color: event?.color ?? '',
    calendarId: event?.calendarId ?? '',
    attendees: (event?.attendees ?? []).map((attendee) => attendee.email).join(', '),
    rrule: event?.rrule ?? '',
  };
};

const buildEventFromForm = (values: EventFormValues, existingEvent?: CalendarEvent): CalendarEvent => ({
  uid: existingEvent?.uid ?? '',
  calendarId: values.calendarId,
  etag: existingEvent?.etag,
  summary: values.summary,
  description: values.description || undefined,
  location: values.location || undefined,
  start: dayjs(values.start).toISOString(),
  end: dayjs(values.end).toISOString(),
  allDay: values.allDay,
  color: values.color || undefined,
  rrule: values.rrule || undefined,
  attendees: parseAttendees(values.attendees),
});

export default buildEventFromForm;
