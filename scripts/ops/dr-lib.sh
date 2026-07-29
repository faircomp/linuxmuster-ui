#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Kevin Stenzel
#
# Shared helpers for the DR scripts (dr-backup.sh / dr-restore.sh / dr-drill.sh).
# Source this file — it is not meant to be executed directly.
#
# Credentials are never hardcoded; they are read from the running containers via
# `docker exec … printenv`, so a change of the installer's env-var names surfaces here.

# Defaults (override via environment).
DR_STACK_DIR="${DR_STACK_DIR:-/srv/docker/edulution-ui}"
DR_COMPOSE="${DR_COMPOSE:-${DR_STACK_DIR}/docker-compose.yml}"
DR_OUT_DIR="${DR_OUT_DIR:-${DR_STACK_DIR}/dr-out}"

dr_log() {
  printf '[dr] %s\n' "$*" >&2
}

dr_die() {
  printf '[dr] FATAL: %s\n' "$*" >&2
  exit 1
}

dr_require() {
  command -v "$1" >/dev/null 2>&1 || dr_die "required command not found: $1"
}

# Resolve the container id for a compose service, with a container_name fallback
# (edu-db -> edulution-db) so it also works when compose metadata is unavailable.
dr_container() {
  local service="$1"
  local cid=""
  cid="$(docker compose -f "$DR_COMPOSE" ps -q "$service" 2>/dev/null || true)"
  if [ -z "$cid" ]; then
    # Docker stores names with a leading slash (/edulution-db); make it optional.
    cid="$(docker ps -q --filter "name=^/?edulution-${service#edu-}\$" 2>/dev/null || true)"
  fi
  [ -n "$cid" ] || dr_die "container for service '$service' not found (stack down?)"
  printf '%s\n' "$cid"
}

# Print the Mongo root credentials from the edu-db container, one value per line:
#   line 1 = username, line 2 = password. Dies if either is unset/empty.
dr_mongo_env() {
  local cid user pass
  cid="$(dr_container edu-db)"
  { read -r user; read -r pass; } < <(docker exec "$cid" printenv MONGO_INITDB_ROOT_USERNAME MONGO_INITDB_ROOT_PASSWORD)
  { [ -n "$user" ] && [ -n "$pass" ]; } || dr_die "edu-db is missing Mongo root credentials (MONGO_INITDB_ROOT_USERNAME/PASSWORD)"
  printf '%s\n%s\n' "$user" "$pass"
}

# Print the Keycloak Postgres credentials from the edu-keycloak-db container,
# one value per line: line 1 = user, line 2 = password, line 3 = database.
# Dies if any is unset/empty.
dr_pg_env() {
  local cid user pass db
  cid="$(dr_container edu-keycloak-db)"
  { read -r user; read -r pass; read -r db; } < <(docker exec "$cid" printenv POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB)
  { [ -n "$user" ] && [ -n "$pass" ] && [ -n "$db" ]; } || dr_die "edu-keycloak-db is missing Postgres credentials (POSTGRES_USER/PASSWORD/DB)"
  printf '%s\n%s\n%s\n' "$user" "$pass" "$db"
}
