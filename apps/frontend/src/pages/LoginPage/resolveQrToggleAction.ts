/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const QR_TOGGLE_ACTION = {
  CANCEL_TOTP: 'cancelTotp',
  HIDE: 'hide',
  REQUEST_SESSION: 'requestSession',
} as const;

type QrToggleAction = (typeof QR_TOGGLE_ACTION)[keyof typeof QR_TOGGLE_ACTION];

const resolveQrToggleAction = (isEnterTotpVisible: boolean, showQrCode: boolean): QrToggleAction => {
  if (isEnterTotpVisible) {
    return QR_TOGGLE_ACTION.CANCEL_TOTP;
  }

  if (showQrCode) {
    return QR_TOGGLE_ACTION.HIDE;
  }

  return QR_TOGGLE_ACTION.REQUEST_SESSION;
};

export { QR_TOGGLE_ACTION };

export default resolveQrToggleAction;
