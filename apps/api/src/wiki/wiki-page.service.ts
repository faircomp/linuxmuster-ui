/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Injectable } from '@nestjs/common';
import slugify from 'slugify';
import WIKI_CONSTANTS from '@libs/wiki/constants/wikiConstants';
import WIKI_ERROR_MESSAGES from '@libs/wiki/constants/wikiErrorMessages';
import stripSlashes from '@libs/common/utils/stripSlashes';
import type WikiPageDto from '@libs/wiki/types/wikiPageDto';
import CustomHttpException from '../common/CustomHttpException';
import WebdavService from '../webdav/webdav.service';
import WebdavSharesService from '../webdav/shares/webdav-shares.service';
import WebdavFileAlreadyExistsError from '../webdav/errors/WebdavFileAlreadyExistsError';
import resolveWikiPath, { joinWikiPath } from './resolveWikiPath';
import wrapWikiPathOp from './wrapWikiPathOp';
import assertShareAccessible from './assertShareAccessible';
import { buildPageDiskPath, buildWikiFolderDiskPath } from './wikiDiskPaths';
import extractTitleFromMarkdown from './extractTitleFromMarkdown';

const buildIndexPageDiskPath = (folderRelativePath: string): string =>
  `${buildWikiFolderDiskPath(folderRelativePath)}/${WIKI_CONSTANTS.INDEX_PAGE_SLUG}${WIKI_CONSTANTS.MARKDOWN_EXTENSION}`;

const errorStatus = (error: unknown): number | undefined =>
  error instanceof CustomHttpException ? error.getStatus() : undefined;

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

@Injectable()
class WikiPageService {
  constructor(
    private readonly webdavService: WebdavService,
    private readonly webdavSharesService: WebdavSharesService,
  ) {}

  async getPage(username: string, userGroups: string[], path: string): Promise<WikiPageDto> {
    const { share, relativePath } = wrapWikiPathOp(() => resolveWikiPath(path));
    await assertShareAccessible(this.webdavSharesService, share, userGroups);
    const resolved = await this.resolvePageDiskPath(username, share, relativePath);
    if (!resolved) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.PAGE_NOT_FOUND, HttpStatus.NOT_FOUND, { path });
    }

    try {
      const { content, etag, mtime, truncated, totalBytes } = await this.webdavService.getFileContentWithRange(
        username,
        resolved.diskPath,
        share,
        { rangeBytes: [0, WIKI_CONSTANTS.MAX_WIKI_PAGE_SIZE_BYTES - 1] },
      );
      if (truncated) {
        throw new CustomHttpException(WIKI_ERROR_MESSAGES.PAGE_TOO_LARGE, HttpStatus.PAYLOAD_TOO_LARGE, {
          path,
          totalBytes,
          maxBytes: WIKI_CONSTANTS.MAX_WIKI_PAGE_SIZE_BYTES,
        });
      }
      const title = extractTitleFromMarkdown(content) || WikiPageService.fallbackTitleFromPath(relativePath);
      return {
        path: joinWikiPath(share, relativePath),
        title,
        content,
        etag: etag || null,
        mtime,
        isIndex: resolved.isIndex,
      };
    } catch (error) {
      if (errorStatus(error) === Number(HttpStatus.NOT_FOUND)) {
        throw new CustomHttpException(WIKI_ERROR_MESSAGES.PAGE_NOT_FOUND, HttpStatus.NOT_FOUND, { path });
      }
      throw error;
    }
  }

  async createPage(
    username: string,
    userGroups: string[],
    parentPath: string,
    title: string,
    asIndex = false,
  ): Promise<WikiPageDto> {
    const { share, relativePath: parentRel } = wrapWikiPathOp(() => resolveWikiPath(parentPath));
    await assertShareAccessible(this.webdavSharesService, share, userGroups);
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.INVALID_NAME, HttpStatus.BAD_REQUEST, { title });
    }
    const slug = asIndex ? WIKI_CONSTANTS.INDEX_PAGE_SLUG : slugify(cleanTitle);
    if (!slug) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.INVALID_NAME, HttpStatus.BAD_REQUEST, { title });
    }
    if (!asIndex && slug === WIKI_CONSTANTS.INDEX_PAGE_SLUG) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.INVALID_NAME, HttpStatus.BAD_REQUEST, {
        parentPath,
        title: cleanTitle,
        reason: 'reserved-slug',
      });
    }

    const wikiFolderPath = wrapWikiPathOp(() => buildWikiFolderDiskPath(parentRel));
    await this.ensureWikiFolderExists(username, share, parentRel);
    const diskPath = `${wikiFolderPath}/${slug}${WIKI_CONSTANTS.MARKDOWN_EXTENSION}`;
    const seedContent = `# ${cleanTitle}\n\n`;

    try {
      const { etag, mtime } = await this.webdavService.putFileWithEtag(username, diskPath, share, seedContent, {
        ifNoneMatch: '*',
      });
      const returnRel = asIndex ? parentRel : WikiPageService.joinRelative(parentRel, slug);
      return {
        path: joinWikiPath(share, returnRel),
        title: cleanTitle,
        content: seedContent,
        etag: etag || null,
        mtime,
        isIndex: asIndex,
      };
    } catch (error) {
      if (error instanceof WebdavFileAlreadyExistsError) {
        throw new CustomHttpException(WIKI_ERROR_MESSAGES.PAGE_ALREADY_EXISTS, HttpStatus.CONFLICT, { parentPath, slug });
      }
      if (error instanceof CustomHttpException) {
        const status = error.getStatus();
        if (status === Number(HttpStatus.UNAUTHORIZED) || status === Number(HttpStatus.FORBIDDEN)) {
          throw new CustomHttpException(WIKI_ERROR_MESSAGES.ACCESS_DENIED, HttpStatus.FORBIDDEN, {
            parentPath,
            title: cleanTitle,
          });
        }
        throw error;
      }
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.PAGE_CREATION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR, {
        parentPath,
        title: cleanTitle,
        error: errorMessage(error),
      });
    }
  }

  async updatePage(
    username: string,
    userGroups: string[],
    path: string,
    content: string,
    etag: string | undefined,
  ): Promise<WikiPageDto> {
    if (!etag || !etag.trim()) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.PAGE_ETAG_MISSING, HttpStatus.PRECONDITION_REQUIRED, { path });
    }
    const { share, relativePath } = wrapWikiPathOp(() => resolveWikiPath(path));
    await assertShareAccessible(this.webdavSharesService, share, userGroups);
    const resolved = await this.resolvePageDiskPath(username, share, relativePath);
    if (!resolved) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.PAGE_NOT_FOUND, HttpStatus.NOT_FOUND, { path });
    }

    let newEtag: string;
    let mtime: number;
    try {
      ({ etag: newEtag, mtime } = await this.webdavService.putFileWithEtag(username, resolved.diskPath, share, content, {
        ifMatch: etag,
      }));
    } catch (error) {
      const status = errorStatus(error);
      if (status === Number(HttpStatus.UNAUTHORIZED) || status === Number(HttpStatus.FORBIDDEN)) {
        throw new CustomHttpException(WIKI_ERROR_MESSAGES.ACCESS_DENIED, HttpStatus.FORBIDDEN, { path });
      }
      throw error;
    }

    const title = extractTitleFromMarkdown(content) || WikiPageService.fallbackTitleFromPath(relativePath);
    return {
      path: joinWikiPath(share, relativePath),
      title,
      content,
      etag: newEtag || null,
      mtime,
      isIndex: resolved.isIndex,
    };
  }

  async deletePage(username: string, userGroups: string[], path: string): Promise<void> {
    const { share, relativePath } = wrapWikiPathOp(() => resolveWikiPath(path));
    await assertShareAccessible(this.webdavSharesService, share, userGroups);
    const resolved = await this.resolvePageDiskPath(username, share, relativePath);
    if (!resolved) {
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.PAGE_NOT_FOUND, HttpStatus.NOT_FOUND, { path });
    }

    try {
      await this.webdavService.deletePath(username, resolved.diskPath, share);
    } catch (error) {
      const status = errorStatus(error);
      if (status === Number(HttpStatus.NOT_FOUND)) {
        throw new CustomHttpException(WIKI_ERROR_MESSAGES.PAGE_NOT_FOUND, HttpStatus.NOT_FOUND, { path });
      }
      if (status === Number(HttpStatus.UNAUTHORIZED) || status === Number(HttpStatus.FORBIDDEN)) {
        throw new CustomHttpException(WIKI_ERROR_MESSAGES.ACCESS_DENIED, HttpStatus.FORBIDDEN, { path });
      }
      throw new CustomHttpException(WIKI_ERROR_MESSAGES.PAGE_DELETION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR, {
        path,
        error: errorMessage(error),
      });
    }
  }

  private async resolvePageDiskPath(
    username: string,
    share: string,
    relativePath: string,
  ): Promise<{ diskPath: string; isIndex: boolean } | null> {
    const regularPath = wrapWikiPathOp(() => buildPageDiskPath(relativePath));
    if ((await this.webdavService.probeFile(username, regularPath, share)) !== null) {
      return { diskPath: regularPath, isIndex: false };
    }
    const indexPath = wrapWikiPathOp(() => buildIndexPageDiskPath(relativePath));
    if ((await this.webdavService.probeFile(username, indexPath, share)) !== null) {
      return { diskPath: indexPath, isIndex: true };
    }
    return null;
  }

  private async ensureWikiFolderExists(username: string, share: string, parentRel: string): Promise<void> {
    const wikiFolderPath = wrapWikiPathOp(() => buildWikiFolderDiskPath(parentRel));
    if ((await this.webdavService.probeFolder(username, wikiFolderPath, share)) !== null) {
      return;
    }
    const clean = stripSlashes(parentRel);
    const parentDiskPath = clean ? `/${clean}` : '/';
    try {
      await this.webdavService.createFolder(username, parentDiskPath, WIKI_CONSTANTS.WIKI_FOLDER_NAME, share);
    } catch (error) {
      if ((await this.webdavService.probeFolder(username, wikiFolderPath, share)) !== null) {
        return;
      }
      throw error;
    }
  }

  private static joinRelative(parent: string, leaf: string): string {
    const clean = stripSlashes(parent);
    return clean ? `${clean}/${leaf}` : leaf;
  }

  private static fallbackTitleFromPath(relativePath: string): string {
    const clean = stripSlashes(relativePath);
    if (!clean) {
      return '';
    }
    const lastSlash = clean.lastIndexOf('/');
    return lastSlash === -1 ? clean : clean.slice(lastSlash + 1);
  }
}

export default WikiPageService;
