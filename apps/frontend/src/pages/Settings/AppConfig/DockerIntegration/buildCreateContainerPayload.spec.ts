/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import APPS from '@libs/appconfig/constants/apps';
import { ACTIVE_DOCUMENT_EDITOR } from '@libs/filesharing/constants/activeDocumentEditor';
import buildCreateContainerPayload from './buildCreateContainerPayload';

describe('buildCreateContainerPayload', () => {
  it('builds a file sharing payload with the collabora container and its persisted compose config', () => {
    const dockerComposeFiles = {
      'edulution-collabora': 'services:\n  collabora: {}\n',
      'edulution-onlyoffice': 'services:\n  onlyoffice: {}\n',
    };

    const payload = buildCreateContainerPayload(
      APPS.FILE_SHARING,
      ACTIVE_DOCUMENT_EDITOR.COLLABORA,
      [],
      dockerComposeFiles,
    );

    expect(payload).toEqual({
      applicationName: APPS.FILE_SHARING,
      containerName: 'edulution-collabora',
      containers: [],
      originalComposeConfig: 'services:\n  collabora: {}\n',
    });
  });

  it('defaults file sharing to onlyoffice when no editor is active', () => {
    const payload = buildCreateContainerPayload(APPS.FILE_SHARING, undefined, [], {
      'edulution-onlyoffice': 'services:\n  onlyoffice: {}\n',
    });

    expect(payload.containerName).toBe('edulution-onlyoffice');
    expect(payload.originalComposeConfig).toBe('services:\n  onlyoffice: {}\n');
  });

  it('resolves a non-file-sharing app through the docker application list and empty compose when unknown', () => {
    const payload = buildCreateContainerPayload('mail', undefined, [], {});

    expect(payload.containerName).toBe('edulution-mail');
    expect(payload.originalComposeConfig).toBe('');
  });
});
