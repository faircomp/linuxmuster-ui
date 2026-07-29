/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PARENT_CHILD_PAIRING_STATUS from '@libs/parent-child-pairing/constants/parentChildPairingStatus';
import ParentChildPairingStatusBadge from './ParentChildPairingStatusBadge';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ParentChildPairingStatusBadge', () => {
  it.each([
    [PARENT_CHILD_PAIRING_STATUS.PENDING, 'parentChildPairing.statusPending'],
    [PARENT_CHILD_PAIRING_STATUS.ACCEPTED, 'parentChildPairing.statusAccepted'],
    [PARENT_CHILD_PAIRING_STATUS.REJECTED, 'parentChildPairing.statusRejected'],
  ])('renders the translated label for status "%s"', (status, expectedKey) => {
    const markup = renderToStaticMarkup(<ParentChildPairingStatusBadge status={status} />);

    expect(markup).toContain(expectedKey);
  });

  it('falls back to the raw status when the status is unknown', () => {
    const markup = renderToStaticMarkup(<ParentChildPairingStatusBadge status="unknown-status" />);

    expect(markup).toContain('unknown-status');
  });
});
