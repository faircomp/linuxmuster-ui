/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import CalendarEventClassification from '@libs/calendar/constants/calendarEventClassification';
import CalendarEventTransparency from '@libs/calendar/constants/calendarEventTransparency';
import type CalendarEventAttendee from './calendarEventAttendee';

export type TCalendarEventClassification =
  (typeof CalendarEventClassification)[keyof typeof CalendarEventClassification];
export type TCalendarEventTransparency = (typeof CalendarEventTransparency)[keyof typeof CalendarEventTransparency];

interface CalendarEvent {
  uid: string;
  calendarId: string;
  etag?: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  rrule?: string;
  classification?: TCalendarEventClassification;
  transparency?: TCalendarEventTransparency;
  color?: string;
  attendees?: CalendarEventAttendee[];
  organizer?: CalendarEventAttendee;
  exdate?: string[];
}

export default CalendarEvent;
