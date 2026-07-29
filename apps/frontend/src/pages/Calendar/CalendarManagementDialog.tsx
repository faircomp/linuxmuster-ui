/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import type { CalendarShare } from '@libs/calendar/types';
import AdaptiveDialog from '@/components/ui/AdaptiveDialog';
import DialogFooterButtons from '@/components/ui/DialogFooterButtons';
import { Form } from '@/components/ui/Form';
import FormField from '@/components/shared/FormField';
import Switch from '@/components/ui/Switch';
import useCalendarStore from '@/pages/Calendar/useCalendarStore';
import buildCalendarCreateBody from '@/pages/Calendar/buildCalendarCreateBody';
import ShareEditor from '@/pages/Calendar/ShareEditor';

interface CalendarFormFields {
  displayName: string;
  description: string;
  color: string;
}

const DEFAULT_VALUES: CalendarFormFields = { displayName: '', description: '', color: '' };

const getCalendarFormSchema = (t: (key: string) => string) =>
  z.object({
    displayName: z.string().min(1, { message: t('common.required') }),
    description: z.string().optional(),
    color: z.string().optional(),
  });

interface CalendarManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const CalendarManagementDialog: React.FC<CalendarManagementDialogProps> = ({ isOpen, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { createCalendar } = useCalendarStore();
  const [isTimetable, setIsTimetable] = useState(false);
  const [shares, setShares] = useState<CalendarShare[]>([]);

  const form = useForm<CalendarFormFields>({
    mode: 'onChange',
    resolver: zodResolver(getCalendarFormSchema(t)),
    defaultValues: DEFAULT_VALUES,
  });
  const { reset } = form;

  useEffect(() => {
    reset(DEFAULT_VALUES);
    setIsTimetable(false);
    setShares([]);
  }, [isOpen, reset]);

  const onSubmit = async (values: CalendarFormFields) => {
    const created = await createCalendar(buildCalendarCreateBody({ ...values, isTimetable, shares }));
    if (created) {
      if (onSaved) {
        onSaved();
      }
      onClose();
    }
  };

  const body = (
    <Form {...form}>
      <form
        onSubmit={(submitEvent) => {
          submitEvent.stopPropagation();
          void form.handleSubmit(onSubmit)(submitEvent);
        }}
        className="flex flex-col gap-4"
      >
        <FormField
          name="displayName"
          form={form}
          labelTranslationId="calendar.fields.name"
          variant="dialog"
        />
        <FormField
          name="description"
          form={form}
          labelTranslationId="calendar.fields.description"
          variant="dialog"
        />
        <FormField
          name="color"
          form={form}
          type="color"
          labelTranslationId="calendar.fields.color"
          variant="dialog"
        />
        <div className="flex items-center gap-2">
          <Switch
            id="calendar-timetable"
            checked={isTimetable}
            onCheckedChange={setIsTimetable}
          />
          <label
            htmlFor="calendar-timetable"
            className="text-sm font-bold"
          >
            {t('calendar.timetableTag')}
          </label>
        </div>
        <ShareEditor
          value={shares}
          onChange={setShares}
        />
        <DialogFooterButtons
          handleClose={onClose}
          handleSubmit={() => {}}
          cancelButtonText="common.cancel"
          submitButtonText="common.save"
          submitButtonType="submit"
        />
      </form>
    </Form>
  );

  return (
    <AdaptiveDialog
      isOpen={isOpen}
      handleOpenChange={onClose}
      title={t('calendar.newCalendar')}
      body={body}
    />
  );
};

export default CalendarManagementDialog;
