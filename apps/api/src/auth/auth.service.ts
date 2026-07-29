/*
 * Copyright (C) [2025] [Netzint GmbH]
 * All rights reserved.
 *
 * This software is dual-licensed under the terms of:
 *
 * 1. The GNU Affero General Public License (AGPL-3.0-or-later), as published by the Free Software Foundation.
 *    You may use, modify and distribute this software under the terms of the AGPL, provided that you comply with its conditions.
 *
 *    A copy of the license can be found at: https://www.gnu.org/licenses/agpl-3.0.html
 *
 * OR
 *
 * 2. A commercial license agreement with Netzint GmbH. Licensees holding a valid commercial license from Netzint GmbH
 *    may use this software in accordance with the terms contained in such written agreement, without the obligations imposed by the AGPL.
 *
 * If you are uncertain which license applies to your use case, please contact us at info@netzint.de for clarification.
 */

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { Request } from 'express';
import { from, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Secret, TOTP } from 'otpauth';
import { ErrorResponse, OidcMetadata, SigninResponse } from 'oidc-client-ts';
import { HTTP_HEADERS, RequestResponseContentType } from '@libs/common/types/http-methods';
import AuthErrorMessages from '@libs/auth/constants/authErrorMessages';
import UserErrorMessages from '@libs/user/constants/user-error-messages';
import AUTH_PATHS from '@libs/auth/constants/auth-paths';
import AUTH_TOTP_CONFIG from '@libs/auth/constants/totp-config';
import type AuthRequestArgs from '@libs/auth/types/auth-request';
import EDU_API_ROOT from '@libs/common/constants/eduApiRoot';
import SSE_MESSAGE_TYPE from '@libs/common/constants/sseMessageType';
import type LoginQrSseDto from '@libs/auth/types/loginQrSse.dto';
import { decodeBase64Api, encodeBase64Api } from '@libs/common/utils/getBase64StringApi';
import GroupRoles from '@libs/groups/types/group-roles.enum';
import type JWTUser from '@libs/user/types/jwt/jwtUser';
import UserRoles from '@libs/user/constants/userRoles';
import getIsAdmin from '@libs/user/utils/getIsAdmin';
import LOGIN_SESSION_SSE_CHANNEL_PREFIX from '@libs/sse/constants/loginSessionSseChannelPrefix';
import AUTH_GRANT_TYPES from '@libs/auth/constants/authGrantTypes';
import CustomHttpException from '../common/CustomHttpException';
import { User, UserDocument } from '../users/user.schema';
import SseService from '../sse/sse.service';
import GlobalSettingsService from '../global-settings/global-settings.service';
import SessionDenylistService from './session-denylist.service';
import QrLoginSessionService from '../sse/qr-login-session.service';

const { KEYCLOAK_EDU_UI_SECRET, KEYCLOAK_EDU_UI_CLIENT_ID, KEYCLOAK_EDU_UI_REALM, KEYCLOAK_API } = process.env;

const KEYCLOAK_INVALID_GRANT_ERROR = 'invalid_grant';

const CASE_INSENSITIVE_COLLATION = { locale: 'en', strength: 2 };

const TOTP_VALIDATION_WINDOW = 1;

const TOTP_SUFFIX_PATTERN = new RegExp(`:(\\d{${AUTH_TOTP_CONFIG.digits}})$`);

@Injectable()
class AuthService {
  private keycloakApi: AxiosInstance;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly sseService: SseService,
    private readonly qrLoginSessionService: QrLoginSessionService,
    private readonly globalSettingsService: GlobalSettingsService,
    private readonly sessionDenylistService: SessionDenylistService,
  ) {
    this.keycloakApi = axios.create({
      baseURL: `${KEYCLOAK_API}/realms/${KEYCLOAK_EDU_UI_REALM}`,
    });
  }

  static validateTotp(token: string, username: string, secret: string): number | null {
    const totp = new TOTP({ ...AUTH_TOTP_CONFIG, label: username, secret });
    const delta = totp.validate({ token, window: TOTP_VALIDATION_WINDOW });

    if (delta === null) {
      return null;
    }

    return Math.floor(Date.now() / 1000 / AUTH_TOTP_CONFIG.period) + delta;
  }

  static checkTotp(token: string, username: string, secret: string): boolean {
    return AuthService.validateTotp(token, username, secret) !== null;
  }

  static splitPasswordAndTotp(passwordString: string): { password: string; token: string | null } {
    const match = TOTP_SUFFIX_PATTERN.exec(passwordString);

    if (!match) {
      return { password: passwordString, token: null };
    }

    return { password: passwordString.slice(0, match.index), token: match[1] };
  }

  authconfig(req: Request): Observable<OidcMetadata> {
    return from(this.keycloakApi.get<OidcMetadata>(AUTH_PATHS.AUTH_OIDC_CONFIG_PATH)).pipe(
      map((response: AxiosResponse<OidcMetadata>) => {
        const oidcConfig = response.data;
        const apiAuthUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}/${EDU_API_ROOT}/${AUTH_PATHS.AUTH_ENDPOINT}`;

        oidcConfig.authorization_endpoint = apiAuthUrl;
        oidcConfig.token_endpoint = apiAuthUrl;
        return oidcConfig;
      }),
      catchError(() => {
        throw new HttpException(
          { error: AuthErrorMessages.Unknown, error_description: AuthErrorMessages.KeycloakConnectionFailed },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }),
    );
  }

  async signin(body: AuthRequestArgs, password?: string) {
    const extendedBody = {
      ...body,
      password,
      client_id: KEYCLOAK_EDU_UI_CLIENT_ID,
      client_secret: KEYCLOAK_EDU_UI_SECRET,
    };

    try {
      const response = await this.keycloakApi.post<SigninResponse>(AUTH_PATHS.AUTH_OIDC_TOKEN_PATH, extendedBody, {
        headers: {
          [HTTP_HEADERS.ContentType]: RequestResponseContentType.APPLICATION_X_WWW_FORM_URLENCODED,
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data && error.response.status < 500) {
        const errorMessage: ErrorResponse = error.response.data as ErrorResponse;
        throw new HttpException(errorMessage, HttpStatus.UNAUTHORIZED);
      }
      if (error instanceof AxiosError && error.response && error.response.status === 503)
        throw new HttpException(
          { error: AuthErrorMessages.Unknown, error_description: AuthErrorMessages.KeycloakConnectionFailed },
          error.response.status,
        );
      throw new HttpException(
        { error: AuthErrorMessages.Unknown, error_description: AuthErrorMessages.LmnConnectionFailed },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async revokeSession(refreshToken?: string): Promise<boolean> {
    if (!refreshToken) {
      return true;
    }

    try {
      await this.keycloakApi.post(
        AUTH_PATHS.AUTH_OIDC_LOGOUT_PATH,
        new URLSearchParams({
          client_id: KEYCLOAK_EDU_UI_CLIENT_ID ?? '',
          client_secret: KEYCLOAK_EDU_UI_SECRET ?? '',
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            [HTTP_HEADERS.ContentType]: RequestResponseContentType.APPLICATION_X_WWW_FORM_URLENCODED,
          },
        },
      );
      return true;
    } catch (error) {
      const isAlreadyInvalid =
        error instanceof AxiosError &&
        error.response?.status === HttpStatus.BAD_REQUEST &&
        (error.response.data as ErrorResponse | undefined)?.error === KEYCLOAK_INVALID_GRANT_ERROR;

      if (isAlreadyInvalid) {
        Logger.debug('Refresh token was already invalid, its session is gone anyway', AuthService.name);
        return true;
      }

      Logger.warn(`Failed to revoke session: ${(error as Error).message}`, AuthService.name);
      return false;
    }
  }

  async logout(refreshToken: string, session?: JWTUser): Promise<void> {
    if (session && !session.sid) {
      Logger.warn(
        'Verified access token carries no sid, its session cannot be denied and stays usable until it expires',
        AuthService.name,
      );
    }

    const [isDenied, isRevoked] = await Promise.all([
      this.sessionDenylistService.denySession(session?.sid, session?.exp),
      this.revokeSession(refreshToken),
    ]);

    if (!isDenied || !isRevoked) {
      throw new CustomHttpException(
        AuthErrorMessages.LogoutFailed,
        HttpStatus.INTERNAL_SERVER_ERROR,
        { isDenied, isRevoked },
        AuthService.name,
      );
    }
  }

  private async signinOrNull(body: AuthRequestArgs, password?: string): Promise<SigninResponse | null> {
    try {
      return await this.signin(body, password);
    } catch {
      return null;
    }
  }

  private async signinWithSuffixCostParity(body: AuthRequestArgs, passwordString: string): Promise<SigninResponse> {
    const { password, token } = AuthService.splitPasswordAndTotp(passwordString);

    if (token !== null) {
      await this.signinOrNull(body, password);
    }

    return this.signin(body, passwordString);
  }

  async authenticateUser(body: AuthRequestArgs): Promise<SigninResponse> {
    const { grant_type: grantType, password: encodedPassword, username: identifier } = body;

    if (grantType === AUTH_GRANT_TYPES.REFRESH_TOKEN) {
      return this.signin(body);
    }

    const passwordString = decodeBase64Api(encodedPassword);

    const candidates = await this.userModel
      .find(
        identifier.includes('@') ? { email: identifier.toLowerCase() } : { username: identifier },
        'mfaEnabled totpSecret totpLastUsedCounter username email',
      )
      .collation(CASE_INSENSITIVE_COLLATION)
      .lean();

    const mfaUser = candidates.find((candidate) => candidate.mfaEnabled);

    if (!mfaUser) {
      return this.signinWithSuffixCostParity(body, passwordString);
    }

    const { totpSecret = '', username } = mfaUser;
    const { password, token } = AuthService.splitPasswordAndTotp(passwordString);

    const throwTotpMissing = (refreshToken?: string): never => {
      void this.revokeSession(refreshToken);
      throw new HttpException(
        { error: AuthErrorMessages.TotpMissing, error_description: AuthErrorMessages.TotpMissing },
        HttpStatus.UNAUTHORIZED,
      );
    };

    if (token === null) {
      const passwordOnlyTokens = await this.signin(body, password);
      return throwTotpMissing(passwordOnlyTokens.refresh_token);
    }

    let tokens: SigninResponse;

    try {
      tokens = await this.signin(body, password);
    } catch (passwordError) {
      const fullPasswordTokens = await this.signinOrNull(body, passwordString);

      if (!fullPasswordTokens) {
        throw passwordError;
      }

      return throwTotpMissing(fullPasswordTokens.refresh_token);
    }

    const counter = AuthService.validateTotp(token, username, totpSecret);

    if (counter === null) {
      void this.revokeSession(tokens.refresh_token);
      throw new HttpException(
        { error: AuthErrorMessages.TotpInvalid, error_description: AuthErrorMessages.TotpInvalid },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const claimed = await this.userModel
      .findOneAndUpdate(
        {
          username,
          $or: [{ totpLastUsedCounter: { $lt: counter } }, { totpLastUsedCounter: { $exists: false } }],
        },
        { $set: { totpLastUsedCounter: counter } },
      )
      .lean();

    if (!claimed) {
      void this.revokeSession(tokens.refresh_token);
      throw new HttpException(
        { error: AuthErrorMessages.TotpAlreadyUsed, error_description: AuthErrorMessages.TotpAlreadyUsed },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return tokens;
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  public getQrCode(username: string): string {
    const totpSecret = new Secret({ size: 16 });
    const secret = totpSecret.base32;
    const newTotp = new TOTP({ ...AUTH_TOTP_CONFIG, label: username, secret });
    const otpAuthString = Buffer.from(newTotp.toString()).toString('base64');
    return otpAuthString;
  }

  async setupTotp(username: string, body: { totp: string; secret: string }): Promise<User | null> {
    const { totp, secret } = body;
    const isTotpValid = AuthService.checkTotp(totp, username, secret);
    if (isTotpValid) {
      const user = await this.userModel
        .findOneAndUpdate<User>(
          { username },
          {
            $set: { mfaEnabled: true, totpSecret: secret, totpCreatedAt: new Date() },
            $unset: { totpLastUsedCounter: 1 },
          },
          { new: true, projection: { totpSecret: 0, password: 0 } },
        )
        .lean();
      return user;
    }
    throw new CustomHttpException(AuthErrorMessages.TotpInvalid, HttpStatus.UNAUTHORIZED, undefined, AuthService.name);
  }

  async disableTotp(username: string) {
    try {
      return await this.userModel
        .findOneAndUpdate<User>(
          { username },
          {
            $set: { mfaEnabled: false },
            $unset: { totpSecret: 1, totpCreatedAt: 1, totpLastUsedCounter: 1 },
          },
          { new: true, projection: { totpSecret: 0, password: 0 } },
        )
        .lean();
    } catch (error) {
      throw new CustomHttpException(UserErrorMessages.NotFoundError, HttpStatus.NOT_FOUND, undefined, AuthService.name);
    }
  }

  async disableTotpForUser(username: string, ldapGroups: string[]) {
    if (!username) {
      throw new CustomHttpException(UserErrorMessages.NotFoundError, HttpStatus.NOT_FOUND, undefined, AuthService.name);
    }

    if (ldapGroups.includes(GroupRoles.STUDENT)) {
      throw new CustomHttpException(
        AuthErrorMessages.Unauthorized,
        HttpStatus.UNAUTHORIZED,
        undefined,
        AuthService.name,
      );
    }

    try {
      const updateUser = await this.userModel.findOne<User>({ username }).lean();
      const updateUserRoles = updateUser?.ldapGroups;
      const adminGroups = await this.globalSettingsService.getAdminGroupsFromCache();

      const userHasPermission =
        getIsAdmin(ldapGroups, adminGroups) ||
        (ldapGroups.includes(GroupRoles.TEACHER) && !!updateUserRoles?.roles.includes(UserRoles.STUDENT));

      if (!userHasPermission) {
        throw new Error();
      }
    } catch (error) {
      throw new CustomHttpException(
        AuthErrorMessages.Unauthorized,
        HttpStatus.UNAUTHORIZED,
        undefined,
        AuthService.name,
      );
    }

    await this.disableTotp(username);

    return { success: true, status: HttpStatus.OK };
  }

  async createQrLoginSession(): Promise<{ sessionId: string; subscriberToken: string }> {
    return this.qrLoginSessionService.create();
  }

  async loginViaApp(body: LoginQrSseDto, sessionId: string) {
    const { username, password } = body;
    const channelId = `${LOGIN_SESSION_SSE_CHANNEL_PREFIX}${sessionId}`;
    const isConnectionActive = this.sseService.getUserConnection(channelId);

    if (!isConnectionActive) throw new CustomHttpException(UserErrorMessages.NotFoundError, HttpStatus.NOT_FOUND);

    const isSessionConsumed = await this.qrLoginSessionService.consume(sessionId);

    if (!isSessionConsumed) throw new CustomHttpException(UserErrorMessages.NotFoundError, HttpStatus.NOT_FOUND);

    this.sseService.sendEventToUser(
      channelId,
      encodeBase64Api(JSON.stringify({ username, password })),
      SSE_MESSAGE_TYPE.MESSAGE,
    );
  }
}

export default AuthService;
