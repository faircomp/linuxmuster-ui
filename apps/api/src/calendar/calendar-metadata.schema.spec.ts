/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { CalendarMetadataSchema } from './calendar-metadata.schema';
import { CalendarShareEntrySchema } from './calendar-share-entry.schema';

describe('CalendarShareEntrySchema', () => {
  it('is an embedded schema without its own _id', () => {
    expect(CalendarShareEntrySchema).toBeDefined();
    expect(CalendarShareEntrySchema.get('_id')).toBe(false);
  });

  it('defaults subjectType to USER, permission to VIEW and label to an empty string', () => {
    expect(CalendarShareEntrySchema.path('subjectType').options.default).toBe('USER');
    expect(CalendarShareEntrySchema.path('permission').options.default).toBe('VIEW');
    expect(CalendarShareEntrySchema.path('label').options.default).toBe('');
    expect(CalendarShareEntrySchema.path('subjectId').isRequired).toBe(true);
  });
});

describe('CalendarMetadataSchema', () => {
  it('compiles from the class with timestamps enabled', () => {
    expect(CalendarMetadataSchema).toBeDefined();
    expect(CalendarMetadataSchema.get('timestamps')).toBe(true);
  });

  it('marks calendarId as required, unique and indexed', () => {
    const calendarId = CalendarMetadataSchema.path('calendarId');

    expect(calendarId.isRequired).toBe(true);
    expect(calendarId.options.unique).toBe(true);
    expect(calendarId.options.index).toBe(true);
  });

  it('embeds shares and stores tags as arrays', () => {
    expect(CalendarMetadataSchema.path('shares').instance).toBe('Array');
    expect(CalendarMetadataSchema.path('tags').instance).toBe('Array');
  });

  it('does not require ownerUsername', () => {
    expect(CalendarMetadataSchema.path('ownerUsername').isRequired).toBe(false);
  });
});
