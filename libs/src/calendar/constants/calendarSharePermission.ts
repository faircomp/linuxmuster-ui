/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const CalendarSharePermission = {
  NONE: 'NONE',
  FREE_BUSY: 'FREE_BUSY',
  VIEW: 'VIEW',
  MODIFY: 'MODIFY',
  ADMIN: 'ADMIN',
} as const;

export default CalendarSharePermission;
