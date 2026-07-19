/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Calendar, CalendarEvent } from '@libs/calendar/types';
import AdaptiveDialog from '@/components/ui/AdaptiveDialog';
import DialogFooterButtons from '@/components/ui/DialogFooterButtons';
import { Form, FormControl, FormFieldSH, FormItem, FormLabel, FormMessage } from '@/components/ui/Form';
import FormField from '@/components/shared/FormField';
import Switch from '@/components/ui/Switch';
import { DropdownSelect } from '@/components';
import useCalendarStore from '@/pages/Calendar/useCalendarStore';
import buildEventFromForm, { buildFormValuesFromEvent } from '@/pages/Calendar/buildEventFromForm';
import type { EventFormValues } from '@/pages/Calendar/buildEventFromForm';
import getEventFormSchema from '@/pages/Calendar/getEventFormSchema';

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: Calendar[];
  event?: CalendarEvent;
  defaultStart?: string;
  onSaved?: () => void;
}

const EventDialog: React.FC<EventDialogProps> = ({ isOpen, onClose, calendars, event, defaultStart, onSaved }) => {
  const { t } = useTranslation();
  const { createEvent, updateEvent } = useCalendarStore();

  const form = useForm<EventFormValues>({
    mode: 'onChange',
    resolver: zodResolver(getEventFormSchema(t)),
    defaultValues: buildFormValuesFromEvent(event, defaultStart),
  });
  const { reset, control } = form;

  useEffect(() => {
    reset(buildFormValuesFromEvent(event, defaultStart));
  }, [event, defaultStart, isOpen, reset]);

  const onSubmit = async (values: EventFormValues) => {
    const body = buildEventFromForm(values, event);
    if (event) {
      await updateEvent(event.uid, body);
    } else {
      await createEvent(body);
    }
    if (onSaved) {
      onSaved();
    }
    onClose();
  };

  const calendarOptions = calendars.map((calendar) => ({ id: calendar.id, name: calendar.displayName }));

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
      title={t(event ? 'calendar.editEvent' : 'calendar.newEvent')}
      body={body}
    />
  );
};

export default EventDialog;
