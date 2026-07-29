/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import NotificationsController from './notifications.controller';
import NotificationsService from './notifications.service';
import controllerContractReflection from '../common/controllerContractReflection';

const mockNotificationsService = {
  getInboxNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteUserNotification: jest.fn(),
  deleteAllUserNotifications: jest.fn(),
};

const NOTIFICATION_ROUTES = [
  'getInbox',
  'getUnreadCount',
  'markAsRead',
  'markAllAsRead',
  'deleteNotification',
  'deleteAllNotifications',
];

describe(NotificationsController.name, () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockNotificationsService }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('relies on the global auth guard only (no class guard)', () => {
      expect(controllerContractReflection.getClassGuards(NotificationsController)).toHaveLength(0);
    });

    it('keeps every route non-public and without an extra route guard', () => {
      NOTIFICATION_ROUTES.forEach((route) => {
        expect(controllerContractReflection.isRoutePublic(NotificationsController, route)).toBe(false);
        expect(controllerContractReflection.getRouteGuards(NotificationsController, route)).toHaveLength(0);
      });
    });
  });
});
