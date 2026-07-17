/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

interface ThrottleConfig {
  limit: number;
  ttl: number;
  byIp: boolean;
}

export default ThrottleConfig;
