/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import APPS from '@libs/appconfig/constants/apps';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import { ACTIVE_MAIL_CLIENT } from '@libs/mail/constants/activeMailClient';
import type AppConfigDto from '@libs/appconfig/types/appConfigDto';
import MailPage from './MailPage';

const mockState: { appConfigs: AppConfigDto[] } = { appConfigs: [] };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/pages/Settings/AppConfig/useAppConfigsStore', () => ({
  default: () => mockState,
}));

const mailConfigs = (client: string): AppConfigDto[] => [
  { name: APPS.MAIL, extendedOptions: { [ExtendedOptionKeys.ACTIVE_MAIL_CLIENT]: client } } as unknown as AppConfigDto,
];

describe('MailPage', () => {
  beforeEach(() => {
    mockState.appConfigs = [];
  });

  it('renders the native shell placeholder when the selector is native', () => {
    mockState.appConfigs = mailConfigs(ACTIVE_MAIL_CLIENT.NATIVE);

    const html = renderToStaticMarkup(<MailPage />);

    expect(html).toContain('mail.emptyState.nativePlaceholder');
  });

  it('renders nothing when the selector is sogo (the SOGo overlay takes over)', () => {
    mockState.appConfigs = mailConfigs(ACTIVE_MAIL_CLIENT.SOGO);

    expect(renderToStaticMarkup(<MailPage />)).toBe('');
  });

  it('renders nothing by default when no ACTIVE_MAIL_CLIENT option is set', () => {
    expect(renderToStaticMarkup(<MailPage />)).toBe('');
  });
});
