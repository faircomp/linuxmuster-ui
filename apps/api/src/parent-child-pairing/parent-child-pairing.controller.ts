/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HTTP_HEADERS } from '@libs/common/types/http-methods';
import PARENT_CHILD_PAIRING_API_ENDPOINTS from '@libs/parent-child-pairing/constants/parentChildPairingApiEndpoints';
import PARENT_CHILD_PAIRING_QUERY_PARAMS from '@libs/parent-child-pairing/constants/parentChildPairingQueryParams';
import PARENT_CHILD_PAIRING_STATUS from '@libs/parent-child-pairing/constants/parentChildPairingStatus';
import type ParentChildPairingStatusType from '@libs/parent-child-pairing/types/parentChildPairingStatusType';
import type ParentChildPairingDto from '@libs/parent-child-pairing/types/parentChildPairingDto';
import type ParentChildPairingCodeResponseDto from '@libs/parent-child-pairing/types/parentChildPairingCodeResponseDto';
import type EnrichedRelationshipResponseDto from '@libs/parent-child-pairing/types/enrichedRelationshipResponseDto';
import type SubmitParentChildPairingCodeDto from '@libs/parent-child-pairing/types/submitParentChildPairingCodeDto';
import type JwtUser from '@libs/user/types/jwt/jwtUser';
import APPS from '@libs/appconfig/constants/apps';
import GetCurrentUsername from '../common/decorators/getCurrentUsername.decorator';
import GetCurrentUserGroups from '../common/decorators/getCurrentUserGroups.decorator';
import GetCurrentUser from '../common/decorators/getCurrentUser.decorator';
import ParentChildPairingService from './parent-child-pairing.service';
import RequireAppAccess from '../common/decorators/requireAppAccess.decorator';

@ApiTags(PARENT_CHILD_PAIRING_API_ENDPOINTS.BASE)
@ApiBearerAuth()
@Controller(PARENT_CHILD_PAIRING_API_ENDPOINTS.BASE)
class ParentChildPairingController {
  constructor(private readonly parentChildPairingService: ParentChildPairingService) {}

  @ApiOperation({ summary: 'Get or create a pairing code for the current user' })
  @Get(PARENT_CHILD_PAIRING_API_ENDPOINTS.CODE)
  async getCode(
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() groups: string[],
    @GetCurrentUser() user: JwtUser,
  ): Promise<ParentChildPairingCodeResponseDto> {
    return this.parentChildPairingService.getOrCreateCode(username, groups, user.school);
  }

  @ApiOperation({ summary: 'Refresh the pairing code for the current user' })
  @Put(PARENT_CHILD_PAIRING_API_ENDPOINTS.CODE)
  async refreshCode(
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() groups: string[],
    @GetCurrentUser() user: JwtUser,
  ): Promise<ParentChildPairingCodeResponseDto> {
    return this.parentChildPairingService.refreshCode(username, groups, user.school);
  }

  @ApiOperation({ summary: 'Submit a parent-child pairing code' })
  @Post()
  async createParentChildPairing(
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() groups: string[],
    @GetCurrentUser() user: JwtUser,
    @Body() body: SubmitParentChildPairingCodeDto,
  ): Promise<ParentChildPairingDto> {
    return this.parentChildPairingService.createParentChildPairing(username, groups, user.school, body.code);
  }

  @ApiOperation({ summary: 'Get enriched relationships for the current user' })
  @Get(PARENT_CHILD_PAIRING_API_ENDPOINTS.RELATIONSHIPS)
  async getEnrichedRelationships(
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() groups: string[],
    @GetCurrentUser() user: JwtUser,
  ): Promise<EnrichedRelationshipResponseDto[]> {
    return this.parentChildPairingService.getEnrichedRelationships(username, groups, user.school);
  }

  @ApiOperation({ summary: 'Get all parent-child pairings' })
  @RequireAppAccess(APPS.LINUXMUSTER)
  @Get(PARENT_CHILD_PAIRING_API_ENDPOINTS.ALL)
  async getAllParentChildPairings(
    @Query(PARENT_CHILD_PAIRING_QUERY_PARAMS.STATUS) status?: string,
    @Query(PARENT_CHILD_PAIRING_QUERY_PARAMS.SCHOOL) school?: string,
  ): Promise<ParentChildPairingDto[]> {
    return this.parentChildPairingService.getAllParentChildPairings(status, school);
  }

  @ApiOperation({ summary: 'Update parent-child pairing status' })
  @RequireAppAccess(APPS.LINUXMUSTER)
  @Patch(`:id/${PARENT_CHILD_PAIRING_API_ENDPOINTS.STATUS}`)
  async updateParentChildPairingStatus(
    @Param('id') id: string,
    @Body('status', new ParseEnumPipe(PARENT_CHILD_PAIRING_STATUS)) status: ParentChildPairingStatusType,
    @GetCurrentUsername() username: string,
    @Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string,
  ): Promise<ParentChildPairingDto> {
    return this.parentChildPairingService.updateParentChildPairingStatus(id, status, username, lmnApiToken);
  }
}

export default ParentChildPairingController;
