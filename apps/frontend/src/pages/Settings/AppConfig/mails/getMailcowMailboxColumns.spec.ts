/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import getMailcowMailboxColumns from './getMailcowMailboxColumns';

describe('getMailcowMailboxColumns', () => {
  it('defines the mailbox columns in order', () => {
    const columns = getMailcowMailboxColumns();

    expect(columns.map((column) => column.id)).toEqual(['username', 'name', 'domain', 'quota', 'active']);
  });

  it('binds every column to a translation id', () => {
    const columns = getMailcowMailboxColumns();

    columns.forEach((column) => {
      expect(column.meta?.translationId).toBeTruthy();
    });
  });
});
