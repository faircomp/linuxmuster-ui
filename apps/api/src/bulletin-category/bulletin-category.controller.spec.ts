/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import BulletinCategoryController from './bulletin-category.controller';
import BulletinCategoryService from './bulletin-category.service';
import AdminGuard from '../common/guards/admin.guard';
import controllerContractReflection from '../common/controllerContractReflection';

const mockBulletinCategoryService = {
  findAll: jest.fn(),
  create: jest.fn(),
  checkIfNameExists: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  setPosition: jest.fn(),
};

const ADMIN_GUARDED_ROUTES = ['create', 'checkName', 'update', 'remove', 'setPosition'];

describe(BulletinCategoryController.name, () => {
  let controller: BulletinCategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BulletinCategoryController],
      providers: [{ provide: BulletinCategoryService, useValue: mockBulletinCategoryService }],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BulletinCategoryController>(BulletinCategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('guards every mutation route with the AdminGuard', () => {
      ADMIN_GUARDED_ROUTES.forEach((route) => {
        expect(controllerContractReflection.getRouteGuards(BulletinCategoryController, route)).toContain(AdminGuard);
      });
    });

    it('leaves the read-all route without an AdminGuard', () => {
      expect(controllerContractReflection.getRouteGuards(BulletinCategoryController, 'findAll')).not.toContain(
        AdminGuard,
      );
    });
  });
});
