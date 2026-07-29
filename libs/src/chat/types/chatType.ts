/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import CHAT_TYPES from '@libs/chat/constants/chatTypes';

type ChatType = (typeof CHAT_TYPES)[keyof typeof CHAT_TYPES];

export default ChatType;
