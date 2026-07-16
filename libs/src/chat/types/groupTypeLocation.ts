/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { CHAT_GROUP_TYPE_LOCATIONS } from '@libs/chat/constants/chatPaths';

type GroupTypeLocation = (typeof CHAT_GROUP_TYPE_LOCATIONS)[keyof typeof CHAT_GROUP_TYPE_LOCATIONS];

export default GroupTypeLocation;
