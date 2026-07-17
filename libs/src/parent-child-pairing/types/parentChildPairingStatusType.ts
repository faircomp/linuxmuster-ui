/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import PARENT_CHILD_PAIRING_STATUS from '../constants/parentChildPairingStatus';

type ParentChildPairingStatusType = (typeof PARENT_CHILD_PAIRING_STATUS)[keyof typeof PARENT_CHILD_PAIRING_STATUS];

export default ParentChildPairingStatusType;
