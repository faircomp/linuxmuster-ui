/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type { AxiosInstance } from 'axios';
import { Logger } from '@nestjs/common';
import getKeycloakToken from '../../scripts/keycloak/utilities/getKeycloakToken';
import createKeycloakAxiosClient from '../../scripts/keycloak/utilities/createKeycloakAxiosClient';
import ensureKeycloakClient from './ensureKeycloakClient';

jest.mock('../../scripts/keycloak/utilities/getKeycloakToken');
jest.mock('../../scripts/keycloak/utilities/createKeycloakAxiosClient');

const mockedGetKeycloakToken = getKeycloakToken as jest.MockedFunction<typeof getKeycloakToken>;
const mockedCreateKeycloakAxiosClient = createKeycloakAxiosClient as jest.MockedFunction<
  typeof createKeycloakAxiosClient
>;

const MOODLE_CLIENT_ID = 'edulution-moodle';
const PROVIDED_SECRET = 'provided-secret';
const READ_BACK_SECRET = 'read-back-secret';
const CLIENTS_PATH = '/clients';
const REALM_MANAGEMENT_CLIENT_ID = 'realm-management';
const ACCOUNT_CLIENT_ID = 'account';

type ClientRepresentation = { id: string };

const buildMockClient = (moodleClientsSequence: ClientRepresentation[][]) => {
  let moodleCallIndex = 0;

  const get = jest.fn((url: string, config?: { params?: { clientId?: string } }) => {
    const requestedClientId = config?.params?.clientId;

    if (url === CLIENTS_PATH) {
      if (requestedClientId === MOODLE_CLIENT_ID) {
        const result = moodleClientsSequence[Math.min(moodleCallIndex, moodleClientsSequence.length - 1)];
        moodleCallIndex += 1;
        return { data: result };
      }
      if (requestedClientId === REALM_MANAGEMENT_CLIENT_ID) {
        return { data: [{ id: 'realm-management-id' }] };
      }
      if (requestedClientId === ACCOUNT_CLIENT_ID) {
        return { data: [{ id: 'account-id' }] };
      }
      return { data: [] };
    }
    if (url.endsWith('/service-account-user')) {
      return { data: { id: 'service-account-user-id' } };
    }
    if (url.endsWith('/client-secret')) {
      return { data: { value: READ_BACK_SECRET } };
    }
    if (url.includes('/roles/')) {
      const roleName = url.split('/roles/')[1];
      return { data: { id: `role-${roleName}`, name: roleName } };
    }
    return { data: {} };
  });

  const post = jest.fn((_url: string, _body?: unknown) => ({ data: {} }));

  const client = { get, post } as unknown as AxiosInstance;
  return { client, get, post };
};

describe('ensureKeycloakClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetKeycloakToken.mockResolvedValue('keycloak-access-token');
  });

  it('reuses an existing client without creating one and returns the existing secret', async () => {
    const { client, post } = buildMockClient([[{ id: 'existing-internal-id' }]]);
    mockedCreateKeycloakAxiosClient.mockReturnValue(client);

    const secret = await ensureKeycloakClient(MOODLE_CLIENT_ID, PROVIDED_SECRET);

    expect(secret).toBe(READ_BACK_SECRET);
    const createCalls = post.mock.calls.filter(([url]) => url === CLIENTS_PATH);
    expect(createCalls).toHaveLength(0);
  });

  it('creates a missing client with the provided secret and returns the read-back secret', async () => {
    const { client, post } = buildMockClient([[], [{ id: 'created-internal-id' }]]);
    mockedCreateKeycloakAxiosClient.mockReturnValue(client);

    const secret = await ensureKeycloakClient(MOODLE_CLIENT_ID, PROVIDED_SECRET);

    expect(secret).toBe(READ_BACK_SECRET);
    const createCalls = post.mock.calls.filter(([url]) => url === CLIENTS_PATH);
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0][1]).toMatchObject({
      clientId: MOODLE_CLIENT_ID,
      secret: PROVIDED_SECRET,
      serviceAccountsEnabled: true,
    });
  });

  it('assigns service-account and account roles to the client', async () => {
    const { client, post } = buildMockClient([[{ id: 'existing-internal-id' }]]);
    mockedCreateKeycloakAxiosClient.mockReturnValue(client);

    await ensureKeycloakClient(MOODLE_CLIENT_ID, PROVIDED_SECRET);

    const roleMappingCalls = post.mock.calls.filter(([url]) => url.includes('/role-mappings/clients/'));
    expect(roleMappingCalls).toHaveLength(2);
  });

  it('rethrows and logs when the Keycloak call fails', async () => {
    const loggerErrorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    mockedCreateKeycloakAxiosClient.mockImplementation(() => {
      throw new Error('keycloak unreachable');
    });

    await expect(ensureKeycloakClient(MOODLE_CLIENT_ID, PROVIDED_SECRET)).rejects.toThrow('keycloak unreachable');
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    loggerErrorSpy.mockRestore();
  });
});
