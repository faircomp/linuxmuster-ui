/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Controller, Get, HttpStatus, Logger, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import WOPI from '@libs/filesharing/constants/wopi';
import { HTTP_HEADERS, RequestResponseContentType } from '@libs/common/types/http-methods';
import getPathWithoutWebdav from '@libs/filesharing/utils/getPathWithoutWebdav';
import type WopiFileInfo from '@libs/filesharing/types/wopiFileInfo';
import Public from '../common/decorators/public.decorator';
import CollaboraService from './collabora.service';
import WebdavService from '../webdav/webdav.service';
import WebdavSharesService from '../webdav/shares/webdav-shares.service';
import FilesystemService from '../filesystem/filesystem.service';

@ApiTags('wopi')
@Controller(WOPI.BASE_PATH)
class WopiController {
  constructor(
    private readonly collaboraService: CollaboraService,
    private readonly webdavService: WebdavService,
    private readonly webdavSharesService: WebdavSharesService,
  ) {}

  @Public()
  @Get(':fileId')
  async checkFileInfo(
    @Param('fileId') fileId: string,
    @Query('access_token') accessToken: string,
    @Res() res: Response,
  ): Promise<Response> {
    const tokenData = await this.collaboraService.validateWopiToken(accessToken);
    const fileName = tokenData.filePath.split('/').pop() || fileId;
    const fileStat = await this.collaboraService.getFileStat(tokenData.username, tokenData.filePath, tokenData.share);
    const fileInfo: WopiFileInfo = {
      BaseFileName: fileName,
      Size: fileStat?.size ?? 0,
      OwnerId: tokenData.username,
      UserId: tokenData.username,
      UserFriendlyName: tokenData.username,
      UserCanWrite: tokenData.canWrite,
      UserCanNotWriteRelative: true,
      PostMessageOrigin: tokenData.origin,
      LastModifiedTime: fileStat?.lastmod ?? new Date().toISOString(),
      Version: fileStat?.etag ?? Date.now().toString(),
    };
    return res.status(HttpStatus.OK).json(fileInfo);
  }

  @Public()
  @Get(':fileId/contents')
  async getFile(@Query('access_token') accessToken: string, @Res() res: Response): Promise<void> {
    const tokenData = await this.collaboraService.validateWopiToken(accessToken);
    const client = await this.webdavService.getClient(tokenData.username, tokenData.share);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(tokenData.share);
    const pathWithoutWebdav = getPathWithoutWebdav(tokenData.filePath, webdavShare.pathname);
    const url = WebdavService.safeJoinUrl(webdavShare.url, pathWithoutWebdav);
    const stream = await FilesystemService.fetchFileStream(url, client);
    const readableStream = stream instanceof Readable ? stream : stream.data;
    res.setHeader(HTTP_HEADERS.ContentType, RequestResponseContentType.APPLICATION_OCTET_STREAM);
    try {
      await pipeline(readableStream, res);
    } catch {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
      }
    }
  }

  @Public()
  @Post(':fileId/contents')
  async putFile(
    @Query('access_token') accessToken: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    const tokenData = await this.collaboraService.validateWopiToken(accessToken);
    if (!tokenData.canWrite) {
      return res.status(HttpStatus.FORBIDDEN).json({ LastModifiedTime: new Date().toISOString() });
    }
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(tokenData.share);
    const pathWithoutWebdav = getPathWithoutWebdav(tokenData.filePath, webdavShare.pathname);
    const contentType =
      (req.headers[HTTP_HEADERS.ContentType] as string | undefined) ||
      RequestResponseContentType.APPLICATION_OCTET_STREAM;
    try {
      await this.webdavService.uploadFile(tokenData.username, pathWithoutWebdav, req, tokenData.share, contentType);
    } catch (error) {
      Logger.error(`WOPI putFile failed for ${tokenData.filePath}`, (error as Error).stack, WopiController.name);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ LastModifiedTime: new Date().toISOString() });
    }
    return res.status(HttpStatus.OK).json({ LastModifiedTime: new Date().toISOString() });
  }
}

export default WopiController;
