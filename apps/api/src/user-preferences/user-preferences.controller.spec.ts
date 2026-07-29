/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import UserPreferencesController from './user-preferences.controller';
import UserPreferencesService from './user-preferences.service';
import controllerContractReflection from '../common/controllerContractReflection';

const mockUserPreferencesService = {
  getForUser: jest.fn(),
  updateBulletinCollapsedState: jest.fn(),
  updateBulletinBoardGridRows: jest.fn(),
};

describe(UserPreferencesController.name, () => {
  let controller: UserPreferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPreferencesController],
      providers: [{ provide: UserPreferencesService, useValue: mockUserPreferencesService }],
    }).compile();

    controller = module.get<UserPreferencesController>(UserPreferencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('relies on the global auth guard only (no class guard)', () => {
      expect(controllerContractReflection.getClassGuards(UserPreferencesController)).toHaveLength(0);
    });

    it('keeps every route non-public and without an extra route guard', () => {
      ['getPreferences', 'updateBulletinCollapsed', 'updateBulletinBoardGridRows'].forEach((route) => {
        expect(controllerContractReflection.isRoutePublic(UserPreferencesController, route)).toBe(false);
        expect(controllerContractReflection.getRouteGuards(UserPreferencesController, route)).toHaveLength(0);
      });
    });
  });
});
