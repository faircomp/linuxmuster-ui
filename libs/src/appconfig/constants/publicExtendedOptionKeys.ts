/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ExtendedOptionKeys from './extendedOptionKeys';

const PUBLIC_EXTENDED_OPTION_KEYS: string[] = [
  ExtendedOptionKeys.EMBEDDED_PAGE_HTML_CONTENT,
  ExtendedOptionKeys.EMBEDDED_PAGE_HTML_MODE,
  ExtendedOptionKeys.EMBEDDED_PAGE_IS_PUBLIC,
  ExtendedOptionKeys.FRAME_SCRIPT_ON_LOAD_ENABLED,
  ExtendedOptionKeys.FRAME_SCRIPT_ON_LOAD_CONTENT,
  ExtendedOptionKeys.FRAME_SCRIPT_ON_LOGOUT_ENABLED,
  ExtendedOptionKeys.FRAME_SCRIPT_ON_LOGOUT_CONTENT,
  ExtendedOptionKeys.FRAME_URL_SYNC_ENABLED,
  ExtendedOptionKeys.FRAME_URL_SYNC_PRELOAD_BASE_PAGE,
];

export default PUBLIC_EXTENDED_OPTION_KEYS;
