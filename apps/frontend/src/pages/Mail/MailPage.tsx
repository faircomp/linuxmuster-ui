/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import { ACTIVE_MAIL_CLIENT } from '@libs/mail/constants/activeMailClient';
import getActiveMailClient from '@libs/mail/utils/getActiveMailClient';
import useAppConfigsStore from '@/pages/Settings/AppConfig/useAppConfigsStore';

const MailPage = () => {
  const { t } = useTranslation();
  const { appConfigs } = useAppConfigsStore();

  if (getActiveMailClient(appConfigs) !== ACTIVE_MAIL_CLIENT.NATIVE) {
    return null;
  }

  return (
    <div className={cn('flex h-full')}>
      <aside className={cn('w-64 shrink-0 border-r border-muted bg-glass')} />
      <div className={cn('w-96 shrink-0 border-r border-muted bg-glass')} />
      <div className={cn('flex flex-1 flex-col items-center justify-center bg-glass')}>
        <p className={cn('text-lg text-muted-foreground')}>{t('mail.emptyState.nativePlaceholder')}</p>
      </div>
    </div>
  );
};

export default MailPage;
