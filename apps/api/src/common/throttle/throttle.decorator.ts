/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { SetMetadata } from '@nestjs/common';
import THROTTLE_METADATA_KEY from '@libs/common/constants/throttleMetadataKey';
import ThrottleConfig from '@libs/common/types/throttleConfig';

interface ThrottleOptions {
  byIp?: boolean;
}

const Throttle = (limit: number, ttl: number, options?: ThrottleOptions) => {
  const config: ThrottleConfig = { limit, ttl, byIp: options?.byIp ?? false };
  return SetMetadata(THROTTLE_METADATA_KEY, config);
};

export default Throttle;
