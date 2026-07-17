/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const PARENT_CHILD_PAIRING_LOG_ACTION = {
  PAIRING_REQUESTED: 'pairing_requested',
  STATUS_CHANGED: 'status_changed',
} as const;

export default PARENT_CHILD_PAIRING_LOG_ACTION;
