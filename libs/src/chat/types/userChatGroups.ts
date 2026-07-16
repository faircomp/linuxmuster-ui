/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ChatGroup from '@libs/chat/types/chatGroup';

interface UserChatGroups {
  classes: ChatGroup[];
  projects: ChatGroup[];
  groups: ChatGroup[];
}

export default UserChatGroups;
