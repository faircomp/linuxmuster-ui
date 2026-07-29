/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import RecurrenceEditScope from '@libs/calendar/constants/recurrenceEditScope';

export type TRecurrenceEditScope = (typeof RecurrenceEditScope)[keyof typeof RecurrenceEditScope];

interface RecurrenceEdit {
  scope: TRecurrenceEditScope;
  occurrenceStart: string;
}

export default RecurrenceEdit;
