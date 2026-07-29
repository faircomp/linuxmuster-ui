/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { createHmac, timingSafeEqual } from 'crypto';

const SECRET_COMPARISON_HMAC_KEY = 'public-share-secret-compare';

const digestSecret = (value: string): Buffer =>
  createHmac('sha256', SECRET_COMPARISON_HMAC_KEY).update(value, 'utf8').digest();

const compareSecretsConstantTime = (left: string, right: string): boolean =>
  timingSafeEqual(digestSecret(left), digestSecret(right));

export default compareSecretsConstantTime;
