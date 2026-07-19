/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import z from 'zod';

const getEventFormSchema = (t: (key: string) => string) =>
  z
    .object({
      summary: z.string().min(1, { message: t('common.required') }),
      calendarId: z.string().min(1, { message: t('common.required') }),
      start: z.string().min(1, { message: t('common.required') }),
      end: z.string().min(1, { message: t('common.required') }),
      description: z.string().optional(),
      location: z.string().optional(),
      color: z.string().optional(),
      allDay: z.boolean(),
      attendees: z.string().optional(),
    })
    .refine((values) => values.end >= values.start, {
      message: t('calendar.endBeforeStart'),
      path: ['end'],
    });

export default getEventFormSchema;
