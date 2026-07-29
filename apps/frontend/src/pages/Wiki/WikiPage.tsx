/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import type WikiNodeType from '@libs/wiki/constants/wikiNodeType';
import PageLayout from '@/components/structure/layout/PageLayout';
import useWikiStore from '@/pages/Wiki/store/useWikiStore';
import WikiSidebar from './components/WikiSidebar';
import WikiPageView from './components/WikiPageView';
import CreatePageDialog from './components/dialogs/CreatePageDialog';
import CreateFolderDialog from './components/dialogs/CreateFolderDialog';
import DeleteDialog from './components/dialogs/DeleteDialog';

const WIKI_DIALOG = {
  CREATE_PAGE: 'createPage',
  CREATE_FOLDER: 'createFolder',
  DELETE: 'delete',
} as const;

type WikiDialog = (typeof WIKI_DIALOG)[keyof typeof WIKI_DIALOG];

const WikiPage = () => {
  const { t } = useTranslation();
  const refreshTree = useWikiStore((state) => state.refreshTree);
  const [activeDialog, setActiveDialog] = useState<WikiDialog | null>(null);
  const [parentPath, setParentPath] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; nodeType: WikiNodeType } | null>(null);

  const closeDialog = () => setActiveDialog(null);

  const handleCreatePage = (target: string) => {
    setParentPath(target);
    setActiveDialog(WIKI_DIALOG.CREATE_PAGE);
  };

  const handleCreateFolder = (target: string) => {
    setParentPath(target);
    setActiveDialog(WIKI_DIALOG.CREATE_FOLDER);
  };

  const handleDelete = (path: string, nodeType: WikiNodeType) => {
    setDeleteTarget({ path, nodeType });
    setActiveDialog(WIKI_DIALOG.DELETE);
  };

  return (
    <PageLayout hasFullWidthMain>
      <div className={cn('flex h-full')}>
        <aside
          className={cn('flex w-72 shrink-0 flex-col overflow-hidden border-r border-muted bg-glass')}
          aria-label={t('wiki.sidebar')}
        >
          <WikiSidebar
            onCreatePage={handleCreatePage}
            onCreateFolder={handleCreateFolder}
            onDelete={handleDelete}
          />
        </aside>
        <WikiPageView />
      </div>
      <CreatePageDialog
        isOpen={activeDialog === WIKI_DIALOG.CREATE_PAGE}
        parentPath={parentPath}
        onClose={closeDialog}
        onSuccess={refreshTree}
      />
      <CreateFolderDialog
        isOpen={activeDialog === WIKI_DIALOG.CREATE_FOLDER}
        parentPath={parentPath}
        onClose={closeDialog}
        onSuccess={refreshTree}
      />
      {deleteTarget && (
        <DeleteDialog
          isOpen={activeDialog === WIKI_DIALOG.DELETE}
          path={deleteTarget.path}
          nodeType={deleteTarget.nodeType}
          onClose={closeDialog}
          onSuccess={refreshTree}
        />
      )}
    </PageLayout>
  );
};

export default WikiPage;
