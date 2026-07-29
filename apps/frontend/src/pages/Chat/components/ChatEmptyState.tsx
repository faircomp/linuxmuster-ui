/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments } from '@fortawesome/free-solid-svg-icons';

const ChatEmptyState = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
      <FontAwesomeIcon
        icon={faComments}
        className="mb-4 h-16 w-16 opacity-30"
      />
      <p className="text-lg">{t('chat.noMessages')}</p>
      <p className="mt-2 text-sm opacity-70">{t('chat.startConversation')}</p>
    </div>
  );
};

export default ChatEmptyState;
