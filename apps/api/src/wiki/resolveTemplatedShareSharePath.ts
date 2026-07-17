/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import normalizeLdapHomeDirectory from '@libs/filesharing/utils/normalizeLdapHomeDirectory';
import type MultipleSelectorOptionSH from '@libs/ui/types/multipleSelectorOptionSH';
import { normalizeSharePath } from './resolveOwningShare';

const HOME_DIRECTORY_VARIABLE = 'homeDirectory';

export interface TemplatableShare {
  sharePath?: string;
  pathVariables?: MultipleSelectorOptionSH[];
}

const resolveTemplatedShareSharePath = (share: TemplatableShare, homeDirectory: string): string => {
  const explicitSharePath = normalizeSharePath(share.sharePath ?? '');
  if (explicitSharePath !== '') {
    return explicitSharePath;
  }

  const hasHomeDirectoryVariable = (share.pathVariables ?? []).some(
    (variable) => variable.label === HOME_DIRECTORY_VARIABLE,
  );
  if (!hasHomeDirectoryVariable || !homeDirectory) {
    return '';
  }

  return normalizeSharePath(normalizeLdapHomeDirectory(homeDirectory));
};

export default resolveTemplatedShareSharePath;
