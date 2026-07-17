/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import PARENT_CHILD_PAIRING_ERROR_MESSAGES from '../constants/parentChildPairingErrorMessages';

type ParentChildPairingErrorMessagesType =
  (typeof PARENT_CHILD_PAIRING_ERROR_MESSAGES)[keyof typeof PARENT_CHILD_PAIRING_ERROR_MESSAGES];

export default ParentChildPairingErrorMessagesType;
