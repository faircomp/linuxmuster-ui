/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '@edulution-io/ui-kit';
import useWikiStore from '@/pages/Wiki/store/useWikiStore';
import AdaptiveDialog from '@/components/ui/AdaptiveDialog';
import DialogFooterButtons from '@/components/ui/DialogFooterButtons';
import Input from '@/components/shared/Input';
import { canSubmitCreateFolder } from './wikiDialogValidation';

interface CreateFolderDialogProps {
  isOpen: boolean;
  parentPath: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateFolderDialog = ({ isOpen, parentPath, onClose, onSuccess }: CreateFolderDialogProps) => {
  const { t } = useTranslation();
  const createFolder = useWikiStore((state) => state.createFolder);
  const isSaving = useWikiStore((state) => state.isSaving);
  const [name, setName] = useState('');

  const hasLocation = parentPath !== '';
  const canSubmit = canSubmitCreateFolder(parentPath, name, isSaving);

  const handleClose = () => {
    setName('');
    onClose();
  };

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    const created = await createFolder({ parentPath, name: name.trim() });
    if (created) {
      toast.success(t('wiki.notifications.folderCreated'));
      onSuccess?.();
      handleClose();
    }
  };

  const body = (
    <div className={cn('flex flex-col gap-3')}>
      <p className={cn('text-sm text-muted-foreground')}>
        {hasLocation ? `${t('wiki.dialog.location')} ${parentPath}` : t('wiki.dialog.noLocationSelected')}
      </p>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t('wiki.dialog.createFolder.namePlaceholder')}
      />
    </div>
  );

  return (
    <AdaptiveDialog
      isOpen={isOpen}
      handleOpenChange={handleClose}
      title={t('wiki.dialog.createFolder.title')}
      body={body}
      footer={
        <DialogFooterButtons
          handleClose={handleClose}
          handleSubmit={() => {
            void submit();
          }}
          submitButtonText="common.create"
          disableSubmit={!canSubmit}
        />
      }
    />
  );
};

export default CreateFolderDialog;
