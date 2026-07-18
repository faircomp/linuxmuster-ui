/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import APPS from '@libs/appconfig/constants/apps';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import { ACTIVE_DOCUMENT_EDITOR } from '@libs/filesharing/constants/activeDocumentEditor';
import DockerService from './docker.service';

const buildFileSharingConfig = (editor?: string) => ({
  extendedOptions: editor ? { [ExtendedOptionKeys.ACTIVE_DOCUMENT_EDITOR]: editor } : {},
});

describe('DockerService.resolveContainerName', () => {
  let service: DockerService;
  const mockAppConfigService = { getAppConfigByName: jest.fn() };
  const mockSseService = {};

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DockerService(mockSseService as never, mockAppConfigService as never);
  });

  it('resolves the collabora editor container for file sharing', async () => {
    mockAppConfigService.getAppConfigByName.mockResolvedValue(buildFileSharingConfig(ACTIVE_DOCUMENT_EDITOR.COLLABORA));

    await expect(service.resolveContainerName(APPS.FILE_SHARING)).resolves.toBe('edulution-collabora');
  });

  it('falls back to onlyoffice when no editor is configured', async () => {
    mockAppConfigService.getAppConfigByName.mockResolvedValue(buildFileSharingConfig());

    await expect(service.resolveContainerName(APPS.FILE_SHARING)).resolves.toBe('edulution-onlyoffice');
  });

  it('resolves the onlyoffice editor container when explicitly selected', async () => {
    mockAppConfigService.getAppConfigByName.mockResolvedValue(
      buildFileSharingConfig(ACTIVE_DOCUMENT_EDITOR.ONLY_OFFICE),
    );

    await expect(service.resolveContainerName(APPS.FILE_SHARING)).resolves.toBe('edulution-onlyoffice');
  });

  it('resolves a non-file-sharing app through the docker application list without reading its config', async () => {
    await expect(service.resolveContainerName('mail')).resolves.toBe('edulution-mail');
    expect(mockAppConfigService.getAppConfigByName).not.toHaveBeenCalled();
  });

  it('returns the application name unchanged for an unmapped app', async () => {
    await expect(service.resolveContainerName('unmapped-app')).resolves.toBe('unmapped-app');
  });
});
