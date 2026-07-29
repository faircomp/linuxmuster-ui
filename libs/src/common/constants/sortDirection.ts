/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

type SortDirection = (typeof SORT_DIRECTION)[keyof typeof SORT_DIRECTION];

export { SORT_DIRECTION };
export default SortDirection;
