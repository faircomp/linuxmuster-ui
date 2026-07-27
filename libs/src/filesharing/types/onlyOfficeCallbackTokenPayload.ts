/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

interface OnlyOfficeSignedCallbackClaims {
  status?: number;
  url?: string;
  key?: string;
}

interface OnlyOfficeCallbackTokenPayload extends OnlyOfficeSignedCallbackClaims {
  payload?: OnlyOfficeSignedCallbackClaims;
}

export default OnlyOfficeCallbackTokenPayload;
