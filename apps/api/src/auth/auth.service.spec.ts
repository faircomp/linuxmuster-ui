/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError } from 'axios';
import AuthErrorMessages from '@libs/auth/constants/authErrorMessages';
import AUTH_PATHS from '@libs/auth/constants/auth-paths';
import AUTH_TOTP_CONFIG from '@libs/auth/constants/totp-config';
import LOGIN_SESSION_SSE_CHANNEL_PREFIX from '@libs/sse/constants/loginSessionSseChannelPrefix';
import { Secret, TOTP } from 'otpauth';
import { decodeBase64Api, encodeBase64Api } from '@libs/common/utils/getBase64StringApi';
import type { SigninResponse } from 'oidc-client-ts';
import type AuthRequestArgs from '@libs/auth/types/auth-request';
import { HTTP_HEADERS, RequestResponseContentType } from '@libs/common/types/http-methods';
import type JWTUser from '@libs/user/types/jwt/jwtUser';
import { User } from '../users/user.schema';
import SseService from '../sse/sse.service';
import GlobalSettingsService from '../global-settings/global-settings.service';
import SessionDenylistService from './session-denylist.service';
import QrLoginSessionService from '../sse/qr-login-session.service';
import AuthService from './auth.service';

const REFRESH_TOKEN = 'a-refresh-token';
const SESSION = { preferred_username: 'alice', sid: 'session-id', exp: 4102444800 } as JWTUser;

const buildAxiosError = (status: number, data: unknown) =>
  Object.assign(new AxiosError('request failed'), { response: { status, data } });

describe(AuthService.name, () => {
  let service: AuthService;
  let post: jest.Mock;

  const denySession = jest.fn();
  const findOne = jest.fn();
  const findOneAndUpdate = jest.fn();
  const userModel = { findOne, findOneAndUpdate, updateOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    denySession.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: SseService, useValue: { sendEventToUser: jest.fn(), getUserConnection: jest.fn() } },
        {
          provide: QrLoginSessionService,
          useValue: { create: jest.fn(), consume: jest.fn(), verifySubscriber: jest.fn() },
        },
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

describe(`${AuthService.name} qr login session`, () => {
  let service: AuthService;

  const create = jest.fn();
  const consume = jest.fn();
  const getUserConnection = jest.fn();
  const sendEventToUser = jest.fn();

  const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const CREDENTIALS = { username: 'alice', password: 'geheim' };

  beforeEach(async () => {
    jest.clearAllMocks();
    getUserConnection.mockReturnValue(true);
    consume.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: { findOne: jest.fn(), find: jest.fn() } },
        { provide: SseService, useValue: { sendEventToUser, getUserConnection } },
        { provide: QrLoginSessionService, useValue: { create, consume, verifySubscriber: jest.fn() } },
        { provide: GlobalSettingsService, useValue: { getGlobalSettings: jest.fn() } },
        { provide: SessionDenylistService, useValue: { denySession: jest.fn(), isSessionDenied: jest.fn() } },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('hands the session creation to the session service', async () => {
    create.mockResolvedValue({ sessionId: SESSION_ID, subscriberToken: 'token' });

    await expect(service.createQrLoginSession()).resolves.toEqual({
      sessionId: SESSION_ID,
      subscriberToken: 'token',
    });
  });

  it('forwards the credentials once the session is consumed', async () => {
    await service.loginViaApp(CREDENTIALS, SESSION_ID);

    expect(consume).toHaveBeenCalledWith(SESSION_ID);
    expect(sendEventToUser).toHaveBeenCalledTimes(1);

    const [channel, payload] = sendEventToUser.mock.calls[0] as [string, string, string];
    expect(channel).toBe(`${LOGIN_SESSION_SSE_CHANNEL_PREFIX}${SESSION_ID}`);
    expect(JSON.parse(decodeBase64Api(payload))).toEqual(CREDENTIALS);
  });

  it('refuses a second redemption of the same session and sends nothing', async () => {
    consume.mockResolvedValue(false);

    await expect(service.loginViaApp(CREDENTIALS, SESSION_ID)).rejects.toThrow(
      expect.objectContaining({ status: HttpStatus.NOT_FOUND }) as unknown as Error,
    );

    expect(sendEventToUser).not.toHaveBeenCalled();
  });

  it('does not consume a session nobody is listening on', async () => {
    getUserConnection.mockReturnValue(false);

    await expect(service.loginViaApp(CREDENTIALS, SESSION_ID)).rejects.toThrow(
      expect.objectContaining({ status: HttpStatus.NOT_FOUND }) as unknown as Error,
    );

    expect(consume).not.toHaveBeenCalled();
  });
});

describe(`${AuthService.name} two-stage login`, () => {
  let service: AuthService;
  let signin: jest.SpyInstance;
  let revokeSession: jest.SpyInstance;

  const findOne = jest.fn();
  const find = jest.fn();
  const findOneAndUpdate = jest.fn();
  const userModel = { findOne, find, findOneAndUpdate, updateOne: jest.fn() };

  const PASSWORD = 'geheim';
  const ENCODED = encodeBase64Api(PASSWORD);
  const TOKENS = { refresh_token: 'refresh-a', access_token: 'access-a' } as SigninResponse;

  const body = (encoded: string): AuthRequestArgs =>
    ({ grant_type: 'password', username: 'alice', password: encoded }) as AuthRequestArgs;

  const rejectsWith = async (promise: Promise<unknown>, key: AuthErrorMessages) => {
    await expect(promise).rejects.toThrow(
      expect.objectContaining({
        status: HttpStatus.UNAUTHORIZED,
        response: expect.objectContaining({ error: key }) as unknown,
      }) as unknown as Error,
    );
  };

  const chainable = (value: unknown) => {
    const chain = { collation: () => chain, lean: () => Promise.resolve(value) };
    return chain;
  };

  const mockUser = (mfaEnabled: boolean, totpSecret = 'JBSWY3DPEHPK3PXP') =>
    find.mockReturnValue(chainable([{ mfaEnabled, totpSecret, username: 'alice' }]));

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: SseService, useValue: { sendEventToUser: jest.fn(), getUserConnection: jest.fn() } },
        {
          provide: QrLoginSessionService,
          useValue: { create: jest.fn(), consume: jest.fn(), verifySubscriber: jest.fn() },
        },
        { provide: GlobalSettingsService, useValue: { getGlobalSettings: jest.fn() } },
        { provide: SessionDenylistService, useValue: { denySession: jest.fn(), isSessionDenied: jest.fn() } },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    signin = jest.spyOn(service, 'signin').mockResolvedValue(TOKENS);
    revokeSession = jest.spyOn(service, 'revokeSession').mockResolvedValue(true);
    findOneAndUpdate.mockReturnValue({ lean: () => Promise.resolve({ username: 'alice' }) });
  });

  describe('splitPasswordAndTotp', () => {
    it.each([
      ['geheim:123456', 'geheim', '123456'],
      ['pass:wort:123456', 'pass:wort', '123456'],
      ['pass:wort', 'pass:wort', null],
      ['geheim:12345', 'geheim:12345', null],
      ['geheim:1234567', 'geheim:1234567', null],
      ['geheim', 'geheim', null],
    ])('splits %p into password %p and token %p', (input, password, token) => {
      expect(AuthService.splitPasswordAndTotp(input)).toEqual({ password, token });
    });
  });

  describe('validateTotp', () => {
    it('returns the counter the code belongs to', () => {
      const secret = new Secret({ size: 16 }).base32;
      const totp = new TOTP({ ...AUTH_TOTP_CONFIG, label: 'alice', secret });

      const counter = AuthService.validateTotp(totp.generate(), 'alice', secret);

      expect(counter).toBe(Math.floor(Date.now() / 1000 / AUTH_TOTP_CONFIG.period));
    });

    it('returns null for a code that is not ours', () => {
      const secret = new Secret({ size: 16 }).base32;

      expect(AuthService.validateTotp('000000', 'alice', secret)).toBeNull();
    });
  });

  describe('cost parity', () => {
    it('spends the same number of keycloak roundtrips when a password looks like it carries a code', async () => {
      mockUser(false);

      await service.authenticateUser(body(encodeBase64Api('geheim:123456')));

      expect(signin).toHaveBeenCalledTimes(2);

      const passwords = signin.mock.calls.map((call) => (call as [AuthRequestArgs, string])[1]);
      expect(passwords).toEqual(['geheim', 'geheim:123456']);
    });

    it('spends one roundtrip for an ordinary password', async () => {
      mockUser(false);

      await service.authenticateUser(body(ENCODED));

      expect(signin).toHaveBeenCalledTimes(1);
    });

    it('still signs in when the discarded parity call throws', async () => {
      mockUser(false);
      signin.mockRejectedValueOnce(new HttpException({ error: 'invalid_grant' }, HttpStatus.UNAUTHORIZED));
      signin.mockResolvedValueOnce(TOKENS);

      await expect(service.authenticateUser(body(encodeBase64Api('geheim:123456')))).resolves.toBe(TOKENS);
      expect(signin).toHaveBeenCalledTimes(2);
    });

    it('treats an unknown user exactly like a user without mfa', async () => {
      find.mockReturnValue(chainable([]));

      await service.authenticateUser(body(encodeBase64Api('geheim:123456')));

      expect(signin).toHaveBeenCalledTimes(2);
    });
  });

  describe('mfa user', () => {
    it('checks the password at keycloak before saying anything about totp', async () => {
      mockUser(true);

      await rejectsWith(service.authenticateUser(body(ENCODED)), AuthErrorMessages.TotpMissing);

      expect(signin).toHaveBeenCalledTimes(1);
      expect(revokeSession).toHaveBeenCalledWith(TOKENS.refresh_token);
    });

    it('does not reveal mfa when the password is wrong', async () => {
      mockUser(true);
      const keycloakError = new HttpException({ error: 'invalid_grant' }, HttpStatus.UNAUTHORIZED);
      signin.mockRejectedValue(keycloakError);

      await expect(service.authenticateUser(body(ENCODED))).rejects.toBe(keycloakError);
      expect(revokeSession).not.toHaveBeenCalled();
    });

    it('asks for the code when the password itself ends in six digits', async () => {
      mockUser(true);
      signin.mockRejectedValueOnce(new HttpException({ error: 'invalid_grant' }, HttpStatus.UNAUTHORIZED));
      signin.mockResolvedValueOnce(TOKENS);

      await rejectsWith(
        service.authenticateUser(body(encodeBase64Api('geheim:123456'))),
        AuthErrorMessages.TotpMissing,
      );

      expect(revokeSession).toHaveBeenCalledWith(TOKENS.refresh_token);
      const passwords = signin.mock.calls.map((call) => (call as [AuthRequestArgs, string])[1]);
      expect(passwords).toEqual(['geheim', 'geheim:123456']);
    });

    it('rejects a wrong code and revokes the session the password opened', async () => {
      mockUser(true);

      await rejectsWith(
        service.authenticateUser(body(encodeBase64Api('geheim:000000'))),
        AuthErrorMessages.TotpInvalid,
      );

      expect(revokeSession).toHaveBeenCalledWith(TOKENS.refresh_token);
      expect(findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('signs in with a valid code and claims its counter', async () => {
      const secret = new Secret({ size: 16 }).base32;
      mockUser(true, secret);
      const code = new TOTP({ ...AUTH_TOTP_CONFIG, label: 'alice', secret }).generate();

      await expect(service.authenticateUser(body(encodeBase64Api(`geheim:${code}`)))).resolves.toBe(TOKENS);

      const [filter, update] = findOneAndUpdate.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
      expect(filter.username).toBe('alice');
      expect(filter.$or).toEqual([
        { totpLastUsedCounter: { $lt: expect.any(Number) as unknown as number } },
        { totpLastUsedCounter: { $exists: false } },
      ]);
      expect(update).toEqual({ $set: { totpLastUsedCounter: expect.any(Number) as unknown as number } });
    });

    it('finds the mfa user even when the client spells the name differently', async () => {
      const stored = { mfaEnabled: true, totpSecret: 'JBSWY3DPEHPK3PXP', username: 'alice' };

      find.mockImplementation((filter: { username?: string }) => {
        let caseInsensitive = false;
        const chain = {
          collation: (options: { strength?: number }) => {
            caseInsensitive = options.strength === 2;
            return chain;
          },
          lean: () => {
            const matches = caseInsensitive
              ? filter.username?.toLowerCase() === stored.username
              : filter.username === stored.username;
            return Promise.resolve(matches ? [stored] : []);
          },
        };
        return chain;
      });

      await rejectsWith(
        service.authenticateUser({ ...body(ENCODED), username: 'ALICE' } as AuthRequestArgs),
        AuthErrorMessages.TotpMissing,
      );
    });

    it('enforces mfa when any spelling variant has it, since the lookup cannot pick deterministically', async () => {
      find.mockReturnValue(
        chainable([
          { mfaEnabled: false, username: 'Alice' },
          { mfaEnabled: true, totpSecret: 'JBSWY3DPEHPK3PXP', username: 'alice' },
        ]),
      );

      await rejectsWith(service.authenticateUser(body(ENCODED)), AuthErrorMessages.TotpMissing);
    });

    it('propagates the keycloak error when neither the stripped nor the full password works', async () => {
      mockUser(true);
      const keycloakError = new HttpException({ error: 'invalid_grant' }, HttpStatus.UNAUTHORIZED);
      signin.mockRejectedValue(keycloakError);

      await expect(service.authenticateUser(body(encodeBase64Api('geheim:123456')))).rejects.toBe(keycloakError);
      expect(revokeSession).not.toHaveBeenCalled();
    });

    it('refuses a code that was already used, since the claim finds nothing to update', async () => {
      const secret = new Secret({ size: 16 }).base32;
      mockUser(true, secret);
      const code = new TOTP({ ...AUTH_TOTP_CONFIG, label: 'alice', secret }).generate();
      findOneAndUpdate.mockReturnValue({ lean: () => Promise.resolve(null) });

      await rejectsWith(
        service.authenticateUser(body(encodeBase64Api(`geheim:${code}`))),
        AuthErrorMessages.TotpAlreadyUsed,
      );

      expect(revokeSession).toHaveBeenCalledWith(TOKENS.refresh_token);
    });
  });
});
