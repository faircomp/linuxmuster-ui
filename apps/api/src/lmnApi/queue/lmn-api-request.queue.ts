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

import { HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, QueueEvents, UnrecoverableError, Worker } from 'bullmq';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Agent as HttpsAgent } from 'https';
import { HttpMethods } from '@libs/common/types/http-methods';
import QUEUE_CONSTANTS from '@libs/queue/constants/queueConstants';
import LmnApiJobData from '@libs/lmnApi/types/lmnApiJobData';
import LmnApiJobResult from '@libs/lmnApi/types/lmn-api-job.result';
import redisConnection from '../../common/redis.connection';
import LmnApiQueueUpstreamError from './lmn-api-queue-upstream.error';

@Injectable()
class LmnApiRequestQueue implements OnModuleInit, OnModuleDestroy {
  private queue: Queue;

  private queueEvents: QueueEvents;

  private worker: Worker<LmnApiJobData, unknown>;

  private axiosClient: AxiosInstance;

  private readonly timeoutMs = +(process.env.LMN_API_TIMEOUT_MS ?? 15000);

  private readonly retryDelayMs = 1000;

  async onModuleInit() {
    this.queue = new Queue(QUEUE_CONSTANTS.LMN_API_REQUESTS_QUEUE, { connection: redisConnection });
    this.queue.setMaxListeners(0);
    this.queueEvents = new QueueEvents(QUEUE_CONSTANTS.LMN_API_REQUESTS_QUEUE, { connection: redisConnection });
    await this.queueEvents.waitUntilReady();

    const httpsAgent = new HttpsAgent({ rejectUnauthorized: false });

    this.axiosClient = axios.create({
      baseURL: process.env.LMN_API_BASE_URL,
      httpsAgent,
      timeout: this.timeoutMs,
      paramsSerializer: { indexes: null },
    });

    this.worker = new Worker<LmnApiJobData, unknown>(
      QUEUE_CONSTANTS.LMN_API_REQUESTS_QUEUE,
      (job) => this.handleJob(job),
      { connection: redisConnection, concurrency: 10 },
    );

    Logger.debug('LMN API request queue initialized', LmnApiRequestQueue.name);
  }

  private async handleJob<T>(job: Job<LmnApiJobData>): Promise<LmnApiJobResult<T>> {
    const { method, endpoint, payload, config } = job.data;

    const requestConfig: AxiosRequestConfig = {
      ...config,
      method,
      url: endpoint,
      timeout: config?.timeout ?? this.timeoutMs,
    };

    if (payload !== undefined) {
      requestConfig.data = payload;
    }

    try {
      const response = await this.axiosClient.request<T>(requestConfig);
      const responseData =
        response.data instanceof ArrayBuffer ? Buffer.from(response.data) : (response.data as unknown as T);

      return {
        data: responseData as T,
        headers: response.headers ?? {},
        status: response.status,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const formatted = LmnApiRequestQueue.formatErrorDataForLog(error.response?.data);
        const dataPart = formatted ? ` data=${formatted}` : '';
        Logger.debug(
          `LMN API request failed: ${method} ${endpoint} status=${error.response?.status}${dataPart}`,
          LmnApiRequestQueue.name,
        );
      } else {
        Logger.debug(`LMN API request failed: ${method} ${endpoint} error=${String(error)}`, LmnApiRequestQueue.name);
      }

      if (axios.isAxiosError(error) && error.response) {
        const detail = LmnApiRequestQueue.extractUpstreamDetail(error.response.data);
        const message = detail ? `${error.message}: ${detail}` : error.message;
        if (error.response.status < Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
          const encoded = LmnApiQueueUpstreamError.encode({
            status: error.response.status,
            data: error.response.data,
            message,
          });
          throw new UnrecoverableError(encoded);
        }
        throw new Error(message);
      }

      throw error;
    }
  }

  private static readonly LOG_DATA_MAX_LENGTH = 500;

  private static truncateForLog(value: string): string {
    return value.length > LmnApiRequestQueue.LOG_DATA_MAX_LENGTH
      ? `${value.slice(0, LmnApiRequestQueue.LOG_DATA_MAX_LENGTH)}...`
      : value;
  }

  private static formatErrorDataForLog(data: unknown): string | undefined {
    if (data === undefined || data === null) {
      return undefined;
    }
    if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
      return undefined;
    }
    if (typeof data === 'string') {
      return LmnApiRequestQueue.truncateForLog(data);
    }
    try {
      return LmnApiRequestQueue.truncateForLog(JSON.stringify(data));
    } catch {
      return String(data);
    }
  }

  private static extractUpstreamDetail(data: unknown): string | undefined {
    if (!data) {
      return undefined;
    }
    let raw: string | undefined;
    if (typeof data === 'string') {
      raw = data;
    } else if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
      raw = new TextDecoder().decode(data);
    } else if (typeof data === 'object') {
      const { detail } = data as { detail?: unknown };
      return typeof detail === 'string' ? detail : undefined;
    }
    if (!raw) {
      return undefined;
    }
    try {
      const { detail } = JSON.parse(raw) as { detail?: unknown };
      return typeof detail === 'string' ? detail : undefined;
    } catch {
      return undefined;
    }
  }

  public async enqueue<T>(
    method: HttpMethods,
    endpoint: string,
    payload?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<LmnApiJobResult<T>> {
    const job = await this.queue.add(
      QUEUE_CONSTANTS.LMN_API_REQUESTS_QUEUE,
      { method, endpoint, payload, config },
      {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: this.retryDelayMs },
      },
    );

    try {
      const result = (await job.waitUntilFinished(this.queueEvents)) as LmnApiJobResult<T>;
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const upstream = LmnApiQueueUpstreamError.tryParse(message);
      if (upstream) {
        throw upstream;
      }
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await this.queueEvents?.close();
  }
}

export default LmnApiRequestQueue;
