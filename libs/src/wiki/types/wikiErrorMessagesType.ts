/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import WIKI_ERROR_MESSAGES from '@libs/wiki/constants/wikiErrorMessages';

type WikiErrorMessagesType = (typeof WIKI_ERROR_MESSAGES)[keyof typeof WIKI_ERROR_MESSAGES];

export default WikiErrorMessagesType;
