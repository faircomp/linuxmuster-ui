/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { HttpStatus, Logger } from '@nestjs/common';
import WIKI_ERROR_MESSAGES from '@libs/wiki/constants/wikiErrorMessages';
import type WebdavShareDto from '@libs/filesharing/types/webdavShareDto';
import CustomHttpException from '../common/CustomHttpException';
import WebdavSharesService from '../webdav/shares/webdav-shares.service';

const assertShareAccessible = async (
  webdavSharesService: WebdavSharesService,
  displayName: string,
  userGroups: string[],
): Promise<WebdavShareDto> => {
  const shares = await webdavSharesService.findAllWikiShares(userGroups);
  const match = shares.find((share) => share.displayName === displayName);
  if (!match) {
    Logger.debug(
      `[WikiAccess] share displayName=${displayName} not visible to user (${shares.length} shares accessible)`,
      assertShareAccessible.name,
    );
    throw new CustomHttpException(WIKI_ERROR_MESSAGES.ACCESS_DENIED, HttpStatus.FORBIDDEN, { share: displayName });
  }
  return match;
};

export default assertShareAccessible;
