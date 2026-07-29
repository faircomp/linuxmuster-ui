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

import { create } from 'zustand';
import { RowSelectionState } from '@tanstack/react-table';
import { toast } from 'sonner';
import i18n from '@/i18n';
import type {
  MailDto,
  MailsStore,
  MailProviderConfigDto,
  SyncJobDto,
  MailcowMailboxDto,
} from '@libs/mail/types';
import type CreateMailboxDto from '@libs/mail/types/createMailbox.dto';
import type UpdateMailboxDto from '@libs/mail/types/updateMailbox.dto';
import type MailboxAclDto from '@libs/mail/types/mailboxAcl.dto';
import type MailProviderPublicConfigDto from '@libs/mail/types/mailProviderPublicConfig.dto';
import type CreateSyncJobRequestDto from '@libs/mail/types/createSyncJobRequest.dto';
import MAIL_ENDPOINT from '@libs/mail/constants/mail-endpoint';
import MAIL_ENDPOINT_PATHS from '@libs/mail/constants/mailEndpointPaths';
import eduApi from '@/api/eduApi';
import handleApiError from '@/utils/handleApiError';
import MailStoreInitialState from '@libs/mail/constants/mailsStoreInitialState';
import { MAILS_PATH } from '@libs/userSettings/constants/user-settings-endpoints';

const MAILCOW_MAILBOXES_PATH = `${MAILS_PATH}/${MAIL_ENDPOINT_PATHS.MAILCOW_MAILBOXES}`;

const useMailsStore = create<MailsStore>((set) => ({
  ...MailStoreInitialState,
  reset: () => set(MailStoreInitialState),
  setSelectedSyncJob: (selectedSyncJob: RowSelectionState) => set({ selectedSyncJob }),

  getMails: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      const { data } = await eduApi.get<MailDto[]>(MAIL_ENDPOINT);
      set({ mails: data });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isLoading: false });
    }
  },

  getPublicMailProviderConfigs: async () => {
    set({ isLoading: true });
    try {
      const response = await eduApi.get<MailProviderPublicConfigDto[]>(`${MAILS_PATH}/provider-config/public`);
      set({ publicMailProviderConfigs: response.data });
    } catch (error) {
      handleApiError(error, set, 'mailProviderConfigError');
    } finally {
      set({ isLoading: false });
    }
  },

  getExternalMailProviderConfig: async () => {
    set({ isLoading: true });
    try {
      const response = await eduApi.get<MailProviderConfigDto[]>(`${MAILS_PATH}/provider-config`);
      set({ externalMailProviderConfig: response.data });
    } catch (error) {
      handleApiError(error, set, 'mailProviderConfigError');
    } finally {
      set({ isLoading: false });
    }
  },

  postExternalMailProviderConfig: async (mailProviderConfig: MailProviderConfigDto) => {
    set({ isLoading: true });
    try {
      const response = await eduApi.post<MailProviderConfigDto[]>(`${MAILS_PATH}/provider-config`, mailProviderConfig);
      set({ externalMailProviderConfig: response.data });
    } catch (error) {
      handleApiError(error, set, 'mailProviderConfigError');
    } finally {
      set({ isLoading: false });
    }
  },

  deleteExternalMailProviderConfig: async (mailProviderId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await eduApi.delete<MailProviderConfigDto[]>(`${MAILS_PATH}/provider-config/${mailProviderId}`);
      set({ externalMailProviderConfig: response.data });
    } catch (e) {
      handleApiError(e, set, 'mailProviderConfigError');
    } finally {
      set({ isLoading: false });
    }
  },

  getSyncJob: async () => {
    set({ isGetSyncJobLoading: true });
    try {
      const response = await eduApi.get<SyncJobDto[]>(`${MAILS_PATH}/sync-job`);
      set({ syncJobs: response.data });
    } catch (error) {
      handleApiError(error, set, 'mailProviderConfigError');
    } finally {
      set({ isGetSyncJobLoading: false });
    }
  },

  postSyncJob: async (createSyncJobRequest: CreateSyncJobRequestDto) => {
    set({ isEditSyncJobLoading: true });
    try {
      const response = await eduApi.post<SyncJobDto[]>(`${MAILS_PATH}/sync-job`, createSyncJobRequest);
      set({ syncJobs: response.data });
      toast.success(i18n.t('mail.importer.syncAccountAdded'));
    } catch (error) {
      handleApiError(error, set, 'mailProviderConfigError');
    } finally {
      set({ isEditSyncJobLoading: false });
    }
  },

  deleteSyncJobs: async (syncJobIds: string[]) => {
    set({ isEditSyncJobLoading: true });
    try {
      const response = await eduApi.delete<SyncJobDto[]>(`${MAILS_PATH}/sync-job`, { data: syncJobIds });
      set({ syncJobs: response.data });
      toast.success(i18n.t('mail.importer.syncAccountDeleted'));
    } catch (error) {
      handleApiError(error, set, 'mailProviderConfigError');
    } finally {
      set({ isEditSyncJobLoading: false });
    }
  },

  getMailcowDomains: async () => {
    set({ isMailcowLoading: true });
    try {
      const { data } = await eduApi.get<string[]>(`${MAILCOW_MAILBOXES_PATH}/${MAIL_ENDPOINT_PATHS.DOMAINS}`);
      set({ mailcowDomains: data });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isMailcowLoading: false });
    }
  },

  getMailcowMailboxes: async () => {
    set({ isMailcowLoading: true });
    try {
      const { data } = await eduApi.get<MailcowMailboxDto[]>(MAILCOW_MAILBOXES_PATH);
      set({ mailcowMailboxes: data });
    } catch (error) {
      handleApiError(error, set);
    } finally {
      set({ isMailcowLoading: false });
    }
  },

  createMailcowMailbox: async (createMailboxDto: CreateMailboxDto): Promise<boolean> => {
    set({ isMailcowLoading: true });
    try {
      const { data } = await eduApi.post<MailcowMailboxDto[]>(MAILCOW_MAILBOXES_PATH, createMailboxDto);
      set({ mailcowMailboxes: data });
      toast.success(i18n.t('mailcowAdmin.notifications.mailboxCreated'));
      return true;
    } catch (error) {
      handleApiError(error, set);
      return false;
    } finally {
      set({ isMailcowLoading: false });
    }
  },

  updateMailcowMailbox: async (updateMailboxDto: UpdateMailboxDto): Promise<boolean> => {
    set({ isMailcowLoading: true });
    try {
      const { data } = await eduApi.patch<MailcowMailboxDto[]>(MAILCOW_MAILBOXES_PATH, updateMailboxDto);
      set({ mailcowMailboxes: data });
      toast.success(i18n.t('mailcowAdmin.notifications.mailboxUpdated'));
      return true;
    } catch (error) {
      handleApiError(error, set);
      return false;
    } finally {
      set({ isMailcowLoading: false });
    }
  },

  deleteMailcowMailboxes: async (mailboxes: string[]): Promise<boolean> => {
    set({ isMailcowLoading: true });
    try {
      const { data } = await eduApi.delete<MailcowMailboxDto[]>(MAILCOW_MAILBOXES_PATH, { data: { items: mailboxes } });
      set({ mailcowMailboxes: data });
      toast.success(i18n.t('mailcowAdmin.notifications.mailboxDeleted'));
      return true;
    } catch (error) {
      handleApiError(error, set);
      return false;
    } finally {
      set({ isMailcowLoading: false });
    }
  },

  updateMailboxAcl: async (mailboxAclDto: MailboxAclDto): Promise<boolean> => {
    set({ isMailcowLoading: true });
    try {
      const { data } = await eduApi.post<MailcowMailboxDto[]>(
        `${MAILCOW_MAILBOXES_PATH}/${MAIL_ENDPOINT_PATHS.ACL}`,
        mailboxAclDto,
      );
      set({ mailcowMailboxes: data });
      toast.success(i18n.t('mailcowAdmin.notifications.aclUpdated'));
      return true;
    } catch (error) {
      handleApiError(error, set);
      return false;
    } finally {
      set({ isMailcowLoading: false });
    }
  },
}));

export default useMailsStore;
