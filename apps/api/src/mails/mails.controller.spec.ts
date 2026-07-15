/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import MailsController from './mails.controller';
import MailsService from './mails.service';
import MailIdleService from './mail-idle.service';
import UsersService from '../users/users.service';
import AdminGuard from '../common/guards/admin.guard';
import controllerContractReflection from '../common/controllerContractReflection';

const mockUsersService = { getPassword: jest.fn() };
const mockMailsService = {
  getMails: jest.fn(),
  getExternalMailProviderConfig: jest.fn(),
  postExternalMailProviderConfig: jest.fn(),
  deleteExternalMailProviderConfig: jest.fn(),
  getSyncJobs: jest.fn(),
  createSyncJob: jest.fn(),
  deleteSyncJobs: jest.fn(),
  checkSogoThemeVersion: jest.fn(),
  updateSogoTheme: jest.fn(),
};
const mockMailIdleService = {
  fetchUnseenMails: jest.fn(),
  startIdle: jest.fn(),
  getConnectionStats: jest.fn(),
};

const ADMIN_GUARDED_ROUTES = [
  'postExternalMailProviderConfig',
  'deleteExternalMailProviderConfig',
  'checkSogoThemeVersion',
  'updateSogoThemeManually',
  'getConnectionStats',
];
const NON_ADMIN_ROUTES = ['getMails', 'getExternalMailProviderConfig', 'getSyncJob', 'postSyncJob', 'deleteSyncJobs'];

describe(MailsController.name, () => {
  let controller: MailsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailsController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailsService, useValue: mockMailsService },
        { provide: MailIdleService, useValue: mockMailIdleService },
      ],
    }).compile();

    controller = module.get<MailsController>(MailsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('guards every mailcow-admin route with the AdminGuard', () => {
      ADMIN_GUARDED_ROUTES.forEach((route) => {
        expect(controllerContractReflection.getRouteGuards(MailsController, route)).toContain(AdminGuard);
      });
    });

    it('leaves the user-facing mail routes without an AdminGuard', () => {
      NON_ADMIN_ROUTES.forEach((route) => {
        expect(controllerContractReflection.getRouteGuards(MailsController, route)).not.toContain(AdminGuard);
      });
    });
  });
});
