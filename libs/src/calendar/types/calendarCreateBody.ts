/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type CalendarShare from './calendarShare';

interface CalendarCreateBody {
  displayName: string;
  description?: string;
  color?: string;
  tags?: string[];
  shares: CalendarShare[];
}

export default CalendarCreateBody;
