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
import { Response } from 'express';
import { of } from 'rxjs';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import LOGIN_SESSION_SSE_CHANNEL_PREFIX from '@libs/sse/constants/loginSessionSseChannelPrefix';
import PUBLIC_CONFERENCE_SSE_CHANNEL_PREFIX from '@libs/sse/constants/publicConferenceSseChannelPrefix';
import SseController from './sse.controller';
import SseService from './sse.service';
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

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SseController],
      providers: [
        ConfigService,
        { provide: SseService, useValue: mockSseService },
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

      expect(sseService.subscribe).toHaveBeenCalledWith(`${PUBLIC_CONFERENCE_SSE_CHANNEL_PREFIX}${meetingID}`, response);
    });
  });

  describe('public SSE channels stay out of the user namespace', () => {
    it('namespaces the login session channel', () => {
      const response = {} as Response;

      sseController.publicLoginSse('some-session-id', response);

      expect(sseService.subscribe).toHaveBeenCalledWith(`${LOGIN_SESSION_SSE_CHANNEL_PREFIX}some-session-id`, response);
    });

    it('cannot be pointed at a username, even when the query looks like one', () => {
      const response = {} as Response;

      sseController.publicLoginSse('global-admin', response);

      expect(sseService.subscribe).not.toHaveBeenCalledWith('global-admin', response);
      expect(sseService.subscribe).toHaveBeenCalledWith(`${LOGIN_SESSION_SSE_CHANNEL_PREFIX}global-admin`, response);
    });
  });
});
