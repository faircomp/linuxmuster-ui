/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const ACTIVE_MAIL_CLIENT = {
  SOGO: 'sogo',
  NATIVE: 'native',
} as const;

type ActiveMailClient = (typeof ACTIVE_MAIL_CLIENT)[keyof typeof ACTIVE_MAIL_CLIENT];

export { ACTIVE_MAIL_CLIENT };
export default ActiveMailClient;
