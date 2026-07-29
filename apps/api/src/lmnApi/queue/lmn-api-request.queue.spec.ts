/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import type { AxiosError } from 'axios';
import { HttpMethods } from '@libs/common/types/http-methods';
import LmnApiRequestQueue from './lmn-api-request.queue';
import LmnApiQueueUpstreamError, { LMN_QUEUE_UPSTREAM_PREFIX } from './lmn-api-queue-upstream.error';

const buildAxiosError = (status: number, data: unknown): AxiosError =>
  Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: { status, data },
  }) as unknown as AxiosError;

interface QueuePrivates {
  axiosClient: { request: jest.Mock };
  queue: { add: jest.Mock };
  queueEvents: unknown;
  handleJob: (job: { data: unknown }) => Promise<unknown>;
}

const asPrivates = (queue: LmnApiRequestQueue): QueuePrivates => queue as unknown as QueuePrivates;

const jobData = { method: HttpMethods.GET, endpoint: 'linbo/health', payload: undefined, config: undefined };

const captureThrow = async (run: () => Promise<unknown>): Promise<unknown> => {
  try {
    await run();
    return undefined;
  } catch (error) {
    return error as unknown;
  }
};

describe('LmnApiQueueUpstreamError', () => {
  it('round-trips an encoded upstream error', () => {
    const encoded = LmnApiQueueUpstreamError.encode({ status: 404, data: { detail: 'x' }, message: 'not found' });

    expect(encoded.startsWith(LMN_QUEUE_UPSTREAM_PREFIX)).toBe(true);

    const parsed = LmnApiQueueUpstreamError.tryParse(encoded);
    expect(parsed).toBeInstanceOf(LmnApiQueueUpstreamError);
    expect(parsed?.status).toBe(404);
    expect(parsed?.message).toBe('not found');
    expect(parsed?.data).toEqual({ detail: 'x' });
  });

  it('returns undefined for non-prefixed or malformed messages', () => {
    expect(LmnApiQueueUpstreamError.tryParse('some other error')).toBeUndefined();
    expect(LmnApiQueueUpstreamError.tryParse(`${LMN_QUEUE_UPSTREAM_PREFIX}not-json`)).toBeUndefined();
    expect(
      LmnApiQueueUpstreamError.tryParse(`${LMN_QUEUE_UPSTREAM_PREFIX}${JSON.stringify({ message: 'no status' })}`),
    ).toBeUndefined();
  });
});

describe('LmnApiRequestQueue handleJob error mapping', () => {
  it('wraps a 4xx upstream error as an UnrecoverableError encoding the status', async () => {
    const queue = new LmnApiRequestQueue();
    asPrivates(queue).axiosClient = {
      request: jest.fn().mockRejectedValue(buildAxiosError(HttpStatus.NOT_FOUND, { detail: 'host missing' })),
    };

    const thrown = await captureThrow(() => asPrivates(queue).handleJob({ data: jobData }));

    expect(thrown).toBeInstanceOf(UnrecoverableError);
    const decoded = LmnApiQueueUpstreamError.tryParse((thrown as Error).message);
    expect(decoded?.status).toBe(HttpStatus.NOT_FOUND);
    expect(decoded?.message).toContain('host missing');
  });

  it('rethrows a 5xx upstream error as a generic retryable Error', async () => {
    const queue = new LmnApiRequestQueue();
    asPrivates(queue).axiosClient = {
      request: jest.fn().mockRejectedValue(buildAxiosError(HttpStatus.BAD_GATEWAY, 'boom')),
    };

    const thrown = await captureThrow(() => asPrivates(queue).handleJob({ data: jobData }));

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(UnrecoverableError);
    expect(LmnApiQueueUpstreamError.tryParse((thrown as Error).message)).toBeUndefined();
  });
});

describe('LmnApiRequestQueue enqueue error propagation', () => {
  it('rethrows a finished-job failure as a typed LmnApiQueueUpstreamError', async () => {
    const queue = new LmnApiRequestQueue();
    const encoded = LmnApiQueueUpstreamError.encode({ status: 403, data: {}, message: 'forbidden' });
    const job = { waitUntilFinished: jest.fn().mockRejectedValue(new Error(encoded)) };
    asPrivates(queue).queue = { add: jest.fn().mockResolvedValue(job) };
    asPrivates(queue).queueEvents = {};

    const thrown = await captureThrow(() => queue.enqueue(HttpMethods.GET, 'linbo/health'));

    expect(thrown).toBeInstanceOf(LmnApiQueueUpstreamError);
    expect((thrown as LmnApiQueueUpstreamError).status).toBe(403);
  });
});
