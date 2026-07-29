/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import CustomHttpException from '../../common/CustomHttpException';
import LmnApiQueueUpstreamError from '../queue/lmn-api-queue-upstream.error';
import LinboService from './linbo.service';

jest.mock('fs', () => ({ createReadStream: jest.fn(() => ({ destroy: jest.fn() })) }));
jest.mock('fs/promises', () => ({ unlink: jest.fn().mockResolvedValue(undefined) }));

interface QueueMock {
  enqueue: jest.Mock;
}

interface BinaryMock {
  put: jest.Mock;
  post: jest.Mock;
  get: jest.Mock;
}

const buildService = (): { service: LinboService; queue: QueueMock; binary: BinaryMock } => {
  const queue: QueueMock = { enqueue: jest.fn() };
  const service = new LinboService(queue as never);
  const binary: BinaryMock = { put: jest.fn(), post: jest.fn(), get: jest.fn() };
  (service as unknown as { binaryClient: BinaryMock }).binaryClient = binary;
  return { service, queue, binary };
};

const captureThrow = async (run: () => Promise<unknown>): Promise<unknown> => {
  try {
    await run();
    return undefined;
  } catch (error) {
    return error as unknown;
  }
};

describe('LinboService', () => {
  it('proxies a successful JSON call and returns the upstream data', async () => {
    const { service, queue } = buildService();
    queue.enqueue.mockResolvedValue({ data: { status: 'ok', devicesCSV: true }, headers: {}, status: 200 });

    const result = await service.getHealth('token', 'default-school');

    expect(result).toEqual({ status: 'ok', devicesCSV: true });
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
  });

  it('forwards a 4xx upstream error with its status', async () => {
    const { service, queue } = buildService();
    queue.enqueue.mockRejectedValue(
      new LmnApiQueueUpstreamError({ status: HttpStatus.NOT_FOUND, data: { detail: 'x' }, message: 'not found' }),
    );

    const thrown = await captureThrow(() => service.getHealth('token'));

    expect(thrown).toBeInstanceOf(CustomHttpException);
    expect((thrown as CustomHttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
  });

  it('maps a 5xx upstream error to 502 Bad Gateway', async () => {
    const { service, queue } = buildService();
    queue.enqueue.mockRejectedValue(
      new LmnApiQueueUpstreamError({ status: HttpStatus.SERVICE_UNAVAILABLE, data: {}, message: 'down' }),
    );

    const thrown = await captureThrow(() => service.getServerInfo('token'));

    expect((thrown as CustomHttpException).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
  });

  it('rejects an upload with an empty image name as a 400', async () => {
    const { service } = buildService();

    const thrown = await captureThrow(() =>
      service.uploadImage('token', '', 'file.qcow2', { path: '/tmp/x', size: 100 } as never),
    );

    expect(thrown).toBeInstanceOf(CustomHttpException);
    expect((thrown as CustomHttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('fails an upload with a 502 when the upstream byte count mismatches', async () => {
    const { service, binary } = buildService();
    binary.put.mockResolvedValue({});
    binary.post.mockResolvedValue({ data: { bytesStored: 999 } });

    const thrown = await captureThrow(() =>
      service.uploadImage('token', 'debian13', 'debian13.qcow2', { path: '/tmp/x', size: 100 } as never),
    );

    expect(thrown).toBeInstanceOf(CustomHttpException);
    expect((thrown as CustomHttpException).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
  });

  it('completes an upload and returns the byte count when the upstream matches', async () => {
    const { service, binary } = buildService();
    binary.put.mockResolvedValue({});
    binary.post.mockResolvedValue({ data: { bytesStored: 100 } });

    const result = await service.uploadImage('token', 'debian13', 'debian13.qcow2', {
      path: '/tmp/x',
      size: 100,
    } as never);

    expect(result).toEqual({ ok: true, bytesUploaded: 100, upstream: { bytesStored: 100 } });
    expect(binary.put).toHaveBeenCalledTimes(1);
    expect(binary.post).toHaveBeenCalledTimes(1);
  });
});
