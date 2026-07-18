/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ICAL from 'ical.js';
import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import CalendarEventClassification from '@libs/calendar/constants/calendarEventClassification';
import CalendarEventTransparency from '@libs/calendar/constants/calendarEventTransparency';
import type CalendarEvent from '@libs/calendar/types/calendarEvent';
import type CalendarEventAttendee from '@libs/calendar/types/calendarEventAttendee';

const MAILTO_PREFIX_REGEX = /^mailto:/i;
const ALLOWED_CLASSIFICATIONS = new Set<string>(Object.values(CalendarEventClassification));
const ALLOWED_TRANSPARENCIES = new Set<string>(Object.values(CalendarEventTransparency));
const DEFAULT_ATTENDEE_ROLE = 'REQ-PARTICIPANT';
const DEFAULT_ATTENDEE_PARTSTAT = 'NEEDS-ACTION';
const ONE_SECOND_MS = 1000;

export interface MappedCalendarEvent extends CalendarEvent {
  recurrenceId?: string;
  sequence?: number;
}

export interface CalendarEventOverride {
  recurrenceId: string;
  fields: MappedCalendarEvent;
}

export interface ParsedCalendarEvent extends MappedCalendarEvent {
  overrides?: CalendarEventOverride[];
}

class IcalMapper {
  static PRODID = '-//edulution//CalDAV Client//EN';

  static VERSION = '2.0';

  static icalTimeToUtcMs(time: ICAL.Time): number {
    if (time.isDate) {
      return Date.UTC(time.year, time.month - 1, time.day, 0, 0, 0, 0);
    }
    return time.toJSDate().getTime();
  }

  static icalTimeToIso(time: ICAL.Time): string {
    return new Date(IcalMapper.icalTimeToUtcMs(time)).toISOString();
  }

  static extractUid(ics: string): string | null {
    try {
      const jcal = ICAL.parse(ics) as unknown[];
      const vcalendar = new ICAL.Component(jcal);
      const vevent = vcalendar.getFirstSubcomponent('vevent');
      if (!vevent) {
        return null;
      }
      return (vevent.getFirstPropertyValue('uid') as string | null) ?? null;
    } catch {
      return null;
    }
  }

  static parseIcsToEvent(ics: string, calendarId: string, etag?: string): ParsedCalendarEvent | null {
    try {
      const jcal = ICAL.parse(ics) as unknown[];
      const vcalendar = new ICAL.Component(jcal);
      const vevents = vcalendar.getAllSubcomponents('vevent');
      if (vevents.length === 0) {
        return null;
      }
      const baseVevent = vevents.find((v) => !v.getFirstPropertyValue('recurrence-id')) ?? vevents[0];
      const overrideVevents = vevents.filter((v) => v !== baseVevent && !!v.getFirstPropertyValue('recurrence-id'));
      const base = IcalMapper.mapVeventToEventFields(baseVevent);
      if (!base) {
        return null;
      }
      const overrides = overrideVevents
        .map((v): CalendarEventOverride | null => {
          const recurrenceIdValue = v.getFirstPropertyValue('recurrence-id') as ICAL.Time | null;
          if (!recurrenceIdValue) {
            return null;
          }
          const overrideFields = IcalMapper.mapVeventToEventFields(v);
          if (!overrideFields) {
            return null;
          }
          return { recurrenceId: IcalMapper.icalTimeToIso(recurrenceIdValue), fields: overrideFields };
        })
        .filter((o): o is CalendarEventOverride => o !== null);
      return {
        ...base,
        calendarId,
        etag,
        overrides: overrides.length > 0 ? overrides : undefined,
      };
    } catch (error) {
      Logger.warn(`Failed to parse iCal: ${error instanceof Error ? error.message : String(error)}`, IcalMapper.name);
      return null;
    }
  }

  static mapVeventToEventFields(vevent: ICAL.Component): MappedCalendarEvent | null {
    try {
      const event = new ICAL.Event(vevent);
      const rrule = vevent.getFirstPropertyValue('rrule');
      const rruleString = rrule ? rrule.toString() : undefined;
      const exdates = vevent
        .getAllProperties('exdate')
        .map((prop) => {
          const value = prop.getFirstValue() as ICAL.Time | null;
          return value ? IcalMapper.icalTimeToIso(value) : null;
        })
        .filter((v): v is string => !!v);
      const startTime = event.startDate;
      const endTime = event.endDate;
      const allDay = !!(startTime && startTime.isDate);
      const rawClassification = vevent.getFirstPropertyValue('class');
      const classification =
        typeof rawClassification === 'string' && ALLOWED_CLASSIFICATIONS.has(rawClassification.toUpperCase())
          ? (rawClassification.toUpperCase() as MappedCalendarEvent['classification'])
          : undefined;
      const rawTransparency = vevent.getFirstPropertyValue('transp');
      const transparency =
        typeof rawTransparency === 'string' && ALLOWED_TRANSPARENCIES.has(rawTransparency.toUpperCase())
          ? (rawTransparency.toUpperCase() as MappedCalendarEvent['transparency'])
          : undefined;
      const attendees = vevent
        .getAllProperties('attendee')
        .map((prop) => IcalMapper.parseAttendee(prop))
        .filter((a): a is CalendarEventAttendee => !!a);
      const organizerProp = vevent.getFirstProperty('organizer');
      const organizer = organizerProp ? IcalMapper.parseAttendee(organizerProp) : undefined;
      const recurrenceIdValue = vevent.getFirstPropertyValue('recurrence-id') as ICAL.Time | null;
      const rawColor = vevent.getFirstPropertyValue('color');
      const color = typeof rawColor === 'string' && rawColor.length > 0 ? rawColor : undefined;
      return {
        uid: event.uid || '',
        calendarId: '',
        summary: event.summary || '',
        description: event.description || undefined,
        location: event.location || undefined,
        start: startTime ? IcalMapper.icalTimeToIso(startTime) : '',
        end: endTime ? IcalMapper.icalTimeToIso(endTime) : '',
        allDay,
        rrule: rruleString,
        exdate: exdates.length > 0 ? exdates : undefined,
        recurrenceId: recurrenceIdValue ? IcalMapper.icalTimeToIso(recurrenceIdValue) : undefined,
        classification,
        transparency,
        color,
        attendees: attendees.length > 0 ? attendees : undefined,
        organizer: organizer ?? undefined,
        sequence: (vevent.getFirstPropertyValue('sequence') as number | null) ?? undefined,
      };
    } catch (error) {
      Logger.warn(`Failed to map VEVENT: ${error instanceof Error ? error.message : String(error)}`, IcalMapper.name);
      return null;
    }
  }

  static serializeEventToIcs(event: MappedCalendarEvent): string {
    const vcalendar = new ICAL.Component(['vcalendar', [], []]);
    vcalendar.updatePropertyWithValue('prodid', IcalMapper.PRODID);
    vcalendar.updatePropertyWithValue('version', IcalMapper.VERSION);
    const vevent = IcalMapper.buildVevent(event);
    vcalendar.addSubcomponent(vevent);
    return vcalendar.toString();
  }

  static serializeEventWithOverrides(base: MappedCalendarEvent, overrides: MappedCalendarEvent[]): string {
    const vcalendar = new ICAL.Component(['vcalendar', [], []]);
    vcalendar.updatePropertyWithValue('prodid', IcalMapper.PRODID);
    vcalendar.updatePropertyWithValue('version', IcalMapper.VERSION);
    vcalendar.addSubcomponent(IcalMapper.buildVevent(base));
    overrides.forEach((override) => {
      vcalendar.addSubcomponent(IcalMapper.buildVevent({ ...override, uid: base.uid }));
    });
    return vcalendar.toString();
  }

  static addExdate(ics: string, occurrenceIso: string): string {
    try {
      const jcal = ICAL.parse(ics) as unknown[];
      const vcalendar = new ICAL.Component(jcal);
      const vevents = vcalendar.getAllSubcomponents('vevent');
      const baseVevent = vevents.find((v) => !v.getFirstPropertyValue('recurrence-id')) ?? vevents[0];
      if (!baseVevent) {
        return ics;
      }
      const startValue = baseVevent.getFirstPropertyValue('dtstart') as ICAL.Time | null;
      const allDay = !!(startValue && startValue.isDate);
      const exdateProp = new ICAL.Property('exdate', baseVevent);
      exdateProp.setValue(IcalMapper.toIcalTime(occurrenceIso, allDay));
      baseVevent.addProperty(exdateProp);
      return vcalendar.toString();
    } catch (error) {
      Logger.warn(`Failed to add EXDATE: ${error instanceof Error ? error.message : String(error)}`, IcalMapper.name);
      return ics;
    }
  }

  static clipRrule(ics: string, untilIso: string, splitInstantMs?: number): string {
    try {
      const jcal = ICAL.parse(ics) as unknown[];
      const vcalendar = new ICAL.Component(jcal);
      const vevents = vcalendar.getAllSubcomponents('vevent');
      const baseVevent = vevents.find((v) => !v.getFirstPropertyValue('recurrence-id')) ?? vevents[0];
      if (!baseVevent) {
        return ics;
      }
      const existing = baseVevent.getFirstPropertyValue('rrule');
      if (!existing) {
        return ics;
      }
      const baseRrule = existing
        .toString()
        .replace(/(^|;)COUNT=[^;]*/gi, '')
        .replace(/(^|;)UNTIL=[^;]*/gi, '')
        .replace(/^;/, '');
      const untilIcalString = IcalMapper.formatIcalUtcString(untilIso);
      const separator = baseRrule.length > 0 ? ';' : '';
      const clipped = ICAL.Recur.fromString(`${baseRrule}${separator}UNTIL=${untilIcalString}`);
      baseVevent.updatePropertyWithValue('rrule', clipped);
      if (typeof splitInstantMs === 'number') {
        baseVevent.getAllProperties('exdate').forEach((prop) => {
          const value = prop.getFirstValue() as ICAL.Time | null;
          if (value && IcalMapper.icalTimeToUtcMs(value) >= splitInstantMs) {
            baseVevent.removeProperty(prop);
          }
        });
        vevents
          .filter((v) => v !== baseVevent)
          .forEach((override) => {
            const rid = override.getFirstPropertyValue('recurrence-id') as ICAL.Time | null;
            if (rid && IcalMapper.icalTimeToUtcMs(rid) >= splitInstantMs) {
              vcalendar.removeSubcomponent(override);
            }
          });
      }
      return vcalendar.toString();
    } catch (error) {
      Logger.warn(`Failed to clip RRULE: ${error instanceof Error ? error.message : String(error)}`, IcalMapper.name);
      return ics;
    }
  }

  static applyFullSeriesEdit(ics: string, edit: MappedCalendarEvent): string {
    try {
      const jcal = ICAL.parse(ics) as unknown[];
      const vcalendar = new ICAL.Component(jcal);
      const vevents = vcalendar.getAllSubcomponents('vevent');
      const baseVevent = vevents.find((v) => !v.getFirstPropertyValue('recurrence-id')) ?? vevents[0];
      if (!baseVevent) {
        return IcalMapper.serializeEventToIcs(edit);
      }
      IcalMapper.applyEditToVevent(baseVevent, edit);
      IcalMapper.applyRruleAndExdate(baseVevent, edit);
      baseVevent.updatePropertyWithValue('uid', edit.uid);
      baseVevent.updatePropertyWithValue('dtstamp', ICAL.Time.now());
      return vcalendar.toString();
    } catch (error) {
      Logger.warn(
        `Failed to apply full-series edit: ${error instanceof Error ? error.message : String(error)}`,
        IcalMapper.name,
      );
      return IcalMapper.serializeEventToIcs(edit);
    }
  }

  static upsertOccurrenceOverride(ics: string, occurrenceIso: string, edit: MappedCalendarEvent): string {
    try {
      const jcal = ICAL.parse(ics) as unknown[];
      const vcalendar = new ICAL.Component(jcal);
      const vevents = vcalendar.getAllSubcomponents('vevent');
      const baseVevent = vevents.find((v) => !v.getFirstPropertyValue('recurrence-id')) ?? vevents[0];
      if (!baseVevent) {
        return ics;
      }
      const baseStart = baseVevent.getFirstPropertyValue('dtstart') as ICAL.Time | null;
      const allDay = !!(baseStart && baseStart.isDate);
      const recurrenceTime = IcalMapper.toIcalTime(occurrenceIso, allDay);
      const recurrenceTimeMs = IcalMapper.icalTimeToUtcMs(recurrenceTime);
      const existingOverride = vevents.find((v) => {
        const rid = v.getFirstPropertyValue('recurrence-id') as ICAL.Time | null;
        return rid != null && IcalMapper.icalTimeToUtcMs(rid) === recurrenceTimeMs;
      });
      let target: ICAL.Component;
      if (existingOverride) {
        target = existingOverride;
      } else {
        target = IcalMapper.cloneVeventAsOverrideSeed(baseVevent);
        vcalendar.addSubcomponent(target);
      }
      IcalMapper.applyEditToVevent(target, edit);
      target.updatePropertyWithValue('uid', edit.uid);
      target.updatePropertyWithValue('recurrence-id', recurrenceTime);
      target.updatePropertyWithValue('dtstamp', ICAL.Time.now());
      return vcalendar.toString();
    } catch (error) {
      Logger.warn(
        `Failed to upsert occurrence override: ${error instanceof Error ? error.message : String(error)}`,
        IcalMapper.name,
      );
      return ics;
    }
  }

  static buildForkedSeriesIcs(
    originalIcs: string,
    splitInstantMs: number,
    newUid: string,
    edit: MappedCalendarEvent,
  ): string {
    try {
      const jcal = ICAL.parse(originalIcs) as unknown[];
      const vcalendar = new ICAL.Component(jcal);
      const vevents = vcalendar.getAllSubcomponents('vevent');
      const baseVevent = vevents.find((v) => !v.getFirstPropertyValue('recurrence-id')) ?? vevents[0];
      if (!baseVevent) {
        return IcalMapper.serializeEventToIcs({ ...edit, uid: newUid });
      }
      const carriedExdates = baseVevent
        .getAllProperties('exdate')
        .map((prop) => prop.getFirstValue() as ICAL.Time | null)
        .filter((t): t is ICAL.Time => t != null && IcalMapper.icalTimeToUtcMs(t) >= splitInstantMs)
        .map((t) => IcalMapper.icalTimeToIso(t));
      const editForFork: MappedCalendarEvent = {
        ...edit,
        uid: newUid,
        exdate: edit.exdate && edit.exdate.length > 0 ? edit.exdate : carriedExdates,
      };
      IcalMapper.applyEditToVevent(baseVevent, editForFork);
      IcalMapper.applyRruleAndExdate(baseVevent, editForFork);
      baseVevent.updatePropertyWithValue('uid', newUid);
      baseVevent.updatePropertyWithValue('dtstamp', ICAL.Time.now());
      vevents
        .filter((v) => v !== baseVevent)
        .forEach((override) => {
          const rid = override.getFirstPropertyValue('recurrence-id') as ICAL.Time | null;
          if (!rid || IcalMapper.icalTimeToUtcMs(rid) < splitInstantMs) {
            vcalendar.removeSubcomponent(override);
            return;
          }
          override.updatePropertyWithValue('uid', newUid);
        });
      return vcalendar.toString();
    } catch (error) {
      Logger.warn(`Failed to fork series: ${error instanceof Error ? error.message : String(error)}`, IcalMapper.name);
      return IcalMapper.serializeEventToIcs({ ...edit, uid: newUid });
    }
  }

  static cloneVeventAsOverrideSeed(source: ICAL.Component): ICAL.Component {
    const clonedJcal = JSON.parse(JSON.stringify(source.jCal)) as unknown[];
    const cloned = new ICAL.Component(clonedJcal);
    cloned.removeAllProperties('rrule');
    cloned.removeAllProperties('exdate');
    return cloned;
  }

  static applyEditToVevent(vevent: ICAL.Component, edit: MappedCalendarEvent): void {
    vevent.updatePropertyWithValue('summary', edit.summary);
    vevent.updatePropertyWithValue('dtstart', IcalMapper.toIcalTime(edit.start, edit.allDay));
    vevent.updatePropertyWithValue('dtend', IcalMapper.toIcalTime(edit.end, edit.allDay));
    IcalMapper.upsertOptional(vevent, 'description', edit.description);
    IcalMapper.upsertOptional(vevent, 'location', edit.location);
    IcalMapper.upsertOptional(vevent, 'class', edit.classification);
    IcalMapper.upsertOptional(vevent, 'transp', edit.transparency);
    IcalMapper.upsertOptional(vevent, 'color', edit.color);
    vevent.removeAllProperties('attendee');
    (edit.attendees ?? []).forEach((attendee) => {
      if (!attendee.email) {
        return;
      }
      const prop = vevent.addPropertyWithValue('attendee', `mailto:${attendee.email}`);
      if (attendee.displayName) {
        prop.setParameter('cn', attendee.displayName);
      }
      prop.setParameter('role', attendee.role ?? DEFAULT_ATTENDEE_ROLE);
      prop.setParameter('partstat', attendee.status ?? DEFAULT_ATTENDEE_PARTSTAT);
    });
  }

  static applyRruleAndExdate(vevent: ICAL.Component, edit: MappedCalendarEvent): void {
    vevent.removeAllProperties('rrule');
    if (edit.rrule) {
      try {
        vevent.updatePropertyWithValue('rrule', ICAL.Recur.fromString(edit.rrule));
      } catch (error) {
        Logger.warn(
          `Invalid RRULE "${edit.rrule}": ${error instanceof Error ? error.message : String(error)}`,
          IcalMapper.name,
        );
      }
    }
    vevent.removeAllProperties('exdate');
    (edit.exdate ?? []).forEach((iso) => {
      const prop = new ICAL.Property('exdate', vevent);
      prop.setValue(IcalMapper.toIcalTime(iso, edit.allDay));
      vevent.addProperty(prop);
    });
  }

  static upsertOptional(vevent: ICAL.Component, name: string, value?: string): void {
    if (!value) {
      vevent.removeAllProperties(name);
      return;
    }
    vevent.updatePropertyWithValue(name, value);
  }

  static formatIcalUtcString(iso: string): string {
    const date = new Date(iso);
    const yyyy = date.getUTCFullYear().toString().padStart(4, '0');
    const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const dd = date.getUTCDate().toString().padStart(2, '0');
    const hh = date.getUTCHours().toString().padStart(2, '0');
    const min = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
  }

  static occurrenceBeforeIso(occurrenceIso: string): string {
    return new Date(new Date(occurrenceIso).getTime() - ONE_SECOND_MS).toISOString();
  }

  static buildVevent(event: MappedCalendarEvent): ICAL.Component {
    const vevent = new ICAL.Component('vevent');
    vevent.updatePropertyWithValue('uid', event.uid || randomUUID());
    vevent.updatePropertyWithValue('summary', event.summary);
    vevent.updatePropertyWithValue('dtstamp', ICAL.Time.now());
    vevent.updatePropertyWithValue('dtstart', IcalMapper.toIcalTime(event.start, event.allDay));
    vevent.updatePropertyWithValue('dtend', IcalMapper.toIcalTime(event.end, event.allDay));
    if (event.recurrenceId) {
      vevent.updatePropertyWithValue('recurrence-id', IcalMapper.toIcalTime(event.recurrenceId, event.allDay));
    }
    if (event.description) {
      vevent.updatePropertyWithValue('description', event.description);
    }
    if (event.location) {
      vevent.updatePropertyWithValue('location', event.location);
    }
    if (event.rrule) {
      try {
        vevent.updatePropertyWithValue('rrule', ICAL.Recur.fromString(event.rrule));
      } catch (error) {
        Logger.warn(
          `Invalid RRULE "${event.rrule}": ${error instanceof Error ? error.message : String(error)}`,
          IcalMapper.name,
        );
      }
    }
    (event.exdate ?? []).forEach((iso) => {
      const prop = new ICAL.Property('exdate', vevent);
      prop.setValue(IcalMapper.toIcalTime(iso, event.allDay));
      vevent.addProperty(prop);
    });
    if (event.classification) {
      vevent.updatePropertyWithValue('class', event.classification);
    }
    if (event.transparency) {
      vevent.updatePropertyWithValue('transp', event.transparency);
    }
    if (event.color) {
      vevent.updatePropertyWithValue('color', event.color);
    }
    (event.attendees ?? []).forEach((attendee) => {
      if (!attendee.email) {
        return;
      }
      const prop = vevent.addPropertyWithValue('attendee', `mailto:${attendee.email}`);
      if (attendee.displayName) {
        prop.setParameter('cn', attendee.displayName);
      }
      prop.setParameter('role', attendee.role ?? DEFAULT_ATTENDEE_ROLE);
      prop.setParameter('partstat', attendee.status ?? DEFAULT_ATTENDEE_PARTSTAT);
    });
    return vevent;
  }

  static parseAttendee(prop: ICAL.Property): CalendarEventAttendee | null {
    const value = prop.getFirstValue();
    const uri = typeof value === 'string' ? value : String(value ?? '');
    if (!uri) {
      return null;
    }
    const email = uri.replace(MAILTO_PREFIX_REGEX, '').trim();
    if (!email) {
      return null;
    }
    const cn = prop.getParameter('cn');
    const role = prop.getParameter('role');
    const partstat = prop.getParameter('partstat');
    return {
      email,
      displayName: typeof cn === 'string' ? cn : undefined,
      role: typeof role === 'string' ? role : undefined,
      status: typeof partstat === 'string' ? partstat : undefined,
    };
  }

  static toIcalTime(iso: string, allDay?: boolean): ICAL.Time {
    const date = new Date(iso);
    if (allDay) {
      return ICAL.Time.fromDateString(date.toISOString().substring(0, 10));
    }
    return ICAL.Time.fromJSDate(date, true);
  }
}

export default IcalMapper;
