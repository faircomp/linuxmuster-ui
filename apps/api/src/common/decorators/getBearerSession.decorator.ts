/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import getBearerSessionFromRequest from '../utils/getBearerSessionFromRequest';

const GetBearerSession = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  getBearerSessionFromRequest(ctx.switchToHttp().getRequest<Request>()),
);

export default GetBearerSession;
