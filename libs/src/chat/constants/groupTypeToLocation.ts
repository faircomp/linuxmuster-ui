/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import SOPHOMORIX_GROUP_TYPES from '@libs/lmnApi/constants/sophomorixGroupTypes';
import GENERIC_CHAT_GROUP_TYPE from '@libs/chat/constants/genericChatGroupType';
import { CHAT_GROUP_TYPE_LOCATIONS } from '@libs/chat/constants/chatPaths';

const GROUP_TYPE_TO_LOCATION: Record<string, string> = {
  [SOPHOMORIX_GROUP_TYPES.ADMIN_CLASS]: CHAT_GROUP_TYPE_LOCATIONS.CLASSES,
  [SOPHOMORIX_GROUP_TYPES.PROJECT]: CHAT_GROUP_TYPE_LOCATIONS.PROJECTS,
  [GENERIC_CHAT_GROUP_TYPE]: CHAT_GROUP_TYPE_LOCATIONS.GROUPS,
};

export default GROUP_TYPE_TO_LOCATION;
