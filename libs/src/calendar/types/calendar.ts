/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type CalendarShare from './calendarShare';

interface Calendar {
  id: string;
  displayName: string;
  color?: string;
  description?: string;
  ctag?: string;
  readOnly: boolean;
  isSubscribed: boolean;
  url: string;
  shares?: CalendarShare[];
  tags?: string[];
}

export default Calendar;
