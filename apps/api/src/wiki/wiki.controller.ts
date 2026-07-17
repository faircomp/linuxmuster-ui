/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Body, Controller, Delete, Get, Headers, HttpStatus, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import APPS from '@libs/appconfig/constants/apps';
import WIKI_ENDPOINTS from '@libs/wiki/constants/wikiEndpoints';
import WIKI_SEARCH_THROTTLE_CONFIG from '@libs/wiki/constants/wikiSearchThrottleConfig';
import { HTTP_HEADERS } from '@libs/common/types/http-methods';
import WebdavShareDto from '@libs/filesharing/types/webdavShareDto';
import WikiTreeChildDto from '@libs/wiki/types/wikiTreeChildDto';
import WikiPageDto from '@libs/wiki/types/wikiPageDto';
import CreateWikiPageDto from '@libs/wiki/types/createWikiPageDto';
import UpdateWikiPageDto from '@libs/wiki/types/updateWikiPageDto';
import CreateWikiFolderDto from '@libs/wiki/types/createWikiFolderDto';
import WikiFolderCreatedDto from '@libs/wiki/types/wikiFolderCreatedDto';
import WikiSuccessDto from '@libs/wiki/types/wikiSuccessDto';
import WikiSearchRequestDto from '@libs/wiki/types/wikiSearchRequestDto';
import WikiSearchResponseDto from '@libs/wiki/types/wikiSearchResponseDto';
import RequireAppAccess from '../common/decorators/requireAppAccess.decorator';
import GetCurrentUsername from '../common/decorators/getCurrentUsername.decorator';
import GetCurrentUserGroups from '../common/decorators/getCurrentUserGroups.decorator';
import Throttle from '../common/throttle/throttle.decorator';
import ThrottleGuard from '../common/throttle/throttle.guard';
import WebdavSharesService from '../webdav/shares/webdav-shares.service';
import WikiTreeService from './wiki-tree.service';
import WikiPageService from './wiki-page.service';
import WikiFolderService from './wiki-folder.service';
import WikiSearchService from './wiki-search.service';
import WebdavEtagConflictError from '../webdav/errors/WebdavEtagConflictError';
import WikiEtagConflictHttpException from './WikiEtagConflictHttpException';

@ApiTags(WIKI_ENDPOINTS.BASE)
@ApiBearerAuth()
@RequireAppAccess(APPS.WIKI)
@Controller(WIKI_ENDPOINTS.BASE)
class WikiController {
  constructor(
    private readonly webdavSharesService: WebdavSharesService,
    private readonly treeService: WikiTreeService,
    private readonly pageService: WikiPageService,
    private readonly folderService: WikiFolderService,
    private readonly searchService: WikiSearchService,
  ) {}

  @ApiOperation({ summary: 'List wiki shares the current user can see' })
  @ApiResponse({ status: HttpStatus.OK, type: [WebdavShareDto] })
  @Get(WIKI_ENDPOINTS.SHARES)
  async listShares(@GetCurrentUserGroups() userGroups: string[]): Promise<WebdavShareDto[]> {
    return this.webdavSharesService.findAllWikiShares(userGroups);
  }

  @ApiOperation({ summary: 'List direct children of a wiki tree path' })
  @ApiQuery({ name: 'path', description: 'Frontend path `<shareDisplayName>/<relativePath>`. Empty relative part = share root.' })
  @ApiResponse({ status: HttpStatus.OK, type: [WikiTreeChildDto] })
  @Get(WIKI_ENDPOINTS.TREE)
  async getTree(
    @Query('path') path: string,
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() userGroups: string[],
  ): Promise<WikiTreeChildDto[]> {
    return this.treeService.listChildren(username, userGroups, path);
  }

  @ApiOperation({ summary: 'Read a wiki page and emit its ETag header' })
  @ApiQuery({ name: 'path', description: 'Frontend path `<shareDisplayName>/<relativePath-without-.wiki-without-.md>`.' })
  @ApiResponse({ status: HttpStatus.OK, type: WikiPageDto })
  @Get(WIKI_ENDPOINTS.PAGE)
  async getPage(
    @Query('path') path: string,
    @Res({ passthrough: true }) response: Response,
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() userGroups: string[],
  ): Promise<WikiPageDto> {
    const page = await this.pageService.getPage(username, userGroups, path);
    if (page.etag) {
      response.setHeader(HTTP_HEADERS.ETag, page.etag);
    }
    return page;
  }

  @ApiOperation({ summary: 'Create a new wiki page under a parent folder' })
  @ApiBody({ type: CreateWikiPageDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: WikiPageDto })
  @Post(WIKI_ENDPOINTS.PAGE)
  async createPage(
    @Body() dto: CreateWikiPageDto,
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() userGroups: string[],
  ): Promise<WikiPageDto> {
    return this.pageService.createPage(username, userGroups, dto.parentPath, dto.title, dto.asIndex ?? false);
  }

  @ApiOperation({ summary: 'Update a wiki page (optimistic concurrency via If-Match)' })
  @ApiQuery({ name: 'path' })
  @ApiBody({ type: UpdateWikiPageDto })
  @ApiResponse({ status: HttpStatus.OK, type: WikiPageDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'ETag mismatch — body carries { currentEtag, serverContent } for 3-way merge UI',
  })
  @ApiResponse({
    status: HttpStatus.PRECONDITION_REQUIRED,
    description: 'Missing ETag — provide via If-Match header or body.etag',
  })
  @Put(WIKI_ENDPOINTS.PAGE)
  async updatePage(
    @Query('path') path: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() dto: UpdateWikiPageDto,
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() userGroups: string[],
  ): Promise<WikiPageDto> {
    try {
      return await this.pageService.updatePage(username, userGroups, path, dto.content, ifMatch ?? dto.etag);
    } catch (error) {
      if (error instanceof WebdavEtagConflictError) {
        throw new WikiEtagConflictHttpException(error.currentEtag, error.serverContent);
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Delete a wiki page' })
  @ApiQuery({ name: 'path' })
  @ApiResponse({ status: HttpStatus.OK, type: WikiSuccessDto })
  @Delete(WIKI_ENDPOINTS.PAGE)
  async deletePage(
    @Query('path') path: string,
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() userGroups: string[],
  ): Promise<WikiSuccessDto> {
    await this.pageService.deletePage(username, userGroups, path);
    return { success: true };
  }

  @ApiOperation({ summary: 'Create a new folder inside a parent folder' })
  @ApiBody({ type: CreateWikiFolderDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: WikiFolderCreatedDto })
  @Post(WIKI_ENDPOINTS.FOLDER)
  async createFolder(
    @Body() dto: CreateWikiFolderDto,
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() userGroups: string[],
  ): Promise<WikiFolderCreatedDto> {
    return this.folderService.createFolder(username, userGroups, dto.parentPath, dto.name);
  }

  @ApiOperation({ summary: 'Delete a folder recursively' })
  @ApiQuery({ name: 'path' })
  @ApiResponse({ status: HttpStatus.OK, type: WikiSuccessDto })
  @Delete(WIKI_ENDPOINTS.FOLDER)
  async deleteFolder(
    @Query('path') path: string,
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() userGroups: string[],
  ): Promise<WikiSuccessDto> {
    await this.folderService.deleteFolder(username, userGroups, path);
    return { success: true };
  }

  @ApiOperation({ summary: 'Search wikis across accessible fileproxies' })
  @ApiBody({ type: WikiSearchRequestDto })
  @ApiResponse({ status: HttpStatus.OK, type: WikiSearchResponseDto })
  @Throttle(WIKI_SEARCH_THROTTLE_CONFIG.LIMIT, WIKI_SEARCH_THROTTLE_CONFIG.TTL_MS)
  @UseGuards(ThrottleGuard)
  @Post(WIKI_ENDPOINTS.SEARCH)
  async search(
    @Body() request: WikiSearchRequestDto,
    @GetCurrentUsername() username: string,
    @GetCurrentUserGroups() userGroups: string[],
  ): Promise<WikiSearchResponseDto> {
    return this.searchService.search(request, username, userGroups);
  }
}

export default WikiController;
