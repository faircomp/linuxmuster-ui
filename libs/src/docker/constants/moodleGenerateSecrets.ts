/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const MOODLE_GENERATE_SECRETS = [
  'MOODLE_DB_PASSWORD',
  'MOODLE_DB_ROOT_PASSWORD',
  'KEYCLOAK_MOODLE_CLIENT_SECRET',
] as const;

export default MOODLE_GENERATE_SECRETS;
