/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Agent } from 'https';
import { HTTP_HEADERS, RequestResponseContentType } from '@libs/common/types/http-methods';
import MailsErrorMessages from '@libs/mail/constants/mails-error-messages';
import getErrorMessage from '@libs/common/utils/getErrorMessage';
import type CreateMailboxDto from '@libs/mail/types/createMailbox.dto';
import type UpdateMailboxDto from '@libs/mail/types/updateMailbox.dto';
import type MailboxAclDto from '@libs/mail/types/mailboxAcl.dto';
import CustomHttpException from '../common/CustomHttpException';
import MailcowValidationError, {
  assertMailcowSuccess,
  getMailcowErrorStatus,
  mapMailcowErrorCode,
} from './errors/MailcowValidationError';

const { MAILCOW_API_URL, MAILCOW_API_TOKEN } = process.env;
const MAILCOW_API_TIMEOUT_MS = 10000;

const createMailcowApi = (url: string | undefined, apiKey: string | undefined): AxiosInstance =>
  axios.create({
    baseURL: url ? `${url}/api/v1` : undefined,
    timeout: MAILCOW_API_TIMEOUT_MS,
    headers: {
      [HTTP_HEADERS.XApiKey]: apiKey ?? '',
      [HTTP_HEADERS.ContentType]: RequestResponseContentType.APPLICATION_JSON,
    },
    httpsAgent: new Agent({ rejectUnauthorized: false }),
  });

@Injectable()
class MailcowAdminService {
  private readonly mailcowApi: AxiosInstance = createMailcowApi(MAILCOW_API_URL, MAILCOW_API_TOKEN);

  async getMailcowDomains(): Promise<string[]> {
    try {
      const { data } = await this.mailcowApi.get<unknown>('/get/domain/all');
      if (!Array.isArray(data)) {
        throw new Error('Mailcow API returned a non-array response for /get/domain/all');
      }
      return (data as Array<{ domain_name: string }>).map((domain) => domain.domain_name);
    } catch (error) {
      throw new CustomHttpException(
        MailsErrorMessages.MailcowApiGetDomainsFailed,
        getMailcowErrorStatus(error),
        getErrorMessage(error),
        MailcowAdminService.name,
      );
    }
  }

  async getMailcowMailboxes(): Promise<unknown[]> {
    try {
      const { data } = await this.mailcowApi.get<unknown>('/get/mailbox/all');
      if (!Array.isArray(data)) {
        throw new Error('Mailcow API returned a non-array response for /get/mailbox/all');
      }
      return data as unknown[];
    } catch (error) {
      throw new CustomHttpException(
        MailsErrorMessages.MailcowApiGetMailboxesFailed,
        getMailcowErrorStatus(error),
        getErrorMessage(error),
        MailcowAdminService.name,
      );
    }
  }

  async createMailcowMailbox(createMailboxDto: CreateMailboxDto): Promise<unknown[]> {
    try {
      const normalizedDto = {
        ...createMailboxDto,
        local_part: createMailboxDto.local_part.toLowerCase(),
      };
      const { data } = await this.mailcowApi.post<unknown>('/add/mailbox', normalizedDto);
      assertMailcowSuccess(data);
    } catch (error) {
      throw new CustomHttpException(
        mapMailcowErrorCode(error, MailsErrorMessages.MailcowApiCreateMailboxFailed),
        getMailcowErrorStatus(error),
        error instanceof MailcowValidationError ? error.codes : getErrorMessage(error),
        MailcowAdminService.name,
      );
    }
    return this.getMailcowMailboxes();
  }

  async updateMailcowMailbox(updateMailboxDto: UpdateMailboxDto): Promise<unknown[]> {
    try {
      const { data } = await this.mailcowApi.post<unknown>('/edit/mailbox', updateMailboxDto);
      assertMailcowSuccess(data);
    } catch (error) {
      throw new CustomHttpException(
        mapMailcowErrorCode(error, MailsErrorMessages.MailcowApiUpdateMailboxFailed),
        getMailcowErrorStatus(error),
        error instanceof MailcowValidationError ? error.codes : getErrorMessage(error),
        MailcowAdminService.name,
      );
    }
    return this.getMailcowMailboxes();
  }

  async deleteMailcowMailboxes(mailboxes: string[]): Promise<unknown[]> {
    try {
      const { data } = await this.mailcowApi.post<unknown>('/delete/mailbox', mailboxes);
      assertMailcowSuccess(data);
    } catch (error) {
      throw new CustomHttpException(
        mapMailcowErrorCode(error, MailsErrorMessages.MailcowApiDeleteMailboxFailed),
        getMailcowErrorStatus(error),
        error instanceof MailcowValidationError ? error.codes : getErrorMessage(error),
        MailcowAdminService.name,
      );
    }
    return this.getMailcowMailboxes();
  }

  async updateMailboxAcl(updateAclDto: MailboxAclDto): Promise<unknown[]> {
    try {
      const { data } = await this.mailcowApi.post<unknown>('/edit/user-acl', updateAclDto);
      assertMailcowSuccess(data);
    } catch (error) {
      throw new CustomHttpException(
        mapMailcowErrorCode(error, MailsErrorMessages.MailcowApiUpdateMailboxAclFailed),
        getMailcowErrorStatus(error),
        error instanceof MailcowValidationError ? error.codes : getErrorMessage(error),
        MailcowAdminService.name,
      );
    }
    return this.getMailcowMailboxes();
  }
}

export default MailcowAdminService;
