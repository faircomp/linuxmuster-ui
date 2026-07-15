/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import WebhookController from './webhook.controller';
import WebhookService from './webhook.service';
import WebhookGuard from './webhook.guard';
import controllerContractReflection from '../common/controllerContractReflection';

const mockWebhookService = { handleEvent: jest.fn() };

describe(WebhookController.name, () => {
  let controller: WebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [{ provide: WebhookService, useValue: mockWebhookService }],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth bypass contract', () => {
    it('exposes the webhook endpoint publicly but only behind the WebhookGuard', () => {
      expect(controllerContractReflection.isRoutePublic(WebhookController, 'handleWebhook')).toBe(true);
      expect(controllerContractReflection.getRouteGuards(WebhookController, 'handleWebhook')).toContain(WebhookGuard);
    });
  });
});
