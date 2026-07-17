/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

interface ParentChildPairingQrPayload {
  type: string;
  version: number;
  code: string;
  username: string;
  role: string;
  expiresAt: string;
}

export default ParentChildPairingQrPayload;
