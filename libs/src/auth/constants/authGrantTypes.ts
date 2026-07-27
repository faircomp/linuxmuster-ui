/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const AUTH_GRANT_TYPES = {
  PASSWORD: 'password',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export type AuthGrantType = (typeof AUTH_GRANT_TYPES)[keyof typeof AUTH_GRANT_TYPES];

export default AUTH_GRANT_TYPES;
