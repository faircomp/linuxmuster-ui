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

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const { mockStore } = vi.hoisted(() => ({ mockStore: vi.fn() }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/pages/UserSettings/Info/useCommunityLicenseStore', () => ({ default: () => mockStore() as unknown }));
vi.mock('@edulution-io/ui-kit', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));
vi.mock('./RegisterLicenseDialog', () => ({ default: () => <div data-testid="register-dialog" /> }));

import LicenseOverview from './LicenseOverview';

const baseStore = { isRegisterDialogOpen: false, setIsRegisterDialogOpen: vi.fn() };

describe('LicenseOverview — community mode hides commercial registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isCommunity=true: no register control/dialog, community notice shown', () => {
    mockStore.mockReturnValue({ ...baseStore, licenseInfo: { isCommunity: true, customerId: '' } });

    const html = renderToStaticMarkup(<LicenseOverview />);

    expect(html).toContain('settings.license.communityNotice');
    expect(html).not.toContain('settings.license.register');
    expect(html).not.toContain('register-dialog');
  });

  it('isCommunity=false: register button + dialog rendered', () => {
    mockStore.mockReturnValue({ ...baseStore, licenseInfo: { isCommunity: false, customerId: '' } });

    const html = renderToStaticMarkup(<LicenseOverview />);

    expect(html).toContain('settings.license.register');
    expect(html).toContain('register-dialog');
    expect(html).not.toContain('settings.license.communityNotice');
  });
});
