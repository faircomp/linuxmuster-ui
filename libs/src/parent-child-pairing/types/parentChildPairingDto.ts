/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type ParentChildPairingStatusType from './parentChildPairingStatusType';

interface ParentChildPairingLogEntryDto {
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

interface ParentChildPairingDto {
  id: string;
  parent: string;
  student: string;
  school: string;
  status: ParentChildPairingStatusType;
  logs: ParentChildPairingLogEntryDto[];
  createdAt: string;
  updatedAt: string;
}

export default ParentChildPairingDto;
