/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import ChatView from '@/pages/Chat/components/ChatView';
import useGroupChat from '@/pages/Chat/hooks/useGroupChat';
import GroupTypeLocation from '@libs/chat/types/groupTypeLocation';
import { CHAT_GROUP_TYPE_LOCATIONS } from '@libs/chat/constants/chatPaths';

interface ChatContentProps {
  groupName: string;
  groupType: GroupTypeLocation;
}

const ChatContent: React.FC<ChatContentProps> = ({ groupName, groupType }) => {
  const { t } = useTranslation();
  const adapter = useGroupChat(groupName, groupType);
  const title = `${groupType === CHAT_GROUP_TYPE_LOCATIONS.CLASSES ? t('chat.schoolClass') : t('chat.project')}: ${groupName}`;

  return (
    <ChatView
      adapter={adapter}
      title={title}
    />
  );
};

export default ChatContent;
