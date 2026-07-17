/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@edulution-io/ui-kit';
import PageLayout from '@/components/structure/layout/PageLayout';

const WikiPage = () => {
  const { t } = useTranslation();

  return (
    <PageLayout hasFullWidthMain>
      <div className={cn('flex h-full')}>
        <aside
          className={cn('flex w-72 shrink-0 flex-col border-r border-muted bg-glass')}
          aria-label={t('wiki.sidebar')}
        />
        <div className={cn('bg-glass flex flex-1 flex-col items-center justify-center')}>
          <FontAwesomeIcon
            icon={faBookOpen}
            className={cn('mb-4 h-16 w-16 text-muted-foreground opacity-30')}
          />
          <p className={cn('text-lg text-muted-foreground')}>{t('wiki.empty.selectPageHint')}</p>
        </div>
      </div>
    </PageLayout>
  );
};

export default WikiPage;
