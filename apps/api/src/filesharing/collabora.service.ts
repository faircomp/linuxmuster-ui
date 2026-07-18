/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { BadRequestException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import APPS from '@libs/appconfig/constants/apps';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import WOPI from '@libs/filesharing/constants/wopi';
import DEFAULT_PROPFIND_XML from '@libs/filesharing/constants/defaultPropfindXml';
import FileSharingErrorMessage from '@libs/filesharing/types/fileSharingErrorMessage';
import PathValidationErrorMessages from '@libs/common/constants/path-validation-error-messages';
import { DirectoryFileDTO } from '@libs/filesharing/types/directoryFileDTO';
import { HttpMethodsWebDav, HTTP_HEADERS, WebdavRequestDepth } from '@libs/common/types/http-methods';
import getPathWithoutWebdav from '@libs/filesharing/utils/getPathWithoutWebdav';
import mapToDirectoryFiles from '@libs/filesharing/utils/mapToDirectoryFiles';
import type CollaboraTokenResponseDto from '@libs/filesharing/types/collaboraTokenResponseDto';
import type WopiTokenPayload from '@libs/filesharing/types/wopiTokenPayload';
import CustomHttpException from '../common/CustomHttpException';
import AppConfigService from '../appconfig/appconfig.service';
import WebdavService from '../webdav/webdav.service';
import WebdavSharesService from '../webdav/shares/webdav-shares.service';

const LOCALHOST = 'localhost';
const LOCALHOST_ORIGIN = 'http://localhost';
const PARENT_PATH_SEGMENT = '..';

@Injectable()
class CollaboraService {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly jwtService: JwtService,
    private readonly webdavService: WebdavService,
    private readonly webdavSharesService: WebdavSharesService,
  ) {}

  async getWopiSecret(): Promise<string> {
    const appConfig = await this.appConfigService.getAppConfigByName(APPS.FILE_SHARING);
    const secret = appConfig?.extendedOptions?.[ExtendedOptionKeys.COLLABORA_WOPI_SECRET] as string | undefined;
    if (!secret) {
      throw new CustomHttpException(
        FileSharingErrorMessage.AppNotProperlyConfigured,
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        CollaboraService.name,
      );
    }
    return secret;
  }

  async generateWopiToken(
    username: string,
    filePath: string,
    share: string,
    canWrite = true,
  ): Promise<CollaboraTokenResponseDto> {
    Logger.log(`Generating WOPI token for ${username}`, CollaboraService.name);
    const secret = await this.getWopiSecret();
    if (filePath.includes(PARENT_PATH_SEGMENT)) {
      throw new BadRequestException(PathValidationErrorMessages.PathTraversal);
    }
    const baseDomain = process.env.EDULUTION_BASE_DOMAIN || LOCALHOST;
    const origin = baseDomain === LOCALHOST ? LOCALHOST_ORIGIN : `https://${baseDomain}`;
    const payload: WopiTokenPayload = {
      username,
      filePath,
      share,
      canWrite,
      origin,
      jti: randomUUID(),
    };
    const accessToken = this.jwtService.sign(payload, { secret, expiresIn: WOPI.TOKEN_EXPIRY });
    return {
      accessToken,
      accessTokenTTL: Date.now() + WOPI.TOKEN_TTL_MS,
    };
  }

  async getFileStat(username: string, filePath: string, share: string): Promise<DirectoryFileDTO | undefined> {
    try {
      const client = await this.webdavService.getClient(username, share);
      const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
      const pathWithoutWebdav = getPathWithoutWebdav(filePath, webdavShare.pathname);
      const url = WebdavService.safeJoinUrl(webdavShare.url, pathWithoutWebdav);
      const files = (await WebdavService.executeWebdavRequest<string, DirectoryFileDTO[]>(
        client,
        {
          method: HttpMethodsWebDav.PROPFIND,
          url,
          data: DEFAULT_PROPFIND_XML,
          headers: { [HTTP_HEADERS.Depth]: WebdavRequestDepth.ONLY_SELF },
        },
        FileSharingErrorMessage.FileNotFound,
        mapToDirectoryFiles,
      )) as DirectoryFileDTO[];
      return files[0];
    } catch (error) {
      Logger.error(`WOPI getFileStat failed for ${filePath}`, (error as Error).stack, CollaboraService.name);
      return undefined;
    }
  }

  async validateWopiToken(token: string): Promise<WopiTokenPayload> {
    const secret = await this.getWopiSecret();
    try {
      return this.jwtService.verify<WopiTokenPayload>(token, { secret });
    } catch {
      throw new CustomHttpException(
        FileSharingErrorMessage.WopiTokenInvalid,
        HttpStatus.UNAUTHORIZED,
        undefined,
        CollaboraService.name,
      );
    }
  }
}

export default CollaboraService;
