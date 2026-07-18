/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import ExtendedOptionField from '@libs/appconfig/constants/extendedOptionField';
import { AppConfigExtendedOption } from '@libs/appconfig/types/appConfigExtendedOption';
import CalDavAuthMode from '@libs/calendar/constants/calDavAuthMode';

const CALENDAR_CALDAV_EXTENDED_OPTIONS: AppConfigExtendedOption[] = [
  {
    name: ExtendedOptionKeys.CALENDAR_CALDAV_BASE_URL,
    title: 'appExtendedOptions.calendarCaldavBaseUrlTitle',
    description: 'appExtendedOptions.calendarCaldavBaseUrlDescription',
    type: ExtendedOptionField.input,
    value: '',
    width: 'full',
  },
  {
    name: ExtendedOptionKeys.CALENDAR_CALDAV_AUTH_MODE,
    title: 'appExtendedOptions.calendarCaldavAuthModeTitle',
    description: 'appExtendedOptions.calendarCaldavAuthModeDescription',
    type: ExtendedOptionField.dropdown,
    value: CalDavAuthMode.BASIC,
    width: 'full',
    options: [
      { id: CalDavAuthMode.BASIC, name: 'appExtendedOptions.calendarCaldavAuthMode.basic' },
      { id: CalDavAuthMode.DIGEST, name: 'appExtendedOptions.calendarCaldavAuthMode.digest' },
    ],
  },
  {
    name: ExtendedOptionKeys.CALENDAR_CALDAV_REJECT_UNAUTHORIZED,
    title: 'appExtendedOptions.calendarCaldavRejectUnauthorizedTitle',
    description: 'appExtendedOptions.calendarCaldavRejectUnauthorizedDescription',
    type: ExtendedOptionField.switch,
    value: true,
    width: 'full',
  },
];

export default CALENDAR_CALDAV_EXTENDED_OPTIONS;
