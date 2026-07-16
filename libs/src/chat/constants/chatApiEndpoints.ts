/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import APPS from '@libs/appconfig/constants/apps';

export const CHAT_EDU_API_ENDPOINT = APPS.CHAT;

export const CHAT_USER_GROUPS_ENDPOINT = `${CHAT_EDU_API_ENDPOINT}/groups`;

export const CHAT_CONVERSATIONS_ENDPOINT = `${CHAT_EDU_API_ENDPOINT}/conversations`;
