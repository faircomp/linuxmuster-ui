/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const UNAVAILABLE_SHARE_REASON = {
  TIMEOUT: 'timeout',
  CONNECTION_ERROR: 'connection_error',
  HTTP_5XX: 'http_5xx',
  HTTP_4XX: 'http_4xx',
  HEALTH_CHECK_DOWN: 'health_check_down',
} as const;

type UnavailableShareReason = (typeof UNAVAILABLE_SHARE_REASON)[keyof typeof UNAVAILABLE_SHARE_REASON];

export { UNAVAILABLE_SHARE_REASON };
export default UnavailableShareReason;
