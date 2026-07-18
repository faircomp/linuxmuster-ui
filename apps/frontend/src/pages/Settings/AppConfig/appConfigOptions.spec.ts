/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import APPS from '@libs/appconfig/constants/apps';
import AppConfigSectionsKeys from '@libs/appconfig/constants/appConfigSectionsKeys';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import ExtendedOptionField from '@libs/appconfig/constants/extendedOptionField';
import COLLABORA_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/collabora';
import CALENDAR_CALDAV_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/calendarCaldavExtendedOptions';
import CalDavAuthMode from '@libs/calendar/constants/calDavAuthMode';
import APP_CONFIG_OPTIONS from './appConfigOptions';

describe('APP_CONFIG_OPTIONS file sharing document editor section', () => {
  const fileSharingOption = APP_CONFIG_OPTIONS.find((option) => option.id === APPS.FILE_SHARING);

  it('registers the file sharing app', () => {
    expect(fileSharingOption).toBeDefined();
  });

  it('registers the collabora document editor section under file sharing', () => {
    expect(fileSharingOption?.extendedOptions?.[AppConfigSectionsKeys.documentEditor]).toBe(COLLABORA_EXTENDED_OPTIONS);
  });

  it('keeps the existing onlyOffice section registered', () => {
    expect(fileSharingOption?.extendedOptions?.[AppConfigSectionsKeys.onlyOffice]).toBeDefined();
  });
});

describe('APP_CONFIG_OPTIONS calendar section', () => {
  const calendarOption = APP_CONFIG_OPTIONS.find((option) => option.id === APPS.CALENDAR);

  it('registers the calendar app as a native app', () => {
    expect(calendarOption).toBeDefined();
    expect(calendarOption?.isNativeApp).toBe(true);
  });

  it('registers the caldav extended options under the calendar section', () => {
    expect(calendarOption?.extendedOptions?.[AppConfigSectionsKeys.calendar]).toBe(CALENDAR_CALDAV_EXTENDED_OPTIONS);
  });
});

describe('CALENDAR_CALDAV_EXTENDED_OPTIONS', () => {
  const byName = (name: string) => CALENDAR_CALDAV_EXTENDED_OPTIONS.find((option) => option.name === name);

  it('exposes the base url as an input field', () => {
    expect(byName(ExtendedOptionKeys.CALENDAR_CALDAV_BASE_URL)?.type).toBe(ExtendedOptionField.input);
  });

  it('exposes the auth mode as a dropdown defaulting to basic with both schemes', () => {
    const authMode = byName(ExtendedOptionKeys.CALENDAR_CALDAV_AUTH_MODE);
    expect(authMode?.type).toBe(ExtendedOptionField.dropdown);
    expect(authMode?.value).toBe(CalDavAuthMode.BASIC);
    expect(authMode?.options?.map((option) => option.id)).toEqual([CalDavAuthMode.BASIC, CalDavAuthMode.DIGEST]);
  });

  it('exposes reject-unauthorized as a switch that defaults to secure', () => {
    const reject = byName(ExtendedOptionKeys.CALENDAR_CALDAV_REJECT_UNAUTHORIZED);
    expect(reject?.type).toBe(ExtendedOptionField.switch);
    expect(reject?.value).toBe(true);
  });
});
