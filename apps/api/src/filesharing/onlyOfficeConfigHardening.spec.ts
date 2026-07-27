/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import type { IConfig } from '@onlyoffice/document-editor-react';
import EDU_API_ROOT from '@libs/common/constants/eduApiRoot';
import DOWNLOADS_PATH_SEGMENT from '@libs/common/constants/downloadsPathSegment';
import sanitizeOnlyOfficeConfig from '@libs/filesharing/utils/sanitizeOnlyOfficeConfig';
import ONLY_OFFICE_CALLBACK_PATH from '@libs/filesharing/constants/onlyOfficeCallbackPath';
import FileSharingApiEndpoints from '@libs/filesharing/types/fileSharingApiEndpoints';
import FilesystemService from '../filesystem/filesystem.service';
import FilesharingService from './filesharing.service';

const FILE_PATH = 'Documents';
const FILE_NAME = 'report.docx';
const ORIGIN = 'https://edu.example.org';
const HASH = FilesystemService.generateHashedFilename(FILE_PATH, FILE_NAME);
const CALLBACK_URL = `${ORIGIN}/${EDU_API_ROOT}/${FileSharingApiEndpoints.BASE}/${ONLY_OFFICE_CALLBACK_PATH}`;

const buildConfig = (overrides: Partial<IConfig> = {}): IConfig =>
  ({
    document: {
      key: 'k',
      title: FILE_NAME,
      url: `${ORIGIN}/${EDU_API_ROOT}/${DOWNLOADS_PATH_SEGMENT}/${HASH}`,
    },
    editorConfig: {
      callbackUrl: CALLBACK_URL,
      mode: 'view',
    },
    ...overrides,
  }) as unknown as IConfig;

describe('OnlyOffice config hardening', () => {
  describe('assertDocumentUrlMatchesFile', () => {
    it('accepts a config whose document url is the requested file', () => {
      expect(() => FilesharingService.assertDocumentUrlMatchesFile(buildConfig(), FILE_PATH, FILE_NAME)).not.toThrow();
    });

    it('rejects a document url pointing at a different file', () => {
      const config = buildConfig({
        document: {
          key: 'k',
          title: FILE_NAME,
          url: `${ORIGIN}/${EDU_API_ROOT}/${DOWNLOADS_PATH_SEGMENT}/someoneelsesfile`,
        },
      } as unknown as Partial<IConfig>);

      expect(() => FilesharingService.assertDocumentUrlMatchesFile(config, FILE_PATH, FILE_NAME)).toThrow();
    });

    it('rejects a callback url on a foreign origin', () => {
      const config = buildConfig({
        editorConfig: {
          callbackUrl: `https://attacker.example/${EDU_API_ROOT}/${FileSharingApiEndpoints.BASE}/${ONLY_OFFICE_CALLBACK_PATH}`,
          mode: 'view',
        },
      } as unknown as Partial<IConfig>);

      expect(() => FilesharingService.assertDocumentUrlMatchesFile(config, FILE_PATH, FILE_NAME)).toThrow();
    });

    it('rejects a callback url on an unexpected path', () => {
      const config = buildConfig({
        editorConfig: {
          callbackUrl: `${ORIGIN}/${EDU_API_ROOT}/${FileSharingApiEndpoints.BASE}/anything-else`,
          mode: 'view',
        },
      } as unknown as Partial<IConfig>);

      expect(() => FilesharingService.assertDocumentUrlMatchesFile(config, FILE_PATH, FILE_NAME)).toThrow();
    });

    it('answers FORBIDDEN rather than a generic error', () => {
      const config = buildConfig({ document: { key: 'k', title: FILE_NAME, url: 'not-a-url' } } as never);

      expect(() => FilesharingService.assertDocumentUrlMatchesFile(config, FILE_PATH, FILE_NAME)).toThrow(
        expect.objectContaining({ status: HttpStatus.FORBIDDEN }) as unknown as Error,
      );
    });

    it('rejects a config without any document url', () => {
      const config = buildConfig({ document: { key: 'k', title: FILE_NAME } } as never);

      expect(() => FilesharingService.assertDocumentUrlMatchesFile(config, FILE_PATH, FILE_NAME)).toThrow(
        expect.objectContaining({ status: HttpStatus.FORBIDDEN }) as unknown as Error,
      );
    });
  });

  describe('sanitizeOnlyOfficeConfig', () => {
    it('denies every write permission when the caller may not write', () => {
      const sanitized = sanitizeOnlyOfficeConfig(buildConfig({ editorConfig: { mode: 'edit' } } as never), {
        canWrite: false,
        username: 'alice',
      });

      expect(sanitized.editorConfig.mode).toBe('view');
      expect(Object.values(sanitized.document.permissions).every((granted) => granted === false)).toBe(true);
    });

    it('ignores a client-claimed identity and uses the authenticated username', () => {
      const sanitized = sanitizeOnlyOfficeConfig(
        buildConfig({ editorConfig: { mode: 'edit', user: { id: 'root', name: 'root' } } } as never),
        { canWrite: true, username: 'alice' },
      );

      expect(sanitized.editorConfig.user).toEqual({ id: 'alice', name: 'alice' });
    });

    it('drops fields the client smuggled in, since the payload is rebuilt', () => {
      const sanitized = sanitizeOnlyOfficeConfig(
        { ...buildConfig(), edulution: { publicShareId: 'forged' } } as unknown as IConfig,
        { canWrite: true, username: 'alice' },
      );

      expect(JSON.stringify(sanitized)).not.toContain('forged');
    });

    it('grants write only when the caller may write and asked for edit', () => {
      const sanitized = sanitizeOnlyOfficeConfig(buildConfig({ editorConfig: { mode: 'edit' } } as never), {
        canWrite: true,
        username: 'alice',
      });

      expect(sanitized.document.permissions.edit).toBe(true);
      expect(sanitized.editorConfig.mode).toBe('edit');
    });

    it('overrides permissions the client sent itself', () => {
      const sanitized = sanitizeOnlyOfficeConfig(
        buildConfig({
          document: {
            key: 'k',
            title: FILE_NAME,
            url: `${ORIGIN}/${EDU_API_ROOT}/${DOWNLOADS_PATH_SEGMENT}/${HASH}`,
            permissions: { edit: true, comment: true, review: true, print: true },
          },
          editorConfig: { mode: 'edit' },
        } as never),
        { canWrite: false, username: 'alice' },
      );

      expect(Object.values(sanitized.document.permissions).every((granted) => granted === false)).toBe(true);
    });

    it('survives a missing or non-object config instead of throwing', () => {
      expect(() => sanitizeOnlyOfficeConfig(undefined, { canWrite: true, username: 'alice' })).not.toThrow();
      expect(() =>
        sanitizeOnlyOfficeConfig('nonsense' as unknown as IConfig, { canWrite: true, username: 'alice' }),
      ).not.toThrow();
    });
  });

  describe('getOnlyOfficeToken', () => {
    const generateOnlyOfficeToken = jest.fn<Promise<string>, [IConfig]>().mockResolvedValue('signed.jwt');
    const mockOnlyofficeService = { generateOnlyOfficeToken };

    const buildService = () =>
      new FilesharingService(
        null as never,
        mockOnlyofficeService as never,
        null as never,
        null as never,
        null as never,
        null as never,
        null as never,
        null as never,
      );

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('signs the sanitized config, never the payload the client sent', async () => {
      const clientConfig = buildConfig({
        document: {
          key: 'k',
          title: FILE_NAME,
          url: `${ORIGIN}/${EDU_API_ROOT}/${DOWNLOADS_PATH_SEGMENT}/${HASH}`,
          permissions: { edit: true },
        },
        editorConfig: {
          callbackUrl: CALLBACK_URL,
          mode: 'edit',
          user: { id: 'root', name: 'root' },
        },
      } as never);

      const result = await buildService().getOnlyOfficeToken(clientConfig, {
        canWrite: false,
        username: 'alice',
        filePath: FILE_PATH,
        fileName: FILE_NAME,
      });

      const [signedPayload] = generateOnlyOfficeToken.mock.calls[0];

      expect(signedPayload).not.toBe(clientConfig);
      expect(signedPayload.document.permissions.edit).toBe(false);
      expect(signedPayload.editorConfig.mode).toBe('view');
      expect(signedPayload.editorConfig.user).toEqual({ id: 'alice', name: 'alice' });
      expect(result.config).toBe(signedPayload);
      expect(result.token).toBe('signed.jwt');
    });

    it('refuses to sign anything when the document url does not match the requested file', async () => {
      const clientConfig = buildConfig({
        document: {
          key: 'k',
          title: FILE_NAME,
          url: `${ORIGIN}/${EDU_API_ROOT}/${DOWNLOADS_PATH_SEGMENT}/someoneelsesfile`,
        },
      } as never);

      await expect(
        buildService().getOnlyOfficeToken(clientConfig, {
          canWrite: true,
          username: 'alice',
          filePath: FILE_PATH,
          fileName: FILE_NAME,
        }),
      ).rejects.toThrow();

      expect(generateOnlyOfficeToken).not.toHaveBeenCalled();
    });
  });
});
