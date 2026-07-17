/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import React from 'react';
import FloatingButtonsBarConfig from '@libs/ui/types/FloatingButtons/floatingButtonsBarConfig';
import ReloadButton from '@/components/shared/FloatingsButtonsBar/CommonButtonConfigs/reloadButton';
import FloatingButtonsBar from '@/components/shared/FloatingsButtonsBar/FloatingButtonsBar';
import useParentChildPairingStore from './useParentChildPairingStore';

const ParentChildPairingFloatingButtons: React.FC = () => {
  const { refreshPairingCode } = useParentChildPairingStore();

  const config: FloatingButtonsBarConfig = {
    buttons: [
      ReloadButton(() => {
        void refreshPairingCode();
      }),
    ],
    keyPrefix: 'parent-child-pairing-page-floating-button_',
  };

  return <FloatingButtonsBar config={config} />;
};

export default ParentChildPairingFloatingButtons;
