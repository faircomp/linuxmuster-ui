/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import CalendarSharePermission from '@libs/calendar/constants/calendarSharePermission';
import CalendarShareSubjectType from '@libs/calendar/constants/calendarShareSubjectType';
import CalendarTag from '@libs/calendar/constants/calendarTag';
import CalendarErrorMessages from '@libs/calendar/constants/calendar-error-messages';
import type { CalendarShare } from '@libs/calendar/types';
import deTranslation from '@/locales/de/translation.json';
import enTranslation from '@/locales/en/translation.json';
import frTranslation from '@/locales/fr/translation.json';
import buildCalendarCreateBody from './buildCalendarCreateBody';

const getByPath = (source: Record<string, unknown>, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (accumulator, key) =>
        accumulator && typeof accumulator === 'object' ? (accumulator as Record<string, unknown>)[key] : undefined,
      source,
    );

describe('buildCalendarCreateBody', () => {
  it('maps the form to a create body and adds the timetable tag when enabled', () => {
    const body = buildCalendarCreateBody({
      displayName: 'Klasse 10a',
      description: '',
      color: '#0081c6',
      isTimetable: true,
      shares: [],
    });

    expect(body.displayName).toBe('Klasse 10a');
    expect(body.color).toBe('#0081c6');
    expect(body.description).toBeUndefined();
    expect(body.tags).toEqual([CalendarTag.TIMETABLE]);
  });

  it('omits the timetable tag when disabled', () => {
    const body = buildCalendarCreateBody({ displayName: 'Personal', isTimetable: false, shares: [] });

    expect(body.tags).toEqual([]);
  });

  it('keeps only shares that have a subject', () => {
    const shares: CalendarShare[] = [
      {
        subjectId: 'alice',
        subjectType: CalendarShareSubjectType.USER,
        label: 'alice',
        permission: CalendarSharePermission.VIEW,
      },
      {
        subjectId: '  ',
        subjectType: CalendarShareSubjectType.GROUP,
        label: '',
        permission: CalendarSharePermission.MODIFY,
      },
    ];

    const body = buildCalendarCreateBody({ displayName: 'Shared', isTimetable: false, shares });

    expect(body.shares).toHaveLength(1);
    expect(body.shares[0].subjectId).toBe('alice');
  });
});

describe('calendar error message translations', () => {
  it.each(Object.values(CalendarErrorMessages))('resolves %s to a string in every locale', (key) => {
    expect(typeof getByPath(deTranslation, key)).toBe('string');
    expect(typeof getByPath(enTranslation, key)).toBe('string');
    expect(typeof getByPath(frTranslation, key)).toBe('string');
  });
});
