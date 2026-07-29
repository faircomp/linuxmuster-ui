/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const PARENT_CHILD_PAIRING_ERROR_MESSAGES = {
  CODE_NOT_FOUND: 'parentChildPairing.errors.codeNotFound',
  CODE_EXPIRED: 'parentChildPairing.errors.codeExpired',
  CANNOT_PAIR_WITH_SELF: 'parentChildPairing.errors.cannotPairWithSelf',
  PAIRING_ALREADY_EXISTS: 'parentChildPairing.errors.pairingAlreadyExists',
  PAIRING_NOT_FOUND: 'parentChildPairing.errors.pairingNotFound',
  INVALID_ROLE: 'parentChildPairing.errors.invalidRole',
  INCOMPATIBLE_ROLES: 'parentChildPairing.errors.incompatibleRoles',
} as const;

export default PARENT_CHILD_PAIRING_ERROR_MESSAGES;
