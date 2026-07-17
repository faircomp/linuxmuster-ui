/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import { isReservedIndexTitle, canSubmitCreatePage, canSubmitCreateFolder } from './wikiDialogValidation';

describe('isReservedIndexTitle', () => {
  it('flags a non-index page titled "index" (case-insensitive, trimmed)', () => {
    expect(isReservedIndexTitle('index', false)).toBe(true);
    expect(isReservedIndexTitle('  Index  ', false)).toBe(true);
  });

  it('allows the reserved title when the page is created as the folder index', () => {
    expect(isReservedIndexTitle('index', true)).toBe(false);
  });

  it('allows any other title', () => {
    expect(isReservedIndexTitle('Getting started', false)).toBe(false);
  });
});

describe('canSubmitCreatePage', () => {
  it('blocks when no location is selected', () => {
    expect(canSubmitCreatePage('', 'Title', false, false)).toBe(false);
  });

  it('blocks an empty or whitespace-only title', () => {
    expect(canSubmitCreatePage('MyShare', '   ', false, false)).toBe(false);
  });

  it('blocks the reserved index title unless asIndex is set', () => {
    expect(canSubmitCreatePage('MyShare', 'index', false, false)).toBe(false);
    expect(canSubmitCreatePage('MyShare', 'index', true, false)).toBe(true);
  });

  it('blocks while a save is in flight', () => {
    expect(canSubmitCreatePage('MyShare', 'Title', false, true)).toBe(false);
  });

  it('allows a valid page', () => {
    expect(canSubmitCreatePage('MyShare', 'Title', false, false)).toBe(true);
  });
});

describe('canSubmitCreateFolder', () => {
  it('blocks without a location', () => {
    expect(canSubmitCreateFolder('', 'Docs', false)).toBe(false);
  });

  it('blocks an empty name', () => {
    expect(canSubmitCreateFolder('MyShare', '  ', false)).toBe(false);
  });

  it('blocks while saving', () => {
    expect(canSubmitCreateFolder('MyShare', 'Docs', true)).toBe(false);
  });

  it('allows a valid folder', () => {
    expect(canSubmitCreateFolder('MyShare', 'Docs', false)).toBe(true);
  });
});
