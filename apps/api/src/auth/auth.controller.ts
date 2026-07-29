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

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseInterceptors,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Request, Response } from 'express';
import AUTH_PATHS from '@libs/auth/constants/auth-paths';
import { AUTH_CACHE_TTL_MS } from '@libs/common/constants/cacheTtl';
import LoginQrSseDto from '@libs/auth/types/loginQrSse.dto';
import { AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS } from '@libs/auth/constants/authThrottleConfig';
import LogoutRequestDto from '@libs/auth/types/logoutRequest.dto';
import AuthenticateRequestDto from '@libs/auth/types/authenticateRequest.dto';
import TotpSetupBodyDto from '@libs/auth/types/totpSetupBody.dto';
import type JWTUser from '@libs/user/types/jwt/jwtUser';
import {
  QR_LOGIN_COOKIE_PATH,
  QR_LOGIN_SESSION_TTL_MS,
  QR_LOGIN_TOKEN_COOKIE_PREFIX,
} from '@libs/auth/constants/qrLoginSessionConfig';
import Public from '../common/decorators/public.decorator';
import AuthService from './auth.service';
import GetCurrentUsername from '../common/decorators/getCurrentUsername.decorator';
import GetBearerSession from '../common/decorators/getBearerSession.decorator';
import strictValidationPipe from '../common/pipes/strictValidationPipe';
import UuidPipe from '../common/pipes/uuid.pipe';
import whitelistValidationPipe from '../common/pipes/whitelistValidationPipe';
import GetCurrentUserGroups from '../common/decorators/getCurrentUserGroups.decorator';
import Throttle from '../common/throttle/throttle.decorator';
import ThrottleGuard from '../common/throttle/throttle.guard';

const { EDUI_OIDC_CONFIG_CACHE_TTL } = process.env;
const oidcConfigCacheTtl =
  EDUI_OIDC_CONFIG_CACHE_TTL === undefined || EDUI_OIDC_CONFIG_CACHE_TTL === ''
    ? AUTH_CACHE_TTL_MS
    : Number(EDUI_OIDC_CONFIG_CACHE_TTL);

@ApiTags(AUTH_PATHS.AUTH_ENDPOINT)
@Controller(AUTH_PATHS.AUTH_ENDPOINT)
class AuthController {
  constructor(private readonly authService: AuthService) {
    if (oidcConfigCacheTtl > 0) {
      Logger.debug(`OIDC Config Cache TTL: ${oidcConfigCacheTtl} ms`, AuthController.name);
    } else {
      Logger.debug(`OIDC Config Cache deactivated`, AuthController.name);
    }
  }

  @Public()
  @(oidcConfigCacheTtl > 0 ? UseInterceptors(CacheInterceptor) : () => {})
  @CacheTTL(oidcConfigCacheTtl)
  @Get(AUTH_PATHS.AUTH_OIDC_CONFIG_PATH)
  authconfig(@Req() req: Request) {
    return this.authService.authconfig(req);
  }

  @Public()
  @Post()
  @Throttle(AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS, { byIp: true, byUsername: true })
  @UseGuards(ThrottleGuard)
  @UsePipes(whitelistValidationPipe)
  authenticate(@Body() body: AuthenticateRequestDto) {
    return this.authService.authenticateUser(body);
  }

  @Public()
  @Post(AUTH_PATHS.AUTH_LOGOUT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(strictValidationPipe)
  @Throttle(AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS, { byIp: true })
  @UseGuards(ThrottleGuard)
  logout(@Body() body: LogoutRequestDto, @GetBearerSession() session: JWTUser | undefined) {
    return this.authService.logout(body.refresh_token, session);
  }

  @Get(AUTH_PATHS.AUTH_QRCODE)
  getQrCode(@GetCurrentUsername() username: string) {
    return this.authService.getQrCode(username);
  }

  @Post(AUTH_PATHS.AUTH_CHECK_TOTP)
  @UsePipes(strictValidationPipe)
  setupTotp(@GetCurrentUsername() username: string, @Body() body: TotpSetupBodyDto) {
    return this.authService.setupTotp(username, body);
  }

  @Put(AUTH_PATHS.AUTH_CHECK_TOTP)
  disableTotp(@GetCurrentUsername() username: string) {
    return this.authService.disableTotp(username);
  }

  @Put(`${AUTH_PATHS.AUTH_CHECK_TOTP}/:username`)
  disableTotpForUser(
    @GetCurrentUsername() currentUsername: string,
    @GetCurrentUserGroups() ldapGroups: string[],
    @Param() params: { username: string },
  ) {
    const { username } = params;
    Logger.log(`Disable TOTP for user ${username} by ${currentUsername}`);
    return this.authService.disableTotpForUser(username, ldapGroups);
  }

  @Public()
  @Post(AUTH_PATHS.AUTH_QR_SESSION)
  @Throttle(AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS, { byIp: true })
  @UseGuards(ThrottleGuard)
  async createQrLoginSession(@Res({ passthrough: true }) res: Response) {
    const { sessionId, subscriberToken } = await this.authService.createQrLoginSession();

    res.cookie(`${QR_LOGIN_TOKEN_COOKIE_PREFIX}${sessionId}`, subscriberToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      path: QR_LOGIN_COOKIE_PATH,
      maxAge: QR_LOGIN_SESSION_TTL_MS,
    });

    return { sessionId };
  }

  @Public()
  @Post(AUTH_PATHS.AUTH_VIA_APP)
  @UsePipes(strictValidationPipe)
  loginViaApp(@Body() body: LoginQrSseDto, @Query('sessionId', UuidPipe) sessionId: string) {
    return this.authService.loginViaApp(body, sessionId);
  }
}

export default AuthController;
