/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError } from 'axios';
import AuthErrorMessages from '@libs/auth/constants/authErrorMessages';
import AUTH_PATHS from '@libs/auth/constants/auth-paths';
import { HTTP_HEADERS, RequestResponseContentType } from '@libs/common/types/http-methods';
import type JWTUser from '@libs/user/types/jwt/jwtUser';
import { User } from '../users/user.schema';
import SseService from '../sse/sse.service';
import GlobalSettingsService from '../global-settings/global-settings.service';
import SessionDenylistService from './session-denylist.service';
import AuthService from './auth.service';

const REFRESH_TOKEN = 'a-refresh-token';
const SESSION = { preferred_username: 'alice', sid: 'session-id', exp: 4102444800 } as JWTUser;

const buildAxiosError = (status: number, data: unknown) =>
  Object.assign(new AxiosError('request failed'), { response: { status, data } });

describe(AuthService.name, () => {
  let service: AuthService;
  let post: jest.Mock;

  const denySession = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    denySession.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: { findOne: jest.fn(), updateOne: jest.fn() } },
        { provide: SseService, useValue: { sendEventToUser: jest.fn() } },
        { provide: GlobalSettingsService, useValue: { getGlobalSettings: jest.fn() } },
        { provide: SessionDenylistService, useValue: { denySession, isSessionDenied: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    post = jest.fn().mockResolvedValue({ data: {} });
    (service as unknown as { keycloakApi: { post: jest.Mock } }).keycloakApi = { post };
  });

  describe('revokeSession', () => {
    it('does nothing without a refresh token', async () => {
      await expect(service.revokeSession(undefined)).resolves.toBe(true);
      expect(post).not.toHaveBeenCalled();
    });

    it('posts the refresh token to the keycloak logout endpoint as a form body', async () => {
      await expect(service.revokeSession(REFRESH_TOKEN)).resolves.toBe(true);

      const [path, body, config] = post.mock.calls[0] as [string, string, { headers: Record<string, string> }];
      expect(path).toBe(AUTH_PATHS.AUTH_OIDC_LOGOUT_PATH);

      const form = new URLSearchParams(body);
      expect(form.get('refresh_token')).toBe(REFRESH_TOKEN);
      expect(form.has('client_id')).toBe(true);
      expect(form.has('client_secret')).toBe(true);
      expect(config.headers[HTTP_HEADERS.ContentType]).toBe(
        RequestResponseContentType.APPLICATION_X_WWW_FORM_URLENCODED,
      );
    });

    it('treats an already invalid refresh token as revoked', async () => {
      post.mockRejectedValueOnce(buildAxiosError(HttpStatus.BAD_REQUEST, { error: 'invalid_grant' }));

      await expect(service.revokeSession(REFRESH_TOKEN)).resolves.toBe(true);
    });

    it('reports failure for any other keycloak error', async () => {
      post.mockRejectedValueOnce(buildAxiosError(HttpStatus.INTERNAL_SERVER_ERROR, { error: 'boom' }));

      await expect(service.revokeSession(REFRESH_TOKEN)).resolves.toBe(false);
    });

    it('reports failure for a 400 that is not invalid_grant', async () => {
      post.mockRejectedValueOnce(buildAxiosError(HttpStatus.BAD_REQUEST, { error: 'invalid_client' }));

      await expect(service.revokeSession(REFRESH_TOKEN)).resolves.toBe(false);
    });
  });

  describe('logout', () => {
    it('warns when a verified token carries no sid, since that session cannot be denied', async () => {
      const warn = jest.spyOn(Logger, 'warn').mockImplementation();

      await service.logout(REFRESH_TOKEN, { preferred_username: 'alice' } as JWTUser);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no sid'), AuthService.name);
    });

    it('denies the session and revokes the refresh token', async () => {
      await service.logout(REFRESH_TOKEN, SESSION);

      expect(denySession).toHaveBeenCalledWith(SESSION.sid, SESSION.exp);
      expect(post).toHaveBeenCalledTimes(1);
    });

    it('still revokes the refresh token when no session could be resolved', async () => {
      await service.logout(REFRESH_TOKEN, undefined);

      expect(denySession).toHaveBeenCalledWith(undefined, undefined);
      expect(post).toHaveBeenCalledTimes(1);
    });

    it('fails loudly when the session could not be denied', async () => {
      denySession.mockResolvedValue(false);

      await expect(service.logout(REFRESH_TOKEN, SESSION)).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.INTERNAL_SERVER_ERROR }) as unknown as Error,
      );
    });

    it('fails loudly when the refresh token could not be revoked', async () => {
      post.mockRejectedValueOnce(buildAxiosError(HttpStatus.INTERNAL_SERVER_ERROR, { error: 'boom' }));

      await expect(service.logout(REFRESH_TOKEN, SESSION)).rejects.toThrow(
        expect.objectContaining({ message: AuthErrorMessages.LogoutFailed }) as unknown as Error,
      );
    });

    it('still revokes when denying failed, rather than skipping the second half', async () => {
      denySession.mockResolvedValue(false);

      await expect(service.logout(REFRESH_TOKEN, SESSION)).rejects.toThrow();
      expect(post).toHaveBeenCalledTimes(1);
    });
  });
});
