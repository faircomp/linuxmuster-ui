/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ValidationPipe } from '@nestjs/common';

const whitelistValidationPipe = new ValidationPipe({
  whitelist: true,
  disableErrorMessages: process.env.NODE_ENV === 'production',
});

export default whitelistValidationPipe;
