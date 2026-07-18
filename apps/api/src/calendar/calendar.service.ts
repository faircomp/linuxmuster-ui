/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { DAVClient, DAVNamespace, DAVNamespaceShort } from 'tsdav';
import type { DAVCalendar, DAVResponse } from 'tsdav';
import { Agent } from 'undici';
import { randomUUID } from 'crypto';
import EVENT_EMITTER_EVENTS from '@libs/appconfig/constants/eventEmitterEvents';
import APPS from '@libs/appconfig/constants/apps';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import CalDavAuthMode from '@libs/calendar/constants/calDavAuthMode';
import CalendarErrorMessages from '@libs/calendar/constants/calendar-error-messages';
import isCalendarTag from '@libs/calendar/utils/isCalendarTag';
import type Calendar from '@libs/calendar/types/calendar';
import type CalendarShare from '@libs/calendar/types/calendarShare';
import getErrorMessage from '@libs/common/utils/getErrorMessage';
import CustomHttpException from '../common/CustomHttpException';
import AppConfigService from '../appconfig/appconfig.service';
import { CalendarMetadata, CalendarMetadataDocument } from './calendar-metadata.schema';
import CreateCalendarBodyDto from './dto/create-calendar-body.dto';

type TCalDavAuthMode = (typeof CalDavAuthMode)[keyof typeof CalDavAuthMode];

type CalendarBackendConfig = {
  baseUrl: string;
  authMode: TCalDavAuthMode;
  rejectUnauthorized: boolean;
};

type MappedCalendar = Omit<Calendar, 'shares' | 'tags'>;

const encodeCalendarId = (url: string): string => Buffer.from(url, 'utf-8').toString('base64url');

const VEVENT_COMPONENT = 'VEVENT';
const DEFAULT_ACCOUNT_TYPE = 'caldav';
const XML_TEXT_KEY = '_text';

const DAV_AUTH_METHOD = {
  BASIC: 'Basic',
  DIGEST: 'Digest',
} as const;

const DAV_PROP = {
  OWNER: `${DAVNamespaceShort.DAV}:owner`,
  DISPLAYNAME: `${DAVNamespaceShort.DAV}:displayname`,
  CALDAV_DESCRIPTION: `${DAVNamespaceShort.CALDAV}:calendar-description`,
  CALDAV_COLOR: `${DAVNamespaceShort.CALDAV_APPLE}:calendar-color`,
  CALDAV_SUPPORTED_COMPONENT_SET: `${DAVNamespaceShort.CALDAV}:supported-calendar-component-set`,
  CALDAV_COMP: `${DAVNamespaceShort.CALDAV}:comp`,
};

const XMLNS_ATTR = {
  CALDAV: `xmlns:${DAVNamespaceShort.CALDAV}`,
  CALDAV_APPLE: `xmlns:${DAVNamespaceShort.CALDAV_APPLE}`,
};

const SOGO_SHARED_PATH_SEGMENTS = ['subscribed', 'public_shared', 'shared', 'inbox'];
const SOGO_SHARED_PATH_REGEX = new RegExp(`/(${SOGO_SHARED_PATH_SEGMENTS.join('|')})/`);

@Injectable()
class CalendarService implements OnModuleInit {
  private backend: CalendarBackendConfig = {
    baseUrl: '',
    authMode: CalDavAuthMode.BASIC,
    rejectUnauthorized: true,
  };

  constructor(
    @InjectModel(CalendarMetadata.name) private readonly calendarMetadataModel: Model<CalendarMetadataDocument>,
    private readonly appConfigService: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.updateBackendConfig();
  }

  @OnEvent(`${EVENT_EMITTER_EVENTS.APPCONFIG_UPDATED}-${APPS.CALENDAR}`)
  async updateBackendConfig(): Promise<void> {
    const appConfig = await this.appConfigService.getAppConfigByName(APPS.CALENDAR);
    if (!appConfig || typeof appConfig.extendedOptions !== 'object') {
      this.backend = { baseUrl: '', authMode: CalDavAuthMode.BASIC, rejectUnauthorized: true };
      return;
    }
    const opts = appConfig.extendedOptions as Record<string, unknown>;
    this.backend = {
      baseUrl: (opts[ExtendedOptionKeys.CALENDAR_CALDAV_BASE_URL] as string) || '',
      authMode: (opts[ExtendedOptionKeys.CALENDAR_CALDAV_AUTH_MODE] as TCalDavAuthMode) || CalDavAuthMode.BASIC,
      rejectUnauthorized: opts[ExtendedOptionKeys.CALENDAR_CALDAV_REJECT_UNAUTHORIZED] !== false,
    };
    Logger.debug(`CalDAV backend: ${this.backend.baseUrl} (${this.backend.authMode})`, CalendarService.name);
  }

  private assertBackendConfigured(): void {
    if (!this.backend.baseUrl) {
      throw new CustomHttpException(
        CalendarErrorMessages.CalendarBackendNotConfigured,
        HttpStatus.SERVICE_UNAVAILABLE,
        undefined,
        CalendarService.name,
      );
    }
  }

  private static assertAuthenticated(emailAddress: string, password: string): void {
    if (!emailAddress || !password) {
      throw new CustomHttpException(
        CalendarErrorMessages.CalDavConnectionFailed,
        HttpStatus.UNAUTHORIZED,
        undefined,
        CalendarService.name,
      );
    }
  }

  private buildDispatcher(): Agent {
    return new Agent({ connect: { rejectUnauthorized: this.backend.rejectUnauthorized } });
  }

  private static describeError(error: unknown): string {
    const primary = getErrorMessage(error);
    const cause = (error as { cause?: unknown })?.cause;
    if (!cause) {
      return primary;
    }
    const causeMessage = getErrorMessage(cause);
    const causeCode = (cause as { code?: string })?.code;
    const suffix = causeCode ? ` [${causeCode}]` : '';
    return `${primary} -> ${causeMessage}${suffix}`;
  }

  private async buildClient(emailAddress: string, password: string): Promise<DAVClient> {
    const dispatcher = this.buildDispatcher();
    const authMethod = this.backend.authMode === CalDavAuthMode.DIGEST ? DAV_AUTH_METHOD.DIGEST : DAV_AUTH_METHOD.BASIC;
    const client = new DAVClient({
      serverUrl: this.backend.baseUrl,
      credentials: { username: emailAddress, password },
      authMethod,
      defaultAccountType: DEFAULT_ACCOUNT_TYPE,
      fetchOptions: { dispatcher } as unknown as RequestInit,
    });
    try {
      await client.login();
    } catch (error) {
      const detail = CalendarService.describeError(error);
      Logger.error(
        `CalDAV login failed for ${emailAddress} at ${this.backend.baseUrl}: ${detail}`,
        CalendarService.name,
      );
      throw new CustomHttpException(
        CalendarErrorMessages.CalDavConnectionFailed,
        HttpStatus.BAD_GATEWAY,
        detail,
        CalendarService.name,
      );
    }
    return client;
  }

  private static hasVeventComponent(calendar: DAVCalendar): boolean {
    const components = calendar.components ?? [];
    return components.some((c) => typeof c === 'string' && c.toUpperCase() === VEVENT_COMPONENT);
  }

  private static normalizePath(input?: string): string {
    if (!input) {
      return '';
    }
    try {
      return new URL(input, 'https://placeholder').pathname.replace(/\/+$/, '').toLowerCase();
    } catch {
      return input.replace(/\/+$/, '').toLowerCase();
    }
  }

  private static extractOwnerHref(ownerProp: unknown): string | undefined {
    if (!ownerProp) {
      return undefined;
    }
    if (typeof ownerProp === 'string') {
      return ownerProp;
    }
    if (typeof ownerProp === 'object') {
      const candidate = (ownerProp as { href?: unknown }).href;
      if (typeof candidate === 'string') {
        return candidate;
      }
      if (candidate && typeof candidate === 'object') {
        const nested = (candidate as Record<string, unknown>)[XML_TEXT_KEY];
        if (typeof nested === 'string') {
          return nested;
        }
      }
    }
    return undefined;
  }

  private static async fetchOwnerMap(client: DAVClient, homeUrl?: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!homeUrl) {
      return map;
    }
    try {
      const responses = await client.propfind({ url: homeUrl, depth: '1', props: { [DAV_PROP.OWNER]: {} } });
      (responses ?? []).forEach((response: DAVResponse) => {
        const calendarPath = CalendarService.normalizePath(response.href);
        const ownerHref = CalendarService.extractOwnerHref(response.props?.owner);
        if (calendarPath && ownerHref) {
          map.set(calendarPath, CalendarService.normalizePath(ownerHref));
        }
      });
    } catch (error) {
      Logger.warn(`Failed to load owner properties: ${getErrorMessage(error)}`, CalendarService.name);
    }
    return map;
  }

  private static isSubscribedBySogoUrlHeuristic(calendar: DAVCalendar, emailAddress: string): boolean {
    const url = String(calendar.url ?? '').toLowerCase();
    if (!url) {
      return false;
    }
    if (SOGO_SHARED_PATH_REGEX.test(url)) {
      return true;
    }
    const identifier = emailAddress.toLowerCase();
    if (!identifier) {
      return false;
    }
    return !url.includes(encodeURIComponent(identifier)) && !url.includes(identifier);
  }

  private static isSubscribedCalendar(
    calendar: DAVCalendar,
    emailAddress: string,
    principalPath: string,
    ownerMap: Map<string, string>,
  ): boolean {
    const calendarPath = CalendarService.normalizePath(calendar.url);
    const ownerPath = ownerMap.get(calendarPath);
    if (ownerPath && principalPath) {
      return ownerPath !== principalPath;
    }
    return CalendarService.isSubscribedBySogoUrlHeuristic(calendar, emailAddress);
  }

  private static mapCalendar(
    calendar: DAVCalendar,
    emailAddress: string,
    principalPath: string,
    ownerMap: Map<string, string>,
  ): MappedCalendar {
    const { url } = calendar;
    const displayNameRaw = calendar.displayName;
    const displayName = typeof displayNameRaw === 'string' && displayNameRaw.length > 0 ? displayNameRaw : 'Calendar';
    const isSubscribed = CalendarService.isSubscribedCalendar(calendar, emailAddress, principalPath, ownerMap);
    return {
      id: encodeCalendarId(url),
      displayName,
      color: typeof calendar.calendarColor === 'string' ? calendar.calendarColor : undefined,
      description: typeof calendar.description === 'string' ? calendar.description : undefined,
      ctag: typeof calendar.ctag === 'string' ? calendar.ctag : undefined,
      readOnly: isSubscribed,
      isSubscribed,
      url,
    };
  }

  async listCalendars(emailAddress: string, password: string): Promise<Calendar[]> {
    this.assertBackendConfigured();
    CalendarService.assertAuthenticated(emailAddress, password);
    const client = await this.buildClient(emailAddress, password);
    const calendars = await client.fetchCalendars();
    const ownerMap = await CalendarService.fetchOwnerMap(client, client.account?.homeUrl);
    const principalPath = CalendarService.normalizePath(client.account?.principalUrl);
    const mapped = calendars
      .filter((c) => CalendarService.hasVeventComponent(c))
      .map((c) => CalendarService.mapCalendar(c, emailAddress, principalPath, ownerMap));
    const calendarIds = mapped.map((c) => c.id);
    const metadataMap = await this.getMetadataDocsByCalendarId(calendarIds);
    return mapped.map((c) => {
      const doc = metadataMap.get(c.id);
      return {
        ...c,
        shares: doc?.shares ?? [],
        tags: doc ? (doc.tags ?? []).filter(isCalendarTag) : [],
      };
    });
  }

  private async getMetadataDocsByCalendarId(calendarIds: string[]): Promise<Map<string, CalendarMetadataDocument>> {
    const map = new Map<string, CalendarMetadataDocument>();
    if (calendarIds.length === 0) {
      return map;
    }
    const docs = await this.calendarMetadataModel.find({ calendarId: { $in: calendarIds } });
    docs.forEach((doc) => map.set(doc.calendarId, doc));
    return map;
  }

  async setCalendarTags(calendarId: string, tags: string[]): Promise<void> {
    try {
      await this.calendarMetadataModel.findOneAndUpdate(
        { calendarId },
        { $set: { tags } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      throw new CustomHttpException(
        CalendarErrorMessages.SetTagsFailed,
        HttpStatus.INTERNAL_SERVER_ERROR,
        getErrorMessage(error),
        CalendarService.name,
      );
    }
  }

  async createCalendar(
    emailAddress: string,
    password: string,
    username: string,
    input: CreateCalendarBodyDto,
  ): Promise<Calendar> {
    this.assertBackendConfigured();
    CalendarService.assertAuthenticated(emailAddress, password);
    const client = await this.buildClient(emailAddress, password);
    const homeUrl = client.account?.homeUrl;
    if (!homeUrl) {
      throw new CustomHttpException(
        CalendarErrorMessages.CreateCalendarFailed,
        HttpStatus.BAD_GATEWAY,
        'CalDAV account has no home URL',
        CalendarService.name,
      );
    }
    const slug = randomUUID();
    const targetUrl = homeUrl.endsWith('/') ? `${homeUrl}${slug}/` : `${homeUrl}/${slug}/`;
    const props: Record<string, unknown> = { [DAV_PROP.DISPLAYNAME]: input.displayName };
    if (input.description) {
      props[DAV_PROP.CALDAV_DESCRIPTION] = {
        _attributes: { [XMLNS_ATTR.CALDAV]: DAVNamespace.CALDAV },
        _text: input.description,
      };
    }
    if (input.color) {
      props[DAV_PROP.CALDAV_COLOR] = {
        _attributes: { [XMLNS_ATTR.CALDAV_APPLE]: DAVNamespace.CALDAV_APPLE },
        _text: input.color,
      };
    }
    props[DAV_PROP.CALDAV_SUPPORTED_COMPONENT_SET] = {
      _attributes: { [XMLNS_ATTR.CALDAV]: DAVNamespace.CALDAV },
      [DAV_PROP.CALDAV_COMP]: { _attributes: { name: VEVENT_COMPONENT } },
    };
    try {
      await client.makeCalendar({ url: targetUrl, props });
    } catch (error) {
      throw new CustomHttpException(
        CalendarErrorMessages.CreateCalendarFailed,
        HttpStatus.BAD_GATEWAY,
        CalendarService.describeError(error),
        CalendarService.name,
      );
    }
    const calendarId = encodeCalendarId(targetUrl);
    const shareEntries: CalendarShare[] = input.shares.filter((s) => s.subjectId && s.subjectType && s.permission);
    const tags = (input.tags ?? []).filter(isCalendarTag);
    try {
      await this.calendarMetadataModel.findOneAndUpdate(
        { calendarId },
        { $set: { ownerUsername: username, shares: shareEntries, tags } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      try {
        await client.deleteObject({ url: targetUrl });
      } catch (cleanupError) {
        Logger.error(
          `Failed to roll back CalDAV calendar at ${targetUrl} after metadata write error: ${getErrorMessage(cleanupError)}`,
          CalendarService.name,
        );
      }
      throw new CustomHttpException(
        CalendarErrorMessages.CreateCalendarFailed,
        HttpStatus.INTERNAL_SERVER_ERROR,
        getErrorMessage(error),
        CalendarService.name,
      );
    }
    const calendars = await client.fetchCalendars();
    const created = calendars.find((c) => c.url === targetUrl);
    const principalPath = CalendarService.normalizePath(client.account?.principalUrl);
    const ownerMap = await CalendarService.fetchOwnerMap(client, client.account?.homeUrl);
    const base: MappedCalendar = created
      ? CalendarService.mapCalendar(created, emailAddress, principalPath, ownerMap)
      : {
          id: calendarId,
          displayName: input.displayName,
          color: input.color,
          description: input.description,
          ctag: undefined,
          readOnly: false,
          isSubscribed: false,
          url: targetUrl,
        };
    return { ...base, shares: shareEntries, tags };
  }
}

export default CalendarService;
