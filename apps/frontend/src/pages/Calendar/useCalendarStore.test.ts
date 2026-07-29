/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import eduApi from '@/api/eduApi';
import {
  CALENDAR_CALENDARS_ENDPOINT,
  CALENDAR_EVENTS_ENDPOINT,
  CALENDAR_TAGS_PATH_SEGMENT,
} from '@libs/calendar/constants/calendar-endpoint';
import RecurrenceEditScope from '@libs/calendar/constants/recurrenceEditScope';
import useCalendarStore from './useCalendarStore';

vi.mock('@/api/eduApi', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockedGet = (eduApi as unknown as { get: ReturnType<typeof vi.fn> }).get;
const mockedPost = (eduApi as unknown as { post: ReturnType<typeof vi.fn> }).post;
const mockedPut = (eduApi as unknown as { put: ReturnType<typeof vi.fn> }).put;
const mockedDelete = (eduApi as unknown as { delete: ReturnType<typeof vi.fn> }).delete;

describe('useCalendarStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCalendarStore.getState().reset();
    mockedGet.mockResolvedValue({ data: [] });
    mockedPost.mockResolvedValue({ data: {} });
    mockedPut.mockResolvedValue({ data: {} });
    mockedDelete.mockResolvedValue({ data: undefined });
  });

  it('fetchCalendars stores the returned calendars', async () => {
    const calendars = [{ id: 'c1', displayName: 'Personal' }];
    mockedGet.mockResolvedValue({ data: calendars });

    await useCalendarStore.getState().fetchCalendars();

    expect(mockedGet).toHaveBeenCalledWith(CALENDAR_CALENDARS_ENDPOINT);
    expect(useCalendarStore.getState().calendars).toBe(calendars);
  });

  it('createCalendar posts the body and returns the created calendar', async () => {
    const created = { id: 'c9', displayName: 'Klasse 10a' };
    mockedPost.mockResolvedValue({ data: created });

    const result = await useCalendarStore.getState().createCalendar({ displayName: 'Klasse 10a', shares: [] });

    expect(mockedPost).toHaveBeenCalledWith(CALENDAR_CALENDARS_ENDPOINT, { displayName: 'Klasse 10a', shares: [] });
    expect(result).toBe(created);
  });

  it('setCalendarTags puts the tags to the calendar tags path', async () => {
    await useCalendarStore.getState().setCalendarTags('cal-1', ['timetable']);

    expect(mockedPut).toHaveBeenCalledWith(`${CALENDAR_CALENDARS_ENDPOINT}/cal-1/${CALENDAR_TAGS_PATH_SEGMENT}`, {
      tags: ['timetable'],
    });
  });

  it('fetchEvents sends from, to and comma-joined calendarIds as query params', async () => {
    const events = [{ uid: 'e1' }];
    mockedGet.mockResolvedValue({ data: events });

    await useCalendarStore.getState().fetchEvents('2026-04-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z', ['a', 'b']);

    expect(mockedGet).toHaveBeenCalledWith(CALENDAR_EVENTS_ENDPOINT, {
      params: { from: '2026-04-01T00:00:00.000Z', to: '2026-05-01T00:00:00.000Z', calendarIds: 'a,b' },
    });
    expect(useCalendarStore.getState().events).toBe(events);
  });

  it('fetchEvents omits calendarIds when none are given', async () => {
    await useCalendarStore.getState().fetchEvents('2026-04-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z');

    expect(mockedGet).toHaveBeenCalledWith(CALENDAR_EVENTS_ENDPOINT, {
      params: { from: '2026-04-01T00:00:00.000Z', to: '2026-05-01T00:00:00.000Z' },
    });
  });

  it('createEvent posts the event body', async () => {
    const event = { uid: '', calendarId: 'c1', summary: 'Math', start: 's', end: 'e', allDay: false };

    await useCalendarStore.getState().createEvent(event as never);

    expect(mockedPost).toHaveBeenCalledWith(CALENDAR_EVENTS_ENDPOINT, event);
  });

  it('updateEvent puts the event with the recurrence edit merged in', async () => {
    const event = { uid: 'e1', calendarId: 'c1', summary: 'Math', start: 's', end: 'e', allDay: false };
    const recurrenceEdit = { scope: RecurrenceEditScope.THIS, occurrenceStart: '2026-04-27T08:00:00.000Z' };

    await useCalendarStore.getState().updateEvent('e1', event as never, recurrenceEdit);

    expect(mockedPut).toHaveBeenCalledWith(`${CALENDAR_EVENTS_ENDPOINT}/e1`, { ...event, recurrenceEdit });
  });

  it('deleteEvent appends recurrenceScope and occurrenceStart when a scope is given', async () => {
    await useCalendarStore
      .getState()
      .deleteEvent('e1', 'c1', RecurrenceEditScope.THIS_AND_FOLLOWING, '2026-05-04T08:00:00.000Z');

    expect(mockedDelete).toHaveBeenCalledWith(`${CALENDAR_EVENTS_ENDPOINT}/e1`, {
      params: {
        calendarId: 'c1',
        recurrenceScope: RecurrenceEditScope.THIS_AND_FOLLOWING,
        occurrenceStart: '2026-05-04T08:00:00.000Z',
      },
    });
  });

  it('deleteEvent sends only the calendarId when no scope is given', async () => {
    await useCalendarStore.getState().deleteEvent('e1', 'c1');

    expect(mockedDelete).toHaveBeenCalledWith(`${CALENDAR_EVENTS_ENDPOINT}/e1`, { params: { calendarId: 'c1' } });
  });
});
