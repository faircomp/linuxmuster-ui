/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type { PipelineStage } from 'mongoose';
import WebdavSharesService from './webdav-shares.service';

type CtorArgs = ConstructorParameters<typeof WebdavSharesService>;

const ADMIN_GROUPS = ['/p_administrators'];

const containsStage = (pipeline: PipelineStage[], needle: string): boolean =>
  pipeline.some((stage) => JSON.stringify(stage).includes(needle));

const buildService = () => {
  const pipelines: PipelineStage[][] = [];
  const aggregate = jest.fn((pipeline: PipelineStage[]) => {
    pipelines.push(pipeline);
    return Promise.resolve([]);
  });

  const service = new WebdavSharesService(
    { aggregate } as unknown as CtorArgs[0],
    {} as unknown as CtorArgs[1],
    {} as unknown as CtorArgs[2],
    { getAdminGroupsFromCache: jest.fn().mockResolvedValue(ADMIN_GROUPS) } as unknown as CtorArgs[3],
  );

  return { service, pipelines };
};

describe('WebdavSharesService.findAllWikiShares', () => {
  it('always filters out disabled wikis and gates on wikiAccessGroups', async () => {
    const { service, pipelines } = buildService();

    await service.findAllWikiShares(['/teachers']);

    expect(pipelines[0][0]).toEqual({ $match: { wikiDisabled: { $ne: true } } });
    expect(containsStage(pipelines[0], 'wikiAccessGroups')).toBe(true);
  });

  it('restricts non-admins to their own accessGroups', async () => {
    const { service, pipelines } = buildService();

    await service.findAllWikiShares(['/teachers']);

    expect(containsStage(pipelines[0], 'accessGroups.path')).toBe(true);
  });

  it('does not add the accessGroups filter for admins (admin bypass)', async () => {
    const { service, pipelines } = buildService();

    await service.findAllWikiShares(ADMIN_GROUPS);

    expect(containsStage(pipelines[0], 'wikiAccessGroups')).toBe(true);
    expect(containsStage(pipelines[0], 'accessGroups.path')).toBe(false);
  });
});
