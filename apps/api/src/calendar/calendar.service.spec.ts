/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import { DAVClient } from 'tsdav';
import CustomHttpException from '../common/CustomHttpException';
import CalendarService from './calendar.service';

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
  account: { homeUrl: 'https://dav.example/home/', principalUrl: 'https://dav.example/principal/' },
});

const configuredAppConfig = { extendedOptions: { CALENDAR_CALDAV_BASE_URL: 'https://dav.example/' } };

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
});
