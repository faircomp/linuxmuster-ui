/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

class WebdavFileAlreadyExistsError extends Error {
  readonly path: string;

  constructor(path: string, message = 'WebDAV PUT rejected: file already exists (HTTP 412 on If-None-Match: *)') {
    super(message);
    this.name = 'WebdavFileAlreadyExistsError';
    this.path = path;
    Object.setPrototypeOf(this, WebdavFileAlreadyExistsError.prototype);
  }
}

export default WebdavFileAlreadyExistsError;
