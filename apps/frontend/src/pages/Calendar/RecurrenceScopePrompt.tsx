/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import RecurrenceEditScope from '@libs/calendar/constants/recurrenceEditScope';
import type { TRecurrenceEditScope } from '@libs/calendar/types';
import AdaptiveDialog from '@/components/ui/AdaptiveDialog';

const SCOPE_LABEL: Record<TRecurrenceEditScope, string> = {
  [RecurrenceEditScope.THIS]: 'calendar.scope.this',
  [RecurrenceEditScope.THIS_AND_FOLLOWING]: 'calendar.scope.thisAndFollowing',
  [RecurrenceEditScope.ALL]: 'calendar.scope.all',
};

interface RecurrenceScopePromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (scope: TRecurrenceEditScope) => void;
}

const RecurrenceScopePrompt: React.FC<RecurrenceScopePromptProps> = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslation();

  return (
    <AdaptiveDialog
      isOpen={isOpen}
      handleOpenChange={onClose}
      title={t('calendar.scope.title')}
      body={
        <div className="flex flex-col gap-2">
          {Object.values(RecurrenceEditScope).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => onSelect(scope)}
              className={cn('rounded border border-ciGrey px-3 py-2 text-left text-sm hover:bg-ciDarkGrey')}
            >
              {t(SCOPE_LABEL[scope])}
            </button>
          ))}
        </div>
      }
    />
  );
};

export default RecurrenceScopePrompt;
