/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Injectable } from '@nestjs/common';
import WIKI_CONSTANTS from '@libs/wiki/constants/wikiConstants';
import WIKI_ERROR_MESSAGES from '@libs/wiki/constants/wikiErrorMessages';
import stripSlashes from '@libs/common/utils/stripSlashes';
import isSafeLeafName from '@libs/common/utils/isSafeLeafName';
import type WikiFolderCreatedDto from '@libs/wiki/types/wikiFolderCreatedDto';
import CustomHttpException from '../common/CustomHttpException';
import WebdavService from '../webdav/webdav.service';
import WebdavSharesService from '../webdav/shares/webdav-shares.service';
import resolveWikiPath, { joinWikiPath } from './resolveWikiPath';
import wrapWikiPathOp from './wrapWikiPathOp';
import assertShareAccessible from './assertShareAccessible';

const errorStatus = (error: unknown): number | undefined =>
  error instanceof CustomHttpException ? error.getStatus() : undefined;

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

@Injectable()
class WikiFolderService {
  constructor(
    private readonly webdavService: WebdavService,
    private readonly webdavSharesService: WebdavSharesService,
  ) {}

  async createFolder(
    username: string,
    userGroups: string[],
    parentPath: string,
    name: string,
  ): Promise<WikiFolderCreatedDto> {
    if (
      !isSafeLeafName(name) ||
      name === WIKI_CONSTANTS.WIKI_FOLDER_NAME ||
      name === WIKI_CONSTANTS.INDEX_PAGE_SLUG ||
      name.startsWith('.')
    ) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.INVALID_NAME, HttpStatus.BAD_REQUEST, { name });
    }

    const { share, relativePath: parentRel } = wrapWikiPathOp(() => resolveWikiPath(parentPath));
    await assertShareAccessible(this.webdavSharesService, share, userGroups);

    const clean = stripSlashes(parentRel);
    const parentDiskPath = clean ? `/${clean}` : '/';
    const targetDiskPath = clean ? `/${clean}/${name}` : `/${name}`;

    if ((await this.webdavService.probeFolder(username, targetDiskPath, share)) !== null) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.FOLDER_ALREADY_EXISTS, HttpStatus.CONFLICT, {
        parentPath,
        name,
      });
    }

    try {
      await this.webdavService.createFolder(username, parentDiskPath, name, share);
      const newRel = clean ? `${clean}/${name}` : name;
      return { path: joinWikiPath(share, newRel) };
    } catch (error) {
      const upstream = errorStatus(error);
      if (
        upstream === Number(HttpStatus.UNAUTHORIZED) ||
        upstream === Number(HttpStatus.FORBIDDEN) ||
        upstream === Number(HttpStatus.METHOD_NOT_ALLOWED) ||
        upstream === Number(HttpStatus.CONFLICT)
      ) {
        throw new CustomHttpException(WIKI_ERROR_MESSAGES.ACCESS_DENIED, HttpStatus.FORBIDDEN, { parentPath, name });
      }
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.FOLDER_CREATION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR, {
        parentPath,
        name,
        error: errorMessage(error),
      });
    }
  }

  async deleteFolder(username: string, userGroups: string[], path: string): Promise<void> {
    const { share, relativePath } = wrapWikiPathOp(() => resolveWikiPath(path));
    if (!relativePath) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.INVALID_PATH, HttpStatus.BAD_REQUEST, { path });
    }

    const segments = stripSlashes(relativePath).split('/').filter(Boolean);
    const leaf = segments[segments.length - 1] ?? '';
    if (
      !isSafeLeafName(leaf) ||
      leaf === WIKI_CONSTANTS.WIKI_FOLDER_NAME ||
      leaf.startsWith('.') ||
      segments.some((segment) => segment.startsWith('.'))
    ) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.INVALID_NAME, HttpStatus.BAD_REQUEST, { path, leaf });
    }

    await assertShareAccessible(this.webdavSharesService, share, userGroups);

    if ((await this.webdavService.probeFolder(username, relativePath, share)) === null) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND, { path });
    }

    try {
      await this.webdavService.deletePath(username, relativePath, share);
    } catch (error) {
      const status = errorStatus(error);
      if (status === Number(HttpStatus.NOT_FOUND)) {
        throw new CustomHttpException(WIKI_ERROR_MESSAGES.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND, { path });
      }
      if (status === Number(HttpStatus.UNAUTHORIZED) || status === Number(HttpStatus.FORBIDDEN)) {
        throw new CustomHttpException(WIKI_ERROR_MESSAGES.ACCESS_DENIED, HttpStatus.FORBIDDEN, { path });
      }
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.FOLDER_DELETION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR, {
        path,
        error: errorMessage(error),
      });
    }
  }
}

export default WikiFolderService;
