/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect } from 'vitest';
import APPS from '@libs/appconfig/constants/apps';
import { ACTIVE_DOCUMENT_EDITOR } from '@libs/filesharing/constants/activeDocumentEditor';
import resolveDockerContainerName from './resolveDockerContainerName';

describe('resolveDockerContainerName', () => {
  it('resolves the collabora container for file sharing when collabora is the active editor', () => {
    expect(resolveDockerContainerName(APPS.FILE_SHARING, ACTIVE_DOCUMENT_EDITOR.COLLABORA)).toBe('edulution-collabora');
  });

  it('resolves the onlyoffice container for file sharing when onlyoffice is the active editor', () => {
    expect(resolveDockerContainerName(APPS.FILE_SHARING, ACTIVE_DOCUMENT_EDITOR.ONLY_OFFICE)).toBe(
      'edulution-onlyoffice',
    );
  });

  it('falls back to onlyoffice for file sharing when no editor is provided', () => {
    expect(resolveDockerContainerName(APPS.FILE_SHARING)).toBe('edulution-onlyoffice');
  });

  it('resolves a mapped application through the docker application list', () => {
    expect(resolveDockerContainerName('mail')).toBe('edulution-mail');
  });

  it('returns the application name unchanged for an unmapped application', () => {
    expect(resolveDockerContainerName('unmapped-app')).toBe('unmapped-app');
  });
});
