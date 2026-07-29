/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Injectable } from '@nestjs/common';
import { DirectoryFileDTO } from '@libs/filesharing/types/directoryFileDTO';
import ContentType from '@libs/filesharing/types/contentType';
import WIKI_CONSTANTS from '@libs/wiki/constants/wikiConstants';
import { WIKI_NODE_TYPE } from '@libs/wiki/constants/wikiNodeType';
import WIKI_ERROR_MESSAGES from '@libs/wiki/constants/wikiErrorMessages';
import stripSlashes from '@libs/common/utils/stripSlashes';
import type WikiTreeChildDto from '@libs/wiki/types/wikiTreeChildDto';
import CustomHttpException from '../common/CustomHttpException';
import WebdavService from '../webdav/webdav.service';
import WebdavSharesService from '../webdav/shares/webdav-shares.service';
import resolveWikiPath, { joinWikiPath } from './resolveWikiPath';
import wrapWikiPathOp from './wrapWikiPathOp';
import assertShareAccessible from './assertShareAccessible';
import { buildWikiFolderDiskPath } from './wikiDiskPaths';
import extractTitleFromMarkdown from './extractTitleFromMarkdown';

const TITLE_CACHE_MAX_ENTRIES = 5000;
const INDEX_PROBE_CACHE_MAX_ENTRIES = 5000;
const TITLE_PROBE_RANGE: [number, number] = [0, 2048];

interface IndexProbeResult {
  exists: boolean;
  indexLastModified: string | undefined;
}

@Injectable()
class WikiTreeService {
  private titleCache = new Map<string, string>();

  private indexProbeCache = new Map<string, IndexProbeResult>();

  constructor(
    private readonly webdavService: WebdavService,
    private readonly webdavSharesService: WebdavSharesService,
  ) {}

  async listChildren(username: string, userGroups: string[], path: string): Promise<WikiTreeChildDto[]> {
    const { share, relativePath } = wrapWikiPathOp(() => resolveWikiPath(path));
    await assertShareAccessible(this.webdavSharesService, share, userGroups);

    const folderEntries = await this.readDirectorySafe(username, share, relativePath);
    const folderLeaves = folderEntries.filter((entry) => !entry.filename.startsWith('.'));

    const folderReads = await Promise.all(
      folderLeaves
        .filter((entry) => WikiTreeService.isDirectory(entry))
        .filter((entry) => entry.filename !== WIKI_CONSTANTS.WIKI_FOLDER_NAME)
        .map(async (entry): Promise<WikiTreeChildDto> => {
          const childRel = WikiTreeService.joinRelative(relativePath, entry.filename);
          const folderInfo = await this.resolveFolderIndex(username, share, childRel, entry.filename, entry.lastmod);
          return {
            type: WIKI_NODE_TYPE.FOLDER,
            name: folderInfo.displayName,
            path: joinWikiPath(share, childRel),
            mtime: WikiTreeService.toMtime(entry.lastmod),
            hasIndex: folderInfo.hasIndex,
          };
        }),
    );

    const wikiFolderEntries = await this.readWikiFolder(username, share, relativePath);
    const mdReads = await Promise.all(
      wikiFolderEntries
        .filter((entry) => WikiTreeService.isMarkdownFile(entry))
        .filter((entry) => !WikiTreeService.isIndexFile(entry))
        .map(async (entry): Promise<WikiTreeChildDto> => {
          const slug = entry.filename.slice(0, -WIKI_CONSTANTS.MARKDOWN_EXTENSION.length);
          const pageRel = WikiTreeService.joinRelative(relativePath, slug);
          const diskRel = `${WikiTreeService.joinRelative(relativePath, WIKI_CONSTANTS.WIKI_FOLDER_NAME)}/${entry.filename}`;
          const title = await this.readPageTitleOrFallback(username, share, diskRel, slug, entry.lastmod);
          return {
            type: WIKI_NODE_TYPE.PAGE,
            name: title,
            path: joinWikiPath(share, pageRel),
            mtime: WikiTreeService.toMtime(entry.lastmod),
          };
        }),
    );

    return [...folderReads, ...mdReads].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === WIKI_NODE_TYPE.FOLDER ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private async resolveFolderIndex(
    username: string,
    share: string,
    folderRelativePath: string,
    folderName: string,
    folderMtime: string | undefined,
  ): Promise<{ hasIndex: boolean; displayName: string }> {
    const probe = await this.probeFolderIndex(username, share, folderRelativePath, folderMtime);
    if (!probe.exists) {
      return { hasIndex: false, displayName: folderName };
    }
    const indexDiskRel = WikiTreeService.buildIndexDiskRel(folderRelativePath);
    const displayName = await this.readPageTitleOrFallback(
      username,
      share,
      indexDiskRel,
      folderName,
      probe.indexLastModified,
    );
    return { hasIndex: true, displayName };
  }

  private async probeFolderIndex(
    username: string,
    share: string,
    folderRelativePath: string,
    folderMtime: string | undefined,
  ): Promise<IndexProbeResult> {
    const cacheKey = folderMtime
      ? WikiTreeService.indexProbeCacheKey(share, folderRelativePath, folderMtime)
      : undefined;
    if (cacheKey) {
      const cached = this.readCachedIndexProbe(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    const indexDiskRel = WikiTreeService.buildIndexDiskRel(folderRelativePath);
    let result: IndexProbeResult;
    try {
      const probe = await this.webdavService.probeFile(username, indexDiskRel, share);
      result = probe
        ? { exists: true, indexLastModified: probe.lastModified }
        : { exists: false, indexLastModified: undefined };
    } catch {
      result = { exists: false, indexLastModified: undefined };
    }

    if (cacheKey) {
      this.writeCachedIndexProbe(cacheKey, result);
    }
    return result;
  }

  private async readDirectorySafe(username: string, share: string, relativePath: string): Promise<DirectoryFileDTO[]> {
    try {
      return await this.webdavService.getFilesAtPath(username, relativePath || '/', share);
    } catch (error) {
      const status = error instanceof CustomHttpException ? error.getStatus() : undefined;
      if (status === Number(HttpStatus.NOT_FOUND)) {
        throw new CustomHttpException(WIKI_ERROR_MESSAGES.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND, {
          share,
          relativePath,
        });
      }
      throw error;
    }
  }

  private async readWikiFolder(
    username: string,
    share: string,
    parentRelativePath: string,
  ): Promise<DirectoryFileDTO[]> {
    const wikiDiskPath = wrapWikiPathOp(() => buildWikiFolderDiskPath(parentRelativePath));
    const entries = await this.webdavService.probeFolder(username, wikiDiskPath, share);
    return entries ?? [];
  }

  private async readPageTitleOrFallback(
    username: string,
    share: string,
    diskRelativePath: string,
    fallback: string,
    lastmod: string | undefined,
  ): Promise<string> {
    const cacheKey = WikiTreeService.titleCacheKey(share, diskRelativePath, lastmod);
    const cached = this.readCachedTitle(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    try {
      const { content } = await this.webdavService.getFileContentWithRange(username, diskRelativePath, share, {
        rangeBytes: TITLE_PROBE_RANGE,
      });
      const title = extractTitleFromMarkdown(content) || fallback;
      this.writeCachedTitle(cacheKey, title);
      return title;
    } catch {
      return fallback;
    }
  }

  private readCachedTitle(key: string): string | undefined {
    const hit = this.titleCache.get(key);
    if (hit === undefined) {
      return undefined;
    }
    this.titleCache.delete(key);
    this.titleCache.set(key, hit);
    return hit;
  }

  private writeCachedTitle(key: string, title: string): void {
    this.titleCache.set(key, title);
    while (this.titleCache.size > TITLE_CACHE_MAX_ENTRIES) {
      const oldestKey = this.titleCache.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.titleCache.delete(oldestKey);
    }
  }

  private readCachedIndexProbe(key: string): IndexProbeResult | undefined {
    const hit = this.indexProbeCache.get(key);
    if (hit === undefined) {
      return undefined;
    }
    this.indexProbeCache.delete(key);
    this.indexProbeCache.set(key, hit);
    return hit;
  }

  private writeCachedIndexProbe(key: string, value: IndexProbeResult): void {
    this.indexProbeCache.set(key, value);
    while (this.indexProbeCache.size > INDEX_PROBE_CACHE_MAX_ENTRIES) {
      const oldestKey = this.indexProbeCache.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.indexProbeCache.delete(oldestKey);
    }
  }

  private static titleCacheKey(share: string, diskRelativePath: string, mtime: string | undefined): string {
    return `${share}:${diskRelativePath}:${mtime ?? ''}`;
  }

  private static indexProbeCacheKey(share: string, folderRelativePath: string, folderMtime: string): string {
    return `${share}:${folderRelativePath}:${folderMtime}`;
  }

  private static buildIndexDiskRel(folderRelativePath: string): string {
    const wikiFolder = WikiTreeService.joinRelative(folderRelativePath, WIKI_CONSTANTS.WIKI_FOLDER_NAME);
    return `${wikiFolder}/${WIKI_CONSTANTS.INDEX_PAGE_SLUG}${WIKI_CONSTANTS.MARKDOWN_EXTENSION}`;
  }

  private static isIndexFile(entry: DirectoryFileDTO): boolean {
    return (
      entry.type !== ContentType.DIRECTORY &&
      entry.filename.toLowerCase() === `${WIKI_CONSTANTS.INDEX_PAGE_SLUG}${WIKI_CONSTANTS.MARKDOWN_EXTENSION}`
    );
  }

  private static isDirectory(entry: DirectoryFileDTO): boolean {
    return entry.type === ContentType.DIRECTORY;
  }

  private static isMarkdownFile(entry: DirectoryFileDTO): boolean {
    if (entry.type === ContentType.DIRECTORY) {
      return false;
    }
    return entry.filename.toLowerCase().endsWith(WIKI_CONSTANTS.MARKDOWN_EXTENSION);
  }

  private static joinRelative(parent: string, leaf: string): string {
    const clean = stripSlashes(parent);
    return clean ? `${clean}/${leaf}` : leaf;
  }

  private static toMtime(lastmod: string | undefined): number | undefined {
    if (!lastmod) {
      return undefined;
    }
    const parsed = Date.parse(lastmod);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}

export default WikiTreeService;
