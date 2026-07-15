/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel and linuxmuster-ui contributors
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * A copy of the license can be found at: https://www.gnu.org/licenses/agpl-3.0.html
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EDU_PLUGINS_GITHUB_URL } from '@libs/common/constants';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn(() => false),
    create: vi.fn(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() })),
  },
}));

import axios from 'axios';
import useDockerApplicationStore from './useDockerApplicationStore';

const SAMPLE_COMPOSE = 'services:\n  web:\n    image: nginx:latest\n';
const mockedGet = axios.get as unknown as ReturnType<typeof vi.fn>;

describe('useDockerApplicationStore — plugin mirror fetch contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDockerContainerConfig fetches <mirror>/<app>/<container>/docker-compose.yml and parses services', async () => {
    mockedGet.mockResolvedValue({ data: SAMPLE_COMPOSE });

    const config = await useDockerApplicationStore.getState().getDockerContainerConfig('nextcloud' as never, 'app');

    const calledUrl = mockedGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain(`${EDU_PLUGINS_GITHUB_URL}/nextcloud/app/docker-compose.yml`);
    expect(config.services).toBeDefined();
    expect(config.services.web).toBeDefined();
  });

  it('getTraefikConfig fetches <mirror>/<app>/<container>/<app>.yml', async () => {
    mockedGet.mockResolvedValue({ status: 200, data: 'http:\n  routers: {}\n' });

    await useDockerApplicationStore.getState().getTraefikConfig('nextcloud' as never, 'app');

    const calledUrl = mockedGet.mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${EDU_PLUGINS_GITHUB_URL}/nextcloud/app/nextcloud.yml`);
  });
});
