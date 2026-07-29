/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

export const LMN_QUEUE_UPSTREAM_PREFIX = 'LMN_QUEUE_UPSTREAM:';

interface LmnApiQueueUpstreamPayload {
  status: number;
  data: unknown;
  message: string;
}

class LmnApiQueueUpstreamError extends Error {
  readonly status: number;

  readonly data: unknown;

  constructor(payload: LmnApiQueueUpstreamPayload) {
    super(payload.message);
    this.name = 'LmnApiQueueUpstreamError';
    this.status = payload.status;
    this.data = payload.data;
  }

  static encode(payload: LmnApiQueueUpstreamPayload): string {
    return `${LMN_QUEUE_UPSTREAM_PREFIX}${JSON.stringify(payload)}`;
  }

  static tryParse(message: string): LmnApiQueueUpstreamError | undefined {
    if (!message.startsWith(LMN_QUEUE_UPSTREAM_PREFIX)) {
      return undefined;
    }
    try {
      const parsed: unknown = JSON.parse(message.slice(LMN_QUEUE_UPSTREAM_PREFIX.length));
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof (parsed as { status?: unknown }).status !== 'number'
      ) {
        return undefined;
      }
      return new LmnApiQueueUpstreamError(parsed as LmnApiQueueUpstreamPayload);
    } catch {
      return undefined;
    }
  }
}

export default LmnApiQueueUpstreamError;
