/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { join } from 'path';
import { HttpStatus } from '@nestjs/common';
import { ensureDirSync, existsSync, moveSync, readFileSync, writeFileSync } from 'fs-extra';
import APPS from '@libs/appconfig/constants/apps';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import { ACTIVE_DOCUMENT_EDITOR } from '@libs/filesharing/constants/activeDocumentEditor';
import APPS_FILES_PATH from '@libs/common/constants/appsFilesPath';
import DockerService from './docker.service';
import ensureKeycloakClient from './utils/ensureKeycloakClient';
import CustomHttpException from '../common/CustomHttpException';

jest.mock('fs-extra');
jest.mock('./utils/ensureKeycloakClient');

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockMoveSync = moveSync as jest.MockedFunction<typeof moveSync>;
const mockEnsureDirSync = ensureDirSync as jest.MockedFunction<typeof ensureDirSync>;
const mockReadFileSync = readFileSync as unknown as jest.MockedFunction<(path: string, encoding: string) => string>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockEnsureKeycloakClient = ensureKeycloakClient as jest.MockedFunction<typeof ensureKeycloakClient>;

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

describe('DockerService.readSavedEnvValues', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns only the requested keys from a persisted compose file', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      [
        'services:',
        '  moodle:',
        '    environment:',
        '      - MOODLE_DB_PASSWORD=super-secret',
        '      - MOODLE_DB_ROOT_PASSWORD=root-secret',
      ].join('\n'),
    );

    const result = DockerService.readSavedEnvValues('learningmanagement', 'edulution-moodle', [
      'MOODLE_DB_PASSWORD',
      'MISSING_KEY',
    ]);

    expect(result).toEqual({ MOODLE_DB_PASSWORD: 'super-secret' });
  });

  it('reads object-form environment blocks', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(['services:', '  app:', '    environment:', '      FOO: bar'].join('\n'));

    expect(DockerService.readSavedEnvValues('mail', 'edulution-mail', ['FOO'])).toEqual({ FOO: 'bar' });
  });

  it('returns an empty object when the compose file does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    expect(DockerService.readSavedEnvValues('mail', 'edulution-mail', ['FOO'])).toEqual({});
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });
});

describe('DockerService.saveDockerCompose', () => {
  type SaveDockerCompose = (
    applicationName: string,
    containerName: string,
    containers: unknown[],
    originalComposeConfig: string,
  ) => void;
  const { saveDockerCompose } = DockerService as unknown as { saveDockerCompose: SaveDockerCompose };

  beforeEach(() => jest.clearAllMocks());

  it('writes the resolved compose file into the container subdirectory', () => {
    const composeYaml = ['services:', '  mail:', '    image: edulution-mail'].join('\n');

    saveDockerCompose('mail', 'edulution-mail', [{ Env: ['FOO=bar'] }], composeYaml);

    const expectedDir = join(APPS_FILES_PATH, 'mail', 'edulution-mail');
    expect(mockEnsureDirSync).toHaveBeenCalledWith(expectedDir);
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      join(expectedDir, 'docker-compose.yml'),
      expect.any(String),
      'utf-8',
    );
  });
});

describe('DockerService.replaceEnvVariables', () => {
  const mockAppConfigService = { getAppConfigByName: jest.fn() };
  const mockSseService = {};
  const buildService = () => new DockerService(mockSseService as never, mockAppConfigService as never);
  const envRef = (expression: string) => `\${${expression}}`;

  beforeEach(() => jest.clearAllMocks());

  it('resolves the :- default syntax when the variable is unset', async () => {
    const result = await buildService().replaceEnvVariables(
      [{ Env: [`A=${envRef('MISSING_A:-fallback')}`] }],
      'someapp',
      'somecontainer',
    );

    expect(result[0].Env).toEqual(['A=fallback']);
  });

  it('recurses into non-Env fields and leaves fully unresolved variables untouched', async () => {
    const result = await buildService().replaceEnvVariables(
      [{ name: envRef('NAME_VAR:-resolved-name'), Env: [`C=${envRef('TRULY_UNSET_XYZ')}`] }],
      'someapp',
      'somecontainer',
    );

    expect(result[0].name).toBe('resolved-name');
    expect(result[0].Env).toEqual([`C=${envRef('TRULY_UNSET_XYZ')}`]);
  });

  it('provisions moodle: reuses persisted secrets and calls ensureKeycloakClient', async () => {
    const persisted = {
      MOODLE_DB_PASSWORD: 'persisted-db-pw',
      MOODLE_DB_ROOT_PASSWORD: 'persisted-root-pw',
      KEYCLOAK_MOODLE_CLIENT_SECRET: 'persisted-kc-secret',
    };
    const readSpy = jest.spyOn(DockerService, 'readSavedEnvValues').mockReturnValue(persisted);
    mockEnsureKeycloakClient.mockResolvedValue('kc-secret-from-keycloak');

    const result = await buildService().replaceEnvVariables(
      [
        {
          Env: [
            `DB=${envRef('MOODLE_DB_PASSWORD')}`,
            `CLIENT_ID=${envRef('KEYCLOAK_MOODLE_CLIENT_ID')}`,
            `CLIENT_SECRET=${envRef('KEYCLOAK_MOODLE_CLIENT_SECRET')}`,
          ],
        },
      ],
      APPS.LEARNING_MANAGEMENT,
      'edulution-moodle',
    );

    expect(mockEnsureKeycloakClient).toHaveBeenCalledWith('edulution-moodle', 'persisted-kc-secret');
    expect(result[0].Env).toEqual([
      'DB=persisted-db-pw',
      'CLIENT_ID=edulution-moodle',
      'CLIENT_SECRET=kc-secret-from-keycloak',
    ]);

    readSpy.mockRestore();
  });

  it('injects the wireguard api key from the app config', async () => {
    mockAppConfigService.getAppConfigByName.mockResolvedValue({ options: { apiKey: 'wg-secret-key' } });

    const result = await buildService().replaceEnvVariables(
      [{ Env: [`WG=${envRef('EDU_WG_API_KEY')}`] }],
      APPS.WIREGUARD,
      'edulution-wireguard',
    );

    expect(mockAppConfigService.getAppConfigByName).toHaveBeenCalledWith(APPS.WIREGUARD);
    expect(result[0].Env).toEqual(['WG=wg-secret-key']);
  });
});

describe('DockerService.checkProtectedContainer', () => {
  it('throws a forbidden error for a protected container', () => {
    try {
      DockerService.checkProtectedContainer('edulution-api');
      throw new Error('expected checkProtectedContainer to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CustomHttpException);
      expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });

  it('does not throw for an unprotected container', () => {
    expect(() => DockerService.checkProtectedContainer('my-user-app')).not.toThrow();
  });
});
