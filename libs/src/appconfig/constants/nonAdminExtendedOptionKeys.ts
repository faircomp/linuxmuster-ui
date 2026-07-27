/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import type { ExtendedOptionKeysType } from '@libs/appconfig/types/extendedOptionKeysType';

const NON_ADMIN_EXTENDED_OPTION_KEYS: ExtendedOptionKeysType[] = [
  ExtendedOptionKeys.COLLABORA_URL,
  ExtendedOptionKeys.ONLY_OFFICE_URL,
  ExtendedOptionKeys.ACTIVE_DOCUMENT_EDITOR,
  ExtendedOptionKeys.DRAWIO_URL,
  ExtendedOptionKeys.VEYON_PROXYS,
  ExtendedOptionKeys.FRAME_SCRIPT_ON_LOAD_ENABLED,
  ExtendedOptionKeys.FRAME_SCRIPT_ON_LOAD_CONTENT,
  ExtendedOptionKeys.FRAME_SCRIPT_ON_LOGOUT_ENABLED,
  ExtendedOptionKeys.FRAME_SCRIPT_ON_LOGOUT_CONTENT,
  ExtendedOptionKeys.FRAME_URL_SYNC_ENABLED,
  ExtendedOptionKeys.FRAME_URL_SYNC_PRELOAD_BASE_PAGE,
  ExtendedOptionKeys.EMBEDDED_PAGE_HTML_CONTENT,
  ExtendedOptionKeys.EMBEDDED_PAGE_HTML_MODE,
  ExtendedOptionKeys.EMBEDDED_PAGE_IS_PUBLIC,
  ExtendedOptionKeys.FORWARDING_FORWARD_DIRECTLY,
  ExtendedOptionKeys.ACTIVE_MAIL_CLIENT,
  ExtendedOptionKeys.OVERRIDE_FILE_SHARING_DOCUMENT_VENDOR_MS_WITH_OO,
];

export default NON_ADMIN_EXTENDED_OPTION_KEYS;
