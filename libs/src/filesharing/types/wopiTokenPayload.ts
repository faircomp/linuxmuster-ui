/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

interface WopiTokenPayload {
  username: string;
  filePath: string;
  share: string;
  canWrite: boolean;
  origin: string;
  jti: string;
}

export default WopiTokenPayload;
