/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import ONLY_OFFICE_CALLBACK_STATUS from '@libs/filesharing/constants/onlyOfficeCallbackStatus';

type OnlyOfficeCallbackStatusType = (typeof ONLY_OFFICE_CALLBACK_STATUS)[keyof typeof ONLY_OFFICE_CALLBACK_STATUS];

export default OnlyOfficeCallbackStatusType;
