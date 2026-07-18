/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { join } from 'path';
import { ensureDirSync, existsSync, moveSync } from 'fs-extra';
import APPS from '@libs/appconfig/constants/apps';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import { ACTIVE_DOCUMENT_EDITOR } from '@libs/filesharing/constants/activeDocumentEditor';
import APPS_FILES_PATH from '@libs/common/constants/appsFilesPath';
import DockerService from './docker.service';

jest.mock('fs-extra');

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockMoveSync = moveSync as jest.MockedFunction<typeof moveSync>;
const mockEnsureDirSync = ensureDirSync as jest.MockedFunction<typeof ensureDirSync>;

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

describe('DockerService.migrateDockerComposeFiles', () => {
  let service: DockerService;
  const mockAppConfigService = { getAppConfigByName: jest.fn() };
  const mockSseService = {};

  const oldMailPath = join(APPS_FILES_PATH, 'mail', 'docker-compose.yml');
  const newMailDir = join(APPS_FILES_PATH, 'mail', 'edulution-mail');
  const newMailPath = join(newMailDir, 'docker-compose.yml');

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DockerService(mockSseService as never, mockAppConfigService as never);
  });

  it('moves a legacy compose file into its container subdirectory when the target is missing', async () => {
    mockExistsSync.mockImplementation((filePath) => filePath === oldMailPath);

    await service.migrateDockerComposeFiles();

    expect(mockEnsureDirSync).toHaveBeenCalledWith(newMailDir);
    expect(mockMoveSync).toHaveBeenCalledTimes(1);
    expect(mockMoveSync).toHaveBeenCalledWith(oldMailPath, newMailPath);
  });

  it('does not move when the target compose file already exists', async () => {
    mockExistsSync.mockImplementation((filePath) => filePath === oldMailPath || filePath === newMailPath);

    await service.migrateDockerComposeFiles();

    expect(mockMoveSync).not.toHaveBeenCalled();
  });

  it('does nothing when there are no legacy compose files', async () => {
    mockExistsSync.mockReturnValue(false);

    await service.migrateDockerComposeFiles();

    expect(mockEnsureDirSync).not.toHaveBeenCalled();
    expect(mockMoveSync).not.toHaveBeenCalled();
  });
});
