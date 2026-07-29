/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

enum CalendarErrorMessages {
  CalDavConnectionFailed = 'calendar.errors.CalDavConnectionFailed',
  CalendarNotFound = 'calendar.errors.CalendarNotFound',
  EventNotFound = 'calendar.errors.EventNotFound',
  CreateEventFailed = 'calendar.errors.CreateEventFailed',
  UpdateEventFailed = 'calendar.errors.UpdateEventFailed',
  DeleteEventFailed = 'calendar.errors.DeleteEventFailed',
  CreateCalendarFailed = 'calendar.errors.CreateCalendarFailed',
  CalendarBackendNotConfigured = 'calendar.errors.CalendarBackendNotConfigured',
  SetTagsFailed = 'calendar.errors.SetTagsFailed',
}

export default CalendarErrorMessages;
