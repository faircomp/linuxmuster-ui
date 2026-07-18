/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Kevin Stenzel
 */

const DOCKER_COMPOSE_ENV_VAR_PATTERN = /\${([^}]+)}/g;

export default DOCKER_COMPOSE_ENV_VAR_PATTERN;
