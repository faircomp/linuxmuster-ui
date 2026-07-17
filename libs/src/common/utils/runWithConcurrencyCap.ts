/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

export type SettledResult<T> = { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown };

const runWithConcurrencyCap = async <T>(
  tasks: Array<() => Promise<T>>,
  cap: number,
): Promise<Array<SettledResult<T>>> => {
  const results = new Array<SettledResult<T>>(tasks.length);
  let cursor = 0;
  const workerCount = Math.max(0, Math.min(cap, tasks.length));

  const runWorker = async (): Promise<void> => {
    while (cursor < tasks.length) {
      const idx = cursor;
      cursor += 1;
      // eslint-disable-next-line no-await-in-loop
      const settled = await tasks[idx]()
        .then((value): SettledResult<T> => ({ status: 'fulfilled', value }))
        .catch((reason: unknown): SettledResult<T> => ({ status: 'rejected', reason }));
      results[idx] = settled;
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
};

export default runWithConcurrencyCap;
