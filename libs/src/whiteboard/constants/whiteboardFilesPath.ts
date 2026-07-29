/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import { join } from 'node:path';
import APPS_FILES_PATH from '@libs/common/constants/appsFilesPath';
import APPS from '@libs/appconfig/constants/apps';

const WHITEBOARD_FILES_PATH = join(APPS_FILES_PATH, APPS.WHITEBOARD);

export default WHITEBOARD_FILES_PATH;
