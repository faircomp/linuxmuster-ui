/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments } from '@fortawesome/free-solid-svg-icons';

const ChatNoSelectionState = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-glass flex flex-1 flex-col items-center justify-center">
      <FontAwesomeIcon
        icon={faComments}
        className="mb-4 h-16 w-16 text-muted-foreground opacity-30"
      />
      <p className="text-lg text-muted-foreground">{t('chat.selectConversation')}</p>
      <p className="mt-2 text-sm text-muted-foreground opacity-70">{t('chat.selectConversationDescription')}</p>
    </div>
  );
};

export default ChatNoSelectionState;
