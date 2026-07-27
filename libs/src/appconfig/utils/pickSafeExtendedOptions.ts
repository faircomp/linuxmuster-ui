/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import NON_ADMIN_EXTENDED_OPTION_KEYS from '@libs/appconfig/constants/nonAdminExtendedOptionKeys';
import SECRET_EXTENDED_OPTION_KEYS from '@libs/appconfig/constants/secretExtendedOptionKeys';
import type { ExtendedOptionKeysType } from '@libs/appconfig/types/extendedOptionKeysType';

const pickSafeExtendedOptions = <T extends Record<string, unknown>>(
  extendedOptions: T | undefined,
  allowedKeys: ExtendedOptionKeysType[] = NON_ADMIN_EXTENDED_OPTION_KEYS,
): Partial<T> =>
  Object.fromEntries(
    Object.entries(extendedOptions ?? {}).filter(
      ([key]) =>
        allowedKeys.some((allowed) => allowed === key) && !SECRET_EXTENDED_OPTION_KEYS.some((secret) => secret === key),
    ),
  ) as Partial<T>;

export default pickSafeExtendedOptions;
