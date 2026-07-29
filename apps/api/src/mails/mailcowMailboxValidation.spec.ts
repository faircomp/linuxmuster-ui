/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import CreateMailboxDto from '@libs/mail/types/createMailbox.dto';
import DeleteMailboxesDto from '@libs/mail/types/deleteMailboxes.dto';

const pipe = new ValidationPipe({ whitelist: true, transform: true });

const createMeta: ArgumentMetadata = { type: 'body', metatype: CreateMailboxDto, data: '' };
const deleteMeta: ArgumentMetadata = { type: 'body', metatype: DeleteMailboxesDto, data: '' };

const validCreatePayload = {
  local_part: 'jane',
  domain: 'example.com',
  name: 'Jane Doe',
  quota: 1024,
  password: 'secret1!',
  password2: 'secret1!',
  active: 1,
  force_pw_update: 0,
  tls_enforce_in: 0,
  tls_enforce_out: 0,
};

describe('mailcow mailbox DTO validation (MAILS_VALIDATION_PIPE)', () => {
  it('accepts a well-formed create payload', async () => {
    await expect(pipe.transform({ ...validCreatePayload }, createMeta)).resolves.toMatchObject({ local_part: 'jane' });
  });

  it('rejects a mismatched password confirmation', async () => {
    await expect(pipe.transform({ ...validCreatePayload, password2: 'different1!' }, createMeta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a quota above the allowed maximum', async () => {
    await expect(pipe.transform({ ...validCreatePayload, quota: 999_999_999 }, createMeta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a quota below one', async () => {
    await expect(pipe.transform({ ...validCreatePayload, quota: 0 }, createMeta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a local part with forbidden characters', async () => {
    await expect(pipe.transform({ ...validCreatePayload, local_part: 'jane@doe' }, createMeta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a password without the required complexity', async () => {
    await expect(
      pipe.transform({ ...validCreatePayload, password: 'password', password2: 'password' }, createMeta),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an empty delete identifier list', async () => {
    await expect(pipe.transform({ items: [] }, deleteMeta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a delete identifier list over the request cap', async () => {
    const items = Array.from({ length: 257 }, (_element, index) => `user${index}@example.com`);
    await expect(pipe.transform({ items }, deleteMeta)).rejects.toBeInstanceOf(BadRequestException);
  });
});
