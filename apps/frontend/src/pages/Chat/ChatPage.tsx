/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { CHAT_GROUP_TYPE_LOCATIONS } from '@libs/chat/constants/chatPaths';
import GroupTypeLocation from '@libs/chat/types/groupTypeLocation';
import PageLayout from '@/components/structure/layout/PageLayout';
import LoadingIndicatorDialog from '@/components/ui/Loading/LoadingIndicatorDialog';
import useChatStore from '@/store/useChatStore';
import ChatNoSelectionState from './components/ChatNoSelectionState';
import useRegisterChatSections from './useRegisterChatSections';

const isValidGroupType = (value: string | undefined): value is GroupTypeLocation =>
  Object.values(CHAT_GROUP_TYPE_LOCATIONS).includes(value as GroupTypeLocation);

const ChatPage = () => {
  const { groupType, groupName } = useParams<{ groupType: string; groupName: string }>();
  const { isLoadingGroups } = useChatStore();
  useRegisterChatSections();

  const hasActiveConversation = !!groupName && isValidGroupType(groupType);

  return (
    <PageLayout hasFullWidthMain>
      <LoadingIndicatorDialog isOpen={isLoadingGroups} />
      <div className="flex h-full flex-col">
        {hasActiveConversation ? (
          <div className="border-b border-muted px-4 py-3">
            <h3 className="font-semibold text-background">{groupName}</h3>
          </div>
        ) : (
          <ChatNoSelectionState />
        )}
      </div>
    </PageLayout>
  );
};

export default ChatPage;
