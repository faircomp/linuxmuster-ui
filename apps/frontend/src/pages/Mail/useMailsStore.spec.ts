/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { MAILS_PATH } from '@libs/userSettings/constants/user-settings-endpoints';
import MAIL_ENDPOINT_PATHS from '@libs/mail/constants/mailEndpointPaths';
import type CreateMailboxDto from '@libs/mail/types/createMailbox.dto';
import type UpdateMailboxDto from '@libs/mail/types/updateMailbox.dto';
import type MailboxAclDto from '@libs/mail/types/mailboxAcl.dto';
import eduApi from '@/api/eduApi';
import useMailsStore from './useMailsStore';

vi.mock('@/api/eduApi', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }));

const mockedEduApi = eduApi as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};
const mockedToast = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

const MAILCOW_PATH = `${MAILS_PATH}/${MAIL_ENDPOINT_PATHS.MAILCOW_MAILBOXES}`;
const DOMAINS_PATH = `${MAILCOW_PATH}/${MAIL_ENDPOINT_PATHS.DOMAINS}`;
const ACL_PATH = `${MAILCOW_PATH}/${MAIL_ENDPOINT_PATHS.ACL}`;

const createDto = { local_part: 'jane', domain: 'example.com' } as CreateMailboxDto;
const updateDto = { items: ['jane@example.com'], attr: { name: 'Jane' } } as UpdateMailboxDto;
const aclDto = { items: ['jane@example.com'], attr: { user_acl: ['spam_alias'] } } as MailboxAclDto;

describe('useMailsStore mailcow admin actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMailsStore.setState({ mailcowDomains: [], mailcowMailboxes: [], isMailcowLoading: false });
    mockedEduApi.get.mockResolvedValue({ data: [] });
    mockedEduApi.post.mockResolvedValue({ data: [] });
    mockedEduApi.patch.mockResolvedValue({ data: [] });
    mockedEduApi.delete.mockResolvedValue({ data: [] });
  });

  it('getMailcowDomains fetches the domains route and stores the result', async () => {
    mockedEduApi.get.mockResolvedValueOnce({ data: ['a.example', 'b.example'] });

    await useMailsStore.getState().getMailcowDomains();

    expect(mockedEduApi.get).toHaveBeenCalledWith(DOMAINS_PATH);
    expect(useMailsStore.getState().mailcowDomains).toEqual(['a.example', 'b.example']);
  });

  it('getMailcowMailboxes fetches the mailboxes route and stores the result', async () => {
    const mailboxes = [{ username: 'jane@example.com' }];
    mockedEduApi.get.mockResolvedValueOnce({ data: mailboxes });

    await useMailsStore.getState().getMailcowMailboxes();

    expect(mockedEduApi.get).toHaveBeenCalledWith(MAILCOW_PATH);
    expect(useMailsStore.getState().mailcowMailboxes).toEqual(mailboxes);
  });

  it('createMailcowMailbox posts the dto, stores the refreshed list and toasts success', async () => {
    const refreshed = [{ username: 'jane@example.com' }];
    mockedEduApi.post.mockResolvedValueOnce({ data: refreshed });

    await useMailsStore.getState().createMailcowMailbox(createDto);

    expect(mockedEduApi.post).toHaveBeenCalledWith(MAILCOW_PATH, createDto);
    expect(useMailsStore.getState().mailcowMailboxes).toEqual(refreshed);
    expect(mockedToast.success).toHaveBeenCalledWith('mailcowAdmin.notifications.mailboxCreated');
  });

  it('updateMailcowMailbox patches the dto and toasts success', async () => {
    await useMailsStore.getState().updateMailcowMailbox(updateDto);

    expect(mockedEduApi.patch).toHaveBeenCalledWith(MAILCOW_PATH, updateDto);
    expect(mockedToast.success).toHaveBeenCalledWith('mailcowAdmin.notifications.mailboxUpdated');
  });

  it('deleteMailcowMailboxes sends the identifiers wrapped in an items body and toasts success', async () => {
    await useMailsStore.getState().deleteMailcowMailboxes(['jane@example.com', 'john@example.com']);

    expect(mockedEduApi.delete).toHaveBeenCalledWith(MAILCOW_PATH, {
      data: { items: ['jane@example.com', 'john@example.com'] },
    });
    expect(mockedToast.success).toHaveBeenCalledWith('mailcowAdmin.notifications.mailboxDeleted');
  });

  it('updateMailboxAcl posts to the acl route and toasts success', async () => {
    await useMailsStore.getState().updateMailboxAcl(aclDto);

    expect(mockedEduApi.post).toHaveBeenCalledWith(ACL_PATH, aclDto);
    expect(mockedToast.success).toHaveBeenCalledWith('mailcowAdmin.notifications.aclUpdated');
  });

  it('surfaces API failures without toasting success', async () => {
    mockedEduApi.get.mockRejectedValueOnce(new Error('boom'));

    await useMailsStore.getState().getMailcowMailboxes();

    expect(mockedToast.success).not.toHaveBeenCalled();
    expect(useMailsStore.getState().isMailcowLoading).toBe(false);
  });
});
