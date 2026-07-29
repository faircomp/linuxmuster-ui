/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type AppConfigDto from '@libs/appconfig/types/appConfigDto';
import APPS from '@libs/appconfig/constants/apps';
import ExtendedOptionKeys from '@libs/appconfig/constants/extendedOptionKeys';
import getExtendedOptionsValue from '@libs/appconfig/utils/getExtendedOptionsValue';
import { ACTIVE_MAIL_CLIENT } from '@libs/mail/constants/activeMailClient';
import type ActiveMailClient from '@libs/mail/constants/activeMailClient';

const getActiveMailClient = (appConfigs: AppConfigDto[]): ActiveMailClient =>
  getExtendedOptionsValue<ActiveMailClient>(appConfigs, APPS.MAIL, ExtendedOptionKeys.ACTIVE_MAIL_CLIENT) ??
  ACTIVE_MAIL_CLIENT.SOGO;

export default getActiveMailClient;
