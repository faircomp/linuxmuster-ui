/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

interface CalendarEventAttendee {
  email: string;
  displayName?: string;
  role?: string;
  status?: string;
}

export default CalendarEventAttendee;
