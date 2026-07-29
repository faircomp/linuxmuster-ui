/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import { DAVClient } from 'tsdav';
import CustomHttpException from '../common/CustomHttpException';
import CalendarService from './calendar.service';
import IcalMapper from './ical.mapper';

jest.mock('tsdav', () => ({
  DAVClient: jest.fn(),
  DAVNamespace: { CALDAV: 'urn:ietf:params:xml:ns:caldav', CALDAV_APPLE: 'http://apple.com/ns/ical/' },
  DAVNamespaceShort: { DAV: 'd', CALDAV: 'c', CALDAV_APPLE: 'ca' },
}));

const MockedDAVClient = DAVClient as unknown as jest.Mock;

const buildClientMock = () => ({
  login: jest.fn().mockResolvedValue(undefined),
  fetchCalendars: jest.fn().mockResolvedValue([]),
  propfind: jest.fn().mockResolvedValue([]),
  makeCalendar: jest.fn().mockResolvedValue(undefined),
  deleteObject: jest.fn().mockResolvedValue(undefined),
  fetchCalendarObjects: jest.fn().mockResolvedValue([]),
  createCalendarObject: jest.fn().mockResolvedValue({ headers: { get: () => 'etag-new' } }),
  updateCalendarObject: jest.fn().mockResolvedValue({ headers: { get: () => 'etag-updated' } }),
  deleteCalendarObject: jest.fn().mockResolvedValue({ headers: { get: () => null } }),
  account: { homeUrl: 'https://dav.example/home/', principalUrl: 'https://dav.example/principal/' },
});

const configuredAppConfig = { extendedOptions: { CALENDAR_CALDAV_BASE_URL: 'https://dav.example/' } };

const CAL_URL = 'https://dav.example/cal/';
const CAL_ID = Buffer.from(CAL_URL, 'utf-8').toString('base64url');
const calendarWithVevent = { url: CAL_URL, components: ['VEVENT'], displayName: 'Cal' };

const baseSeriesIcs = () =>
  IcalMapper.serializeEventToIcs({
    uid: 'evt-1',
    calendarId: CAL_ID,
    summary: 'Weekly Math',
    start: '2026-04-20T08:00:00.000Z',
    end: '2026-04-20T08:45:00.000Z',
    allDay: false,
    rrule: 'FREQ=WEEKLY;BYDAY=MO',
  });

const seriesObject = () => [{ url: `${CAL_URL}evt-1.ics`, etag: 'e1', data: baseSeriesIcs() }];

const dataOf = (call: unknown): string => (call as { calendarObject: { data: string } }).calendarObject.data;

describe('CalendarService', () => {
  let model: { find: jest.Mock; findOneAndUpdate: jest.Mock };
  let appConfigService: { getAppConfigByName: jest.Mock };
  let service: CalendarService;

  beforeEach(() => {
    jest.clearAllMocks();
    model = { find: jest.fn().mockResolvedValue([]), findOneAndUpdate: jest.fn().mockResolvedValue({}) };
    appConfigService = { getAppConfigByName: jest.fn().mockResolvedValue(configuredAppConfig) };
    service = new CalendarService(model as never, appConfigService as never);
    MockedDAVClient.mockImplementation(() => buildClientMock());
  });

  describe('assertBackendConfigured', () => {
    it('throws SERVICE_UNAVAILABLE when no CalDAV backend is configured', async () => {
      appConfigService.getAppConfigByName.mockResolvedValue(null);
      await service.updateBackendConfig();

      try {
        await service.listCalendars('user@example.com', 'pw');
        throw new Error('expected listCalendars to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(CustomHttpException);
        expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('proceeds to the CalDAV client once the backend base url is configured', async () => {
      await service.updateBackendConfig();

      await expect(service.listCalendars('user@example.com', 'pw')).resolves.toEqual([]);
      expect(MockedDAVClient).toHaveBeenCalled();
    });
  });

  describe('setCalendarTags', () => {
    it('persists the tags via an upserting findOneAndUpdate', async () => {
      await service.setCalendarTags('cal-1', ['timetable']);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { calendarId: 'cal-1' },
        { $set: { tags: ['timetable'] } },
        expect.objectContaining({ upsert: true }),
      );
    });

    it('throws SetTagsFailed on a persistence error', async () => {
      model.findOneAndUpdate.mockRejectedValue(new Error('db down'));

      await expect(service.setCalendarTags('cal-1', ['timetable'])).rejects.toBeInstanceOf(CustomHttpException);
    });
  });

  describe('createCalendar', () => {
    beforeEach(async () => {
      await service.updateBackendConfig();
    });

    it('rolls back the CalDAV calendar when the metadata write fails', async () => {
      const clientMock = buildClientMock();
      MockedDAVClient.mockImplementation(() => clientMock);
      model.findOneAndUpdate.mockRejectedValue(new Error('metadata write failed'));

      await expect(
        service.createCalendar('user@example.com', 'pw', 'user', { displayName: 'Klasse 10a', shares: [] } as never),
      ).rejects.toBeInstanceOf(CustomHttpException);

      expect(clientMock.makeCalendar).toHaveBeenCalled();
      expect(clientMock.deleteObject).toHaveBeenCalled();
    });

    it('creates the calendar and persists its metadata on success', async () => {
      const clientMock = buildClientMock();
      MockedDAVClient.mockImplementation(() => clientMock);

      const result = await service.createCalendar('user@example.com', 'pw', 'user', {
        displayName: 'Klasse 10a',
        shares: [],
        tags: ['timetable'],
      } as never);

      expect(clientMock.makeCalendar).toHaveBeenCalled();
      expect(model.findOneAndUpdate).toHaveBeenCalled();
      expect(clientMock.deleteObject).not.toHaveBeenCalled();
      expect(result.displayName).toBe('Klasse 10a');
      expect(result.tags).toEqual(['timetable']);
    });
  });

  describe('event operations', () => {
    let clientMock: ReturnType<typeof buildClientMock>;

    beforeEach(async () => {
      await service.updateBackendConfig();
      clientMock = buildClientMock();
      clientMock.fetchCalendars.mockResolvedValue([calendarWithVevent]);
      clientMock.fetchCalendarObjects.mockResolvedValue(seriesObject());
      MockedDAVClient.mockImplementation(() => clientMock);
    });

    it('listEvents returns the raw rrule string without expanding occurrences', async () => {
      const events = await service.listEvents('user@example.com', 'pw', {
        from: new Date('2026-04-01T00:00:00.000Z'),
        to: new Date('2026-05-01T00:00:00.000Z'),
      });

      expect(events).toHaveLength(1);
      expect(events[0].uid).toBe('evt-1');
      expect(events[0].rrule).toContain('FREQ=WEEKLY');
    });

    it('deleteEvent THIS excludes the occurrence via addExdate instead of deleting the object', async () => {
      await service.deleteEvent('user@example.com', 'pw', CAL_ID, 'evt-1', {
        scope: 'THIS',
        occurrenceStart: '2026-04-27T08:00:00.000Z',
      } as never);

      expect(clientMock.updateCalendarObject).toHaveBeenCalled();
      expect(clientMock.deleteCalendarObject).not.toHaveBeenCalled();
      expect(dataOf((clientMock.updateCalendarObject.mock.calls as unknown[][])[0][0])).toContain('EXDATE');
    });

    it('deleteEvent THIS_AND_FOLLOWING clips the series with UNTIL instead of deleting the object', async () => {
      await service.deleteEvent('user@example.com', 'pw', CAL_ID, 'evt-1', {
        scope: 'THIS_AND_FOLLOWING',
        occurrenceStart: '2026-05-04T08:00:00.000Z',
      } as never);

      expect(clientMock.updateCalendarObject).toHaveBeenCalled();
      expect(clientMock.deleteCalendarObject).not.toHaveBeenCalled();
      expect(dataOf((clientMock.updateCalendarObject.mock.calls as unknown[][])[0][0])).toContain('UNTIL=');
    });

    it('deleteEvent without a recurrence scope deletes the whole object', async () => {
      await service.deleteEvent('user@example.com', 'pw', CAL_ID, 'evt-1');

      expect(clientMock.deleteCalendarObject).toHaveBeenCalled();
      expect(clientMock.updateCalendarObject).not.toHaveBeenCalled();
    });

    it('updateEvent THIS_AND_FOLLOWING clips the original series and creates a forked new series', async () => {
      const result = await service.updateEvent('user@example.com', 'pw', 'evt-1', {
        calendarId: CAL_ID,
        uid: 'evt-1',
        summary: 'Changed Series',
        start: '2026-05-04T08:00:00.000Z',
        end: '2026-05-04T08:45:00.000Z',
        allDay: false,
        recurrenceEdit: { scope: 'THIS_AND_FOLLOWING', occurrenceStart: '2026-05-04T08:00:00.000Z' },
      } as never);

      expect(clientMock.updateCalendarObject).toHaveBeenCalledTimes(1);
      expect(dataOf((clientMock.updateCalendarObject.mock.calls as unknown[][])[0][0])).toContain('UNTIL=');
      expect(clientMock.createCalendarObject).toHaveBeenCalledTimes(1);
      expect(result.summary).toBe('Changed Series');
    });
  });
});
