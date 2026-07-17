/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import PageLayout from '@/components/structure/layout/PageLayout';
import WikiSidebar from './components/WikiSidebar';
import WikiPageView from './components/WikiPageView';

const WikiPage = () => {
  const { t } = useTranslation();

  return (
    <PageLayout hasFullWidthMain>
      <div className={cn('flex h-full')}>
        <aside
          className={cn('flex w-72 shrink-0 flex-col overflow-hidden border-r border-muted bg-glass')}
          aria-label={t('wiki.sidebar')}
        >
          <WikiSidebar />
        </aside>
        <WikiPageView />
      </div>
    </PageLayout>
  );
};

export default WikiPage;
