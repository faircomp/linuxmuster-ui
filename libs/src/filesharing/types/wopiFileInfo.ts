/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

interface WopiFileInfo {
  BaseFileName: string;
  Size: number;
  OwnerId: string;
  UserId: string;
  UserFriendlyName: string;
  UserCanWrite: boolean;
  UserCanNotWriteRelative: boolean;
  PostMessageOrigin: string;
  LastModifiedTime: string;
  Version: string;
}

export default WopiFileInfo;
