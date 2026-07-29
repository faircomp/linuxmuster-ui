/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const EDULUTION_QR_TYPE = {
  SATELLITE_APPLIANCE: 'edulution-satellite-appliance',
  PARENT_CHILD_PAIRING: 'parent-child-pairing',
  ACCOUNT_SETUP: 'account-setup',
  QR_LOGIN: 'qr-login',
} as const;

export default EDULUTION_QR_TYPE;
