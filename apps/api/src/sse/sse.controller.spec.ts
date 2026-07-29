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

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { of } from 'rxjs';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import LOGIN_SESSION_SSE_CHANNEL_PREFIX from '@libs/sse/constants/loginSessionSseChannelPrefix';
import { QR_LOGIN_TOKEN_COOKIE_PREFIX } from '@libs/auth/constants/qrLoginSessionConfig';
import PUBLIC_CONFERENCE_SSE_CHANNEL_PREFIX from '@libs/sse/constants/publicConferenceSseChannelPrefix';
import SseController from './sse.controller';
import SseService from './sse.service';
import QrLoginSessionService from './qr-login-session.service';
import { Conference } from '../conferences/conference.schema';

const conferencesModelMock = {
  exists: jest.fn().mockImplementation(({ meetingID }) => ({ _id: meetingID as string })),
};
describe('SseController', () => {
  let sseController: SseController;
  let sseService: SseService;

  const mockSseService = {
    subscribe: jest.fn().mockReturnValue(of({ data: 'test' })),
  };

  const mockQrLoginSessionService = {
    verifySubscriber: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
    consume: jest.fn(),
  };

  const SESSION_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const SUBSCRIBER_TOKEN = 'a'.repeat(64);
  const requestWithCookie = (cookie?: string) => ({ headers: cookie ? { cookie } : {} }) as unknown as Request;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SseController],
      providers: [
        ConfigService,
        { provide: SseService, useValue: mockSseService },
        { provide: QrLoginSessionService, useValue: mockQrLoginSessionService },
        { provide: getModelToken(Conference.name), useValue: conferencesModelMock },
      ],
    }).compile();

    sseController = module.get<SseController>(SseController);
    sseService = module.get<SseService>(SseService);
  });

  it('should be defined', () => {
    expect(sseController).toBeDefined();
  });

  describe('getSseConnection', () => {
    it('should call sseService.subscribe with the username and response', () => {
      const username = 'testUser';
      const response = {} as Response;

      sseController.getSseConnection(username, response);

      expect(sseService.subscribe).toHaveBeenCalledWith(username, response);
    });
  });

  describe('publicConferenceSse', () => {
    it('subscribes to the namespaced public conference channel', async () => {
      const meetingID = '12345';
      const response = {} as Response;

      await sseController.publicConferenceSse(meetingID, response);

      expect(sseService.subscribe).toHaveBeenCalledWith(
        `${PUBLIC_CONFERENCE_SSE_CHANNEL_PREFIX}${meetingID}`,
        response,
      );
    });
  });

  describe('public SSE channels stay out of the user namespace', () => {
    it('namespaces the login session channel', async () => {
      const response = {} as Response;

      await sseController.publicLoginSse(
        SESSION_ID,
        requestWithCookie(`${QR_LOGIN_TOKEN_COOKIE_PREFIX}${SESSION_ID}=${SUBSCRIBER_TOKEN}`),
        response,
      );

      expect(sseService.subscribe).toHaveBeenCalledWith(`${LOGIN_SESSION_SSE_CHANNEL_PREFIX}${SESSION_ID}`, response);
    });

    it('cannot be pointed at a username, even when the query looks like one', async () => {
      const response = {} as Response;

      await sseController.publicLoginSse(
        SESSION_ID,
        requestWithCookie(`${QR_LOGIN_TOKEN_COOKIE_PREFIX}${SESSION_ID}=${SUBSCRIBER_TOKEN}`),
        response,
      );

      expect(sseService.subscribe).not.toHaveBeenCalledWith(SESSION_ID, response);
      expect(sseService.subscribe).toHaveBeenCalledWith(`${LOGIN_SESSION_SSE_CHANNEL_PREFIX}${SESSION_ID}`, response);
    });

    it('refuses a subscriber without the cookie, so a guessed session id cannot listen in', async () => {
      mockQrLoginSessionService.verifySubscriber.mockResolvedValueOnce(false);

      await expect(sseController.publicLoginSse(SESSION_ID, requestWithCookie(), {} as Response)).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.FORBIDDEN }) as unknown as Error,
      );

      expect(sseService.subscribe).not.toHaveBeenCalled();
    });

    it('refuses a wrong subscriber token', async () => {
      mockQrLoginSessionService.verifySubscriber.mockResolvedValueOnce(false);

      await expect(
        sseController.publicLoginSse(
          SESSION_ID,
          requestWithCookie(`${QR_LOGIN_TOKEN_COOKIE_PREFIX}${SESSION_ID}=${'b'.repeat(64)}`),
          {} as Response,
        ),
      ).rejects.toThrow(expect.objectContaining({ status: HttpStatus.FORBIDDEN }) as unknown as Error);

      expect(sseService.subscribe).not.toHaveBeenCalled();
    });

    it('reads the cookie that belongs to this session, not any other', async () => {
      const response = {} as Response;

      await sseController.publicLoginSse(
        SESSION_ID,
        requestWithCookie(`${QR_LOGIN_TOKEN_COOKIE_PREFIX}00000000-0000-4000-8000-000000000000=other`),
        response,
      );

      expect(mockQrLoginSessionService.verifySubscriber).toHaveBeenCalledWith(SESSION_ID, undefined);
    });
  });
});
