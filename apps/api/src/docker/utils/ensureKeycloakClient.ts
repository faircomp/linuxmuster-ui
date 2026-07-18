/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { AxiosInstance } from 'axios';
import { Logger } from '@nestjs/common';
import getErrorMessage from '@libs/common/utils/getErrorMessage';
import getKeycloakToken from '../../scripts/keycloak/utilities/getKeycloakToken';
import createKeycloakAxiosClient from '../../scripts/keycloak/utilities/createKeycloakAxiosClient';

const SERVICE_ACCOUNT_ROLES = ['query-groups', 'query-users', 'view-users'];
const ACCOUNT_ROLES = ['view-groups'];
const REALM_MANAGEMENT_CLIENT_ID = 'realm-management';
const ACCOUNT_CLIENT_ID = 'account';

type KeycloakClientRepresentation = { id: string };
type KeycloakServiceAccountUser = { id?: string };
type KeycloakRole = { id: string; name: string };
type KeycloakClientSecret = { value: string };

const LOG_CONTEXT = 'ensureKeycloakClient';

const assignServiceAccountRoles = async (
  keycloakClient: AxiosInstance,
  internalClientId: string,
  clientId: string,
): Promise<void> => {
  const { data: serviceAccountUser } = await keycloakClient.get<KeycloakServiceAccountUser>(
    `/clients/${internalClientId}/service-account-user`,
  );
  if (!serviceAccountUser?.id) {
    Logger.warn(`No service account user found for '${clientId}'; skipping role assignment.`, LOG_CONTEXT);
    return;
  }

  const [realmMgmtClient, accountClient] = await Promise.all([
    keycloakClient.get<KeycloakClientRepresentation[]>('/clients', {
      params: { clientId: REALM_MANAGEMENT_CLIENT_ID },
    }),
    keycloakClient.get<KeycloakClientRepresentation[]>('/clients', { params: { clientId: ACCOUNT_CLIENT_ID } }),
  ]);
  const realmMgmtClientId = realmMgmtClient.data[0]?.id;
  const accountClientId = accountClient.data[0]?.id;

  const realmRoles = await Promise.all(
    SERVICE_ACCOUNT_ROLES.map((role) =>
      keycloakClient.get<KeycloakRole>(`/clients/${realmMgmtClientId}/roles/${role}`),
    ),
  );
  const realmRolesToAdd = realmRoles.map(({ data: { id, name } }) => ({ id, name }));
  await keycloakClient.post(
    `/users/${serviceAccountUser.id}/role-mappings/clients/${realmMgmtClientId}`,
    realmRolesToAdd,
  );
  Logger.debug(
    `Assigned realm-management roles [${realmRolesToAdd.map((r) => r.name).join(', ')}] to '${clientId}'.`,
    LOG_CONTEXT,
  );

  const accountRoles = await Promise.all(
    ACCOUNT_ROLES.map((role) => keycloakClient.get<KeycloakRole>(`/clients/${accountClientId}/roles/${role}`)),
  );
  const accountRolesToAdd = accountRoles.map(({ data: { id, name } }) => ({ id, name }));
  await keycloakClient.post(
    `/users/${serviceAccountUser.id}/role-mappings/clients/${accountClientId}`,
    accountRolesToAdd,
  );
  Logger.debug(
    `Assigned account roles [${accountRolesToAdd.map((r) => r.name).join(', ')}] to '${clientId}'.`,
    LOG_CONTEXT,
  );
};

const ensureKeycloakClient = async (clientId: string, clientSecret: string): Promise<string> => {
  try {
    const keycloakAccessToken = await getKeycloakToken();
    const keycloakClient = createKeycloakAxiosClient(keycloakAccessToken);

    const existingClients = await keycloakClient.get<KeycloakClientRepresentation[]>('/clients', {
      params: { clientId },
    });
    if (existingClients.data.length > 0) {
      const internalId = existingClients.data[0].id;
      await assignServiceAccountRoles(keycloakClient, internalId, clientId);
      const secretResponse = await keycloakClient.get<KeycloakClientSecret>(`/clients/${internalId}/client-secret`);
      Logger.log(`Keycloak client '${clientId}' already exists; using existing secret.`, LOG_CONTEXT);
      return secretResponse.data.value;
    }

    await keycloakClient.post('/clients', {
      clientId,
      secret: clientSecret,
      enabled: true,
      protocol: 'openid-connect',
      publicClient: false,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: true,
    });
    Logger.log(`Keycloak client '${clientId}' created successfully.`, LOG_CONTEXT);

    const createdClients = await keycloakClient.get<KeycloakClientRepresentation[]>('/clients', {
      params: { clientId },
    });
    const createdId = createdClients.data[0]?.id;
    if (!createdId) {
      throw new Error(`Keycloak client '${clientId}' was created but could not be found`);
    }
    await assignServiceAccountRoles(keycloakClient, createdId, clientId);
    const secretResponse = await keycloakClient.get<KeycloakClientSecret>(`/clients/${createdId}/client-secret`);
    return secretResponse.data.value;
  } catch (error) {
    Logger.error(`Failed to ensure Keycloak client '${clientId}': ${getErrorMessage(error)}`, LOG_CONTEXT);
    throw error;
  }
};

export default ensureKeycloakClient;
