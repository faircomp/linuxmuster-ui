/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ExtendedOptionField from '@libs/appconfig/constants/extendedOptionField';
import type { AppConfigExtendedOption } from '@libs/appconfig/types/appConfigExtendedOption';
import type { ExtendedOptionKeysType } from '@libs/appconfig/types/extendedOptionKeysType';
import APP_LOGO_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/appLogoExtendedOptions';
import BULLETIN_BOARD_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/bulletinBoardExtendedOptions';
import CALENDAR_CALDAV_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/calendarCaldavExtendedOptions';
import CLASS_MANAGEMENT_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/classManagementExtendedOptions';
import COLLABORA_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/collabora';
import DOCKER_CONTAINER_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/dockerContainerExtendedOptions';
import DRAWIO_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/drawioExtendedOptions';
import EMBEDDED_PAGE_EDITOR_CONFIG from '@libs/appconfig/constants/extendedOptions/embeddedPageEditorConfig';
import FILE_SHARING_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/fileSharing';
import FORWARDING_PAGE_OPTIONS from '@libs/appconfig/constants/extendedOptions/forwardingPageOptions';
import FRAME_SCRIPT_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/frameScriptExtendedOptions';
import MAIL_IMAP_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/imapMailFeed';
import MAIL_GENERAL_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/mailGeneralExtendedOptions';
import ONLY_OFFICE_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/onlyOffice';
import URL_SYNC_EXTENDED_OPTIONS, {
  EMBEDDED_URL_SYNC_EXTENDED_OPTIONS,
} from '@libs/appconfig/constants/extendedOptions/urlSyncExtendedOptions';
import WEBDAV_SHARE_TABLE_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/webdavShareTableExtendedOptions';
import WIREGUARD_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/wireguardExtendedOptions';

const OPTION_MODULES: AppConfigExtendedOption[][] = [
  APP_LOGO_EXTENDED_OPTIONS,
  BULLETIN_BOARD_EXTENDED_OPTIONS,
  CALENDAR_CALDAV_EXTENDED_OPTIONS,
  CLASS_MANAGEMENT_EXTENDED_OPTIONS,
  COLLABORA_EXTENDED_OPTIONS,
  DOCKER_CONTAINER_EXTENDED_OPTIONS,
  DRAWIO_EXTENDED_OPTIONS,
  EMBEDDED_PAGE_EDITOR_CONFIG,
  FILE_SHARING_EXTENDED_OPTIONS,
  FORWARDING_PAGE_OPTIONS,
  FRAME_SCRIPT_EXTENDED_OPTIONS,
  MAIL_IMAP_EXTENDED_OPTIONS,
  MAIL_GENERAL_EXTENDED_OPTIONS,
  ONLY_OFFICE_EXTENDED_OPTIONS,
  URL_SYNC_EXTENDED_OPTIONS,
  WEBDAV_SHARE_TABLE_EXTENDED_OPTIONS,
  WIREGUARD_EXTENDED_OPTIONS,
];

const ALL_EXTENDED_OPTIONS: AppConfigExtendedOption[] = [
  ...OPTION_MODULES.flat(),
  ...EMBEDDED_URL_SYNC_EXTENDED_OPTIONS,
];

const PASSWORD_FIELD_KEYS: ExtendedOptionKeysType[] = ALL_EXTENDED_OPTIONS.filter(
  (option) => option.type === ExtendedOptionField.password,
).map((option) => option.name);

const SECRET_EXTENDED_OPTION_KEYS: ExtendedOptionKeysType[] = Array.from(new Set(PASSWORD_FIELD_KEYS));

export const aggregatedOptionModuleCount = OPTION_MODULES.length;

export default SECRET_EXTENDED_OPTION_KEYS;
