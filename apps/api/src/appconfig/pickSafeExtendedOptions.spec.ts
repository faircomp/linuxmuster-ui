/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import ExtendedOptionField from '@libs/appconfig/constants/extendedOptionField';
import NON_ADMIN_EXTENDED_OPTION_KEYS from '@libs/appconfig/constants/nonAdminExtendedOptionKeys';
import SECRET_EXTENDED_OPTION_KEYS, {
  aggregatedOptionModuleCount,
} from '@libs/appconfig/constants/secretExtendedOptionKeys';
import pickSafeExtendedOptions from '@libs/appconfig/utils/pickSafeExtendedOptions';
import ONLY_OFFICE_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/onlyOffice';
import COLLABORA_EXTENDED_OPTIONS from '@libs/appconfig/constants/extendedOptions/collabora';

describe('pickSafeExtendedOptions', () => {
  it('withholds the document server secrets from a non-admin', () => {
    const result = pickSafeExtendedOptions({
      [ExtendedOptionKeys.ONLY_OFFICE_URL]: 'https://office.example.org',
      [ExtendedOptionKeys.ONLY_OFFICE_JWT_SECRET]: 'a-secret',
      [ExtendedOptionKeys.COLLABORA_WOPI_SECRET]: 'another-secret',
    });

    expect(result).toEqual({ [ExtendedOptionKeys.ONLY_OFFICE_URL]: 'https://office.example.org' });
  });

  it('withholds a key nobody allowed, which is what makes this an allowlist', () => {
    const result = pickSafeExtendedOptions({
      [ExtendedOptionKeys.ONLY_OFFICE_URL]: 'https://office.example.org',
      FUTURE_SECRET_KEY: 'invented-by-a-later-package',
    });

    expect(result).not.toHaveProperty('FUTURE_SECRET_KEY');
  });

  it('lets every allowlisted key through', () => {
    const everything = Object.fromEntries(NON_ADMIN_EXTENDED_OPTION_KEYS.map((key) => [key, `value-of-${key}`]));

    expect(Object.keys(pickSafeExtendedOptions(everything)).sort()).toEqual([...NON_ADMIN_EXTENDED_OPTION_KEYS].sort());
  });

  it('returns everything an explicit allowlist names, which is how the admin branch keeps its view', () => {
    const options = { [ExtendedOptionKeys.DOCKER_CONTAINER_TABLE]: [], [ExtendedOptionKeys.BACKGROUND]: 'blue' };
    const allowed = [ExtendedOptionKeys.DOCKER_CONTAINER_TABLE, ExtendedOptionKeys.BACKGROUND];

    expect(Object.keys(pickSafeExtendedOptions(options, allowed)).sort()).toEqual([...allowed].sort());
  });

  it('never yields a secret even when the allowlist names one', () => {
    const result = pickSafeExtendedOptions({ [ExtendedOptionKeys.ONLY_OFFICE_JWT_SECRET]: 'a-secret' }, [
      ExtendedOptionKeys.ONLY_OFFICE_JWT_SECRET,
    ]);

    expect(result).toEqual({});
  });

  it('survives a missing options object', () => {
    expect(pickSafeExtendedOptions(undefined)).toEqual({});
  });
});

describe('SECRET_EXTENDED_OPTION_KEYS', () => {
  it('is derived from the password fields rather than maintained by hand', () => {
    const passwordFields = [...ONLY_OFFICE_EXTENDED_OPTIONS, ...COLLABORA_EXTENDED_OPTIONS]
      .filter((option) => option.type === ExtendedOptionField.password)
      .map((option) => option.name);

    passwordFields.forEach((key) => expect(SECRET_EXTENDED_OPTION_KEYS).toContain(key));
  });

  it('aggregates every option file, so a new one cannot be forgotten silently', () => {
    const optionFiles = readdirSync(join(__dirname, '../../../../libs/src/appconfig/constants/extendedOptions')).filter(
      (file) => file.endsWith('.ts'),
    );

    expect(aggregatedOptionModuleCount).toBe(optionFiles.length);
  });

  it('covers the two keys the service used to delete by hand', () => {
    expect(SECRET_EXTENDED_OPTION_KEYS).toContain(ExtendedOptionKeys.ONLY_OFFICE_JWT_SECRET);
    expect(SECRET_EXTENDED_OPTION_KEYS).toContain(ExtendedOptionKeys.COLLABORA_WOPI_SECRET);
  });
});

describe('NON_ADMIN_EXTENDED_OPTION_KEYS', () => {
  it('carries the mail client selector, which every user page reads to pick its frame', () => {
    expect(NON_ADMIN_EXTENDED_OPTION_KEYS).toContain(ExtendedOptionKeys.ACTIVE_MAIL_CLIENT);
  });

  it('carries the document vendor override, which the file dialogs read to choose odf over msoffice', () => {
    expect(NON_ADMIN_EXTENDED_OPTION_KEYS).toContain(
      ExtendedOptionKeys.OVERRIDE_FILE_SHARING_DOCUMENT_VENDOR_MS_WITH_OO,
    );
  });

  it('names no secret, since that would be a contradiction the picker has to catch', () => {
    SECRET_EXTENDED_OPTION_KEYS.forEach((secret) => expect(NON_ADMIN_EXTENDED_OPTION_KEYS).not.toContain(secret));
  });
});
