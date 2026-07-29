/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import { DropdownSelect } from '@/components';
import buildRRuleString, {
  parseRRuleString,
  RECURRENCE_END,
  RECURRENCE_FREQUENCY,
  RECURRENCE_WEEKDAYS,
} from '@libs/calendar/utils/recurrenceRule';
import type { RecurrenceModel, TRecurrenceEnd, TRecurrenceFrequency } from '@libs/calendar/utils/recurrenceRule';

const REFERENCE_MONDAY_YEAR = 2024;
const INPUT_CLASS = 'rounded border border-ciGrey bg-transparent px-2 py-1 text-sm';

interface RecurrenceEditorProps {
  value: string;
  onChange: (rrule: string) => void;
}

const RecurrenceEditor: React.FC<RecurrenceEditorProps> = ({ value, onChange }) => {
  const { t, i18n } = useTranslation();
  const model = parseRRuleString(value);

  const update = (patch: Partial<RecurrenceModel>) => onChange(buildRRuleString({ ...model, ...patch }));

  const frequencyOptions = Object.values(RECURRENCE_FREQUENCY).map((frequency) => ({
    id: frequency,
    name: `calendar.recurrence.${frequency.toLowerCase()}`,
  }));
  const endOptions = Object.values(RECURRENCE_END).map((end) => ({
    id: end,
    name: `calendar.recurrence.${end.toLowerCase()}`,
  }));

  const weekdayLabel = (index: number) =>
    new Date(Date.UTC(REFERENCE_MONDAY_YEAR, 0, 1 + index)).toLocaleDateString(i18n.language, {
      weekday: 'short',
      timeZone: 'UTC',
    });

  const toggleWeekday = (day: string) => {
    const byday = model.byday.includes(day) ? model.byday.filter((entry) => entry !== day) : [...model.byday, day];
    update({ byday });
  };

  const isRecurring = model.frequency !== RECURRENCE_FREQUENCY.NONE;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold">{t('calendar.recurrence.repeats')}</p>
      <DropdownSelect
        options={frequencyOptions}
        selectedVal={model.frequency}
        handleChange={(frequency) => update({ frequency: frequency as TRecurrenceFrequency })}
      />

      {isRecurring ? (
        <label
          htmlFor="recurrence-interval"
          className="flex items-center gap-2 text-sm"
        >
          {t('calendar.recurrence.interval')}
          <input
            id="recurrence-interval"
            type="number"
            min={1}
            value={model.interval}
            onChange={(changeEvent) => update({ interval: Number(changeEvent.target.value) || 1 })}
            className={cn(INPUT_CLASS, 'w-16')}
          />
        </label>
      ) : null}

      {model.frequency === RECURRENCE_FREQUENCY.WEEKLY ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold">{t('calendar.recurrence.byday')}</p>
          <div className="flex flex-wrap gap-1">
            {RECURRENCE_WEEKDAYS.map((day, index) => (
              <button
                key={day}
                type="button"
                aria-pressed={model.byday.includes(day)}
                onClick={() => toggleWeekday(day)}
                className={cn(
                  'rounded border border-ciGrey px-2 py-1 text-xs',
                  model.byday.includes(day) && 'bg-ciDarkGrey',
                )}
              >
                {weekdayLabel(index)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isRecurring ? (
        <div className="flex items-center gap-2">
          <DropdownSelect
            options={endOptions}
            selectedVal={model.end}
            handleChange={(end) => update({ end: end as TRecurrenceEnd })}
          />
          {model.end === RECURRENCE_END.UNTIL ? (
            <input
              type="date"
              aria-label={t('calendar.recurrence.until')}
              value={model.until ?? ''}
              onChange={(changeEvent) => update({ until: changeEvent.target.value })}
              className={INPUT_CLASS}
            />
          ) : null}
          {model.end === RECURRENCE_END.COUNT ? (
            <input
              type="number"
              min={1}
              aria-label={t('calendar.recurrence.count')}
              value={model.count ?? 1}
              onChange={(changeEvent) => update({ count: Number(changeEvent.target.value) || 1 })}
              className={cn(INPUT_CLASS, 'w-16')}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default RecurrenceEditor;
