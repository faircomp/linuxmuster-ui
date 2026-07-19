/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Calendar, CalendarEvent, TRecurrenceEditScope } from '@libs/calendar/types';
import AdaptiveDialog from '@/components/ui/AdaptiveDialog';
import DialogFooterButtons from '@/components/ui/DialogFooterButtons';
import { Form, FormControl, FormFieldSH, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import FormField from '@/components/shared/FormField';
import Switch from '@/components/ui/Switch';
import { DropdownSelect } from '@/components';
import { cn } from '@edulution-io/ui-kit';
import useCalendarStore from '@/pages/Calendar/useCalendarStore';
import buildEventFromForm, { buildFormValuesFromEvent } from '@/pages/Calendar/buildEventFromForm';
import type { EventFormValues } from '@/pages/Calendar/buildEventFromForm';
import getEventFormSchema from '@/pages/Calendar/getEventFormSchema';
import RecurrenceEditor from '@/pages/Calendar/RecurrenceEditor';
import RecurrenceScopePrompt from '@/pages/Calendar/RecurrenceScopePrompt';

const PENDING_ACTION = {
  NONE: 'NONE',
  SAVE: 'SAVE',
  DELETE: 'DELETE',
} as const;

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: Calendar[];
  event?: CalendarEvent;
  defaultStart?: string;
  occurrenceStart?: string;
  onSaved?: () => void;
}

const EventDialog: React.FC<EventDialogProps> = ({
  isOpen,
  onClose,
  calendars,
  event,
  defaultStart,
  occurrenceStart,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { createEvent, updateEvent, deleteEvent } = useCalendarStore();
  const [pendingAction, setPendingAction] = useState<string>(PENDING_ACTION.NONE);
  const [pendingBody, setPendingBody] = useState<CalendarEvent | null>(null);

  const form = useForm<EventFormValues>({
    mode: 'onChange',
    resolver: zodResolver(getEventFormSchema(t)),
    defaultValues: buildFormValuesFromEvent(event, defaultStart),
  });
  const { reset, control, watch, setValue } = form;

  useEffect(() => {
    reset(buildFormValuesFromEvent(event, defaultStart));
    setPendingAction(PENDING_ACTION.NONE);
    setPendingBody(null);
  }, [event, defaultStart, isOpen, reset]);

  const isRecurringEdit = Boolean(event?.rrule);
  const scopeOccurrenceStart = occurrenceStart ?? event?.start ?? '';

  const finish = () => {
    if (onSaved) {
      onSaved();
    }
    onClose();
  };

  const persist = async (body: CalendarEvent, scope?: TRecurrenceEditScope) => {
    if (event) {
      await updateEvent(event.uid, body, scope ? { scope, occurrenceStart: scopeOccurrenceStart } : undefined);
    } else {
      await createEvent(body);
    }
    finish();
  };

  const handleSave = async (values: EventFormValues) => {
    const body = buildEventFromForm(values, event);
    if (isRecurringEdit) {
      setPendingBody(body);
      setPendingAction(PENDING_ACTION.SAVE);
      return;
    }
    await persist(body);
  };

  const handleDelete = async () => {
    if (!event) {
      return;
    }
    if (isRecurringEdit) {
      setPendingAction(PENDING_ACTION.DELETE);
      return;
    }
    await deleteEvent(event.uid, event.calendarId);
    finish();
  };

  const handleScopeSelect = async (scope: TRecurrenceEditScope) => {
    if (!event) {
      return;
    }
    if (pendingAction === PENDING_ACTION.SAVE && pendingBody) {
      await persist(pendingBody, scope);
    } else if (pendingAction === PENDING_ACTION.DELETE) {
      await deleteEvent(event.uid, event.calendarId, scope, scopeOccurrenceStart);
      finish();
    }
    setPendingAction(PENDING_ACTION.NONE);
  };

  const calendarOptions = calendars.map((calendar) => ({ id: calendar.id, name: calendar.displayName }));
  const rrule = watch('rrule');

  const body = (
    <Form {...form}>
      <form
        onSubmit={(submitEvent) => {
          submitEvent.stopPropagation();
          void form.handleSubmit(handleSave)(submitEvent);
        }}
        className="flex flex-col gap-4"
      >
        <FormField
          name="summary"
          form={form}
          labelTranslationId="calendar.fields.summary"
          variant="dialog"
        />
        <FormFieldSH
          control={control}
          name="calendarId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <p className="font-bold">{t('calendar.fields.calendar')}</p>
              </FormLabel>
              <FormControl>
                <DropdownSelect
                  options={calendarOptions}
                  selectedVal={field.value}
                  handleChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <FormField
            name="start"
            form={form}
            type="datetime-local"
            labelTranslationId="calendar.fields.start"
            variant="dialog"
            className="flex-1"
          />
          <FormField
            name="end"
            form={form}
            type="datetime-local"
            labelTranslationId="calendar.fields.end"
            variant="dialog"
            className="flex-1"
          />
        </div>
        <FormFieldSH
          control={control}
          name="allDay"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>
                <p className="font-bold">{t('calendar.fields.allDay')}</p>
              </FormLabel>
            </FormItem>
          )}
        />
        <RecurrenceEditor
          value={rrule ?? ''}
          onChange={(nextRrule) => setValue('rrule', nextRrule)}
        />
        <FormField
          name="location"
          form={form}
          labelTranslationId="calendar.fields.location"
          variant="dialog"
        />
        <FormField
          name="color"
          form={form}
          type="color"
          labelTranslationId="calendar.fields.color"
          variant="dialog"
        />
        <FormField
          name="description"
          form={form}
          labelTranslationId="calendar.fields.description"
          variant="dialog"
        />
        <FormField
          name="attendees"
          form={form}
          labelTranslationId="calendar.fields.attendees"
          variant="dialog"
          placeholder="a@example.com, b@example.com"
        />
        {event ? (
          <button
            type="button"
            onClick={handleDelete}
            className={cn('self-start rounded px-3 py-1 text-sm text-ciRed hover:bg-ciDarkGrey')}
          >
            {t('common.delete')}
          </button>
        ) : null}
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
    <>
      <AdaptiveDialog
        isOpen={isOpen && pendingAction === PENDING_ACTION.NONE}
        handleOpenChange={onClose}
        title={t(event ? 'calendar.editEvent' : 'calendar.newEvent')}
        body={body}
      />
      <RecurrenceScopePrompt
        isOpen={pendingAction !== PENDING_ACTION.NONE}
        onClose={() => setPendingAction(PENDING_ACTION.NONE)}
        onSelect={handleScopeSelect}
      />
    </>
  );
};

export default EventDialog;
