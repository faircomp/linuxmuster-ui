/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

class WikiPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WikiPathError';
  }
}

export default WikiPathError;
