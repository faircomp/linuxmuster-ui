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
  useTranslation: () => ({
    t: (key: string, opts?: { version?: string }) => (opts?.version ? `${key}:${opts.version}` : key),
  }),
}));

import SourceOffer from './SourceOffer';

describe('SourceOffer (AGPL §13 source offer)', () => {
  it('renders a prominent link to PRODUCT_SOURCE_URL with the section-13 text and a version field', () => {
    const html = renderToStaticMarkup(<SourceOffer />);

    expect(html).toContain(`href="${PRODUCT_SOURCE_URL}"`);
    expect(html).toContain('settings.sourceOffer.description');
    expect(html).toContain('settings.sourceOffer.repositoryLink');
    expect(html).toContain('settings.sourceOffer.version');
  });
});
