/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { Button, cn } from '@edulution-io/ui-kit';
import useWikiStore from '@/pages/Wiki/store/useWikiStore';
import MarkdownRenderer from '@/components/ui/Renderer/MarkdownRenderer';

interface WikiPageViewProps {
  onEdit?: () => void;
}

const WikiPageView = ({ onEdit }: WikiPageViewProps) => {
  const { t } = useTranslation();
  const currentPage = useWikiStore((state) => state.currentPage);

  if (!currentPage) {
    return (
      <div className={cn('bg-glass flex flex-1 flex-col items-center justify-center')}>
        <FontAwesomeIcon
          icon={faBookOpen}
          className={cn('mb-4 h-16 w-16 text-muted-foreground opacity-30')}
        />
        <p className={cn('text-lg text-muted-foreground')}>{t('wiki.empty.selectPageHint')}</p>
      </div>
    );
  }

  return (
    <article className={cn('bg-glass flex flex-1 flex-col overflow-y-auto p-6')}>
      <header className={cn('mb-4 flex items-start justify-between gap-4')}>
        <div className={cn('min-w-0')}>
          <h1 className={cn('truncate text-2xl font-semibold')}>{currentPage.title}</h1>
          {currentPage.mtime > 0 && (
            <p className={cn('mt-1 text-sm text-muted-foreground')}>
              {`${t('wiki.metadata.updatedAt')} ${new Date(currentPage.mtime).toLocaleString()}`}
            </p>
          )}
        </div>
        <Button
          variant="btn-outline"
          size="md"
          onClick={onEdit}
        >
          <FontAwesomeIcon
            icon={faPenToSquare}
            className={cn('mr-2 h-4 w-4')}
          />
          {t('wiki.actions.edit')}
        </Button>
      </header>
      <MarkdownRenderer
        content={currentPage.content}
        editable={false}
      />
    </article>
  );
};

export default WikiPageView;
