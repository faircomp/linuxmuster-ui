/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

class WebdavEtagConflictError extends Error {
  readonly currentEtag: string;

  readonly serverContent: string;

  constructor(
    payload: { currentEtag: string; serverContent: string },
    message = 'WebDAV PUT conflict: ETag mismatch (HTTP 412)',
  ) {
    super(message);
    this.name = 'WebdavEtagConflictError';
    this.currentEtag = payload.currentEtag;
    this.serverContent = payload.serverContent;
    Object.setPrototypeOf(this, WebdavEtagConflictError.prototype);
  }
}

export default WebdavEtagConflictError;
