/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import GROUP_TYPE_TO_LOCATION from '@libs/chat/constants/groupTypeToLocation';

const toChatRoute = (sourceId: string): string => {
  const separatorIndex = sourceId.indexOf('/');
  if (separatorIndex === -1) {
    return sourceId;
  }
  const conversationType = sourceId.substring(0, separatorIndex);
  const groupName = sourceId.substring(separatorIndex + 1);
  const location = GROUP_TYPE_TO_LOCATION[conversationType];
  return location ? `${location}/${groupName}` : sourceId;
};

export default toChatRoute;
