/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel and linuxmuster-ui contributors
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * A copy of the license can be found at: https://www.gnu.org/licenses/agpl-3.0.html
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PRODUCT_SOURCE_URL } from '@libs/common/constants/productInfo';

declare const APP_VERSION: string;

const UNKNOWN_VERSION = 'unknown';

const SourceOffer = () => {
  const { t } = useTranslation();
  const runningVersion = APP_VERSION ? String(APP_VERSION) : UNKNOWN_VERSION;

  return (
    <div className="flex flex-col gap-2">
      <p>{t('settings.sourceOffer.description')}</p>
      <a
        href={PRODUCT_SOURCE_URL}
        target="_blank"
        rel="noreferrer"
        className="font-bold underline"
      >
        {t('settings.sourceOffer.repositoryLink')}
      </a>
      <p className="text-sm">{t('settings.sourceOffer.version', { version: runningVersion })}</p>
    </div>
  );
};

export default SourceOffer;
