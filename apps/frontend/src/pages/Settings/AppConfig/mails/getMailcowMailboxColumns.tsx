/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import type MailcowMailboxDto from '@libs/mail/types/mailcowMailbox.dto';
import type TableAction from '@libs/common/types/tableAction';
import sortString from '@libs/common/utils/sortString';
import SortableHeader from '@/components/ui/Table/SortableHeader';
import TableActionCell from '@/components/ui/Table/TableActionCell';

interface MailcowMailboxColumnsProps {
  onEdit: (mailbox: MailcowMailboxDto) => void;
  onDelete: (mailbox: MailcowMailboxDto) => void;
}

const COLUMN_IDS = {
  USERNAME: 'username',
  NAME: 'name',
  DOMAIN: 'domain',
  QUOTA: 'quota',
  ACTIVE: 'active',
  ACTIONS: 'actions',
} as const;

const BYTES_PER_MEBIBYTE = 1024 * 1024;

const MAILBOX_ACTIVE_LABEL_KEYS: Record<number, string> = {
  0: 'inactive',
  1: 'active',
  2: 'incomingOnly',
};

const formatQuota = (quotaUsed: number, quota: number): string => {
  const usedInMebibyte = Math.round(quotaUsed / BYTES_PER_MEBIBYTE);
  const totalInMebibyte = Math.round(quota / BYTES_PER_MEBIBYTE);
  return `${usedInMebibyte} / ${totalInMebibyte} MB`;
};

const MailcowMailboxActiveCell: React.FC<{ active: number }> = ({ active }) => {
  const { t } = useTranslation();
  const labelKey = MAILBOX_ACTIVE_LABEL_KEYS[active] ?? MAILBOX_ACTIVE_LABEL_KEYS[0];
  return <span>{t(`mailcowAdmin.activeStates.${labelKey}`)}</span>;
};

const getMailcowMailboxColumns = ({ onEdit, onDelete }: MailcowMailboxColumnsProps): ColumnDef<MailcowMailboxDto>[] => [
  {
    id: COLUMN_IDS.USERNAME,
    meta: { translationId: 'mailcowAdmin.columns.username' },
    header: ({ column }) => <SortableHeader<MailcowMailboxDto, unknown> column={column} />,
    accessorFn: (row) => row.username,
    cell: ({ row }) => row.original.username,
    enableSorting: true,
    sortingFn: (rowA, rowB) => sortString(rowA.original.username, rowB.original.username),
  },
  {
    id: COLUMN_IDS.NAME,
    meta: { translationId: 'mailcowAdmin.columns.name' },
    header: ({ column }) => <SortableHeader<MailcowMailboxDto, unknown> column={column} />,
    accessorFn: (row) => row.name,
    cell: ({ row }) => row.original.name,
    enableSorting: true,
    sortingFn: (rowA, rowB) => sortString(rowA.original.name, rowB.original.name),
  },
  {
    id: COLUMN_IDS.DOMAIN,
    meta: { translationId: 'mailcowAdmin.columns.domain' },
    header: ({ column }) => <SortableHeader<MailcowMailboxDto, unknown> column={column} />,
    accessorFn: (row) => row.domain,
    cell: ({ row }) => row.original.domain,
    enableSorting: true,
    sortingFn: (rowA, rowB) => sortString(rowA.original.domain, rowB.original.domain),
  },
  {
    id: COLUMN_IDS.QUOTA,
    meta: { translationId: 'mailcowAdmin.columns.quota' },
    header: ({ column }) => <SortableHeader<MailcowMailboxDto, unknown> column={column} />,
    accessorFn: (row) => row.quota,
    size: 160,
    cell: ({ row }) => formatQuota(row.original.quota_used, row.original.quota),
    enableSorting: true,
    sortingFn: (rowA, rowB) => rowA.original.quota - rowB.original.quota,
  },
  {
    id: COLUMN_IDS.ACTIVE,
    meta: { translationId: 'mailcowAdmin.columns.active' },
    header: ({ column }) => <SortableHeader<MailcowMailboxDto, unknown> column={column} />,
    accessorFn: (row) => row.active,
    size: 120,
    cell: ({ row }) => <MailcowMailboxActiveCell active={row.original.active} />,
    enableSorting: true,
    sortingFn: (rowA, rowB) => rowA.original.active - rowB.original.active,
  },
  {
    id: COLUMN_IDS.ACTIONS,
    header: () => null,
    enableSorting: false,
    size: 80,
    cell: ({ row }) => {
      const actions: TableAction<MailcowMailboxDto>[] = [
        {
          icon: faPen,
          translationId: 'common.edit',
          onClick: () => onEdit(row.original),
        },
        {
          icon: faTrash,
          translationId: 'common.delete',
          onClick: () => onDelete(row.original),
        },
      ];
      return (
        <TableActionCell
          actions={actions}
          row={row}
        />
      );
    },
  },
];

export default getMailcowMailboxColumns;
