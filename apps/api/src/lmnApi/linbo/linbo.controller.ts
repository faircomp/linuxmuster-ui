/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';
import type { Request, Response } from 'express';
import { HTTP_HEADERS, RequestResponseContentType } from '@libs/common/types/http-methods';
import LMN_API_EDU_API_ENDPOINTS from '@libs/lmnApi/constants/lmnApiEduApiEndpoints';
import SafePathSegmentPipe from '../../common/pipes/safe-path-segment.pipe';
import LinboService from './linbo.service';
import LinboBatchMacsDto from './dto/linbo-batch-macs.dto';
import LinboUploadImageBodyDto from './dto/linbo-upload-image-body.dto';
import LinboUploadImageResponseDto from './dto/linbo-upload-image-response.dto';
import LinboHealthResponseDto from './dto/linbo-health-response.dto';
import LinboChangesResponseDto from './dto/linbo-changes-response.dto';
import LinboServerInfoResponseDto from './dto/linbo-server-info-response.dto';
import LinboHostsQueryResponseDto from './dto/linbo-hosts-query-response.dto';
import LinboGrubConfigsResponseDto from './dto/linbo-grub-configs-response.dto';
import LinboStartConfsResponseDto from './dto/linbo-start-confs-response.dto';
import LinboImagesManifestResponseDto from './dto/linbo-images-manifest-response.dto';
import LinboDhcpIscExportResponseDto from './dto/linbo-dhcp-isc-export-response.dto';

const LINBO_ROUTE = LMN_API_EDU_API_ENDPOINTS.LINBO;
const SCHOOL_QUERY_PARAM = 'school';
const STARTCONF_ID_QUERY_PARAM = 'id';
const GIBIBYTE = 1024 ** 3;
const DEFAULT_LINBO_MAX_UPLOAD_BYTES = 100 * GIBIBYTE;
const LINBO_MAX_UPLOAD_BYTES = (() => {
  const raw = Number(process.env.LINBO_MAX_UPLOAD_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LINBO_MAX_UPLOAD_BYTES;
})();

const CLIENT_DISCONNECT_CODES = ['ECONNRESET', 'ERR_STREAM_PREMATURE_CLOSE'];

@ApiTags(LINBO_ROUTE)
@ApiBearerAuth()
@ApiHeader({ name: HTTP_HEADERS.XApiKey, description: 'LMN API authentication token', required: true })
@Controller(LINBO_ROUTE)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
class LinboController {
  constructor(private readonly linboService: LinboService) {}

  private static getCaseInsensitive(headers: Record<string, unknown>, name: string): unknown {
    if (headers[name] !== undefined) {
      return headers[name];
    }
    const lower = name.toLowerCase();
    if (headers[lower] !== undefined) {
      return headers[lower];
    }
    return undefined;
  }

  private static forwardHeader(res: Response, upstreamHeaders: Record<string, unknown>, name: string): void {
    const value = LinboController.getCaseInsensitive(upstreamHeaders, name);
    if (typeof value === 'string' && value.length > 0) {
      res.setHeader(name, value);
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Linbo subsystem health check' })
  @ApiQuery({ name: SCHOOL_QUERY_PARAM, required: false })
  @ApiResponse({ status: HttpStatus.OK, type: LinboHealthResponseDto })
  async getHealth(
    @Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string,
    @Query(SCHOOL_QUERY_PARAM) school?: string,
  ): Promise<LinboHealthResponseDto> {
    return this.linboService.getHealth(lmnApiToken, school);
  }

  @Get('changes')
  @ApiOperation({ summary: 'Delta feed for sync clients (since=0 returns full snapshot)' })
  @ApiQuery({ name: 'since', required: false, description: 'Cursor from previous sync; "0" for full snapshot' })
  @ApiQuery({ name: SCHOOL_QUERY_PARAM, required: false })
  @ApiResponse({ status: HttpStatus.OK, type: LinboChangesResponseDto })
  async getChanges(
    @Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string,
    @Query('since') since = '0',
    @Query(SCHOOL_QUERY_PARAM) school?: string,
  ): Promise<LinboChangesResponseDto> {
    return this.linboService.getChanges(lmnApiToken, since, school);
  }

  @Get('server-info')
  @ApiOperation({ summary: 'LMN server network info for auto-setup' })
  @ApiResponse({ status: HttpStatus.OK, type: LinboServerInfoResponseDto })
  async getServerInfo(@Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string): Promise<LinboServerInfoResponseDto> {
    return this.linboService.getServerInfo(lmnApiToken);
  }

  @Post('hosts/query')
  @ApiOperation({ summary: 'Query hosts by MAC address list (max 500)' })
  @ApiBody({ type: LinboBatchMacsDto })
  @ApiQuery({ name: SCHOOL_QUERY_PARAM, required: false })
  @ApiResponse({ status: HttpStatus.OK, type: LinboHostsQueryResponseDto })
  async queryHosts(
    @Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string,
    @Body() body: LinboBatchMacsDto,
    @Query(SCHOOL_QUERY_PARAM) school?: string,
  ): Promise<LinboHostsQueryResponseDto> {
    return this.linboService.queryHosts(lmnApiToken, body.macs, school);
  }

  @Get('grub-configs')
  @ApiOperation({ summary: 'All GRUB configs for a school' })
  @ApiQuery({ name: SCHOOL_QUERY_PARAM, required: false })
  @ApiResponse({ status: HttpStatus.OK, type: LinboGrubConfigsResponseDto })
  async getGrubConfigs(
    @Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string,
    @Query(SCHOOL_QUERY_PARAM) school?: string,
  ): Promise<LinboGrubConfigsResponseDto> {
    return this.linboService.getGrubConfigs(lmnApiToken, school);
  }

  @Get('dhcp/export/isc-dhcp')
  @ApiOperation({ summary: 'ISC DHCP export for school (subnets + per-host declarations)' })
  @ApiQuery({ name: SCHOOL_QUERY_PARAM, required: false })
  @ApiResponse({ status: HttpStatus.OK, type: LinboDhcpIscExportResponseDto })
  async getDhcpIscExport(
    @Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string,
    @Query(SCHOOL_QUERY_PARAM) school?: string,
  ): Promise<LinboDhcpIscExportResponseDto> {
    return this.linboService.getDhcpIscExport(lmnApiToken, school);
  }

  @Get('dhcp/export/dnsmasq-proxy')
  @ApiOperation({ summary: 'dnsmasq proxy-mode config for school (text/plain)' })
  @ApiQuery({ name: SCHOOL_QUERY_PARAM, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Generated dnsmasq config',
    content: { 'text/plain': { schema: { type: 'string' } } },
  })
  async getDhcpDnsmasqExport(
    @Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string,
    @Res() res: Response,
    @Query(SCHOOL_QUERY_PARAM) school?: string,
  ): Promise<void> {
    const body = await this.linboService.getDhcpDnsmasqExport(lmnApiToken, school);
    res.setHeader(HTTP_HEADERS.ContentType, RequestResponseContentType.TEXT_PLAIN);
    res.send(body);
  }

  @Get('startconfs')
  @ApiOperation({ summary: 'Get start.conf files by group ID(s)' })
  @ApiQuery({ name: STARTCONF_ID_QUERY_PARAM, required: true, type: String, isArray: true })
  @ApiQuery({ name: SCHOOL_QUERY_PARAM, required: false })
  @ApiResponse({ status: HttpStatus.OK, type: LinboStartConfsResponseDto })
  async getStartConfs(
    @Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string,
    @Query(STARTCONF_ID_QUERY_PARAM) id: string | string[],
    @Query(SCHOOL_QUERY_PARAM) school?: string,
  ): Promise<LinboStartConfsResponseDto> {
    const ids = Array.isArray(id) ? id : [id];
    return this.linboService.getStartConfs(lmnApiToken, ids, school);
  }

  @Get('images/manifest')
  @ApiOperation({ summary: 'Image manifest list' })
  @ApiResponse({ status: HttpStatus.OK, type: LinboImagesManifestResponseDto })
  async getImagesManifest(@Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string): Promise<LinboImagesManifestResponseDto> {
    return this.linboService.getImagesManifest(lmnApiToken);
  }

  @Post('images/upload')
  @ApiOperation({ summary: 'Upload an image (single PUT followed by complete)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: LinboUploadImageBodyDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Upload finalized', type: LinboUploadImageResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_req, _file, cb) => cb(null, `linbo-upload-${randomUUID()}`),
      }),
      limits: { fileSize: LINBO_MAX_UPLOAD_BYTES },
    }),
  )
  async uploadImage(
    @Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: LinboUploadImageBodyDto,
  ): Promise<LinboUploadImageResponseDto> {
    return this.linboService.uploadImage(
      lmnApiToken,
      body.imageName,
      body.filename,
      file ? { path: file.path, size: file.size } : undefined,
    );
  }

  @Get('images/download/:imageName/:filename')
  @ApiOperation({ summary: 'Download an image or extra_file (streamed)' })
  @ApiParam({ name: 'imageName' })
  @ApiParam({ name: 'filename' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File binary stream',
    content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
  })
  async downloadImage(
    @Headers(HTTP_HEADERS.XApiKey) lmnApiToken: string,
    @Param('imageName', SafePathSegmentPipe) imageName: string,
    @Param('filename', SafePathSegmentPipe) filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const ctrl = new AbortController();
    const upstream = await this.linboService.downloadImage(lmnApiToken, imageName, filename, ctrl.signal);
    const headers = upstream.headers as unknown as Record<string, string | undefined>;
    res.setHeader(
      HTTP_HEADERS.ContentType,
      headers[HTTP_HEADERS.ContentType] ?? RequestResponseContentType.APPLICATION_OCTET_STREAM,
    );
    LinboController.forwardHeader(res, headers, HTTP_HEADERS.ContentLength);
    LinboController.forwardHeader(res, headers, HTTP_HEADERS.ContentDisposition);
    LinboController.forwardHeader(res, headers, HTTP_HEADERS.ETag);
    if (!headers[HTTP_HEADERS.ContentDisposition]) {
      res.setHeader(HTTP_HEADERS.ContentDisposition, `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    }

    const upstreamStream = upstream.data as Readable;
    let teardown = false;
    const onClose = () => {
      if (teardown) {
        return;
      }
      teardown = true;
      ctrl.abort();
      if (!upstreamStream.destroyed) {
        upstreamStream.destroy();
      }
    };
    req.on('close', onClose);

    try {
      await pipeline(upstreamStream, res);
    } catch (error) {
      const { code } = error as { code?: string };
      const message = error instanceof Error ? error.message : String(error);
      if (code !== undefined && CLIENT_DISCONNECT_CODES.includes(code)) {
        Logger.debug(`Client disconnected during download: ${message}`, LinboController.name);
        if (!res.headersSent) {
          throw error;
        }
        if (!res.writableEnded) {
          res.end();
        }
        return;
      }
      if (res.headersSent) {
        Logger.warn(`Pipeline error after headers sent: ${message}`, LinboController.name);
        if (!res.writableEnded) {
          res.end();
        }
        return;
      }
      throw error;
    } finally {
      req.off('close', onClose);
    }
  }
}

export default LinboController;
