/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import ONLY_OFFICE_CALLBACK_STATUS from '@libs/filesharing/constants/onlyOfficeCallbackStatus';
import type OnlyOfficeCallbackData from '@libs/filesharing/types/onlyOfficeCallBackData';
import type OnlyOfficeCallbackTokenPayload from '@libs/filesharing/types/onlyOfficeCallbackTokenPayload';
import type { IConfig } from '@onlyoffice/document-editor-react';
import sanitizeOnlyOfficeConfig from '@libs/filesharing/utils/sanitizeOnlyOfficeConfig';
import FilesystemService from '../filesystem/filesystem.service';
import OnlyofficeService from './onlyoffice.service';

const DOCUMENT_SERVER_URL = 'https://office.example.org';
const DOWNLOAD_URL = `${DOCUMENT_SERVER_URL}/cache/files/edited.docx`;
const JWT_SECRET = 'document-server-secret';
const TOKEN = 'signed-callback-token';
const DOCUMENT_KEY = 'doc-key';
const FOREIGN_DOCUMENT_URL = `${DOCUMENT_SERVER_URL}/cache/files/someone-elses-document.docx`;

const buildCallbackBody = (overrides: Partial<OnlyOfficeCallbackData> = {}): OnlyOfficeCallbackData =>
  ({
    key: DOCUMENT_KEY,
    status: ONLY_OFFICE_CALLBACK_STATUS.READY_FOR_SAVING,
    token: TOKEN,
    url: DOWNLOAD_URL,
    ...overrides,
  }) as OnlyOfficeCallbackData;

const buildResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Response, status, json };
};

describe('OnlyOffice callback verification', () => {
  const verify = jest.fn();
  const getAppConfigByName = jest.fn();
  const uploadFile = jest.fn().mockResolvedValue({ success: true, status: HttpStatus.OK });

  const buildService = () => new OnlyofficeService({ getAppConfigByName } as never, { verify } as never);

  const callHandler = (body: OnlyOfficeCallbackData) => {
    const { res, status, json } = buildResponse();
    const req = { body } as Request;
    return {
      promise: buildService().handleCallback(req, res, '/Documents', 'report.docx', 'alice', uploadFile),
      status,
      json,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getAppConfigByName.mockResolvedValue({
      extendedOptions: {
        [ExtendedOptionKeys.ONLY_OFFICE_JWT_SECRET]: JWT_SECRET,
        [ExtendedOptionKeys.ONLY_OFFICE_URL]: DOCUMENT_SERVER_URL,
      },
    });
    verify.mockReturnValue({
      status: ONLY_OFFICE_CALLBACK_STATUS.READY_FOR_SAVING,
      url: DOWNLOAD_URL,
      key: DOCUMENT_KEY,
    });
    jest
      .spyOn(FilesystemService, 'retrieveAndSaveFile')
      .mockResolvedValue({ buffer: Buffer.from('x'), originalname: 'report.docx' } as never);
    jest.spyOn(FilesystemService, 'deleteFile').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves the document when the callback carries a valid signature', async () => {
    const { promise, status } = callHandler(buildCallbackBody());
    await promise;

    expect(verify).toHaveBeenCalledWith(TOKEN, { secret: JWT_SECRET });
    expect(FilesystemService.retrieveAndSaveFile).toHaveBeenCalledWith(
      expect.stringContaining('report.docx'),
      DOWNLOAD_URL,
    );
    expect(uploadFile).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('refuses an unsigned callback', async () => {
    const { promise, status } = callHandler(buildCallbackBody({ token: undefined }));
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(FilesystemService.retrieveAndSaveFile).not.toHaveBeenCalled();
  });

  it('refuses a callback whose signature does not verify', async () => {
    verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const { promise, status } = callHandler(buildCallbackBody());
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(FilesystemService.retrieveAndSaveFile).not.toHaveBeenCalled();
  });

  it('refuses a body whose download url differs from the signed one', async () => {
    const { promise, status } = callHandler(
      buildCallbackBody({ url: `${DOCUMENT_SERVER_URL}/cache/files/other.docx` }),
    );
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(FilesystemService.retrieveAndSaveFile).not.toHaveBeenCalled();
  });

  it('refuses a body whose document key differs from the signed one', async () => {
    const { promise, status } = callHandler(buildCallbackBody({ key: 'someone-elses-document' }));
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(FilesystemService.retrieveAndSaveFile).not.toHaveBeenCalled();
  });

  it('refuses a body whose status differs from the signed one', async () => {
    const { promise, status } = callHandler(buildCallbackBody({ status: ONLY_OFFICE_CALLBACK_STATUS.FORCE_SAVING }));
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(FilesystemService.retrieveAndSaveFile).not.toHaveBeenCalled();
  });

  it('does not accept an editor config token as a callback token', async () => {
    const forgedEditorConfig = sanitizeOnlyOfficeConfig(
      {
        document: { key: DOCUMENT_KEY, title: 'report.docx', url: FOREIGN_DOCUMENT_URL },
        editorConfig: { mode: 'view' },
        status: ONLY_OFFICE_CALLBACK_STATUS.READY_FOR_SAVING,
        url: FOREIGN_DOCUMENT_URL,
        key: DOCUMENT_KEY,
      } as unknown as IConfig,
      { canWrite: false, username: 'mallory' },
    );
    verify.mockReturnValue(forgedEditorConfig as unknown as OnlyOfficeCallbackTokenPayload);

    const { promise, status } = callHandler(buildCallbackBody({ url: FOREIGN_DOCUMENT_URL }));
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(FilesystemService.retrieveAndSaveFile).not.toHaveBeenCalled();
  });

  it('answers a close-without-changes callback without saving, as 2.0.200 does', async () => {
    verify.mockReturnValue({ status: ONLY_OFFICE_CALLBACK_STATUS.CLOSED_WITHOUT_CHANGES, key: DOCUMENT_KEY });

    const { promise, status } = callHandler(
      buildCallbackBody({ status: ONLY_OFFICE_CALLBACK_STATUS.CLOSED_WITHOUT_CHANGES, url: undefined as never }),
    );
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(FilesystemService.retrieveAndSaveFile).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('never fetches a download url outside the configured document server', async () => {
    const attackerUrl = 'http://169.254.169.254/latest/meta-data/';
    verify.mockReturnValue({
      status: ONLY_OFFICE_CALLBACK_STATUS.READY_FOR_SAVING,
      url: attackerUrl,
      key: DOCUMENT_KEY,
    });

    const { promise, status } = callHandler(buildCallbackBody({ url: attackerUrl }));
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(FilesystemService.retrieveAndSaveFile).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('answers with a server error rather than saving when no document server secret is configured', async () => {
    getAppConfigByName.mockResolvedValue({ extendedOptions: {} });

    const { promise, status } = callHandler(buildCallbackBody());
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(FilesystemService.retrieveAndSaveFile).not.toHaveBeenCalled();
  });

  it('acknowledges a status that must not trigger a save without touching the file', async () => {
    verify.mockReturnValue({
      status: ONLY_OFFICE_CALLBACK_STATUS.SAVING_ERROR,
      url: DOWNLOAD_URL,
      key: DOCUMENT_KEY,
    });

    const { promise, status } = callHandler(buildCallbackBody({ status: ONLY_OFFICE_CALLBACK_STATUS.SAVING_ERROR }));
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(FilesystemService.retrieveAndSaveFile).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('accepts claims nested under a payload envelope', async () => {
    verify.mockReturnValue({
      payload: { status: ONLY_OFFICE_CALLBACK_STATUS.FORCE_SAVING, url: DOWNLOAD_URL, key: DOCUMENT_KEY },
    });

    const { promise, status } = callHandler(buildCallbackBody({ status: ONLY_OFFICE_CALLBACK_STATUS.FORCE_SAVING }));
    await promise;

    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(FilesystemService.retrieveAndSaveFile).toHaveBeenCalled();
  });

  describe('isAllowedOnlyOfficeDownloadUrl', () => {
    it.each([
      [DOWNLOAD_URL, DOCUMENT_SERVER_URL, true],
      [`${DOCUMENT_SERVER_URL}:8443/cache/f`, DOCUMENT_SERVER_URL, false],
      ['https://office.example.org.attacker.test/f', DOCUMENT_SERVER_URL, false],
      ['http://office.example.org/f', DOCUMENT_SERVER_URL, false],
      ['file:///etc/passwd', DOCUMENT_SERVER_URL, false],
      ['not-a-url', DOCUMENT_SERVER_URL, false],
      ['https://office.example.org@attacker.test/f', DOCUMENT_SERVER_URL, false],
      [DOWNLOAD_URL, '', false],
      [DOWNLOAD_URL, undefined, false],
    ])('%s against %s is %s', (downloadUrl, configured, expected) => {
      expect(OnlyofficeService.isAllowedOnlyOfficeDownloadUrl(downloadUrl, configured)).toBe(expected);
    });
  });
});
