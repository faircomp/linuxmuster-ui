/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import SOPHOMORIX_GROUP_TYPES from '@libs/lmnApi/constants/sophomorixGroupTypes';

const ALLOWED_CHAT_SOPHOMORIX_TYPES = [SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS, SOPHOMORIX_GROUP_TYPES.PROJECT] as const;

export default ALLOWED_CHAT_SOPHOMORIX_TYPES;
