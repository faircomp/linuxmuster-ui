/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { randomUUID } from 'crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import PARENT_CHILD_PAIRING_STATUS from '@libs/parent-child-pairing/constants/parentChildPairingStatus';
import PARENT_CHILD_PAIRING_LOG_ACTION from '@libs/parent-child-pairing/constants/parentChildPairingLogAction';
import PARENT_CHILD_PAIRING_ERROR_MESSAGES from '@libs/parent-child-pairing/constants/parentChildPairingErrorMessages';
import PARENT_CHILD_PAIRING_CACHE_CONFIG from '@libs/parent-child-pairing/constants/parentChildPairingCacheConfig';
import type ParentChildPairingDto from '@libs/parent-child-pairing/types/parentChildPairingDto';
import type ParentChildPairingCodeResponseDto from '@libs/parent-child-pairing/types/parentChildPairingCodeResponseDto';
import type ParentChildPairingStatusType from '@libs/parent-child-pairing/types/parentChildPairingStatusType';
import GroupRoles from '@libs/groups/types/group-roles.enum';
import getIsParent from '@libs/groups/utils/getIsParent';
import CustomHttpException from '../common/CustomHttpException';
import LmnApiService from '../lmnApi/lmnApi.service';
import { ParentChildPairing, ParentChildPairingDocument } from './parent-child-pairing.schema';

interface ParentChildPairingCodeData {
  username: string;
  groups: string[];
  school: string;
  expiresAt: string;
}

@Injectable()
class ParentChildPairingService {
  constructor(
    @InjectModel(ParentChildPairing.name) private parentChildPairingModel: Model<ParentChildPairingDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly lmnApiService: LmnApiService,
  ) {}

  async getOrCreateCode(
    username: string,
    groups: string[],
    school: string,
  ): Promise<ParentChildPairingCodeResponseDto> {
    const codeKey = `${PARENT_CHILD_PAIRING_CACHE_CONFIG.CODE_KEY_PREFIX}${username}`;
    const existingCode = await this.cacheManager.get<string>(codeKey);

    if (existingCode) {
      const userKey = `${PARENT_CHILD_PAIRING_CACHE_CONFIG.USER_KEY_PREFIX}${existingCode}`;
      const userData = await this.cacheManager.get<ParentChildPairingCodeData>(userKey);

      if (userData) {
        return { code: existingCode, expiresAt: userData.expiresAt };
      }
    }

    return this.generateAndStoreCode(username, groups, school);
  }

  async refreshCode(username: string, groups: string[], school: string): Promise<ParentChildPairingCodeResponseDto> {
    await this.deleteExistingCode(username);
    return this.generateAndStoreCode(username, groups, school);
  }

  async createParentChildPairing(
    username: string,
    groups: string[],
    callerSchool: string,
    code: string,
  ): Promise<ParentChildPairingDto> {
    const target = await this.resolveCode(code);

    if (username === target.username) {
      throw new CustomHttpException(
        PARENT_CHILD_PAIRING_ERROR_MESSAGES.CANNOT_PAIR_WITH_SELF,
        HttpStatus.BAD_REQUEST,
        undefined,
        ParentChildPairingService.name,
      );
    }

    const callerIsParent = getIsParent(groups);
    const callerIsStudent = groups.includes(GroupRoles.STUDENT);

    if (!callerIsParent && !callerIsStudent) {
      throw new CustomHttpException(
        PARENT_CHILD_PAIRING_ERROR_MESSAGES.INVALID_ROLE,
        HttpStatus.FORBIDDEN,
        undefined,
        ParentChildPairingService.name,
      );
    }

    const targetIsParent = getIsParent(target.groups);
    const targetIsStudent = target.groups.includes(GroupRoles.STUDENT);

    if (!targetIsParent && !targetIsStudent) {
      throw new CustomHttpException(
        PARENT_CHILD_PAIRING_ERROR_MESSAGES.INVALID_ROLE,
        HttpStatus.FORBIDDEN,
        undefined,
        ParentChildPairingService.name,
      );
    }

    const hasParent = callerIsParent || targetIsParent;
    const hasStudent = callerIsStudent || targetIsStudent;

    if (!hasParent || !hasStudent) {
      throw new CustomHttpException(
        PARENT_CHILD_PAIRING_ERROR_MESSAGES.INCOMPATIBLE_ROLES,
        HttpStatus.BAD_REQUEST,
        undefined,
        ParentChildPairingService.name,
      );
    }

    const parent = callerIsParent ? username : target.username;
    const student = callerIsStudent ? username : target.username;
    const school = callerIsStudent ? callerSchool : target.school;

    const existingPairing = await this.parentChildPairingModel.findOne({ parent, student }).exec();

    if (existingPairing) {
      throw new CustomHttpException(
        PARENT_CHILD_PAIRING_ERROR_MESSAGES.PAIRING_ALREADY_EXISTS,
        HttpStatus.CONFLICT,
        undefined,
        ParentChildPairingService.name,
      );
    }

    const parentChildPairing = await this.parentChildPairingModel.create({
      parent,
      student,
      school,
      status: PARENT_CHILD_PAIRING_STATUS.PENDING,
      logs: [
        {
          action: PARENT_CHILD_PAIRING_LOG_ACTION.PAIRING_REQUESTED,
          performedBy: username,
          timestamp: new Date(),
        },
      ],
    });

    Logger.log(
      `Parent-child pairing created: ${parent} <-> ${student} (school: ${school})`,
      ParentChildPairingService.name,
    );

    return ParentChildPairingService.toParentChildPairingDto(parentChildPairing);
  }

  async getAllParentChildPairings(status?: string, school?: string): Promise<ParentChildPairingDto[]> {
    const filter: { status?: string; school?: string } = {};

    if (status) {
      filter.status = status;
    }

    if (school) {
      filter.school = school;
    }

    const pairings = await this.parentChildPairingModel.find(filter).sort({ createdAt: -1 }).exec();
    return pairings.map((pairing) => ParentChildPairingService.toParentChildPairingDto(pairing));
  }

  async updateParentChildPairingStatus(
    pairingId: string,
    status: ParentChildPairingStatusType,
    performedBy: string,
    lmnApiToken: string,
  ): Promise<ParentChildPairingDto> {
    const pairing = await this.parentChildPairingModel.findById(pairingId).exec();

    if (!pairing) {
      throw new CustomHttpException(
        PARENT_CHILD_PAIRING_ERROR_MESSAGES.PAIRING_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        undefined,
        ParentChildPairingService.name,
      );
    }

    if (status === PARENT_CHILD_PAIRING_STATUS.ACCEPTED) {
      await this.lmnApiService.addParentToStudent(lmnApiToken, pairing.student, pairing.parent);
    }

    if (status === PARENT_CHILD_PAIRING_STATUS.REJECTED && pairing.status === PARENT_CHILD_PAIRING_STATUS.ACCEPTED) {
      await this.lmnApiService.deleteParentFromStudent(lmnApiToken, pairing.student, pairing.parent);
    }

    pairing.status = status;
    pairing.logs.push({
      action: PARENT_CHILD_PAIRING_LOG_ACTION.STATUS_CHANGED,
      performedBy,
      timestamp: new Date(),
      details: status,
    });
    await pairing.save();

    Logger.log(`Parent-child pairing ${pairingId} status updated to ${status}`, ParentChildPairingService.name);

    return ParentChildPairingService.toParentChildPairingDto(pairing);
  }

  private async resolveCode(code: string): Promise<ParentChildPairingCodeData> {
    const userKey = `${PARENT_CHILD_PAIRING_CACHE_CONFIG.USER_KEY_PREFIX}${code}`;
    const userData = await this.cacheManager.get<ParentChildPairingCodeData>(userKey);

    if (!userData) {
      throw new CustomHttpException(
        PARENT_CHILD_PAIRING_ERROR_MESSAGES.CODE_EXPIRED,
        HttpStatus.GONE,
        undefined,
        ParentChildPairingService.name,
      );
    }

    return userData;
  }

  private async deleteExistingCode(username: string): Promise<void> {
    const codeKey = `${PARENT_CHILD_PAIRING_CACHE_CONFIG.CODE_KEY_PREFIX}${username}`;
    const existingCode = await this.cacheManager.get<string>(codeKey);

    if (existingCode) {
      await this.cacheManager.del(codeKey);
      await this.cacheManager.del(`${PARENT_CHILD_PAIRING_CACHE_CONFIG.USER_KEY_PREFIX}${existingCode}`);
    }
  }

  private async generateAndStoreCode(
    username: string,
    groups: string[],
    school: string,
  ): Promise<ParentChildPairingCodeResponseDto> {
    const code = randomUUID().slice(0, PARENT_CHILD_PAIRING_CACHE_CONFIG.CODE_LENGTH).toUpperCase();
    const codeKey = `${PARENT_CHILD_PAIRING_CACHE_CONFIG.CODE_KEY_PREFIX}${username}`;
    const userKey = `${PARENT_CHILD_PAIRING_CACHE_CONFIG.USER_KEY_PREFIX}${code}`;
    const expiresAt = new Date(Date.now() + PARENT_CHILD_PAIRING_CACHE_CONFIG.CODE_TTL_MS).toISOString();

    await this.cacheManager.set(codeKey, code, PARENT_CHILD_PAIRING_CACHE_CONFIG.CODE_TTL_MS);
    await this.cacheManager.set<ParentChildPairingCodeData>(
      userKey,
      { username, groups, school, expiresAt },
      PARENT_CHILD_PAIRING_CACHE_CONFIG.CODE_TTL_MS,
    );

    Logger.log(`Parent-child pairing code generated for ${username}`, ParentChildPairingService.name);

    return { code, expiresAt };
  }

  private static toParentChildPairingDto(pairing: ParentChildPairingDocument): ParentChildPairingDto {
    return {
      id: String(pairing.id),
      parent: pairing.parent,
      student: pairing.student,
      school: pairing.school,
      status: pairing.status,
      logs: (pairing.logs ?? []).map((log) => ({
        action: log.action,
        performedBy: log.performedBy,
        timestamp: log.timestamp.toISOString(),
        details: log.details,
      })),
      createdAt: pairing.createdAt.toISOString(),
      updatedAt: pairing.updatedAt.toISOString(),
    };
  }
}

export default ParentChildPairingService;
