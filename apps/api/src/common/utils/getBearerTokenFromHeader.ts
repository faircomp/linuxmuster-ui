/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Request } from 'express';
import BEARER_AUTH_SCHEME from '@libs/auth/constants/bearerAuthScheme';

const getBearerTokenFromHeader = (request: Request): string | undefined => {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  if (scheme !== BEARER_AUTH_SCHEME || !token) {
    return undefined;
  }
  return token;
};

export default getBearerTokenFromHeader;
