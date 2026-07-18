/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import APPS from '@libs/appconfig/constants/apps';
import CALENDAR_ENDPOINT, { CALENDAR_TAGS_PATH_SEGMENT } from '@libs/calendar/constants/calendar-endpoint';
import RecurrenceEditScope from '@libs/calendar/constants/recurrenceEditScope';
import type { TRecurrenceEditScope } from '@libs/calendar/types';
import type Calendar from '@libs/calendar/types/calendar';
import GetCurrentUsername from '../common/decorators/getCurrentUsername.decorator';
import GetUsersEmailAddress from '../common/decorators/getUsersEmailAddress.decorator';
import RequireAppAccess from '../common/decorators/requireAppAccess.decorator';
import UsersService from '../users/users.service';
import CalendarService from './calendar.service';
import type { ParsedCalendarEvent } from './ical.mapper';
import CalendarResponseDto from './dto/calendar-response.dto';
import CreateCalendarBodyDto from './dto/create-calendar-body.dto';
import CalendarTagsBodyDto from './dto/calendar-tags-body.dto';
import CalendarEventResponseDto from './dto/calendar-event-response.dto';
import CalendarEventBodyDto from './dto/calendar-event-body.dto';

@ApiTags(CALENDAR_ENDPOINT)
@ApiBearerAuth()
@RequireAppAccess(APPS.CALENDAR)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller(CALENDAR_ENDPOINT)
class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly usersService: UsersService,
  ) {}

  @Get('calendars')
  @ApiOperation({ summary: 'List all calendars accessible to the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Calendars', type: [CalendarResponseDto] })
  async listCalendars(
    @GetCurrentUsername() username: string,
    @GetUsersEmailAddress() emailAddress: string,
  ): Promise<Calendar[]> {
    const password = await this.usersService.getPassword(username);
    return this.calendarService.listCalendars(emailAddress, password);
  }

  @Post('calendars')
  @ApiOperation({ summary: 'Create a new calendar' })
  @ApiBody({ type: CreateCalendarBodyDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Created calendar', type: CalendarResponseDto })
  async createCalendar(
    @GetCurrentUsername() username: string,
    @GetUsersEmailAddress() emailAddress: string,
    @Body() body: CreateCalendarBodyDto,
  ): Promise<Calendar> {
    const password = await this.usersService.getPassword(username);
    return this.calendarService.createCalendar(emailAddress, password, username, body);
  }

  @Put(`calendars/:id/${CALENDAR_TAGS_PATH_SEGMENT}`)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Replace the metadata tags of a calendar' })
  @ApiParam({ name: 'id', description: 'Encoded calendar id' })
  @ApiBody({ type: CalendarTagsBodyDto })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Tags updated, no response body' })
  async setCalendarTags(@Param('id') calendarId: string, @Body() body: CalendarTagsBodyDto): Promise<void> {
    await this.calendarService.setCalendarTags(calendarId, body.tags);
  }

  @Get('events')
  @ApiOperation({ summary: 'List events within a time range' })
  @ApiQuery({ name: 'from', example: '2026-04-01T00:00:00.000Z' })
  @ApiQuery({ name: 'to', example: '2026-05-01T00:00:00.000Z' })
  @ApiQuery({ name: 'calendarIds', required: false, description: 'Comma-separated calendar ids' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Events', type: [CalendarEventResponseDto] })
  async listEvents(
    @GetCurrentUsername() username: string,
    @GetUsersEmailAddress() emailAddress: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('calendarIds') calendarIds?: string,
  ): Promise<ParsedCalendarEvent[]> {
    const password = await this.usersService.getPassword(username);
    return this.calendarService.listEvents(emailAddress, password, {
      from: new Date(from),
      to: new Date(to),
      calendarIds: calendarIds ? calendarIds.split(',').filter(Boolean) : undefined,
    });
  }

  @Post('events')
  @ApiOperation({ summary: 'Create a new event' })
  @ApiBody({ type: CalendarEventBodyDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Created event', type: CalendarEventResponseDto })
  async createEvent(
    @GetCurrentUsername() username: string,
    @GetUsersEmailAddress() emailAddress: string,
    @Body() event: CalendarEventBodyDto,
  ): Promise<ParsedCalendarEvent> {
    const password = await this.usersService.getPassword(username);
    return this.calendarService.createEvent(emailAddress, password, event);
  }

  @Put('events/:uid')
  @ApiOperation({ summary: 'Update an existing event' })
  @ApiParam({ name: 'uid', description: 'Event UID' })
  @ApiBody({ type: CalendarEventBodyDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Updated event', type: CalendarEventResponseDto })
  async updateEvent(
    @GetCurrentUsername() username: string,
    @GetUsersEmailAddress() emailAddress: string,
    @Param('uid') uid: string,
    @Body() event: CalendarEventBodyDto,
  ): Promise<ParsedCalendarEvent> {
    const password = await this.usersService.getPassword(username);
    return this.calendarService.updateEvent(emailAddress, password, uid, event);
  }

  @Delete('events/:uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event' })
  @ApiParam({ name: 'uid', description: 'Event UID' })
  @ApiQuery({ name: 'calendarId', description: 'Parent calendar id (required)' })
  @ApiQuery({ name: 'recurrenceScope', description: 'Recurrence edit scope', required: false })
  @ApiQuery({ name: 'occurrenceStart', description: 'ISO timestamp of the touched occurrence', required: false })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Event deleted, no response body' })
  async deleteEvent(
    @GetCurrentUsername() username: string,
    @GetUsersEmailAddress() emailAddress: string,
    @Param('uid') uid: string,
    @Query('calendarId') calendarId: string,
    @Query('recurrenceScope') recurrenceScope?: string,
    @Query('occurrenceStart') occurrenceStart?: string,
  ): Promise<void> {
    const password = await this.usersService.getPassword(username);
    const isValidScope = (value?: string): value is TRecurrenceEditScope =>
      !!value && (Object.values(RecurrenceEditScope) as string[]).includes(value);
    const recurrenceEdit =
      recurrenceScope && occurrenceStart && isValidScope(recurrenceScope)
        ? { scope: recurrenceScope, occurrenceStart }
        : undefined;
    await this.calendarService.deleteEvent(emailAddress, password, calendarId, uid, recurrenceEdit);
  }
}

export default CalendarController;
