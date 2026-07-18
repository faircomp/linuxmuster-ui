/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import CalendarTag from '@libs/calendar/constants/calendarTag';

const isCalendarTag = (value: unknown): value is string =>
  typeof value === 'string' && (Object.values(CalendarTag) as string[]).includes(value);

export default isCalendarTag;
