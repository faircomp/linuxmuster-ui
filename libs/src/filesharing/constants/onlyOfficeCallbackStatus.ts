/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const ONLY_OFFICE_CALLBACK_STATUS = {
  EDITING: 1,
  READY_FOR_SAVING: 2,
  SAVING_ERROR: 3,
  CLOSED_WITHOUT_CHANGES: 4,
  FORCE_SAVING: 6,
  FORCE_SAVING_ERROR: 7,
} as const;

export default ONLY_OFFICE_CALLBACK_STATUS;
