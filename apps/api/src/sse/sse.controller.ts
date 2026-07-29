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

import { Controller, Req, Res, Sse, MessageEvent, Query, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { parse } from 'cookie';
import { Request, Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import APPS from '@libs/appconfig/constants/apps';
import SSE_EDU_API_ENDPOINTS from '@libs/sse/constants/sseEndpoints';
import ConferencesErrorMessage from '@libs/conferences/types/conferencesErrorMessage';
import AUTH_PATHS from '@libs/auth/constants/auth-paths';
import LOGIN_SESSION_SSE_CHANNEL_PREFIX from '@libs/sse/constants/loginSessionSseChannelPrefix';
import PUBLIC_CONFERENCE_SSE_CHANNEL_PREFIX from '@libs/sse/constants/publicConferenceSseChannelPrefix';
import AuthErrorMessages from '@libs/auth/constants/authErrorMessages';
import { QR_LOGIN_TOKEN_COOKIE_PREFIX } from '@libs/auth/constants/qrLoginSessionConfig';
import CustomHttpException from '../common/CustomHttpException';
import GetCurrentUsername from '../common/decorators/getCurrentUsername.decorator';
import SseService from './sse.service';
import QrLoginSessionService from './qr-login-session.service';
import UuidPipe from '../common/pipes/uuid.pipe';
import Public from '../common/decorators/public.decorator';
import { Conference, ConferenceDocument } from '../conferences/conference.schema';

@ApiTags(SSE_EDU_API_ENDPOINTS.SSE)
@ApiBearerAuth()
@Controller(SSE_EDU_API_ENDPOINTS.SSE)
class SseController {
  constructor(
    private readonly sseService: SseService,
    private readonly qrLoginSessionService: QrLoginSessionService,
    @InjectModel(Conference.name) private conferenceModel: Model<ConferenceDocument>,
  ) {}

  @Sse()
  public getSseConnection(@GetCurrentUsername() username: string, @Res() res: Response): Observable<MessageEvent> {
    return this.sseService.subscribe(username, res);
  }

  @Public()
  @Sse(`${APPS.CONFERENCES}/public`)
  async publicConferenceSse(
    @Query('meetingID') meetingID: string,
    @Res() res: Response,
  ): Promise<Observable<MessageEvent | null>> {
    const exists = await this.conferenceModel.exists({ meetingID, isPublic: true });
    if (exists) {
      return this.sseService.subscribe(`${PUBLIC_CONFERENCE_SSE_CHANNEL_PREFIX}${meetingID}`, res);
    }
    throw new CustomHttpException(
      ConferencesErrorMessage.MeetingNotFound,
      HttpStatus.NOT_FOUND,
      { meetingID },
      SseController.name,
    );
  }

  @Public()
  @Sse(AUTH_PATHS.AUTH_ENDPOINT)
  async publicLoginSse(
    @Query('sessionId', UuidPipe) sessionId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Observable<MessageEvent | null>> {
    const subscriberToken = parse(req.headers.cookie || '')[`${QR_LOGIN_TOKEN_COOKIE_PREFIX}${sessionId}`];
    const isSubscriberVerified = await this.qrLoginSessionService.verifySubscriber(sessionId, subscriberToken);

    if (!isSubscriberVerified) {
      throw new CustomHttpException(
        AuthErrorMessages.Forbidden,
        HttpStatus.FORBIDDEN,
        { sessionId },
        SseController.name,
      );
    }

    return this.sseService.subscribe(`${LOGIN_SESSION_SSE_CHANNEL_PREFIX}${sessionId}`, res);
  }
}

export default SseController;
