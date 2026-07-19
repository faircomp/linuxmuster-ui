/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const CALENDAR_ENDPOINT = 'calendar';

export const CALENDAR_CALENDARS_PATH_SEGMENT = 'calendars';

export const CALENDAR_EVENTS_PATH_SEGMENT = 'events';

export const CALENDAR_TAGS_PATH_SEGMENT = 'tags';

export const CALENDAR_TIMETABLE_PATH_SEGMENT = 'timetable';

export const CALENDAR_CALENDARS_ENDPOINT = `${CALENDAR_ENDPOINT}/${CALENDAR_CALENDARS_PATH_SEGMENT}`;

export const CALENDAR_EVENTS_ENDPOINT = `${CALENDAR_ENDPOINT}/${CALENDAR_EVENTS_PATH_SEGMENT}`;

export default CALENDAR_ENDPOINT;
