/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import APPS from '@libs/appconfig/constants/apps';
import { APP_ACCESS_KEY } from '@libs/auth/constants/appAccessKeys';
import RecurrenceEditScope from '@libs/calendar/constants/recurrenceEditScope';
import controllerContractReflection from '../common/controllerContractReflection';
import UsersService from '../users/users.service';
import CalendarService from './calendar.service';
import CalendarController from './calendar.controller';
import CreateCalendarBodyDto from './dto/create-calendar-body.dto';
import CalendarEventBodyDto from './dto/calendar-event-body.dto';

const USERNAME = 'alice';
const EMAIL = 'alice@example.com';
const PASSWORD = 'secret-pw';
const CALENDAR_ID = 'personal';

const mockCalendarService = {
  listCalendars: jest.fn(),
  createCalendar: jest.fn(),
  setCalendarTags: jest.fn(),
  listEvents: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
};
const mockUsersService = { getPassword: jest.fn().mockResolvedValue(PASSWORD) };

describe('CalendarController', () => {
  let controller: CalendarController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        { provide: CalendarService, useValue: mockCalendarService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<CalendarController>(CalendarController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegation', () => {
    it('listCalendars resolves the password and delegates with the email address', async () => {
      await controller.listCalendars(USERNAME, EMAIL);

      expect(mockUsersService.getPassword).toHaveBeenCalledWith(USERNAME);
      expect(mockCalendarService.listCalendars).toHaveBeenCalledWith(EMAIL, PASSWORD);
    });

    it('createCalendar delegates with email, password, username and body', async () => {
      const body = { displayName: 'Klasse 10a', shares: [] } as CreateCalendarBodyDto;

      await controller.createCalendar(USERNAME, EMAIL, body);

      expect(mockCalendarService.createCalendar).toHaveBeenCalledWith(EMAIL, PASSWORD, USERNAME, body);
    });

    it('setCalendarTags delegates the tags without touching the password', async () => {
      await controller.setCalendarTags(CALENDAR_ID, { tags: ['timetable'] });

      expect(mockCalendarService.setCalendarTags).toHaveBeenCalledWith(CALENDAR_ID, ['timetable']);
      expect(mockUsersService.getPassword).not.toHaveBeenCalled();
    });

    it('listEvents builds a Date window and splits the comma-separated calendarIds', async () => {
      await controller.listEvents(USERNAME, EMAIL, '2026-04-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z', 'a,b,');

      const [email, password, query] = mockCalendarService.listEvents.mock.calls[0] as [
        string,
        string,
        { from: Date; to: Date; calendarIds?: string[] },
      ];
      expect(email).toBe(EMAIL);
      expect(password).toBe(PASSWORD);
      expect(query.from).toEqual(new Date('2026-04-01T00:00:00.000Z'));
      expect(query.to).toEqual(new Date('2026-05-01T00:00:00.000Z'));
      expect(query.calendarIds).toEqual(['a', 'b']);
    });

    it('listEvents passes calendarIds undefined when the query param is absent', async () => {
      await controller.listEvents(USERNAME, EMAIL, '2026-04-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z');

      const [, , query] = mockCalendarService.listEvents.mock.calls[0] as [string, string, { calendarIds?: string[] }];
      expect(query.calendarIds).toBeUndefined();
    });

    it('createEvent delegates the event body', async () => {
      const event = { calendarId: CALENDAR_ID, summary: 'Math' } as CalendarEventBodyDto;

      await controller.createEvent(USERNAME, EMAIL, event);

      expect(mockCalendarService.createEvent).toHaveBeenCalledWith(EMAIL, PASSWORD, event);
    });

    it('updateEvent delegates the uid and event body', async () => {
      const event = { calendarId: CALENDAR_ID, summary: 'Math' } as CalendarEventBodyDto;

      await controller.updateEvent(USERNAME, EMAIL, 'uid-1', event);

      expect(mockCalendarService.updateEvent).toHaveBeenCalledWith(EMAIL, PASSWORD, 'uid-1', event);
    });

    it('deleteEvent forwards a valid recurrence scope with occurrence start', async () => {
      await controller.deleteEvent(
        USERNAME,
        EMAIL,
        'uid-1',
        CALENDAR_ID,
        RecurrenceEditScope.THIS,
        '2026-04-27T08:00:00.000Z',
      );

      expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith(EMAIL, PASSWORD, CALENDAR_ID, 'uid-1', {
        scope: RecurrenceEditScope.THIS,
        occurrenceStart: '2026-04-27T08:00:00.000Z',
      });
    });

    it('deleteEvent drops the recurrence edit when the scope is unknown', async () => {
      await controller.deleteEvent(USERNAME, EMAIL, 'uid-1', CALENDAR_ID, 'NONSENSE', '2026-04-27T08:00:00.000Z');

      expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith(EMAIL, PASSWORD, CALENDAR_ID, 'uid-1', undefined);
    });

    it('deleteEvent drops the recurrence edit when the occurrence start is missing', async () => {
      await controller.deleteEvent(USERNAME, EMAIL, 'uid-1', CALENDAR_ID, RecurrenceEditScope.THIS);

      expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith(EMAIL, PASSWORD, CALENDAR_ID, 'uid-1', undefined);
    });
  });

  describe('auth contract', () => {
    it.each([
      'listCalendars',
      'createCalendar',
      'setCalendarTags',
      'listEvents',
      'createEvent',
      'updateEvent',
      'deleteEvent',
    ])('keeps %s behind the global JWT guard (not public)', (route) => {
      expect(controllerContractReflection.isRoutePublic(CalendarController, route)).toBe(false);
    });

    it('requires calendar app access on the controller so the global AccessGuard enforces it', () => {
      expect(Reflect.getMetadata(APP_ACCESS_KEY, CalendarController)).toBe(APPS.CALENDAR);
    });
  });
});
