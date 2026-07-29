/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { RRule } from 'rrule';
import type { Options, Weekday } from 'rrule';

export const RECURRENCE_FREQUENCY = {
  NONE: 'NONE',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
} as const;

export type TRecurrenceFrequency = (typeof RECURRENCE_FREQUENCY)[keyof typeof RECURRENCE_FREQUENCY];

export const RECURRENCE_END = {
  NEVER: 'NEVER',
  UNTIL: 'UNTIL',
  COUNT: 'COUNT',
} as const;

export type TRecurrenceEnd = (typeof RECURRENCE_END)[keyof typeof RECURRENCE_END];

export const RECURRENCE_WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

export interface RecurrenceModel {
  frequency: TRecurrenceFrequency;
  interval: number;
  byday: string[];
  end: TRecurrenceEnd;
  until?: string;
  count?: number;
}

export const EMPTY_RECURRENCE: RecurrenceModel = {
  frequency: RECURRENCE_FREQUENCY.NONE,
  interval: 1,
  byday: [],
  end: RECURRENCE_END.NEVER,
};

const FREQUENCY_TO_RRULE: Record<string, number> = {
  [RECURRENCE_FREQUENCY.DAILY]: RRule.DAILY,
  [RECURRENCE_FREQUENCY.WEEKLY]: RRule.WEEKLY,
  [RECURRENCE_FREQUENCY.MONTHLY]: RRule.MONTHLY,
};

const RRULE_TO_FREQUENCY: Record<number, TRecurrenceFrequency> = {
  [RRule.DAILY]: RECURRENCE_FREQUENCY.DAILY,
  [RRule.WEEKLY]: RECURRENCE_FREQUENCY.WEEKLY,
  [RRule.MONTHLY]: RECURRENCE_FREQUENCY.MONTHLY,
};

const WEEKDAY_TO_RRULE: Record<string, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

const toWeekdayName = (weekday: number | string | Weekday): string => {
  if (typeof weekday === 'number') {
    return RECURRENCE_WEEKDAYS[weekday];
  }
  if (typeof weekday === 'string') {
    return weekday;
  }
  return RECURRENCE_WEEKDAYS[weekday.weekday];
};

const buildRRuleString = (model: RecurrenceModel): string => {
  if (model.frequency === RECURRENCE_FREQUENCY.NONE) {
    return '';
  }
  const options: Partial<Options> = {
    freq: FREQUENCY_TO_RRULE[model.frequency],
    interval: model.interval > 0 ? model.interval : 1,
  };
  if (model.frequency === RECURRENCE_FREQUENCY.WEEKLY && model.byday.length > 0) {
    options.byweekday = model.byday.map((day) => WEEKDAY_TO_RRULE[day]).filter(Boolean);
  }
  if (model.end === RECURRENCE_END.UNTIL && model.until) {
    options.until = new Date(`${model.until}T00:00:00Z`);
  }
  if (model.end === RECURRENCE_END.COUNT && model.count) {
    options.count = model.count;
  }
  return RRule.optionsToString(options).replace(/^RRULE:/, '');
};

export const parseRRuleString = (rrule?: string): RecurrenceModel => {
  if (!rrule) {
    return { ...EMPTY_RECURRENCE };
  }
  const options = RRule.parseString(rrule);
  const frequency = options.freq === undefined ? RECURRENCE_FREQUENCY.NONE : RRULE_TO_FREQUENCY[options.freq];
  const { byweekday } = options;
  const byday = Array.isArray(byweekday) ? byweekday.map((weekday) => toWeekdayName(weekday)).filter(Boolean) : [];
  let end: TRecurrenceEnd = RECURRENCE_END.NEVER;
  if (options.until) {
    end = RECURRENCE_END.UNTIL;
  } else if (options.count) {
    end = RECURRENCE_END.COUNT;
  }
  return {
    frequency: frequency ?? RECURRENCE_FREQUENCY.NONE,
    interval: options.interval ?? 1,
    byday,
    end,
    until: options.until ? options.until.toISOString().slice(0, 10) : undefined,
    count: options.count ?? undefined,
  };
};

export default buildRRuleString;
