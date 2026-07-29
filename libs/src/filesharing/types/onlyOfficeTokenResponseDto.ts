/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import type { IConfig } from '@onlyoffice/document-editor-react';

interface OnlyOfficeTokenResponseDto {
  config: IConfig;
  token: string;
}

export default OnlyOfficeTokenResponseDto;
