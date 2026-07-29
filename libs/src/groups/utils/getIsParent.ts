/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

import GroupRoles from '@libs/groups/types/group-roles.enum';

const getIsParent = (ldapGroups: string[]): boolean =>
  ldapGroups.includes(GroupRoles.PARENT) ||
  ldapGroups.includes(GroupRoles.TEACHER) ||
  ldapGroups.includes(GroupRoles.STAFF);

export default getIsParent;
