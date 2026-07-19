/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Agent as HttpsAgent } from 'https';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { HTTP_HEADERS, HttpMethods, RequestResponseContentType, ResponseType } from '@libs/common/types/http-methods';
import { LINBO_LMN_API_ENDPOINT } from '@libs/lmnApi/constants/lmnApiEndpoints';
import LmnApiErrorMessage from '@libs/lmnApi/types/lmnApiErrorMessage';
import type LmnApiJobResult from '@libs/lmnApi/types/lmn-api-job.result';
import CustomHttpException from '../../common/CustomHttpException';
import LmnApiRequestQueue from '../queue/lmn-api-request.queue';
import LmnApiQueueUpstreamError from '../queue/lmn-api-queue-upstream.error';
import LinboHealthResponseDto from './dto/linbo-health-response.dto';
import LinboChangesResponseDto from './dto/linbo-changes-response.dto';
import LinboServerInfoResponseDto from './dto/linbo-server-info-response.dto';
import LinboHostsQueryResponseDto from './dto/linbo-hosts-query-response.dto';
import LinboGrubConfigsResponseDto from './dto/linbo-grub-configs-response.dto';
import LinboStartConfsResponseDto from './dto/linbo-start-confs-response.dto';
import LinboImagesManifestResponseDto from './dto/linbo-images-manifest-response.dto';
import LinboDhcpIscExportResponseDto from './dto/linbo-dhcp-isc-export-response.dto';
import LinboUploadImageResponseDto from './dto/linbo-upload-image-response.dto';

const BINARY_DEFAULT_TIMEOUT_MS = 600_000;

const FORWARDABLE_CLIENT_STATUSES: number[] = [
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.NOT_FOUND,
  HttpStatus.PAYLOAD_TOO_LARGE,
  HttpStatus.UNPROCESSABLE_ENTITY,
  HttpStatus.TOO_MANY_REQUESTS,
];

@Injectable()
class LinboService {
  private readonly binaryClient: AxiosInstance;

  private readonly binaryTimeoutMs = +(process.env.LMN_API_BINARY_TIMEOUT_MS ?? BINARY_DEFAULT_TIMEOUT_MS);

  constructor(private readonly lmnApiQueue: LmnApiRequestQueue) {
    this.binaryClient = axios.create({
      baseURL: process.env.LMN_API_BASE_URL,
      httpsAgent: new HttpsAgent({ rejectUnauthorized: false }),
      timeout: this.binaryTimeoutMs,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  private static authHeaders(lmnApiToken: string): AxiosRequestConfig {
    return { headers: { [HTTP_HEADERS.XApiKey]: lmnApiToken } };
  }

  private static withSchool(
    school: string | undefined,
    base: AxiosRequestConfig,
    extraParams?: Record<string, unknown>,
  ): AxiosRequestConfig {
    const hasExtras = extraParams !== undefined && Object.keys(extraParams).length > 0;
    if (!school && !hasExtras) {
      return base;
    }
    const mergedParams: Record<string, unknown> = {
      ...((base.params as Record<string, unknown> | undefined) ?? {}),
      ...(extraParams ?? {}),
    };
    if (school) {
      mergedParams.school = school;
    }
    return { ...base, params: mergedParams };
  }

  private static mapAxiosError(
    error: unknown,
    fallbackMessage: LmnApiErrorMessage,
    data?: Record<string, unknown>,
  ): CustomHttpException {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const upstreamMessage = `${status ?? ''} ${JSON.stringify(error.response?.data ?? error.message)}`.trim();
      const enrichedData = data !== undefined ? { ...data, upstream: upstreamMessage } : upstreamMessage;
      if (typeof status === 'number' && FORWARDABLE_CLIENT_STATUSES.includes(status)) {
        return new CustomHttpException(fallbackMessage, status, enrichedData, LinboService.name);
      }
      return new CustomHttpException(fallbackMessage, HttpStatus.BAD_GATEWAY, enrichedData, LinboService.name);
    }
    if (error instanceof LmnApiQueueUpstreamError) {
      const { status } = error;
      const upstreamMessage = `${status} ${JSON.stringify(error.data ?? error.message)}`.trim();
      const enrichedData = data !== undefined ? { ...data, upstream: upstreamMessage } : upstreamMessage;
      if (FORWARDABLE_CLIENT_STATUSES.includes(status)) {
        return new CustomHttpException(fallbackMessage, status, enrichedData, LinboService.name);
      }
      return new CustomHttpException(fallbackMessage, HttpStatus.BAD_GATEWAY, enrichedData, LinboService.name);
    }
    const message = error instanceof Error ? error.message : undefined;
    const enrichedData = data !== undefined ? { ...data, upstream: message } : message;
    return new CustomHttpException(fallbackMessage, HttpStatus.BAD_GATEWAY, enrichedData, LinboService.name);
  }

  private request<T>(
    method: HttpMethods,
    endpoint: string,
    payload?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<LmnApiJobResult<T>> {
    return this.lmnApiQueue.enqueue<T>(method, endpoint, payload, config);
  }

  async getHealth(lmnApiToken: string, school?: string): Promise<LinboHealthResponseDto> {
    try {
      const response = await this.request<LinboHealthResponseDto>(
        HttpMethods.GET,
        `${LINBO_LMN_API_ENDPOINT}/health`,
        undefined,
        LinboService.withSchool(school, LinboService.authHeaders(lmnApiToken)),
      );
      return response.data;
    } catch (error) {
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.GetLinboHealthFailed);
    }
  }

  async getChanges(lmnApiToken: string, since?: string, school?: string): Promise<LinboChangesResponseDto> {
    try {
      const response = await this.request<LinboChangesResponseDto>(
        HttpMethods.GET,
        `${LINBO_LMN_API_ENDPOINT}/changes`,
        undefined,
        LinboService.withSchool(school, LinboService.authHeaders(lmnApiToken), { since }),
      );
      return response.data;
    } catch (error) {
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.GetLinboChangesFailed);
    }
  }

  async getServerInfo(lmnApiToken: string): Promise<LinboServerInfoResponseDto> {
    try {
      const response = await this.request<LinboServerInfoResponseDto>(
        HttpMethods.GET,
        `${LINBO_LMN_API_ENDPOINT}/server-info`,
        undefined,
        LinboService.authHeaders(lmnApiToken),
      );
      return response.data;
    } catch (error) {
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.GetLinboServerInfoFailed);
    }
  }

  async queryHosts(lmnApiToken: string, macs: string[], school?: string): Promise<LinboHostsQueryResponseDto> {
    try {
      const response = await this.request<LinboHostsQueryResponseDto>(
        HttpMethods.POST,
        `${LINBO_LMN_API_ENDPOINT}/hosts/query`,
        { macs },
        LinboService.withSchool(school, LinboService.authHeaders(lmnApiToken)),
      );
      return response.data;
    } catch (error) {
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.GetLinboHostsFailed);
    }
  }

  async getGrubConfigs(lmnApiToken: string, school?: string): Promise<LinboGrubConfigsResponseDto> {
    try {
      const response = await this.request<LinboGrubConfigsResponseDto>(
        HttpMethods.GET,
        `${LINBO_LMN_API_ENDPOINT}/grub-configs`,
        undefined,
        LinboService.withSchool(school, LinboService.authHeaders(lmnApiToken)),
      );
      return response.data;
    } catch (error) {
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.GetLinboGrubConfigsFailed);
    }
  }

  async getDhcpIscExport(lmnApiToken: string, school?: string): Promise<LinboDhcpIscExportResponseDto> {
    try {
      const response = await this.request<LinboDhcpIscExportResponseDto>(
        HttpMethods.GET,
        `${LINBO_LMN_API_ENDPOINT}/dhcp/export/isc-dhcp`,
        undefined,
        LinboService.withSchool(school, LinboService.authHeaders(lmnApiToken)),
      );
      return response.data;
    } catch (error) {
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.GetLinboDhcpExportFailed);
    }
  }

  async getDhcpDnsmasqExport(lmnApiToken: string, school?: string): Promise<string> {
    try {
      const response = await this.request<string>(
        HttpMethods.GET,
        `${LINBO_LMN_API_ENDPOINT}/dhcp/export/dnsmasq-proxy`,
        undefined,
        { ...LinboService.withSchool(school, LinboService.authHeaders(lmnApiToken)), responseType: ResponseType.TEXT },
      );
      return response.data;
    } catch (error) {
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.GetLinboDhcpExportFailed);
    }
  }

  async getStartConfs(lmnApiToken: string, ids?: string[], school?: string): Promise<LinboStartConfsResponseDto> {
    try {
      const response = await this.request<LinboStartConfsResponseDto>(
        HttpMethods.GET,
        `${LINBO_LMN_API_ENDPOINT}/startconfs`,
        undefined,
        LinboService.withSchool(school, LinboService.authHeaders(lmnApiToken), { id: ids }),
      );
      return response.data;
    } catch (error) {
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.GetLinboStartConfsFailed);
    }
  }

  async getImagesManifest(lmnApiToken: string): Promise<LinboImagesManifestResponseDto> {
    try {
      const response = await this.request<LinboImagesManifestResponseDto>(
        HttpMethods.GET,
        `${LINBO_LMN_API_ENDPOINT}/images/manifest`,
        undefined,
        LinboService.authHeaders(lmnApiToken),
      );
      return response.data;
    } catch (error) {
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.GetLinboImagesManifestFailed);
    }
  }

  async uploadImage(
    lmnApiToken: string,
    imageName: string,
    filename: string,
    file: Express.Multer.File,
  ): Promise<LinboUploadImageResponseDto> {
    if (!imageName || !filename || !file || !file.path || file.size === 0) {
      throw new CustomHttpException(
        LmnApiErrorMessage.UploadLinboImageFailed,
        HttpStatus.BAD_REQUEST,
        `${imageName}/${filename}`,
        LinboService.name,
      );
    }

    const safeImage = encodeURIComponent(imageName);
    const safeFile = encodeURIComponent(filename);
    const totalSize = file.size;
    const stream = createReadStream(file.path);

    try {
      await this.binaryClient.put(`${LINBO_LMN_API_ENDPOINT}/images/upload/${safeImage}/${safeFile}`, stream, {
        headers: {
          [HTTP_HEADERS.XApiKey]: lmnApiToken,
          [HTTP_HEADERS.ContentType]: RequestResponseContentType.APPLICATION_OCTET_STREAM,
          [HTTP_HEADERS.ContentLength]: String(totalSize),
          [HTTP_HEADERS.ContentRange]: `bytes 0-${totalSize - 1}/${totalSize}`,
        },
      });

      const completeResponse = await this.binaryClient.post(
        `${LINBO_LMN_API_ENDPOINT}/images/upload/${safeImage}/complete`,
        {},
        { headers: { [HTTP_HEADERS.XApiKey]: lmnApiToken } },
      );
      const upstream: unknown = completeResponse.data;
      const upstreamBytes = LinboService.extractUpstreamBytes(upstream);
      if (upstreamBytes !== undefined && upstreamBytes !== totalSize) {
        throw new CustomHttpException(
          LmnApiErrorMessage.UploadLinboImageFailed,
          HttpStatus.BAD_GATEWAY,
          { path: `${imageName}/${filename}`, localBytes: totalSize, upstreamBytes },
          LinboService.name,
        );
      }

      return { ok: true, bytesUploaded: totalSize, upstream };
    } catch (error) {
      if (error instanceof CustomHttpException) {
        throw error;
      }
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.UploadLinboImageFailed, {
        path: `${imageName}/${filename}`,
      });
    } finally {
      stream.destroy();
      await unlink(file.path).catch(() => {});
    }
  }

  private static extractUpstreamBytes(upstream: unknown): number | undefined {
    if (!upstream || typeof upstream !== 'object') {
      return undefined;
    }
    const candidate = upstream as Record<string, unknown>;
    const candidates = [candidate.bytesStored, candidate.bytesUploaded, candidate.size, candidate.sizeBytes];
    return candidates.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
  }

  async downloadImage(
    lmnApiToken: string,
    imageName: string,
    filename: string,
    signal?: AbortSignal,
  ): Promise<AxiosResponse> {
    try {
      return await this.binaryClient.get(
        `${LINBO_LMN_API_ENDPOINT}/images/download/${encodeURIComponent(imageName)}/${encodeURIComponent(filename)}`,
        {
          headers: { [HTTP_HEADERS.XApiKey]: lmnApiToken },
          responseType: ResponseType.STREAM,
          decompress: false,
          signal,
        },
      );
    } catch (error) {
      throw LinboService.mapAxiosError(error, LmnApiErrorMessage.DownloadLinboImageFailed, {
        path: `${imageName}/${filename}`,
      });
    }
  }
}

export default LinboService;
