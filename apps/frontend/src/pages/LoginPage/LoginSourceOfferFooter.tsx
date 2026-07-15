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

const LoginSourceOfferFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="mt-4 flex justify-center">
      <a
        href={PRODUCT_SOURCE_URL}
        target="_blank"
        rel="noreferrer"
        className="text-sm underline opacity-80 hover:opacity-100"
      >
        {t('settings.sourceOffer.repositoryLink')}
      </a>
    </footer>
  );
};

export default LoginSourceOfferFooter;
