/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import APPS from '@libs/appconfig/constants/apps';
import APP_INTEGRATION_VARIANT from '@libs/appconfig/constants/appIntegrationVariant';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import { ACTIVE_MAIL_CLIENT } from '@libs/mail/constants/activeMailClient';
import type AppConfigDto from '@libs/appconfig/types/appConfigDto';
import NativeFrameManager from './NativeFrameManager';

const mockAppConfigs: { appConfigs: AppConfigDto[] } = { appConfigs: [] };

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/mail' }),
}));

vi.mock('@/pages/Settings/AppConfig/useAppConfigsStore', () => ({
  default: () => mockAppConfigs,
}));

vi.mock('@/components/structure/framing/useFrameStore', () => ({
  default: () => ({
    setEmbeddedFrameLoaded: vi.fn(),
    setActiveEmbeddedFrame: vi.fn(),
    loadedEmbeddedFrames: [APPS.MAIL],
  }),
}));

vi.mock('@/store/UserStore/useUserStore', () => ({
  default: () => ({ isAuthenticated: true }),
}));

vi.mock('@/components/structure/framing/Native/NativeFrame', () => ({
  default: () => <div data-testid="sogo-frame" />,
}));

const mailConfigs = (client: string): AppConfigDto[] => [
  {
    name: APPS.MAIL,
    appType: APP_INTEGRATION_VARIANT.NATIVE,
    extendedOptions: { [ExtendedOptionKeys.ACTIVE_MAIL_CLIENT]: client },
  } as unknown as AppConfigDto,
];

describe('NativeFrameManager mail gating', () => {
  beforeEach(() => {
    mockAppConfigs.appConfigs = [];
  });

  it('renders the SOGo frame when the selector is sogo', () => {
    mockAppConfigs.appConfigs = mailConfigs(ACTIVE_MAIL_CLIENT.SOGO);

    expect(renderToStaticMarkup(<NativeFrameManager />)).toContain('sogo-frame');
  });

  it('renders no SOGo frame when the selector is native', () => {
    mockAppConfigs.appConfigs = mailConfigs(ACTIVE_MAIL_CLIENT.NATIVE);

    expect(renderToStaticMarkup(<NativeFrameManager />)).not.toContain('sogo-frame');
  });
});
