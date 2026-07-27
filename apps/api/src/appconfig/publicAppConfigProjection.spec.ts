/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type AppConfigDto from '@libs/appconfig/types/appConfigDto';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import AppConfigService from './appconfig.service';

const buildConfig = (extendedOptions: Record<string, unknown>): AppConfigDto =>
  ({
    name: 'embedded',
    icon: 'icon.svg',
    appType: 'native',
    options: {},
    accessGroups: [{ id: 'g1', name: 'teachers', path: '/teachers' }],
    position: 1,
    extendedOptions,
  }) as unknown as AppConfigDto;

describe('public app config projection', () => {
  it('keeps the keys the public embedded page needs', () => {
    const result = AppConfigService.pickPublicExtendedOptions(
      buildConfig({
        [ExtendedOptionKeys.EMBEDDED_PAGE_IS_PUBLIC]: true,
        [ExtendedOptionKeys.EMBEDDED_PAGE_HTML_CONTENT]: '<p>hi</p>',
        [ExtendedOptionKeys.FRAME_URL_SYNC_ENABLED]: true,
      }),
    );

    const options = result.extendedOptions as unknown as Record<string, unknown>;
    expect(options[ExtendedOptionKeys.EMBEDDED_PAGE_IS_PUBLIC]).toBe(true);
    expect(options[ExtendedOptionKeys.EMBEDDED_PAGE_HTML_CONTENT]).toBe('<p>hi</p>');
    expect(options[ExtendedOptionKeys.FRAME_URL_SYNC_ENABLED]).toBe(true);
  });

  it('drops secrets from the unauthenticated response', () => {
    const result = AppConfigService.pickPublicExtendedOptions(
      buildConfig({
        [ExtendedOptionKeys.EMBEDDED_PAGE_IS_PUBLIC]: true,
        [ExtendedOptionKeys.ONLY_OFFICE_JWT_SECRET]: 'super-secret',
        [ExtendedOptionKeys.COLLABORA_WOPI_SECRET]: 'another-secret',
      }),
    );

    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain('super-secret');
    expect(serialised).not.toContain('another-secret');
  });

  it('drops any key that is not on the allowlist, including future ones', () => {
    const result = AppConfigService.pickPublicExtendedOptions(
      buildConfig({
        [ExtendedOptionKeys.EMBEDDED_PAGE_IS_PUBLIC]: true,
        SOME_FUTURE_CREDENTIAL: 'leak-me',
      }),
    );

    expect(JSON.stringify(result)).not.toContain('leak-me');
  });

  it('does not expose access groups to anonymous callers', () => {
    const result = AppConfigService.pickPublicExtendedOptions(
      buildConfig({ [ExtendedOptionKeys.EMBEDDED_PAGE_IS_PUBLIC]: true }),
    );

    expect(result.accessGroups).toEqual([]);
  });

  it('passes a config without extended options through unchanged', () => {
    const config = { name: 'plain' } as unknown as AppConfigDto;

    expect(AppConfigService.pickPublicExtendedOptions(config)).toBe(config);
  });
});
