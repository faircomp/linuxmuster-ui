/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import WebdavSharesController from './webdav-shares.controller';
import WebdavSharesService from './webdav-shares.service';
import AdminGuard from '../../common/guards/admin.guard';
import controllerContractReflection from '../../common/controllerContractReflection';

const mockWebdavSharesService = {
  findAllWebdavServers: jest.fn(),
  findAllWebdavShares: jest.fn(),
  createWebdavShare: jest.fn(),
  updateWebdavShare: jest.fn(),
  deleteWebdavShare: jest.fn(),
};

const ADMIN_GUARDED_ROUTES = ['createWebdavShare', 'updateWebdavShare', 'deleteWebdavShare'];

describe(WebdavSharesController.name, () => {
  let controller: WebdavSharesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebdavSharesController],
      providers: [{ provide: WebdavSharesService, useValue: mockWebdavSharesService }],
    }).compile();

    controller = module.get<WebdavSharesController>(WebdavSharesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('guards every mutation route with the AdminGuard', () => {
      ADMIN_GUARDED_ROUTES.forEach((route) => {
        expect(controllerContractReflection.getRouteGuards(WebdavSharesController, route)).toContain(AdminGuard);
      });
    });

    it('leaves the read route without an AdminGuard', () => {
      expect(controllerContractReflection.getRouteGuards(WebdavSharesController, 'findAllShares')).not.toContain(
        AdminGuard,
      );
    });
  });
});
