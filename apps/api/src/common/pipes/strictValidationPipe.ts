/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ValidationPipe } from '@nestjs/common';

const strictValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  disableErrorMessages: process.env.NODE_ENV === 'production',
});

export default strictValidationPipe;
