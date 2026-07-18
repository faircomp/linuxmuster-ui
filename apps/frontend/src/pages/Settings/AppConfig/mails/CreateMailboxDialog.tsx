/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import type CreateMailboxDto from '@libs/mail/types/createMailbox.dto';
import { DropdownSelect } from '@/components';
import AdaptiveDialog from '@/components/ui/AdaptiveDialog';
import DialogFooterButtons from '@/components/ui/DialogFooterButtons';
import Input from '@/components/shared/Input';
import Checkbox from '@/components/ui/Checkbox';
import useMailsStore from '@/pages/Mail/useMailsStore';
import {
  canSubmitCreateMailbox,
  isValidLocalPart,
  isValidPassword,
  passwordsMatch,
  type CreateMailboxFormValues,
} from './mailcowDialogValidation';

interface CreateMailboxDialogProps {
  isOpen: boolean;
  domains: string[];
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_QUOTA_MB = 1024;

const INITIAL_VALUES: CreateMailboxFormValues = {
  localPart: '',
  domain: '',
  name: '',
  quota: DEFAULT_QUOTA_MB,
  password: '',
  passwordConfirmation: '',
};

const CreateMailboxDialog = ({ isOpen, domains, onClose, onSuccess }: CreateMailboxDialogProps) => {
  const { t } = useTranslation();
  const createMailcowMailbox = useMailsStore((state) => state.createMailcowMailbox);
  const isSaving = useMailsStore((state) => state.isMailcowLoading);
  const [values, setValues] = useState<CreateMailboxFormValues>(INITIAL_VALUES);
  const [active, setActive] = useState(true);

  const canSubmit = canSubmitCreateMailbox(values, isSaving);
  const showLocalPartHint = values.localPart !== '' && !isValidLocalPart(values.localPart);
  const showPasswordHint = values.password !== '' && !isValidPassword(values.password);
  const showPasswordMismatch =
    values.passwordConfirmation !== '' && !passwordsMatch(values.password, values.passwordConfirmation);

  const handleClose = () => {
    setValues(INITIAL_VALUES);
    setActive(true);
    onClose();
  };

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    const dto: CreateMailboxDto = {
      local_part: values.localPart,
      domain: values.domain,
      name: values.name.trim(),
      quota: values.quota,
      password: values.password,
      password2: values.passwordConfirmation,
      active: active ? 1 : 0,
      force_pw_update: 0,
      tls_enforce_in: 0,
      tls_enforce_out: 0,
    };
    const created = await createMailcowMailbox(dto);
    if (created) {
      onSuccess?.();
      handleClose();
    }
  };

  const domainOptions = domains.map((domain) => ({ id: domain, name: domain }));

  const body = (
    <div className={cn('flex flex-col gap-3')}>
      <div className={cn('flex flex-col gap-1')}>
        <span className={cn('text-sm')}>{t('mailcowAdmin.dialog.localPart')}</span>
        <Input
          value={values.localPart}
          onChange={(event) => setValues((previous) => ({ ...previous, localPart: event.target.value }))}
        />
        {showLocalPartHint && <span className={cn('text-sm text-ciRed')}>{t('mailcowAdmin.dialog.localPartHint')}</span>}
      </div>
      <div className={cn('flex flex-col gap-1')}>
        <span className={cn('text-sm')}>{t('mailcowAdmin.dialog.domain')}</span>
        <DropdownSelect
          options={domainOptions}
          selectedVal={values.domain}
          handleChange={(domain) => setValues((previous) => ({ ...previous, domain }))}
          placeholder={t('mailcowAdmin.dialog.domainPlaceholder')}
          translate={false}
        />
      </div>
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
      handleOpenChange={handleClose}
      title={t('mailcowAdmin.dialog.createTitle')}
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

export default CreateMailboxDialog;
