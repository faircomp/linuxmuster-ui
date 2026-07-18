/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@edulution-io/ui-kit';
import APPS from '@libs/appconfig/constants/apps';
import type MailcowMailboxDto from '@libs/mail/types/mailcowMailbox.dto';
import useMailsStore from '@/pages/Mail/useMailsStore';
import ScrollableTable from '@/components/ui/Table/ScrollableTable';
import DeleteConfirmationDialog from '@/components/ui/DeleteConfirmationDialog';
import getMailcowMailboxColumns from './getMailcowMailboxColumns';
import CreateMailboxDialog from './CreateMailboxDialog';
import EditMailboxDialog from './EditMailboxDialog';

const MAILCOW_MAILBOX_FILTER_KEY = 'username';

const MailcowAdminPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    mailcowDomains,
    mailcowMailboxes,
    isMailcowLoading,
    getMailcowDomains,
    getMailcowMailboxes,
    deleteMailcowMailboxes,
  } = useMailsStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [mailboxToEdit, setMailboxToEdit] = useState<MailcowMailboxDto | null>(null);
  const [mailboxToDelete, setMailboxToDelete] = useState<MailcowMailboxDto | null>(null);

  useEffect(() => {
    void getMailcowDomains();
    void getMailcowMailboxes();
  }, [getMailcowDomains, getMailcowMailboxes]);

  const columns = useMemo(
    () => getMailcowMailboxColumns({ onEdit: setMailboxToEdit, onDelete: setMailboxToDelete }),
    [],
  );

  const handleConfirmDelete = async () => {
    if (!mailboxToDelete) {
      return;
    }
    await deleteMailcowMailboxes([mailboxToDelete.username]);
    setMailboxToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{t('mailcowAdmin.domains')}</span>
          {mailcowDomains.length > 0 ? (
            mailcowDomains.map((domain) => (
              <span
                key={domain}
                className="rounded border px-2 py-1 text-sm"
              >
                {domain}
              </span>
            ))
          ) : (
            <span className="text-sm">{t('mailcowAdmin.noDomains')}</span>
          )}
        </div>
        <Button
          variant="btn-collaboration"
          size="lg"
          type="button"
          disabled={mailcowDomains.length === 0}
          onClick={() => setIsCreateOpen(true)}
        >
          {t('mailcowAdmin.newMailbox')}
        </Button>
      </div>
      <ScrollableTable
        columns={columns}
        data={mailcowMailboxes}
        filterKey={MAILCOW_MAILBOX_FILTER_KEY}
        filterPlaceHolderText="mailcowAdmin.searchPlaceholder"
        applicationName={APPS.MAIL}
        isLoading={isMailcowLoading}
        getRowId={(row) => row.username}
      />
      <CreateMailboxDialog
        isOpen={isCreateOpen}
        domains={mailcowDomains}
        onClose={() => setIsCreateOpen(false)}
      />
      {mailboxToEdit && (
        <EditMailboxDialog
          isOpen
          mailbox={mailboxToEdit}
          onClose={() => setMailboxToEdit(null)}
        />
      )}
      <DeleteConfirmationDialog
        isOpen={mailboxToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMailboxToDelete(null);
          }
        }}
        items={mailboxToDelete ? [{ id: mailboxToDelete.username, name: mailboxToDelete.username }] : []}
        onConfirmDelete={handleConfirmDelete}
        isLoading={isMailcowLoading}
        titleTranslationKey="mailcowAdmin.dialog.deleteTitle"
        messageTranslationKey="mailcowAdmin.dialog.deleteMessage"
      />
    </div>
  );
};

export default MailcowAdminPanel;
