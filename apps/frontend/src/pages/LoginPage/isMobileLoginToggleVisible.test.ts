/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel and linuxmuster-ui contributors
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * A copy of the license can be found at: https://www.gnu.org/licenses/agpl-3.0.html
 */

import { describe, it, expect, vi } from 'vitest';

const loadHelper = async (mobileAppEnabled: boolean) => {
  vi.resetModules();
  vi.doMock('@libs/common/constants/productInfo', () => ({
    MOBILE_APP_ENABLED: mobileAppEnabled,
    PRODUCT_NAME: 'linuxmuster',
    PRODUCT_SOURCE_URL: '',
    PRODUCT_DOCS_URL: '',
  }));
  const module = await import('./isMobileLoginToggleVisible');
  return module.default;
};

describe('isMobileLoginToggleVisible', () => {
  it('MOBILE_APP_ENABLED=false: QR-Toggle nur im TOTP-Cancel-Fall sichtbar', async () => {
    const isVisible = await loadHelper(false);
    expect(isVisible(false)).toBe(false);
    expect(isVisible(true)).toBe(true);
  });

  it('MOBILE_APP_ENABLED=true: QR-Toggle immer sichtbar', async () => {
    const isVisible = await loadHelper(true);
    expect(isVisible(false)).toBe(true);
    expect(isVisible(true)).toBe(true);
  });
});
