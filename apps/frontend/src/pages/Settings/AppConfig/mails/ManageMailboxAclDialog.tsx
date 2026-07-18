/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import MAILCOW_ACL_OPTIONS from '@libs/mail/constants/mailcowAclOptions';
import type MailcowMailboxDto from '@libs/mail/types/mailcowMailbox.dto';
import type MailboxAclDto from '@libs/mail/types/mailboxAcl.dto';
import AdaptiveDialog from '@/components/ui/AdaptiveDialog';
import DialogFooterButtons from '@/components/ui/DialogFooterButtons';
import Checkbox from '@/components/ui/Checkbox';
import useMailsStore from '@/pages/Mail/useMailsStore';
import { toggleAclValue } from './mailcowDialogValidation';

interface ManageMailboxAclDialogProps {
  isOpen: boolean;
  mailbox: MailcowMailboxDto;
  onClose: () => void;
}

const ALL_ACL_VALUES = Object.values(MAILCOW_ACL_OPTIONS);

const ManageMailboxAclDialog = ({ isOpen, mailbox, onClose }: ManageMailboxAclDialogProps) => {
  const { t } = useTranslation();
  const updateMailboxAcl = useMailsStore((state) => state.updateMailboxAcl);
  const isSaving = useMailsStore((state) => state.isMailcowLoading);
  const [selected, setSelected] = useState<string[]>(ALL_ACL_VALUES);

  const submit = async () => {
    const dto: MailboxAclDto = { items: [mailbox.username], attr: { user_acl: selected } };
    const updated = await updateMailboxAcl(dto);
    if (updated) {
      onClose();
    }
  };

  const body = (
    <div className={cn('flex flex-col gap-3')}>
      <p className={cn('text-sm')}>{mailbox.username}</p>
      <p className={cn('text-sm')}>{t('mailcowAdmin.dialog.aclDescription')}</p>
      <div className={cn('grid grid-cols-1 gap-2 md:grid-cols-2')}>
        {ALL_ACL_VALUES.map((value) => (
          <Checkbox
            key={value}
            checked={selected.includes(value)}
            onCheckedChange={() => setSelected((previous) => toggleAclValue(previous, value))}
            label={t(`mailcowAdmin.aclOptions.${value}`)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <AdaptiveDialog
      isOpen={isOpen}
      handleOpenChange={onClose}
      title={t('mailcowAdmin.dialog.aclTitle')}
      body={body}
      footer={
        <DialogFooterButtons
          handleClose={onClose}
          handleSubmit={() => {
            void submit();
          }}
          submitButtonText="common.save"
          disableSubmit={isSaving}
        />
      }
    />
  );
};

export default ManageMailboxAclDialog;
