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
import Checkbox from '@/components/ui/Checkbox';
import { canSubmitCreatePage, isReservedIndexTitle } from './wikiDialogValidation';

interface CreatePageDialogProps {
  isOpen: boolean;
  parentPath: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreatePageDialog = ({ isOpen, parentPath, onClose, onSuccess }: CreatePageDialogProps) => {
  const { t } = useTranslation();
  const createPage = useWikiStore((state) => state.createPage);
  const isSaving = useWikiStore((state) => state.isSaving);
  const [title, setTitle] = useState('');
  const [asIndex, setAsIndex] = useState(false);

  const hasLocation = parentPath !== '';
  const showIndexReserved = isReservedIndexTitle(title, asIndex);
  const canSubmit = canSubmitCreatePage(parentPath, title, asIndex, isSaving);

  const handleClose = () => {
    setTitle('');
    setAsIndex(false);
    onClose();
  };

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    const created = await createPage({ parentPath, title: title.trim(), asIndex });
    if (created) {
      toast.success(t('wiki.notifications.pageSaved'));
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
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('wiki.dialog.createPage.titlePlaceholder')}
      />
      {showIndexReserved && (
        <p className={cn('text-sm text-ciRed')}>{t('wiki.dialog.createPage.indexSlugReserved')}</p>
      )}
      <Checkbox
        checked={asIndex}
        onCheckedChange={(checked) => setAsIndex(checked === true)}
        label={t('wiki.dialog.createPage.asIndex')}
      />
    </div>
  );

  return (
    <AdaptiveDialog
      isOpen={isOpen}
      handleOpenChange={handleClose}
      title={t('wiki.dialog.createPage.title')}
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

export default CreatePageDialog;
