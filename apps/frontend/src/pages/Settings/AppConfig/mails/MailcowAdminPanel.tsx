/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import APPS from '@libs/appconfig/constants/apps';
import useMailsStore from '@/pages/Mail/useMailsStore';
import ScrollableTable from '@/components/ui/Table/ScrollableTable';
import getMailcowMailboxColumns from './getMailcowMailboxColumns';

const MAILCOW_MAILBOX_FILTER_KEY = 'username';

const MailcowAdminPanel: React.FC = () => {
  const { t } = useTranslation();
  const { mailcowDomains, mailcowMailboxes, isMailcowLoading, getMailcowDomains, getMailcowMailboxes } = useMailsStore();

  useEffect(() => {
    void getMailcowDomains();
    void getMailcowMailboxes();
  }, [getMailcowDomains, getMailcowMailboxes]);

  const columns = useMemo(() => getMailcowMailboxColumns(), []);

  return (
    <div className="space-y-4">
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
      <ScrollableTable
        columns={columns}
        data={mailcowMailboxes}
        filterKey={MAILCOW_MAILBOX_FILTER_KEY}
        filterPlaceHolderText="mailcowAdmin.searchPlaceholder"
        applicationName={APPS.MAIL}
        isLoading={isMailcowLoading}
        getRowId={(row) => row.username}
      />
    </div>
  );
};

export default MailcowAdminPanel;
