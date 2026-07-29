/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus } from '@nestjs/common';
import axios from 'axios';
import CreateMailboxDto from '@libs/mail/types/createMailbox.dto';
import MailcowAdminService from './mailcow-admin.service';
import CustomHttpException from '../common/CustomHttpException';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
};

const buildCreateDto = (overrides: Partial<CreateMailboxDto> = {}): CreateMailboxDto => ({
  local_part: 'Jane',
  domain: 'example.com',
  name: 'Jane Doe',
  quota: 1024,
  password: 'secret1!',
  password2: 'secret1!',
  active: 1,
  force_pw_update: 0,
  tls_enforce_in: 0,
  tls_enforce_out: 0,
  ...overrides,
});

describe('MailcowAdminService', () => {
  let service: MailcowAdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockApi as never);
    service = new MailcowAdminService();
  });

  describe('getMailcowDomains', () => {
    it('maps domain_name out of the mailcow response', async () => {
      mockApi.get.mockResolvedValue({ data: [{ domain_name: 'a.example' }, { domain_name: 'b.example' }] });

      await expect(service.getMailcowDomains()).resolves.toEqual(['a.example', 'b.example']);
      expect(mockApi.get).toHaveBeenCalledWith('/get/domain/all');
    });

    it('throws a bad-gateway CustomHttpException when the response is not an array', async () => {
      expect.assertions(2);
      mockApi.get.mockResolvedValue({ data: {} });

      try {
        await service.getMailcowDomains();
      } catch (error) {
        expect(error).toBeInstanceOf(CustomHttpException);
        expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      }
    });
  });

  describe('getMailcowMailboxes', () => {
    it('returns the mailbox array unchanged', async () => {
      const mailboxes = [{ username: 'jane@example.com' }];
      mockApi.get.mockResolvedValue({ data: mailboxes });

      await expect(service.getMailcowMailboxes()).resolves.toEqual(mailboxes);
      expect(mockApi.get).toHaveBeenCalledWith('/get/mailbox/all');
    });
  });

  describe('createMailcowMailbox', () => {
    it('lowercases the local part, keeps the domain, and returns the refreshed list', async () => {
      mockApi.post.mockResolvedValue({ data: [{ type: 'success', msg: ['mailbox_added'] }] });
      mockApi.get.mockResolvedValue({ data: [{ username: 'jane@example.com' }] });

      const result = await service.createMailcowMailbox(buildCreateDto({ local_part: 'Jane', domain: 'Example.com' }));

      expect(mockApi.post).toHaveBeenCalledWith(
        '/add/mailbox',
        expect.objectContaining({ local_part: 'jane', domain: 'Example.com' }),
      );
      expect(result).toEqual([{ username: 'jane@example.com' }]);
    });

    it('maps a mailcow danger code to a bad-request CustomHttpException', async () => {
      expect.assertions(3);
      mockApi.post.mockResolvedValue({ data: [{ type: 'danger', msg: ['object_exists'] }] });

      try {
        await service.createMailcowMailbox(buildCreateDto());
      } catch (error) {
        expect(error).toBeInstanceOf(CustomHttpException);
        expect((error as CustomHttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('deleteMailcowMailboxes', () => {
    it('posts the identifier array to the delete endpoint', async () => {
      mockApi.post.mockResolvedValue({ data: [{ type: 'success' }] });
      mockApi.get.mockResolvedValue({ data: [] });

      await service.deleteMailcowMailboxes(['jane@example.com', 'john@example.com']);

      expect(mockApi.post).toHaveBeenCalledWith('/delete/mailbox', ['jane@example.com', 'john@example.com']);
    });
  });
});
