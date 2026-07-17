/*
 * Copyright (C) [2025] [Netzint GmbH]
 * All rights reserved.
 *
 * This software is dual-licensed under the terms of:
 *
 * 1. The GNU Affero General Public License (AGPL-3.0-or-later), as published by the Free Software Foundation.
 *    You may use, modify and distribute this software under the terms of the AGPL, provided that you comply with its conditions.
 *
 *    A copy of the license can be found at: https://www.gnu.org/licenses/agpl-3.0.html
 *
 * OR
 *
 * 2. A commercial license agreement with Netzint GmbH. Licensees holding a valid commercial license from Netzint GmbH
 *    may use this software in accordance with the terms contained in such written agreement, without the obligations imposed by the AGPL.
 *
 * If you are uncertain which license applies to your use case, please contact us at info@netzint.de for clarification.
 */

import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { OnEvent } from '@nestjs/event-emitter';
import FileSharingErrorMessage from '@libs/filesharing/types/fileSharingErrorMessage';
import { DirectoryFileDTO } from '@libs/filesharing/types/directoryFileDTO';
import { WebdavStatusResponse } from '@libs/filesharing/types/fileOperationResult';
import {
  HTTP_HEADERS,
  HttpMethods,
  HttpMethodsWebDav,
  RequestResponseContentType,
  ResponseType,
  WebdavRequestDepth,
} from '@libs/common/types/http-methods';
import ContentType from '@libs/filesharing/types/contentType';
import FILE_PATHS from '@libs/filesharing/constants/file-paths';
import ErrorMessage from '@libs/error/errorMessage';
import DuplicateFileRequestDto from '@libs/filesharing/types/DuplicateFileRequestDto';
import mapToDirectories from '@libs/filesharing/utils/mapToDirectories';
import mapToDirectoryFiles from '@libs/filesharing/utils/mapToDirectoryFiles';
import DEFAULT_PROPFIND_XML from '@libs/filesharing/constants/defaultPropfindXml';
import WEBDAV_SHARE_TYPE from '@libs/filesharing/constants/webdavShareType';
import { Readable } from 'stream';
import EVENT_EMITTER_EVENTS from '@libs/appconfig/constants/eventEmitterEvents';
import got from 'got';
import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';
import CommonErrorMessages from '@libs/common/constants/common-error-messages';
import getPathWithoutWebdav from '@libs/filesharing/utils/getPathWithoutWebdav';
import buildNormalizedWebdavPath from '@libs/filesharing/utils/buildNormalizedWebdavPath';
import CustomHttpException from '../common/CustomHttpException';
import WebdavClientFactory from './webdav.client.factory';
import UsersService from '../users/users.service';
import WebdavSharesService from './shares/webdav-shares.service';
import WebdavEtagConflictError from './errors/WebdavEtagConflictError';
import WebdavFileAlreadyExistsError from './errors/WebdavFileAlreadyExistsError';

const WEBDAV_REQUEST_TIMEOUT_MS = 30_000;

const isReadSuccessStatus = (status: number): boolean =>
  status < Number(HttpStatus.BAD_REQUEST) ||
  status === Number(HttpStatus.PARTIAL_CONTENT) ||
  status === Number(HttpStatus.NOT_MODIFIED);

const isWriteAcceptableStatus = (status: number): boolean => status < Number(HttpStatus.INTERNAL_SERVER_ERROR);

@Injectable()
class WebdavService {
  private webdavClientCache = new Map<string, { client: AxiosInstance; timeout: NodeJS.Timeout }>();

  constructor(
    private readonly usersService: UsersService,
    private readonly webdavSharesService: WebdavSharesService,
  ) {}

  @OnEvent(EVENT_EMITTER_EVENTS.WEBDAV_BASEURL_CHANGED)
  invalidateClientCache() {
    this.webdavClientCache.clear();
  }

  static async executeWebdavRequest<Raw = unknown, Result = Raw>(
    client: AxiosInstance,
    config: {
      method: string;
      url?: string;
      data?: string | Record<string, unknown> | Readable | Buffer;
      headers?: Record<string, string | number>;
      maxContentLength?: number;
      maxBodyLength?: number;
      timeout?: number;
    },
    fileSharingErrorMessage: ErrorMessage,
    transformer?: (data: Raw) => Result,
  ): Promise<Result | WebdavStatusResponse> {
    try {
      const response = await client.request<Raw>(config);
      WebdavService.handleWebDAVError(response);
      return transformer ? transformer(response.data) : (response.data as unknown as Result);
    } catch (error) {
      throw new CustomHttpException(
        fileSharingErrorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR,
        (error as Error).message,
        WebdavService.name,
      );
    }
  }

  private static handleWebDAVError(response: AxiosResponse) {
    if (!response || response.status < 200 || response.status >= 300) {
      throw new CustomHttpException(
        FileSharingErrorMessage.WebDavError,
        HttpStatus.INTERNAL_SERVER_ERROR,
        response?.statusText || 'WebDAV request failed',
        WebdavService.name,
      );
    }
  }

  scheduleClientTimeout(token: string): NodeJS.Timeout {
    return setTimeout(
      () => {
        this.webdavClientCache.delete(token);
      },
      30 * 60 * 1000,
    );
  }

  async initializeClient(username: string, share: string): Promise<void> {
    const password = await this.usersService.getPassword(username);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const client = WebdavClientFactory.createWebdavClient(webdavShare.url, username, password);
    const timeout = this.scheduleClientTimeout(username);
    this.webdavClientCache.set(username, { client, timeout });
  }

  public async getClient(username: string, share: string): Promise<AxiosInstance> {
    if (!this.webdavClientCache.has(username)) {
      await this.initializeClient(username, share);
    } else {
      clearTimeout(this.webdavClientCache.get(username)!.timeout);
      this.webdavClientCache.get(username)!.timeout = this.scheduleClientTimeout(username);
    }
    const client = this.webdavClientCache.get(username)?.client;
    if (!client) {
      throw new CustomHttpException(
        FileSharingErrorMessage.WebDavError,
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Failed to initialize WebDAV client for user: ${username}`,
      );
    }
    return client;
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  getPathUntilFolder(fullPath: string, folderName: string): string {
    const segments = fullPath.split('/');
    const index = segments.indexOf(folderName);

    if (index === -1) {
      return fullPath;
    }
    const partialSegments = segments.slice(0, index + 1);
    return partialSegments.join('/');
  }

  async ensureFolderExists(username: string, basePath: string, folderName: string, share: string) {
    const directories = await this.getDirectoryAtPath(username, `${basePath}/`, share);
    const exists = directories.some((item) => item.type === ContentType.DIRECTORY && item.filename === folderName);
    if (!exists) {
      Logger.verbose(`Creating folder '${folderName}' at '${basePath}'`, WebdavService.name);
      await this.createFolder(username, basePath, folderName, share);
    }
  }

  static safeJoinUrl(base: string, path: string, trailingSlash = true) {
    try {
      const cleanedPath = (path || '').replace(/^\/+/, '').replace(/\/+$/, '');

      const encodedPath = cleanedPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');

      let finalPath = '';
      if (encodedPath) {
        finalPath = trailingSlash ? `${encodedPath}/` : encodedPath;
      }

      return new URL(finalPath, base).href;
    } catch (err) {
      Logger.error(`Invalid URL input (base="${base}", path="${path}")`, WebdavService.name);
      return base;
    }
  }

  async getFilesAtPath(username: string, path: string, share: string): Promise<DirectoryFileDTO[]> {
    const client = await this.getClient(username, share);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const pathWithoutWebdav = getPathWithoutWebdav(path, webdavShare.pathname);
    const url = WebdavService.safeJoinUrl(webdavShare.url, pathWithoutWebdav);

    return (await WebdavService.executeWebdavRequest<string, DirectoryFileDTO[]>(
      client,
      {
        method: HttpMethodsWebDav.PROPFIND,
        url,
        data: DEFAULT_PROPFIND_XML,
        headers: {
          [HTTP_HEADERS.Depth]: WebdavRequestDepth.ONE_LEVEL,
        },
      },
      FileSharingErrorMessage.FileNotFound,
      mapToDirectoryFiles,
    )) as DirectoryFileDTO[];
  }

  async getDirectoryAtPath(username: string, path: string, share: string): Promise<DirectoryFileDTO[]> {
    const client = await this.getClient(username, share);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const pathWithoutWebdav = getPathWithoutWebdav(path, webdavShare.pathname);
    const url = WebdavService.safeJoinUrl(webdavShare.url, pathWithoutWebdav);

    try {
      return (await WebdavService.executeWebdavRequest<string, DirectoryFileDTO[]>(
        client,
        {
          method: HttpMethodsWebDav.PROPFIND,
          url,
          data: DEFAULT_PROPFIND_XML,
          headers: {
            [HTTP_HEADERS.Depth]: WebdavRequestDepth.ONE_LEVEL,
          },
        },
        FileSharingErrorMessage.FolderNotFound,
        mapToDirectories,
      )) as DirectoryFileDTO[];
    } catch (error) {
      return [];
    }
  }

  static dropSelfReference(entries: DirectoryFileDTO[], requestUrl: string): DirectoryFileDTO[] {
    const stripTrailing = (value: string): string => value.replace(/\/+$/, '');
    let requestPathname: string;
    try {
      requestPathname = stripTrailing(decodeURIComponent(new URL(requestUrl).pathname));
    } catch {
      return entries;
    }
    return entries.filter((entry) => {
      let entryPath = entry.filePath;
      if (entryPath.startsWith('http://') || entryPath.startsWith('https://')) {
        try {
          entryPath = decodeURIComponent(new URL(entryPath).pathname);
        } catch {
          return true;
        }
      }
      return stripTrailing(entryPath) !== requestPathname;
    });
  }

  async probeFolder(username: string, path: string, share: string): Promise<DirectoryFileDTO[] | null> {
    const client = await this.getClient(username, share);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const pathWithoutWebdav = getPathWithoutWebdav(path, webdavShare.pathname);
    const url = WebdavService.safeJoinUrl(webdavShare.url, pathWithoutWebdav);

    try {
      const response = await client.request<string>({
        method: HttpMethodsWebDav.PROPFIND,
        url,
        data: DEFAULT_PROPFIND_XML,
        headers: { [HTTP_HEADERS.Depth]: WebdavRequestDepth.ONE_LEVEL },
        validateStatus: isReadSuccessStatus,
        timeout: WEBDAV_REQUEST_TIMEOUT_MS,
      });
      const entries = mapToDirectoryFiles(response.data);
      return WebdavService.dropSelfReference(entries, url);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === Number(HttpStatus.NOT_FOUND)) {
        return null;
      }
      throw error;
    }
  }

  async getFileContentWithRange(
    username: string,
    relativePath: string,
    share: string,
    options: { rangeBytes?: [number, number] } = {},
  ): Promise<{ content: string; etag: string; mtime: number; totalBytes: number | null; truncated: boolean }> {
    const client = await this.getClient(username, share);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const pathWithoutWebdav = getPathWithoutWebdav(relativePath, webdavShare.pathname);
    const url = WebdavService.safeJoinUrl(webdavShare.url, pathWithoutWebdav, false);
    const headers: Record<string, string> = {};
    if (options.rangeBytes) {
      const [from, to] = options.rangeBytes;
      headers[HTTP_HEADERS.Range] = `bytes=${from}-${to}`;
    }

    try {
      const response = await client.request<string>({
        method: HttpMethods.GET,
        url,
        headers,
        responseType: ResponseType.TEXT,
        transformResponse: [(data: unknown) => (typeof data === 'string' ? data : String(data ?? ''))],
        validateStatus: isReadSuccessStatus,
        timeout: WEBDAV_REQUEST_TIMEOUT_MS,
      });
      const responseHeaders = response.headers as unknown as Record<string, string | undefined>;
      const etag = responseHeaders.etag ?? '';
      const lastModified = responseHeaders[HTTP_HEADERS.LastModified];
      const parsedMtime = lastModified ? Date.parse(lastModified) : NaN;
      const mtime = Number.isFinite(parsedMtime) ? parsedMtime : 0;
      const content = typeof response.data === 'string' ? response.data : String(response.data ?? '');
      const contentRange = responseHeaders['content-range'] ?? '';
      const totalMatch = /\/(\d+)$/.exec(contentRange);
      const totalBytes = totalMatch ? Number(totalMatch[1]) : null;
      const requestedTo = options.rangeBytes ? options.rangeBytes[1] : null;
      const truncated =
        response.status === Number(HttpStatus.PARTIAL_CONTENT) &&
        totalBytes !== null &&
        requestedTo !== null &&
        totalBytes > requestedTo + 1;
      return { content, etag, mtime, totalBytes, truncated };
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      Logger.debug(
        `WebDAV getFileContentWithRange failed: GET ${url} status=${status} error=${String(error)}`,
        WebdavService.name,
      );
      throw new CustomHttpException(
        FileSharingErrorMessage.FileNotFound,
        status === Number(HttpStatus.NOT_FOUND) ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR,
        `GET ${url} → status=${status}`,
        WebdavService.name,
      );
    }
  }

  async putFileWithEtag(
    username: string,
    relativePath: string,
    share: string,
    content: string,
    options: { ifMatch?: string; ifNoneMatch?: string } = {},
  ): Promise<{ etag: string; mtime: number }> {
    const client = await this.getClient(username, share);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const pathWithoutWebdav = getPathWithoutWebdav(relativePath, webdavShare.pathname);
    const url = WebdavService.safeJoinUrl(webdavShare.url, pathWithoutWebdav, false);
    const headers: Record<string, string> = {
      [HTTP_HEADERS.ContentType]: `${RequestResponseContentType.TEXT_MARKDOWN}; charset=utf-8`,
    };
    if (options.ifMatch) {
      headers[HTTP_HEADERS.IfMatch] = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      headers[HTTP_HEADERS.IfNoneMatch] = options.ifNoneMatch;
    }

    try {
      const response = await client.request<string>({
        method: HttpMethods.PUT,
        url,
        data: content,
        headers,
        validateStatus: isWriteAcceptableStatus,
        timeout: WEBDAV_REQUEST_TIMEOUT_MS,
      });

      if (response.status === Number(HttpStatus.PRECONDITION_FAILED)) {
        if (options.ifNoneMatch) {
          throw new WebdavFileAlreadyExistsError(relativePath);
        }
        const fresh = await this.getFileContentWithRange(username, relativePath, share, {});
        Logger.warn(
          `PUT ${url} 412: client If-Match=${options.ifMatch ?? '<none>'} server etag=${fresh.etag} content-bytes=${fresh.content.length}`,
          WebdavService.name,
        );
        throw new WebdavEtagConflictError({ currentEtag: fresh.etag, serverContent: fresh.content });
      }

      if (response.status >= Number(HttpStatus.AMBIGUOUS)) {
        throw new CustomHttpException(
          FileSharingErrorMessage.UploadFailed,
          response.status as HttpStatus,
          `PUT ${url} → status=${response.status}`,
          WebdavService.name,
        );
      }

      const responseHeaders = response.headers as unknown as Record<string, string | undefined>;
      const etag = responseHeaders.etag ?? '';
      const lastModified = responseHeaders[HTTP_HEADERS.LastModified];
      const parsedMtime = lastModified ? Date.parse(lastModified) : NaN;
      const mtime = Number.isFinite(parsedMtime) ? parsedMtime : Date.now();
      return { etag, mtime };
    } catch (error) {
      if (
        error instanceof WebdavEtagConflictError ||
        error instanceof WebdavFileAlreadyExistsError ||
        error instanceof CustomHttpException
      ) {
        throw error;
      }
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      Logger.debug(
        `WebDAV putFileWithEtag failed: PUT ${url} status=${status} error=${String(error)}`,
        WebdavService.name,
      );
      throw new CustomHttpException(
        FileSharingErrorMessage.UploadFailed,
        HttpStatus.INTERNAL_SERVER_ERROR,
        `PUT ${url} → status=${status}`,
        WebdavService.name,
      );
    }
  }

  async createFolder(username: string, path: string, folderName: string, share: string): Promise<WebdavStatusResponse> {
    const client = await this.getClient(username, share);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const basePath = getPathWithoutWebdav(path, webdavShare.pathname);
    const encodedPath = WebdavService.safeJoinUrl(webdavShare.url, basePath);
    const encodedFolder = encodeURIComponent(folderName.trim());

    const fullUrl = `${encodedPath}${encodedFolder}`;

    return WebdavService.executeWebdavRequest<WebdavStatusResponse>(
      client,
      {
        method: HttpMethodsWebDav.MKCOL,
        url: fullUrl,
      },
      FileSharingErrorMessage.FolderCreationFailed,
      (resp: WebdavStatusResponse) => ({
        success: resp?.status >= 200 && resp?.status < 300,
        status: resp.status,
      }),
    );
  }

  async uploadFile(
    username: string,
    fullPath: string,
    fileStream: Readable,
    share: string,
    contentType: string,
    totalSize?: number,
    onProgress?: (transferred: number, total?: number) => void,
  ): Promise<WebdavStatusResponse> {
    const password = await this.usersService.getPassword(username);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const url = WebdavService.safeJoinUrl(webdavShare.url, fullPath);

    const headers: Record<string, string> = { [HTTP_HEADERS.ContentType]: contentType };
    if (totalSize && Number.isFinite(totalSize) && totalSize > 0) {
      headers[HTTP_HEADERS.ContentLength] = String(totalSize);
    }

    try {
      const request = got.put(url, {
        agent: {
          http: new HttpAgent({ keepAlive: true }),
          https: new HttpsAgent({ keepAlive: true, rejectUnauthorized: false }),
        },
        body: fileStream,
        headers,
        username,
        password,
        http2: false,
        retry: { limit: 0 },
        throwHttpErrors: true,
        decompress: false,
      });
      fileStream.on('aborted', () => request.cancel());
      fileStream.on('error', () => request.cancel());

      void request.on('uploadProgress', (p) => onProgress?.(p.transferred, p.total));

      const response = await request;
      const ok = response.statusCode >= 200 && response.statusCode < 300;
      return { success: ok, status: response.statusCode, filename: fullPath.split('/').pop() || '' };
    } catch (error) {
      let message;

      if (error instanceof Error) {
        message = error.message;
      } else {
        message = String(error);
      }

      throw new CustomHttpException(
        CommonErrorMessages.FILE_CREATION_FAILED,
        HttpStatus.FORBIDDEN,
        message,
        WebdavService.name,
      );
    }
  }

  async deletePath(username: string, relativePath: string, share: string): Promise<WebdavStatusResponse> {
    const client = await this.getClient(username, share);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const encodedPath = buildNormalizedWebdavPath(relativePath);
    const url = `${webdavShare.url.replace(/\/+$/, '')}/${encodedPath.replace(/^\/+/, '')}`;

    return WebdavService.executeWebdavRequest<WebdavStatusResponse>(
      client,
      {
        method: HttpMethods.DELETE,
        url,
        headers: { [HTTP_HEADERS.ContentType]: RequestResponseContentType.APPLICATION_X_WWW_FORM_URLENCODED },
      },
      FileSharingErrorMessage.DeletionFailed,
      (resp: WebdavStatusResponse) => ({
        success: resp.status >= 200 && resp.status < 300,
        status: resp.status,
      }),
    );
  }

  async moveOrRenameResource(
    username: string,
    originFullPath: string,
    destFullPath: string,
    share: string,
  ): Promise<WebdavStatusResponse> {
    const client = await this.getClient(username, share);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const encodedDest = buildNormalizedWebdavPath(destFullPath);
    let destinationUrl = encodedDest;
    if (webdavShare.type === WEBDAV_SHARE_TYPE.EDU_FILE_PROXY) {
      destinationUrl = `${webdavShare.url.replace(/\/+$/, '')}/${encodedDest.replace(/^\/+/, '')}`;
    }
    return WebdavService.executeWebdavRequest<WebdavStatusResponse>(
      client,
      {
        method: HttpMethodsWebDav.MOVE,
        url: buildNormalizedWebdavPath(originFullPath),
        headers: {
          Destination: destinationUrl,
          Overwrite: 'T',
          [HTTP_HEADERS.ContentType]: RequestResponseContentType.APPLICATION_X_WWW_FORM_URLENCODED,
        },
      },
      FileSharingErrorMessage.RenameFailed,
      (resp: WebdavStatusResponse) => ({
        success: resp.status >= 200 && resp.status < 300,
        status: resp.status,
      }),
    );
  }

  async copyFileViaWebDAV(
    username: string,
    originFullPath: string,
    destFullPath: string,
    share: string,
  ): Promise<WebdavStatusResponse> {
    const client = await this.getClient(username, share);
    const webdavShare = await this.webdavSharesService.getWebdavShareFromCache(share);
    const encodedDest = buildNormalizedWebdavPath(destFullPath);
    let destinationUrl = encodedDest;
    if (webdavShare.type === WEBDAV_SHARE_TYPE.EDU_FILE_PROXY) {
      destinationUrl = `${webdavShare.url.replace(/\/+$/, '')}/${encodedDest.replace(/^\/+/, '')}`;
    }
    return WebdavService.executeWebdavRequest<WebdavStatusResponse>(
      client,
      {
        method: HttpMethodsWebDav.COPY,
        url: buildNormalizedWebdavPath(originFullPath),
        headers: {
          Destination: destinationUrl,
          [HTTP_HEADERS.ContentType]: RequestResponseContentType.APPLICATION_X_WWW_FORM_URLENCODED,
        },
      },
      FileSharingErrorMessage.DuplicateFailed,
      (resp: WebdavStatusResponse) => ({
        success: resp.status >= 200 && resp.status < 300,
        status: resp.status,
      }),
    );
  }

  async createCollectFolderIfNotExists(username: string, destinationPath: string, share: string) {
    const sanitizedDestinationPath = destinationPath.replace(`${FILE_PATHS.COLLECT}/`, '');
    const pathWithoutFilename = sanitizedDestinationPath.slice(0, sanitizedDestinationPath.lastIndexOf('/'));

    try {
      await this.ensureFolderExists(username, `${pathWithoutFilename}/`, FILE_PATHS.COLLECT, share);
    } catch (error) {
      throw new CustomHttpException(
        FileSharingErrorMessage.CreationFailed,
        HttpStatus.NOT_FOUND,
        pathWithoutFilename,
        WebdavService.name,
      );
    }
  }

  async cutCollectedItems(
    username: string,
    originFullPath: string,
    newFullPath: string,
    share: string,
  ): Promise<WebdavStatusResponse> {
    await this.createCollectFolderIfNotExists(username, originFullPath, share);
    await this.moveOrRenameResource(username, originFullPath, newFullPath, share);
    return this.createFolder(username, originFullPath.replace(FILE_PATHS.COLLECT, ''), FILE_PATHS.COLLECT, share);
  }

  async copyCollectedItems(
    username: string,
    duplicateFile: DuplicateFileRequestDto,
    share: string,
  ): Promise<WebdavStatusResponse> {
    const duplicationPromises = duplicateFile.destinationFilePaths.map(async (destinationPath) => {
      await this.copyFileViaWebDAV(username, duplicateFile.originFilePath, destinationPath, share);
    });

    try {
      await Promise.all(duplicationPromises);
      return { success: true, status: HttpStatus.OK };
    } catch (error) {
      throw new CustomHttpException(FileSharingErrorMessage.SharingFailed, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getFileTypeFromWebdavPath(
    username: string,
    fullPath: string,
    filepath: string,
    share: string,
  ): Promise<ContentType | undefined> {
    const files = await this.getFilesAtPath(username, fullPath, share);
    const matchedFile = files.find((file) => file.filePath === filepath);
    return matchedFile?.type === ContentType.FILE ? ContentType.FILE : ContentType.DIRECTORY;
  }
}

export default WebdavService;
