/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { create } from 'zustand';
import eduApi from '@/api/eduApi';
import handleApiError from '@/utils/handleApiError';
import {
  CALENDAR_CALENDARS_ENDPOINT,
  CALENDAR_EVENTS_ENDPOINT,
  CALENDAR_TAGS_PATH_SEGMENT,
} from '@libs/calendar/constants/calendar-endpoint';
import type {
  Calendar,
  CalendarCreateBody,
  CalendarEvent,
  RecurrenceEdit,
  TRecurrenceEditScope,
} from '@libs/calendar/types';

interface CalendarStore {
  calendars: Calendar[];
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  reset: () => void;
  fetchCalendars: () => Promise<void>;
  createCalendar: (body: CalendarCreateBody) => Promise<Calendar | undefined>;
  setCalendarTags: (calendarId: string, tags: string[]) => Promise<void>;
  fetchEvents: (from: string, to: string, calendarIds?: string[]) => Promise<void>;
  createEvent: (event: CalendarEvent) => Promise<CalendarEvent | undefined>;
  updateEvent: (
    uid: string,
    event: CalendarEvent,
    recurrenceEdit?: RecurrenceEdit,
  ) => Promise<CalendarEvent | undefined>;
  deleteEvent: (
    uid: string,
    calendarId: string,
    scope?: TRecurrenceEditScope,
    occurrenceStart?: string,
  ) => Promise<void>;
}

const initialState = {
  calendars: [],
  events: [],
  isLoading: false,
  error: null,
};

const useCalendarStore = create<CalendarStore>((set) => ({
  ...initialState,

  reset: () => set(initialState),

  fetchCalendars: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await eduApi.get<Calendar[]>(CALENDAR_CALENDARS_ENDPOINT);
      set({ calendars: data });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isLoading: false });
    }
  },

  createCalendar: async (body) => {
    set({ error: null });
    try {
      const { data } = await eduApi.post<Calendar>(CALENDAR_CALENDARS_ENDPOINT, body);
      return data;
    } catch (error) {
      handleApiError(error, set);
      return undefined;
    }
  },

  setCalendarTags: async (calendarId, tags) => {
    set({ error: null });
    try {
      await eduApi.put(`${CALENDAR_CALENDARS_ENDPOINT}/${calendarId}/${CALENDAR_TAGS_PATH_SEGMENT}`, { tags });
    } catch (error) {
      handleApiError(error, set);
    }
  },

  fetchEvents: async (from, to, calendarIds) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string> = { from, to };
      if (calendarIds?.length) {
        params.calendarIds = calendarIds.join(',');
      }
      const { data } = await eduApi.get<CalendarEvent[]>(CALENDAR_EVENTS_ENDPOINT, { params });
      set({ events: data });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isLoading: false });
    }
  },

  createEvent: async (event) => {
    set({ error: null });
    try {
      const { data } = await eduApi.post<CalendarEvent>(CALENDAR_EVENTS_ENDPOINT, event);
      return data;
    } catch (error) {
      handleApiError(error, set);
      return undefined;
    }
  },

  updateEvent: async (uid, event, recurrenceEdit) => {
    set({ error: null });
    try {
      const { data } = await eduApi.put<CalendarEvent>(`${CALENDAR_EVENTS_ENDPOINT}/${uid}`, {
        ...event,
        recurrenceEdit,
      });
      return data;
    } catch (error) {
      handleApiError(error, set);
      return undefined;
    }
  },

  deleteEvent: async (uid, calendarId, scope, occurrenceStart) => {
    set({ error: null });
    try {
      const params: Record<string, string> = { calendarId };
      if (scope && occurrenceStart) {
        params.recurrenceScope = scope;
        params.occurrenceStart = occurrenceStart;
      }
      await eduApi.delete(`${CALENDAR_EVENTS_ENDPOINT}/${uid}`, { params });
    } catch (error) {
      handleApiError(error, set);
    }
  },
}));

export default useCalendarStore;
