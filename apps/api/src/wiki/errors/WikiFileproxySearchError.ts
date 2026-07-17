/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type UnavailableShareReason from '@libs/wiki/constants/unavailableShareReason';

class WikiFileproxySearchError extends Error {
  readonly reason: UnavailableShareReason;

  constructor(reason: UnavailableShareReason, message?: string) {
    super(message ?? `fileproxy search failed: ${reason}`);
    this.name = 'WikiFileproxySearchError';
    this.reason = reason;
  }
}

export default WikiFileproxySearchError;
