/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ValidationPipe } from '@nestjs/common';

const strictTransformValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  disableErrorMessages: true,
  transform: true,
});

export default strictTransformValidationPipe;
