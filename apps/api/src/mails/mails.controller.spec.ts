/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import MailsController from './mails.controller';
import MailsService from './mails.service';
import MailIdleService from './mail-idle.service';
import MailcowAdminService from './mailcow-admin.service';
import UsersService from '../users/users.service';
import AdminGuard from '../common/guards/admin.guard';
import GlobalSettingsService from '../global-settings/global-settings.service';
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
const mockMailcowAdminService = {
  getMailcowDomains: jest.fn(),
  getMailcowMailboxes: jest.fn(),
  createMailcowMailbox: jest.fn(),
  updateMailcowMailbox: jest.fn(),
  deleteMailcowMailboxes: jest.fn(),
  updateMailboxAcl: jest.fn(),
};
const mockGlobalSettingsService = { getAdminGroupsFromCache: jest.fn() };

const ADMIN_GUARDED_ROUTES = [
  'getExternalMailProviderConfig',
  'postExternalMailProviderConfig',
  'deleteExternalMailProviderConfig',
  'checkSogoThemeVersion',
  'updateSogoThemeManually',
  'getConnectionStats',
  'getMailcowDomains',
  'getMailcowMailboxes',
  'createMailcowMailbox',
  'updateMailcowMailbox',
  'deleteMailcowMailboxes',
  'updateMailboxAcl',
];
const NON_ADMIN_ROUTES = ['getMails', 'getPublicMailProviderConfigs', 'getSyncJob', 'postSyncJob', 'deleteSyncJobs'];

describe(MailsController.name, () => {
  let controller: MailsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailsController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailsService, useValue: mockMailsService },
        { provide: MailIdleService, useValue: mockMailIdleService },
        { provide: MailcowAdminService, useValue: mockMailcowAdminService },
        { provide: GlobalSettingsService, useValue: mockGlobalSettingsService },
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
