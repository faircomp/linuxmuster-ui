/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import MAILCOW_ACL_OPTIONS from './mailcowAclOptions';

const MAILCOW_VALIDATION = {
  MAX_TAGS: 32,
  MAX_ITEMS_PER_REQUEST: 256,
  USER_ACL_VALUES: Object.values(MAILCOW_ACL_OPTIONS),
  LOCAL_PART_ALLOWED_REGEX: /^[a-zA-Z0-9_+-]+(\.[a-zA-Z0-9_+-]+)*$/,
  LOCAL_PART_MAX_LENGTH: 64,
  DOMAIN_REGEX:
    /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_COMPLEXITY_REGEX: /^(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/,
  QUOTA_MAX_MB: 1_048_576,
} as const;

export default MAILCOW_VALIDATION;
