/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ParentChildPairingDto from './parentChildPairingDto';

interface EnrichedRelationshipResponseDto extends ParentChildPairingDto {
  studentFirstName: string;
  studentLastName: string;
  parentFirstName: string;
  parentLastName: string;
  isGroupActive: boolean;
}

export default EnrichedRelationshipResponseDto;
