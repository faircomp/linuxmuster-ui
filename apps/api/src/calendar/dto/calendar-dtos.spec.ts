/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import CalendarShareBodyDto from './calendar-share-body.dto';
import CreateCalendarBodyDto from './create-calendar-body.dto';
import CalendarTagsBodyDto from './calendar-tags-body.dto';

const errorProps = (errors: ValidationError[]) => errors.map((error) => error.property);

describe('CalendarShareBodyDto', () => {
  it('accepts a valid share', async () => {
    const dto = plainToInstance(CalendarShareBodyDto, {
      subjectId: 'jane.doe',
      subjectType: 'USER',
      label: 'Jane Doe',
      permission: 'VIEW',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an empty subjectId and an unknown permission', async () => {
    const dto = plainToInstance(CalendarShareBodyDto, {
      subjectId: '',
      subjectType: 'USER',
      label: 'Jane',
      permission: 'OWNER',
    });

    expect(errorProps(await validate(dto))).toEqual(expect.arrayContaining(['subjectId', 'permission']));
  });

  it('rejects an unknown subjectType', async () => {
    const dto = plainToInstance(CalendarShareBodyDto, {
      subjectId: 'jane',
      subjectType: 'ROLE',
      label: 'Jane',
      permission: 'VIEW',
    });

    expect(errorProps(await validate(dto))).toContain('subjectType');
  });
});

describe('CreateCalendarBodyDto', () => {
  const validShare = { subjectId: 'jane', subjectType: 'USER', label: 'Jane', permission: 'VIEW' };

  it('accepts a minimal valid calendar', async () => {
    const dto = plainToInstance(CreateCalendarBodyDto, { displayName: 'Klasse 10a', shares: [validShare] });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts optional description, hex color and known tags', async () => {
    const dto = plainToInstance(CreateCalendarBodyDto, {
      displayName: 'Klasse 10a',
      description: 'Klassenkalender',
      color: '#8fc046',
      shares: [validShare],
      tags: ['timetable'],
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an empty displayName, a non-hex color and an unknown tag', async () => {
    const dto = plainToInstance(CreateCalendarBodyDto, {
      displayName: '',
      color: 'not-a-hex',
      shares: [],
      tags: ['bogus'],
    });

    expect(errorProps(await validate(dto))).toEqual(expect.arrayContaining(['displayName', 'color', 'tags']));
  });

  it('rejects an invalid permission inside a nested share', async () => {
    const dto = plainToInstance(CreateCalendarBodyDto, {
      displayName: 'Klasse 10a',
      shares: [{ subjectId: 'jane', subjectType: 'USER', label: 'Jane', permission: 'OWNER' }],
    });

    expect(errorProps(await validate(dto))).toContain('shares');
  });
});

describe('CalendarTagsBodyDto', () => {
  it('accepts a known tag', async () => {
    const dto = plainToInstance(CalendarTagsBodyDto, { tags: ['timetable'] });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an unknown tag', async () => {
    const dto = plainToInstance(CalendarTagsBodyDto, { tags: ['bogus'] });

    expect(errorProps(await validate(dto))).toContain('tags');
  });
});
