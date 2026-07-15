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
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PRODUCT_SOURCE_URL } from '@libs/common/constants/productInfo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import LoginSourceOfferFooter from './LoginSourceOfferFooter';

describe('LoginSourceOfferFooter (AGPL §13 pre-auth footer link)', () => {
  it('renders a footer anchor pointing to PRODUCT_SOURCE_URL', () => {
    const html = renderToStaticMarkup(<LoginSourceOfferFooter />);

    expect(html).toContain('<footer');
    expect(html).toContain(`href="${PRODUCT_SOURCE_URL}"`);
    expect(html).toContain('settings.sourceOffer.repositoryLink');
  });
});
