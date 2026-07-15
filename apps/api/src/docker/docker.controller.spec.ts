/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import DockerController from './docker.controller';
import DockerService from './docker.service';
import AdminGuard from '../common/guards/admin.guard';
import controllerContractReflection from '../common/controllerContractReflection';

const mockDockerService = {
  getContainers: jest.fn(),
  createContainer: jest.fn(),
  executeContainerCommand: jest.fn(),
  deleteContainer: jest.fn(),
  updateContainer: jest.fn(),
  updateEduManagerAgentContainer: jest.fn(),
};

const ADMIN_ONLY_ROUTES = [
  'getContainers',
  'createContainer',
  'executeContainerCommand',
  'deleteContainer',
  'updateContainer',
];

describe(DockerController.name, () => {
  let controller: DockerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DockerController],
      providers: [{ provide: DockerService, useValue: mockDockerService }],
    }).compile();

    controller = module.get<DockerController>(DockerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auth contract', () => {
    it('guards the whole controller with the class-level AdminGuard', () => {
      expect(controllerContractReflection.getClassGuards(DockerController)).toContain(AdminGuard);
    });

    it('exposes only the edu-manager-agent update route publicly', () => {
      expect(controllerContractReflection.isRoutePublic(DockerController, 'updateEduManagerAgentContainer')).toBe(true);
      ADMIN_ONLY_ROUTES.forEach((route) => {
        expect(controllerContractReflection.isRoutePublic(DockerController, route)).toBe(false);
      });
    });
  });
});
