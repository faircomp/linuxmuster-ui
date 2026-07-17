/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const extractTitleFromMarkdown = (content: string): string | null => {
  if (!content) {
    return null;
  }
  const match = /^[ \t]*#[ \t]+(.+?)[ \t]*$/m.exec(content);
  if (!match) {
    return null;
  }
  const raw = match[1].trim();
  return raw || null;
};

export default extractTitleFromMarkdown;
