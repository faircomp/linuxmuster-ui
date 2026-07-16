/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@edulution-io/ui-kit';
import useChatStore from '@/store/useChatStore';

interface ChatMenuBarFooterProps {
  isCollapsed: boolean;
}

const ChatMenuBarFooter: React.FC<ChatMenuBarFooterProps> = ({ isCollapsed }) => {
  const { t } = useTranslation();
  const { fetchUserGroups, isLoadingGroups } = useChatStore();

  if (isCollapsed) {
    return null;
  }

  return (
    <div className="border-t border-muted px-3 py-4">
      <Button
        type="button"
        variant="btn-ghost"
        disabled={isLoadingGroups}
        onClick={() => fetchUserGroups()}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted-background disabled:opacity-50"
      >
        <FontAwesomeIcon
          icon={faRotate}
          className="h-4 w-4"
          spin={isLoadingGroups}
        />
        <span className="text-sm">{t('chat.refreshGroups')}</span>
      </Button>
    </div>
  );
};

export default ChatMenuBarFooter;
