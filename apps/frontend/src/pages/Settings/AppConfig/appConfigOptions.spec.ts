/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import APPS from '@libs/appconfig/constants/apps';
import AppConfigSectionsKeys from '@libs/appconfig/constants/appConfigSectionsKeys';
import COLLABORA_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/collabora';
import APP_CONFIG_OPTIONS from './appConfigOptions';

describe('APP_CONFIG_OPTIONS file sharing document editor section', () => {
  const fileSharingOption = APP_CONFIG_OPTIONS.find((option) => option.id === APPS.FILE_SHARING);

  it('registers the file sharing app', () => {
    expect(fileSharingOption).toBeDefined();
  });

  it('registers the collabora document editor section under file sharing', () => {
    expect(fileSharingOption?.extendedOptions?.[AppConfigSectionsKeys.documentEditor]).toBe(COLLABORA_EXTENDED_OPTIONS);
  });

  it('keeps the existing onlyOffice section registered', () => {
    expect(fileSharingOption?.extendedOptions?.[AppConfigSectionsKeys.onlyOffice]).toBeDefined();
  });
});
