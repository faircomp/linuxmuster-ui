/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const SAFE_PATH_SEGMENT_PATTERN = /^(?!\.)(?!.*\.\.)[\p{L}\p{N}\p{M} ._-]{1,200}$/u;

export default SAFE_PATH_SEGMENT_PATTERN;
