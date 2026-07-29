/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import CHAT_ROLES from '@libs/chat/constants/chatRoles';

type ChatRole = (typeof CHAT_ROLES)[keyof typeof CHAT_ROLES];

export default ChatRole;
