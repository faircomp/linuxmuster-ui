/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@edulution-io/ui-kit';
import { DropdownSelect } from '@/components';
import CalendarSharePermission from '@libs/calendar/constants/calendarSharePermission';
import CalendarShareSubjectType from '@libs/calendar/constants/calendarShareSubjectType';
import type { CalendarShare, TCalendarSharePermission, TCalendarShareSubjectType } from '@libs/calendar/types';

const INPUT_CLASS = 'flex-1 rounded border border-ciGrey bg-transparent px-2 py-1 text-sm';

interface ShareRow {
  id: number;
  share: CalendarShare;
}

interface ShareEditorProps {
  value: CalendarShare[];
  onChange: (shares: CalendarShare[]) => void;
}

const ShareEditor: React.FC<ShareEditorProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const nextId = useRef(0);
  const createRow = (share: CalendarShare): ShareRow => {
    nextId.current += 1;
    return { id: nextId.current, share };
  };
  const [rows, setRows] = useState<ShareRow[]>(() => value.map(createRow));

  const emit = (nextRows: ShareRow[]) => {
    setRows(nextRows);
    onChange(nextRows.map((row) => row.share));
  };

  const subjectTypeOptions = Object.values(CalendarShareSubjectType).map((subjectType) => ({
    id: subjectType,
    name: `calendar.share.subjectType.${subjectType.toLowerCase()}`,
  }));
  const permissionOptions = Object.values(CalendarSharePermission).map((permission) => ({
    id: permission,
    name: `calendar.share.permission.${permission.toLowerCase()}`,
  }));

  const updateShare = (id: number, patch: Partial<CalendarShare>) =>
    emit(rows.map((row) => (row.id === id ? { ...row, share: { ...row.share, ...patch } } : row)));

  const addShare = () =>
    emit([
      ...rows,
      createRow({
        subjectId: '',
        subjectType: CalendarShareSubjectType.USER,
        label: '',
        permission: CalendarSharePermission.VIEW,
      }),
    ]);

  const deleteShare = (id: number) => emit(rows.filter((row) => row.id !== id));

  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold">{t('calendar.share.title')}</p>
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-2"
        >
          <DropdownSelect
            options={subjectTypeOptions}
            selectedVal={row.share.subjectType}
            handleChange={(subjectType) =>
              updateShare(row.id, { subjectType: subjectType as TCalendarShareSubjectType })
            }
          />
          <input
            className={INPUT_CLASS}
            value={row.share.subjectId}
            aria-label={t('calendar.share.subject')}
            onChange={(changeEvent) =>
              updateShare(row.id, { subjectId: changeEvent.target.value, label: changeEvent.target.value })
            }
          />
          <DropdownSelect
            options={permissionOptions}
            selectedVal={row.share.permission}
            handleChange={(permission) => updateShare(row.id, { permission: permission as TCalendarSharePermission })}
          />
          <button
            type="button"
            aria-label={t('common.delete')}
            onClick={() => deleteShare(row.id)}
            className="p-2"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addShare}
        className={cn('flex items-center gap-1 self-start text-sm')}
      >
        <FontAwesomeIcon icon={faPlus} />
        {t('calendar.share.add')}
      </button>
    </div>
  );
};

export default ShareEditor;
