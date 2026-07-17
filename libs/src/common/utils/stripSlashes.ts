/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const stripSlashes = (path: string): string => path.replace(/^\/+|\/+$/g, '');

export default stripSlashes;
