/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import ExtendedOptionField from '@libs/appconfig/constants/extendedOptionField';
import { AppConfigExtendedOption } from '@libs/appconfig/types/appConfigExtendedOption';
import { ACTIVE_DOCUMENT_EDITOR } from '@libs/filesharing/constants/activeDocumentEditor';

const COLLABORA_EXTENDED_OPTIONS: AppConfigExtendedOption[] = [
  {
    name: ExtendedOptionKeys.ACTIVE_DOCUMENT_EDITOR,
    title: 'appExtendedOptions.activeDocumentEditorTitle',
    description: 'appExtendedOptions.activeDocumentEditorDescription',
    type: ExtendedOptionField.dropdown,
    value: ACTIVE_DOCUMENT_EDITOR.ONLY_OFFICE,
    width: 'full',
    options: [
      { id: ACTIVE_DOCUMENT_EDITOR.ONLY_OFFICE, name: 'appExtendedOptions.activeDocumentEditor.onlyoffice' },
      { id: ACTIVE_DOCUMENT_EDITOR.COLLABORA, name: 'appExtendedOptions.activeDocumentEditor.collabora' },
    ],
  },
  {
    name: ExtendedOptionKeys.COLLABORA_URL,
    title: 'appExtendedOptions.collaboraUrlTitle',
    description: 'appExtendedOptions.collaboraUrlDescription',
    type: ExtendedOptionField.input,
    value: '',
    width: 'full',
  },
  {
    name: ExtendedOptionKeys.COLLABORA_WOPI_SECRET,
    title: 'appExtendedOptions.collaboraWopiSecretTitle',
    description: 'appExtendedOptions.collaboraWopiSecretDescription',
    type: ExtendedOptionField.password,
    value: '',
    width: 'full',
  },
];

export default COLLABORA_EXTENDED_OPTIONS;
