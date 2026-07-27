/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Request } from 'express';
import type JWTUser from '@libs/user/types/jwt/jwtUser';
import getBearerTokenFromHeader from './getBearerTokenFromHeader';

const getBearerSessionFromRequest = (request: Request): JWTUser | undefined => {
  const tokenFromHeader = getBearerTokenFromHeader(request);
  if (!tokenFromHeader || tokenFromHeader !== request.token) {
    return undefined;
  }
  return request.user;
};

export default getBearerSessionFromRequest;
