/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const WIKI_NODE_TYPE = {
  PAGE: 'page',
  FOLDER: 'folder',
} as const;

type WikiNodeType = (typeof WIKI_NODE_TYPE)[keyof typeof WIKI_NODE_TYPE];

export { WIKI_NODE_TYPE };
export default WikiNodeType;
