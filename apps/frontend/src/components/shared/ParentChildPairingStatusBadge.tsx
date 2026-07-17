/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@edulution-io/ui-kit';
import PARENT_CHILD_PAIRING_STATUS from '@libs/parent-child-pairing/constants/parentChildPairingStatus';
import { BadgeSH } from '@/components/ui/BadgeSH';

const PARENT_CHILD_PAIRING_STATUS_STYLES: Record<string, string> = {
  [PARENT_CHILD_PAIRING_STATUS.PENDING]: 'bg-yellow-500 text-white',
  [PARENT_CHILD_PAIRING_STATUS.ACCEPTED]: 'bg-ciLightGreen text-white',
  [PARENT_CHILD_PAIRING_STATUS.REJECTED]: 'bg-ciRed text-white',
};

const PARENT_CHILD_PAIRING_STATUS_TRANSLATIONS: Record<string, string> = {
  [PARENT_CHILD_PAIRING_STATUS.PENDING]: 'parentChildPairing.statusPending',
  [PARENT_CHILD_PAIRING_STATUS.ACCEPTED]: 'parentChildPairing.statusAccepted',
  [PARENT_CHILD_PAIRING_STATUS.REJECTED]: 'parentChildPairing.statusRejected',
};

interface ParentChildPairingStatusBadgeProps {
  status: string;
  className?: string;
}

const ParentChildPairingStatusBadge: React.FC<ParentChildPairingStatusBadgeProps> = ({ status, className }) => {
  const { t } = useTranslation();
  const style = PARENT_CHILD_PAIRING_STATUS_STYLES[status] ?? 'bg-gray-500 text-white';
  const translationKey = PARENT_CHILD_PAIRING_STATUS_TRANSLATIONS[status] ?? status;

  return <BadgeSH className={cn('!h-auto !py-0 text-sm', style, className)}>{t(translationKey)}</BadgeSH>;
};

export default ParentChildPairingStatusBadge;
