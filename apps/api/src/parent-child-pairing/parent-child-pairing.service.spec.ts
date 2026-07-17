/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import GroupRoles from '@libs/groups/types/group-roles.enum';
import { GROUP_WITH_MEMBERS_CACHE_KEY } from '@libs/groups/constants/cacheKeys';
import PARENT_CHILD_PAIRING_STATUS from '@libs/parent-child-pairing/constants/parentChildPairingStatus';
import PARENT_CHILD_PAIRING_LOG_ACTION from '@libs/parent-child-pairing/constants/parentChildPairingLogAction';
import PARENT_CHILD_PAIRING_CACHE_CONFIG from '@libs/parent-child-pairing/constants/parentChildPairingCacheConfig';
import PARENT_CHILD_PAIRING_GROUP_SUFFIX from '@libs/parent-child-pairing/constants/parentChildPairingGroupSuffix';
import CustomHttpException from '../common/CustomHttpException';
import LmnApiService from '../lmnApi/lmnApi.service';
import UsersService from '../users/users.service';
import { ParentChildPairing } from './parent-child-pairing.schema';
import ParentChildPairingService from './parent-child-pairing.service';

const PARENT_USER = 'parent1';
const STUDENT_USER = 'student1';
const SCHOOL = 'school1';
const CODE = 'ABCD1234';

const mockPairingModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
};
const mockCacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
const mockLmnApiService = { addParentToStudent: jest.fn(), deleteParentFromStudent: jest.fn() };
const mockUsersService = { findAllCachedUsers: jest.fn() };

const buildPairingDoc = (overrides: Record<string, unknown> = {}) => ({
  id: 'pairing-1',
  parent: PARENT_USER,
  student: STUDENT_USER,
  school: SCHOOL,
  status: PARENT_CHILD_PAIRING_STATUS.PENDING,
  logs: [] as Array<Record<string, unknown>>,
  createdAt: new Date('2026-07-17T00:00:00.000Z'),
  updatedAt: new Date('2026-07-17T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const expectStatus = async (promise: Promise<unknown>, status: HttpStatus) => {
  expect.assertions(2);
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(CustomHttpException);
    expect((error as CustomHttpException).getStatus()).toBe(status);
  }
};

describe('ParentChildPairingService', () => {
  let service: ParentChildPairingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentChildPairingService,
        { provide: getModelToken(ParentChildPairing.name), useValue: mockPairingModel },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: LmnApiService, useValue: mockLmnApiService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<ParentChildPairingService>(ParentChildPairingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateCode', () => {
    it('returns an existing valid code from the cache', async () => {
      mockCacheManager.get.mockResolvedValueOnce(CODE).mockResolvedValueOnce({ expiresAt: 'later' });

      const result = await service.getOrCreateCode(PARENT_USER, [GroupRoles.PARENT], SCHOOL);

      expect(result).toEqual({ code: CODE, expiresAt: 'later' });
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('generates and stores a new code when none is cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getOrCreateCode(PARENT_USER, [GroupRoles.PARENT], SCHOOL);

      expect(result.code).toHaveLength(PARENT_CHILD_PAIRING_CACHE_CONFIG.CODE_LENGTH);
      expect(mockCacheManager.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('createParentChildPairing', () => {
    it('rejects pairing with oneself (400)', async () => {
      mockCacheManager.get.mockResolvedValue({ username: PARENT_USER, groups: [GroupRoles.STUDENT], school: SCHOOL });

      await expectStatus(
        service.createParentChildPairing(PARENT_USER, [GroupRoles.PARENT], SCHOOL, CODE),
        HttpStatus.BAD_REQUEST,
      );
    });

    it('rejects a caller without a parent or student role (403)', async () => {
      mockCacheManager.get.mockResolvedValue({ username: STUDENT_USER, groups: [GroupRoles.STUDENT], school: SCHOOL });

      await expectStatus(service.createParentChildPairing(PARENT_USER, [], SCHOOL, CODE), HttpStatus.FORBIDDEN);
    });

    it('rejects two students with incompatible roles (400)', async () => {
      mockCacheManager.get.mockResolvedValue({ username: STUDENT_USER, groups: [GroupRoles.STUDENT], school: SCHOOL });

      await expectStatus(
        service.createParentChildPairing('otherStudent', [GroupRoles.STUDENT], SCHOOL, CODE),
        HttpStatus.BAD_REQUEST,
      );
    });

    it('rejects an already existing pairing (409)', async () => {
      mockCacheManager.get.mockResolvedValue({ username: STUDENT_USER, groups: [GroupRoles.STUDENT], school: SCHOOL });
      mockPairingModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(buildPairingDoc()) });

      await expectStatus(
        service.createParentChildPairing(PARENT_USER, [GroupRoles.PARENT], SCHOOL, CODE),
        HttpStatus.CONFLICT,
      );
    });

    it('creates a pending pairing with a pairing_requested log for compatible roles', async () => {
      mockCacheManager.get.mockResolvedValue({ username: STUDENT_USER, groups: [GroupRoles.STUDENT], school: SCHOOL });
      mockPairingModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockPairingModel.create.mockResolvedValue(buildPairingDoc());

      const result = await service.createParentChildPairing(PARENT_USER, [GroupRoles.PARENT], SCHOOL, CODE);

      expect(mockPairingModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: PARENT_USER,
          student: STUDENT_USER,
          status: PARENT_CHILD_PAIRING_STATUS.PENDING,
          logs: [expect.objectContaining({ action: PARENT_CHILD_PAIRING_LOG_ACTION.PAIRING_REQUESTED, performedBy: PARENT_USER })],
        }),
      );
      expect(result.status).toBe(PARENT_CHILD_PAIRING_STATUS.PENDING);
    });

    it('throws GONE when the code has expired', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await expectStatus(
        service.createParentChildPairing(PARENT_USER, [GroupRoles.PARENT], SCHOOL, CODE),
        HttpStatus.GONE,
      );
    });
  });

  describe('updateParentChildPairingStatus', () => {
    it('throws 404 when the pairing does not exist', async () => {
      mockPairingModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expectStatus(
        service.updateParentChildPairingStatus('missing', PARENT_CHILD_PAIRING_STATUS.ACCEPTED, PARENT_USER, 'token'),
        HttpStatus.NOT_FOUND,
      );
    });

    it('adds the parent to the student on ACCEPTED and pushes a status_changed log', async () => {
      const pairing = buildPairingDoc();
      mockPairingModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(pairing) });

      await service.updateParentChildPairingStatus(
        'pairing-1',
        PARENT_CHILD_PAIRING_STATUS.ACCEPTED,
        PARENT_USER,
        'token',
      );

      expect(mockLmnApiService.addParentToStudent).toHaveBeenCalledWith('token', STUDENT_USER, PARENT_USER);
      expect(pairing.status).toBe(PARENT_CHILD_PAIRING_STATUS.ACCEPTED);
      expect(pairing.logs).toHaveLength(1);
      expect(pairing.logs[0]).toEqual(
        expect.objectContaining({ action: PARENT_CHILD_PAIRING_LOG_ACTION.STATUS_CHANGED, performedBy: PARENT_USER }),
      );
      expect(pairing.save).toHaveBeenCalledTimes(1);
    });

    it('removes the parent from the student when rejecting a previously accepted pairing', async () => {
      const pairing = buildPairingDoc({ status: PARENT_CHILD_PAIRING_STATUS.ACCEPTED });
      mockPairingModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(pairing) });

      await service.updateParentChildPairingStatus(
        'pairing-1',
        PARENT_CHILD_PAIRING_STATUS.REJECTED,
        PARENT_USER,
        'token',
      );

      expect(mockLmnApiService.deleteParentFromStudent).toHaveBeenCalledWith('token', STUDENT_USER, PARENT_USER);
    });
  });

  describe('getEnrichedRelationships', () => {
    it('enriches a student active relationship from the group cache (isGroupActive + parent names)', async () => {
      const groupKey = `${GROUP_WITH_MEMBERS_CACHE_KEY}-/${STUDENT_USER}${PARENT_CHILD_PAIRING_GROUP_SUFFIX}`;
      mockUsersService.findAllCachedUsers.mockResolvedValue([
        { username: STUDENT_USER, firstName: 'Stu', lastName: 'Dent' },
        { username: PARENT_USER, firstName: 'Par', lastName: 'Ent' },
      ]);
      mockCacheManager.get.mockImplementation((key: string) =>
        Promise.resolve(
          key === groupKey ? { members: [{ username: PARENT_USER, firstName: 'Par', lastName: 'Ent' }] } : null,
        ),
      );
      mockPairingModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      const result = await service.getEnrichedRelationships(STUDENT_USER, [GroupRoles.STUDENT], SCHOOL);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          parent: PARENT_USER,
          student: STUDENT_USER,
          status: PARENT_CHILD_PAIRING_STATUS.ACCEPTED,
          parentFirstName: 'Par',
          isGroupActive: true,
        }),
      );
    });

    it('enriches a parent active relationship by extracting the student from the group suffix', async () => {
      const childGroup = `/${STUDENT_USER}${PARENT_CHILD_PAIRING_GROUP_SUFFIX}`;
      const groupKey = `${GROUP_WITH_MEMBERS_CACHE_KEY}-${childGroup}`;
      mockUsersService.findAllCachedUsers.mockResolvedValue([
        { username: STUDENT_USER, firstName: 'Stu', lastName: 'Dent' },
        { username: PARENT_USER, firstName: 'Par', lastName: 'Ent' },
      ]);
      mockCacheManager.get.mockImplementation((key: string) =>
        Promise.resolve(
          key === groupKey ? { members: [{ username: PARENT_USER, firstName: 'Par', lastName: 'Ent' }] } : null,
        ),
      );
      mockPairingModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      const result = await service.getEnrichedRelationships(PARENT_USER, [GroupRoles.PARENT, childGroup], SCHOOL);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({ parent: PARENT_USER, student: STUDENT_USER, isGroupActive: true, studentFirstName: 'Stu' }),
      );
    });

    it('adds non-active DB pairings and deduplicates them against active relationships', async () => {
      const groupKey = `${GROUP_WITH_MEMBERS_CACHE_KEY}-/${STUDENT_USER}${PARENT_CHILD_PAIRING_GROUP_SUFFIX}`;
      mockUsersService.findAllCachedUsers.mockResolvedValue([
        { username: STUDENT_USER, firstName: 'Stu', lastName: 'Dent' },
        { username: PARENT_USER, firstName: 'Par', lastName: 'Ent' },
        { username: 'otherParent', firstName: 'Oth', lastName: 'Er' },
      ]);
      mockCacheManager.get.mockImplementation((key: string) =>
        Promise.resolve(
          key === groupKey ? { members: [{ username: PARENT_USER, firstName: 'Par', lastName: 'Ent' }] } : null,
        ),
      );
      mockPairingModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          buildPairingDoc({ parent: PARENT_USER, student: STUDENT_USER, status: PARENT_CHILD_PAIRING_STATUS.PENDING }),
          buildPairingDoc({
            id: 'pairing-2',
            parent: 'otherParent',
            student: STUDENT_USER,
            status: PARENT_CHILD_PAIRING_STATUS.PENDING,
          }),
        ]),
      });

      const result = await service.getEnrichedRelationships(STUDENT_USER, [GroupRoles.STUDENT], SCHOOL);

      expect(result).toHaveLength(2);
      const active = result.find((relationship) => relationship.isGroupActive);
      const nonActive = result.find((relationship) => !relationship.isGroupActive);
      expect(active?.parent).toBe(PARENT_USER);
      expect(nonActive?.parent).toBe('otherParent');
      expect(nonActive?.parentFirstName).toBe('Oth');
    });
  });
});
