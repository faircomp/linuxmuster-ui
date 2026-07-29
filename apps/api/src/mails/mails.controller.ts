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

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import MAIL_ENDPOINT from '@libs/mail/constants/mail-endpoint';
import MAIL_ENDPOINT_PATHS from '@libs/mail/constants/mailEndpointPaths';
import { MailDto, MailProviderConfigDto, SogoThemeVersionDto, SyncJobDto } from '@libs/mail/types';
import CreateMailboxDto from '@libs/mail/types/createMailbox.dto';
import UpdateMailboxDto from '@libs/mail/types/updateMailbox.dto';
import DeleteMailboxesDto from '@libs/mail/types/deleteMailboxes.dto';
import MailboxAclDto from '@libs/mail/types/mailboxAcl.dto';
import MailProviderPublicConfigDto from '@libs/mail/types/mailProviderPublicConfig.dto';
import CreateSyncJobRequestDto from '@libs/mail/types/createSyncJobRequest.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import SOGO_THEME from '@libs/mail/constants/sogoTheme';
import APPS from '@libs/appconfig/constants/apps';
import GetUsersEmailAddress from '../common/decorators/getUsersEmailAddress.decorator';
import MailsService from './mails.service';
import MailIdleService from './mail-idle.service';
import MailcowAdminService from './mailcow-admin.service';
import UsersService from '../users/users.service';
import AdminGuard from '../common/guards/admin.guard';
import GetCurrentUsername from '../common/decorators/getCurrentUsername.decorator';
import RequireAppAccess from '../common/decorators/requireAppAccess.decorator';

const MAILS_VALIDATION_PIPE = new ValidationPipe({
  whitelist: true,
  transform: true,
  disableErrorMessages: process.env.NODE_ENV === 'production',
});

@ApiTags(MAIL_ENDPOINT)
@ApiBearerAuth()
@RequireAppAccess(APPS.MAIL)
@Controller(MAIL_ENDPOINT)
class MailsController {
  constructor(
    private readonly userService: UsersService,
    private readonly mailsService: MailsService,
    private readonly mailIdleService: MailIdleService,
    private readonly mailcowAdminService: MailcowAdminService,
  ) {}

  @Get()
  async getMails(
    @GetCurrentUsername() username: string,
    @GetUsersEmailAddress() emailAddress: string,
  ): Promise<MailDto[]> {
    const idleMails = await this.mailIdleService.fetchUnseenMails(username);
    if (idleMails !== null) {
      return idleMails;
    }

    const password = await this.userService.getPassword(username);
    const mails = await this.mailsService.getMails(emailAddress, password);

    void this.mailIdleService.startIdle(username, emailAddress, password);

    return mails;
  }

  @Get(`${MAIL_ENDPOINT_PATHS.PROVIDER_CONFIG}/${MAIL_ENDPOINT_PATHS.PUBLIC}`)
  async getPublicMailProviderConfigs(): Promise<MailProviderPublicConfigDto[]> {
    return this.mailsService.getPublicMailProviderConfigs();
  }

  @Get(MAIL_ENDPOINT_PATHS.PROVIDER_CONFIG)
  @UseGuards(AdminGuard)
  async getExternalMailProviderConfig(): Promise<MailProviderConfigDto[]> {
    return this.mailsService.getExternalMailProviderConfig();
  }

  @Post('provider-config')
  @UseGuards(AdminGuard)
  async postExternalMailProviderConfig(
    @Body() mailProviderConfig: MailProviderConfigDto,
  ): Promise<MailProviderConfigDto[]> {
    return this.mailsService.postExternalMailProviderConfig(mailProviderConfig);
  }

  @Delete('provider-config/:mailProviderId')
  @UseGuards(AdminGuard)
  deleteExternalMailProviderConfig(@Param('mailProviderId') mailProviderId: string) {
    return this.mailsService.deleteExternalMailProviderConfig(mailProviderId);
  }

  @Get('sync-job')
  async getSyncJob(@GetUsersEmailAddress() emailAddress: string): Promise<SyncJobDto[]> {
    return this.mailsService.getSyncJobs(emailAddress);
  }

  @Post('sync-job')
  @UsePipes(MAILS_VALIDATION_PIPE)
  async postSyncJob(
    @Body() createSyncJobRequest: CreateSyncJobRequestDto,
    @GetUsersEmailAddress() emailAddress: string,
  ): Promise<SyncJobDto[]> {
    return this.mailsService.createSyncJob(createSyncJobRequest, emailAddress);
  }

  @Delete('sync-job')
  async deleteSyncJobs(
    @Body() syncJobIds: string[],
    @GetUsersEmailAddress() emailAddress: string,
  ): Promise<SyncJobDto[]> {
    return this.mailsService.deleteSyncJobs(syncJobIds, emailAddress);
  }

  @Get(SOGO_THEME.VERSION_CHECK_PATH)
  @UseGuards(AdminGuard)
  async checkSogoThemeVersion(): Promise<SogoThemeVersionDto> {
    return this.mailsService.checkSogoThemeVersion();
  }

  @Post(`${SOGO_THEME.VERSION_CHECK_PATH}/update`)
  @UseGuards(AdminGuard)
  async updateSogoThemeManually(): Promise<void> {
    await this.mailsService.updateSogoTheme();
  }

  @UseGuards(AdminGuard)
  @Get('connection-stats')
  getConnectionStats(): { current: number; max: number } {
    return this.mailIdleService.getConnectionStats();
  }

  @Get(`${MAIL_ENDPOINT_PATHS.MAILCOW_MAILBOXES}/${MAIL_ENDPOINT_PATHS.DOMAINS}`)
  @UseGuards(AdminGuard)
  getMailcowDomains(): Promise<string[]> {
    return this.mailcowAdminService.getMailcowDomains();
  }

  @Get(MAIL_ENDPOINT_PATHS.MAILCOW_MAILBOXES)
  @UseGuards(AdminGuard)
  getMailcowMailboxes(): Promise<unknown[]> {
    return this.mailcowAdminService.getMailcowMailboxes();
  }

  @Post(MAIL_ENDPOINT_PATHS.MAILCOW_MAILBOXES)
  @UseGuards(AdminGuard)
  @UsePipes(MAILS_VALIDATION_PIPE)
  createMailcowMailbox(@Body() createMailboxDto: CreateMailboxDto): Promise<unknown[]> {
    return this.mailcowAdminService.createMailcowMailbox(createMailboxDto);
  }

  @Patch(MAIL_ENDPOINT_PATHS.MAILCOW_MAILBOXES)
  @UseGuards(AdminGuard)
  @UsePipes(MAILS_VALIDATION_PIPE)
  updateMailcowMailbox(@Body() updateMailboxDto: UpdateMailboxDto): Promise<unknown[]> {
    return this.mailcowAdminService.updateMailcowMailbox(updateMailboxDto);
  }

  @Delete(MAIL_ENDPOINT_PATHS.MAILCOW_MAILBOXES)
  @UseGuards(AdminGuard)
  @UsePipes(MAILS_VALIDATION_PIPE)
  deleteMailcowMailboxes(@Body() deleteMailboxesDto: DeleteMailboxesDto): Promise<unknown[]> {
    return this.mailcowAdminService.deleteMailcowMailboxes(deleteMailboxesDto.items);
  }

  @Post(`${MAIL_ENDPOINT_PATHS.MAILCOW_MAILBOXES}/${MAIL_ENDPOINT_PATHS.ACL}`)
  @UseGuards(AdminGuard)
  @UsePipes(MAILS_VALIDATION_PIPE)
  updateMailboxAcl(@Body() mailboxAclDto: MailboxAclDto): Promise<unknown[]> {
    return this.mailcowAdminService.updateMailboxAcl(mailboxAclDto);
  }
}

export default MailsController;
