/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { randomBytes } from 'crypto';

const SECURE_TOKEN_BYTE_LENGTH = 16;

const generateSecureToken = (): string => randomBytes(SECURE_TOKEN_BYTE_LENGTH).toString('hex');

export default generateSecureToken;
