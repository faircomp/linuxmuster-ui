/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import FilesharingController from './filesharing.controller';
import FilesharingService from './filesharing.service';
import ThumbnailService from './thumbnail.service';
import WebdavService from '../webdav/webdav.service';
import controllerContractReflection from '../common/controllerContractReflection';

const serviceMock = {};

const PUBLIC_ROUTES = ['getPublicShareInfo', 'downloadSharedContent'];
const NON_PUBLIC_ROUTES = [
  'getFilesAtPath',
  'createFileOrFolder',
  'uploadFileViaWebDav',
  'deleteFile',
  'moveOrRenameResource',
  'webDavFileStream',
  'getThumbnail',
  'getDownloadLink',
  'getOnlyofficeToken',
  'duplicateFile',
  'copyFile',
  'collectFiles',
  'createPublicShare',
  'listPublicShares',
  'handleCallback',
  'deletePublicShares',
  'editPublicShare',
];

describe(FilesharingController.name, () => {
  let controller: FilesharingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesharingController],
      providers: [
        { provide: FilesharingService, useValue: serviceMock },
        { provide: WebdavService, useValue: serviceMock },
        { provide: ThumbnailService, useValue: serviceMock },
      ],
    }).compile();

    controller = module.get<FilesharingController>(FilesharingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth bypass contract', () => {
    it('exposes exactly the two public-share download routes via @Public', () => {
      PUBLIC_ROUTES.forEach((route) => {
        expect(controllerContractReflection.isRoutePublic(FilesharingController, route)).toBe(true);
      });
    });

    it('keeps every other route protected (no accidental @Public opt-out)', () => {
      NON_PUBLIC_ROUTES.forEach((route) => {
        expect(controllerContractReflection.isRoutePublic(FilesharingController, route)).toBe(false);
      });
    });
  });
});
