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

import { MOBILE_APP_ENABLED } from '@libs/common/constants/productInfo';

const isMobileLoginToggleVisible = (isEnterTotpVisible: boolean): boolean => isEnterTotpVisible || MOBILE_APP_ENABLED;

export default isMobileLoginToggleVisible;
