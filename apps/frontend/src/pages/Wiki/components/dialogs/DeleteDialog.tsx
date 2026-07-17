/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { WIKI_NODE_TYPE } from '@libs/wiki/constants/wikiNodeType';
import type WikiNodeType from '@libs/wiki/constants/wikiNodeType';
import useWikiStore from '@/pages/Wiki/store/useWikiStore';
import DeleteConfirmationDialog from '@/components/ui/DeleteConfirmationDialog';

interface DeleteDialogProps {
  isOpen: boolean;
  path: string;
  nodeType: WikiNodeType;
  onClose: () => void;
  onSuccess?: () => void;
}

const DeleteDialog = ({ isOpen, path, nodeType, onClose, onSuccess }: DeleteDialogProps) => {
  const { t } = useTranslation();
  const deletePage = useWikiStore((state) => state.deletePage);
  const deleteFolder = useWikiStore((state) => state.deleteFolder);
  const isSaving = useWikiStore((state) => state.isSaving);

  const isPage = nodeType === WIKI_NODE_TYPE.PAGE;
  const leafName = path.split('/').filter(Boolean).pop() ?? path;

  const handleConfirm = async () => {
    const succeeded = isPage ? await deletePage(path) : await deleteFolder(path);
    if (succeeded) {
      toast.success(t('wiki.notifications.deleted'));
      onSuccess?.();
    }
  };

  return (
    <DeleteConfirmationDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      onConfirmDelete={handleConfirm}
      isLoading={isSaving}
      items={[{ id: path, name: leafName }]}
      titleTranslationKey={isPage ? 'wiki.dialog.delete.pageTitle' : 'wiki.dialog.delete.folderTitle'}
      messageTranslationKey={isPage ? 'wiki.dialog.delete.pageMessage' : 'wiki.dialog.delete.folderMessage'}
      autoCloseOnSuccess
    />
  );
};

export default DeleteDialog;
