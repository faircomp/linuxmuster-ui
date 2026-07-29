/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import MailsErrorMessages from '@libs/mail/constants/mails-error-messages';
import MailsService from './mails.service';

const OWNER = 'owner@example.org';

interface SyncJobTestDouble {
  getSyncJobs: jest.Mock;
  mailcowApi: { post: jest.Mock };
  deleteSyncJobs: (syncJobIds: string[], emailAddress: string) => Promise<unknown>;
}

const buildService = (ownedJobs: { id: string | number }[]): SyncJobTestDouble => {
  const service = Object.create(MailsService.prototype) as SyncJobTestDouble;
  service.getSyncJobs = jest.fn().mockResolvedValue(ownedJobs);
  service.mailcowApi = { post: jest.fn().mockResolvedValue({ data: [] }) };
  return service;
};

describe('MailsService sync job ownership', () => {
  it('rejects deleting a sync job the caller does not own', async () => {
    const service = buildService([{ id: '1' }, { id: '2' }]);

    await expect(service.deleteSyncJobs(['3'], OWNER)).rejects.toMatchObject({
      message: MailsErrorMessages.SyncJobAccessDenied,
    });
    expect(service.mailcowApi.post).not.toHaveBeenCalled();
  });

  it('rejects a batch that mixes an owned and a foreign sync job', async () => {
    const service = buildService([{ id: '1' }]);

    await expect(service.deleteSyncJobs(['1', '99'], OWNER)).rejects.toMatchObject({
      message: MailsErrorMessages.SyncJobAccessDenied,
    });
    expect(service.mailcowApi.post).not.toHaveBeenCalled();
  });

  it('answers FORBIDDEN for a foreign sync job', async () => {
    const service = buildService([{ id: '1' }]);

    await expect(service.deleteSyncJobs(['7'], OWNER)).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('deletes when every requested job belongs to the caller', async () => {
    const service = buildService([{ id: '1' }, { id: '2' }]);

    await service.deleteSyncJobs(['1', '2'], OWNER);

    expect(service.mailcowApi.post).toHaveBeenCalledWith('/delete/syncjob', ['1', '2']);
  });

  it('compares ids as strings so numeric mailcow ids still match', async () => {
    const service = buildService([{ id: 5 }]);

    await service.deleteSyncJobs(['5'], OWNER);

    expect(service.mailcowApi.post).toHaveBeenCalledWith('/delete/syncjob', ['5']);
  });
});
