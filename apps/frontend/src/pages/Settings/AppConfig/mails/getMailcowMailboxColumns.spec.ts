/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect, vi } from 'vitest';
import getMailcowMailboxColumns from './getMailcowMailboxColumns';

const callbacks = { onEdit: vi.fn(), onDelete: vi.fn(), onManageAcl: vi.fn() };

describe('getMailcowMailboxColumns', () => {
  it('defines the mailbox columns in order including the actions column', () => {
    const columns = getMailcowMailboxColumns(callbacks);

    expect(columns.map((column) => column.id)).toEqual(['username', 'name', 'domain', 'quota', 'active', 'actions']);
  });

  it('binds every data column to a translation id', () => {
    const columns = getMailcowMailboxColumns(callbacks);

    columns
      .filter((column) => column.id !== 'actions')
      .forEach((column) => {
        expect(column.meta?.translationId).toBeTruthy();
      });
  });
});
