/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

interface MailcowMailboxDto {
  username: string;
  name: string;
  active: number;
  domain: string;
  local_part: string;
  quota: number;
  quota_used: number;
  messages: number;
  tags?: string[];
}

export default MailcowMailboxDto;
