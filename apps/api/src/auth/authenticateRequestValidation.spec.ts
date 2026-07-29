/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import AUTH_GRANT_TYPES from '@libs/auth/constants/authGrantTypes';
import AuthenticateRequestDto from '@libs/auth/types/authenticateRequest.dto';
import whitelistValidationPipe from '../common/pipes/whitelistValidationPipe';

const metadata: ArgumentMetadata = { type: 'body', metatype: AuthenticateRequestDto };

const transform = (body: Record<string, string>) =>
  whitelistValidationPipe.transform(body, metadata) as Promise<AuthenticateRequestDto>;

describe('POST /auth request validation', () => {
  it('accepts the exact form body oidc-client-ts builds for a password grant', async () => {
    const body = Object.fromEntries(
      new URLSearchParams({
        grant_type: 'password',
        scope: 'openid profile email',
        username: 'alice',
        password: 'YmFzZTY0',
        client_id: 'edu-ui',
        client_secret: 'a-client-secret',
      }),
    );

    const result = await transform(body);

    expect(result.username).toBe('alice');
    expect(result.password).toBe('YmFzZTY0');
    expect(result.grant_type).toBe(AUTH_GRANT_TYPES.PASSWORD);
    expect(result.scope).toBe('openid profile email');
  });

  it('strips the client credentials the oidc client sends, since the server supplies its own', async () => {
    const result = await transform({
      grant_type: 'password',
      username: 'alice',
      password: 'YmFzZTY0',
      client_id: 'edu-ui',
      client_secret: 'a-client-secret',
    });

    expect(result).not.toHaveProperty('client_id');
    expect(result).not.toHaveProperty('client_secret');
  });

  it('accepts a refresh grant without username or password', async () => {
    const result = await transform({ grant_type: 'refresh_token', refresh_token: 'a-refresh-token' });

    expect(result.refresh_token).toBe('a-refresh-token');
  });

  it('rejects an unknown grant type', async () => {
    await expect(transform({ grant_type: 'client_credentials' })).rejects.toThrow(BadRequestException);
  });

  it('rejects a password grant without a username', async () => {
    await expect(transform({ grant_type: 'password', password: 'YmFzZTY0' })).rejects.toThrow(BadRequestException);
  });

  it('rejects a refresh grant without a refresh token', async () => {
    await expect(transform({ grant_type: 'refresh_token' })).rejects.toThrow(BadRequestException);
  });

  it('rejects a password grant with an empty password', async () => {
    await expect(transform({ grant_type: 'password', username: 'alice', password: '' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a username that is not a string', async () => {
    await expect(
      transform({ grant_type: 'password', username: ['a', 'b'], password: 'YmFzZTY0' } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not reject an unknown extra field, which would break every login', async () => {
    await expect(
      transform({ grant_type: 'password', username: 'alice', password: 'YmFzZTY0', something_new: 'x' }),
    ).resolves.toBeDefined();
  });
});
