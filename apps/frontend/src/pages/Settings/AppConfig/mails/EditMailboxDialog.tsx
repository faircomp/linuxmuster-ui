/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import type MailcowMailboxDto from '@libs/mail/types/mailcowMailbox.dto';
import type UpdateMailboxDto from '@libs/mail/types/updateMailbox.dto';
import type UpdateMailboxAttrDto from '@libs/mail/types/updateMailboxAttr.dto';
import AdaptiveDialog from '@/components/ui/AdaptiveDialog';
import DialogFooterButtons from '@/components/ui/DialogFooterButtons';
import Input from '@/components/shared/Input';
import Checkbox from '@/components/ui/Checkbox';
import useMailsStore from '@/pages/Mail/useMailsStore';
import {
  canSubmitEditMailbox,
  isPasswordChangeRequested,
  isValidPassword,
  passwordsMatch,
  type EditMailboxFormValues,
} from './mailcowDialogValidation';

interface EditMailboxDialogProps {
  isOpen: boolean;
  mailbox: MailcowMailboxDto;
  onClose: () => void;
}

const BYTES_PER_MEBIBYTE = 1024 * 1024;
const ACTIVE_STATE = 1;

const EditMailboxDialog = ({ isOpen, mailbox, onClose }: EditMailboxDialogProps) => {
  const { t } = useTranslation();
  const updateMailcowMailbox = useMailsStore((state) => state.updateMailcowMailbox);
  const isSaving = useMailsStore((state) => state.isMailcowLoading);
  const [values, setValues] = useState<EditMailboxFormValues>({
    name: mailbox.name,
    quota: Math.round(mailbox.quota / BYTES_PER_MEBIBYTE),
    password: '',
    passwordConfirmation: '',
  });
  const [active, setActive] = useState(mailbox.active === ACTIVE_STATE);

  const canSubmit = canSubmitEditMailbox(values, isSaving);
  const showPasswordHint = values.password !== '' && !isValidPassword(values.password);
  const showPasswordMismatch =
    values.passwordConfirmation !== '' && !passwordsMatch(values.password, values.passwordConfirmation);

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    const changePassword = isPasswordChangeRequested(values.password, values.passwordConfirmation);
    const attr: UpdateMailboxAttrDto = {
      name: values.name.trim(),
      quota: values.quota,
      active: active ? 1 : 0,
      ...(changePassword ? { password: values.password, password2: values.passwordConfirmation } : {}),
    };
    const dto: UpdateMailboxDto = { items: [mailbox.username], attr };
    const updated = await updateMailcowMailbox(dto);
    if (updated) {
      onClose();
    }
  };

  const body = (
    <div className={cn('flex flex-col gap-3')}>
      <p className={cn('text-sm')}>{mailbox.username}</p>
      <div className={cn('flex flex-col gap-1')}>
        <span className={cn('text-sm')}>{t('mailcowAdmin.dialog.name')}</span>
        <Input
          value={values.name}
          onChange={(event) => setValues((previous) => ({ ...previous, name: event.target.value }))}
        />
      </div>
      <div className={cn('flex flex-col gap-1')}>
        <span className={cn('text-sm')}>{t('mailcowAdmin.dialog.quota')}</span>
        <Input
          type="number"
          value={values.quota}
          onChange={(event) => setValues((previous) => ({ ...previous, quota: Number(event.target.value) }))}
        />
      </div>
      <div className={cn('flex flex-col gap-1')}>
        <span className={cn('text-sm')}>{t('mailcowAdmin.dialog.password')}</span>
        <Input
          type="password"
          value={values.password}
          onChange={(event) => setValues((previous) => ({ ...previous, password: event.target.value }))}
        />
        <span className={cn('text-sm')}>{t('mailcowAdmin.dialog.passwordKeepCurrent')}</span>
        {showPasswordHint && <span className={cn('text-sm text-ciRed')}>{t('mailcowAdmin.dialog.passwordHint')}</span>}
      </div>
      <div className={cn('flex flex-col gap-1')}>
        <span className={cn('text-sm')}>{t('mailcowAdmin.dialog.passwordConfirmation')}</span>
        <Input
          type="password"
          value={values.passwordConfirmation}
          onChange={(event) => setValues((previous) => ({ ...previous, passwordConfirmation: event.target.value }))}
        />
        {showPasswordMismatch && (
          <span className={cn('text-sm text-ciRed')}>{t('mailcowAdmin.dialog.passwordMismatch')}</span>
        )}
      </div>
      <Checkbox
        checked={active}
        onCheckedChange={(checked) => setActive(checked === true)}
        label={t('mailcowAdmin.dialog.active')}
      />
    </div>
  );

  return (
    <AdaptiveDialog
      isOpen={isOpen}
      handleOpenChange={onClose}
      title={t('mailcowAdmin.dialog.editTitle')}
      body={body}
      footer={
        <DialogFooterButtons
          handleClose={onClose}
          handleSubmit={() => {
            void submit();
          }}
          submitButtonText="common.save"
          disableSubmit={!canSubmit}
        />
      }
    />
  );
};

export default EditMailboxDialog;
