/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { rrulestr } from 'rrule';
import type { CalendarEvent } from '@libs/calendar/types';

const toRRuleDate = (iso: string): string =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

const expandEventOccurrences = (events: CalendarEvent[], from: Date, to: Date): CalendarEvent[] => {
  const expanded: CalendarEvent[] = [];

  events.forEach((event) => {
    if (!event.rrule) {
      expanded.push(event);
      return;
    }

    const durationMs = new Date(event.end).getTime() - new Date(event.start).getTime();
    const excludedTimes = new Set((event.exdate ?? []).map((exdate) => new Date(exdate).getTime()));

    let occurrences: Date[] = [];
    try {
      const rule = rrulestr(`DTSTART:${toRRuleDate(event.start)}\nRRULE:${event.rrule}`);
      occurrences = rule.between(from, to, true);
    } catch {
      expanded.push(event);
      return;
    }

    occurrences.forEach((occurrence) => {
      if (excludedTimes.has(occurrence.getTime())) {
        return;
      }
      expanded.push({
        ...event,
        start: occurrence.toISOString(),
        end: new Date(occurrence.getTime() + durationMs).toISOString(),
      });
    });
  });

  return expanded;
};

export default expandEventOccurrences;
