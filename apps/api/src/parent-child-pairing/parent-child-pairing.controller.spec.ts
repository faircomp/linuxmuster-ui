/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Test, TestingModule } from '@nestjs/testing';
import GroupRoles from '@libs/groups/types/group-roles.enum';
import PARENT_CHILD_PAIRING_STATUS from '@libs/parent-child-pairing/constants/parentChildPairingStatus';
import type SubmitParentChildPairingCodeDto from '@libs/parent-child-pairing/types/submitParentChildPairingCodeDto';
import type JwtUser from '@libs/user/types/jwt/jwtUser';
import controllerContractReflection from '../common/controllerContractReflection';
import DynamicAppAccessGuard from '../common/guards/dynamicAppAccess.guard';
import ParentChildPairingService from './parent-child-pairing.service';
import ParentChildPairingController from './parent-child-pairing.controller';

const USERNAME = 'alice';
const GROUPS = [GroupRoles.PARENT];
const SCHOOL = 'agy';
const USER = { preferred_username: USERNAME, school: SCHOOL } as JwtUser;

const mockParentChildPairingService = {
  getOrCreateCode: jest.fn(),
  refreshCode: jest.fn(),
  createParentChildPairing: jest.fn(),
  getEnrichedRelationships: jest.fn(),
  getAllParentChildPairings: jest.fn(),
  updateParentChildPairingStatus: jest.fn(),
};

describe('ParentChildPairingController', () => {
  let controller: ParentChildPairingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParentChildPairingController],
      providers: [{ provide: ParentChildPairingService, useValue: mockParentChildPairingService }],
    }).compile();

    controller = module.get<ParentChildPairingController>(ParentChildPairingController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delegation', () => {
    it('getCode delegates to getOrCreateCode with username, groups and school', async () => {
      await controller.getCode(USERNAME, GROUPS, USER);

      expect(mockParentChildPairingService.getOrCreateCode).toHaveBeenCalledWith(USERNAME, GROUPS, SCHOOL);
    });

    it('refreshCode delegates to refreshCode with username, groups and school', async () => {
      await controller.refreshCode(USERNAME, GROUPS, USER);

      expect(mockParentChildPairingService.refreshCode).toHaveBeenCalledWith(USERNAME, GROUPS, SCHOOL);
    });

    it('createParentChildPairing delegates the code from the body', async () => {
      await controller.createParentChildPairing(USERNAME, GROUPS, USER, {
        code: 'ABCD1234',
      } as SubmitParentChildPairingCodeDto);

      expect(mockParentChildPairingService.createParentChildPairing).toHaveBeenCalledWith(
        USERNAME,
        GROUPS,
        SCHOOL,
        'ABCD1234',
      );
    });

    it('getEnrichedRelationships delegates with username, groups and school', async () => {
      await controller.getEnrichedRelationships(USERNAME, GROUPS, USER);

      expect(mockParentChildPairingService.getEnrichedRelationships).toHaveBeenCalledWith(USERNAME, GROUPS, SCHOOL);
    });

    it('getAllParentChildPairings delegates the status and school filters', async () => {
      await controller.getAllParentChildPairings(PARENT_CHILD_PAIRING_STATUS.PENDING, SCHOOL);

      expect(mockParentChildPairingService.getAllParentChildPairings).toHaveBeenCalledWith(
        PARENT_CHILD_PAIRING_STATUS.PENDING,
        SCHOOL,
      );
    });

    it('updateParentChildPairingStatus delegates id, status, username and the LMN token', async () => {
      await controller.updateParentChildPairingStatus(
        'pairing-1',
        PARENT_CHILD_PAIRING_STATUS.ACCEPTED,
        USERNAME,
        'lmn-token',
      );

      expect(mockParentChildPairingService.updateParentChildPairingStatus).toHaveBeenCalledWith(
        'pairing-1',
        PARENT_CHILD_PAIRING_STATUS.ACCEPTED,
        USERNAME,
        'lmn-token',
      );
    });
  });

  describe('auth contract', () => {
    it.each([
      'getCode',
      'refreshCode',
      'createParentChildPairing',
      'getEnrichedRelationships',
      'getAllParentChildPairings',
      'updateParentChildPairingStatus',
    ])('keeps %s behind the global JWT guard (not public)', (route) => {
      expect(controllerContractReflection.isRoutePublic(ParentChildPairingController, route)).toBe(false);
    });

    it.each(['getAllParentChildPairings', 'updateParentChildPairingStatus'])(
      'guards %s with the DynamicAppAccessGuard',
      (route) => {
        expect(controllerContractReflection.getRouteGuards(ParentChildPairingController, route)).toContain(
          DynamicAppAccessGuard,
        );
      },
    );

    it.each(['getCode', 'refreshCode', 'createParentChildPairing', 'getEnrichedRelationships'])(
      'does not add the DynamicAppAccessGuard to the user-facing route %s',
      (route) => {
        expect(controllerContractReflection.getRouteGuards(ParentChildPairingController, route)).not.toContain(
          DynamicAppAccessGuard,
        );
      },
    );
  });
});
