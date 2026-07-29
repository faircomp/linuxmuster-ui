/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import WebhookClientsController from './webhook-clients.controller';
import WebhookClientsService from './webhook-clients.service';
import AdminGuard from '../common/guards/admin.guard';
import controllerContractReflection from '../common/controllerContractReflection';

const mockWebhookClientsService = {
  getAll: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
};

describe(WebhookClientsController.name, () => {
  let controller: WebhookClientsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookClientsController],
      providers: [{ provide: WebhookClientsService, useValue: mockWebhookClientsService }],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WebhookClientsController>(WebhookClientsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('guards the whole controller with the class-level AdminGuard', () => {
      expect(controllerContractReflection.getClassGuards(WebhookClientsController)).toContain(AdminGuard);
    });
  });
});
