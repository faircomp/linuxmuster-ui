#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Kevin Stenzel
#
# DR restore: decrypt bundle -> verify -> ./data + master.key -> DBs -> up.
# The reverse of dr-backup.sh. DESTRUCTIVE: replaces the live DB and ./data.
#
# Usage: dr-restore.sh --confirm [--bundle FILE]
# Env: DR_STACK_DIR, DR_COMPOSE, DR_OUT_DIR (see dr-lib.sh);
#      DR_AGE_IDENTITY (age identity file for .age bundles).

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/dr-lib.sh
. "${SCRIPT_DIR}/dr-lib.sh"

CONFIRM=0
BUNDLE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --confirm) CONFIRM=1; shift ;;
    --bundle) BUNDLE="${2:-}"; [ -n "$BUNDLE" ] || dr_die "--bundle requires a FILE"; shift 2 ;;
    -h | --help) grep '^#' "$0" | grep -v '!/usr/bin' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) dr_die "unknown option: $1" ;;
  esac
done

[ "$CONFIRM" -eq 1 ] || dr_die "refusing to restore without --confirm (this REPLACES the live DB and ./data)"

dr_require docker
dr_require tar
dr_require sha256sum

# Locate the newest bundle if none was given (names are timestamped by dr-backup.sh).
if [ -z "$BUNDLE" ]; then
  # shellcheck disable=SC2012  # controlled, timestamp-named files — ls -t = newest by mtime
  BUNDLE="$(ls -1t "${DR_OUT_DIR}"/edulution-dr-*.tar.age "${DR_OUT_DIR}"/edulution-dr-*.tar.gpg 2>/dev/null | head -n1 || true)"
fi
{ [ -n "$BUNDLE" ] && [ -f "$BUNDLE" ]; } || dr_die "no backup bundle found (pass --bundle FILE or populate ${DR_OUT_DIR})"
dr_log "restoring from ${BUNDLE}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT INT TERM

dr_log "decrypt bundle"
case "$BUNDLE" in
  *.age)
    dr_require age
    if [ -n "${DR_AGE_IDENTITY:-}" ]; then
      age -d -i "$DR_AGE_IDENTITY" -o "${WORK}/bundle.tar" "$BUNDLE"
    else
      age -d -o "${WORK}/bundle.tar" "$BUNDLE"
    fi
    ;;
  *.gpg) dr_require gpg; gpg --batch --yes --decrypt -o "${WORK}/bundle.tar" "$BUNDLE" ;;
  *) dr_die "unknown bundle format: ${BUNDLE}" ;;
esac

dr_log "extract + verify sha256 manifest"
tar -xf "${WORK}/bundle.tar" -C "$WORK"
(cd "$WORK" && sha256sum -c manifest.sha256) || dr_die "sha256 manifest mismatch — bundle corrupt, refusing to restore"

# The master.key MUST be in the bundle — restoring without it leaves every stored
# password unreadable (worse than not restoring).
dr_log "check master.key present in bundle"
tar -tzf "${WORK}/data.tar.gz" | grep -qx 'data/master.key' \
  || dr_die "bundle has no data/master.key — restoring would make all stored passwords unreadable"

dr_log "stopping stack"
docker compose -f "$DR_COMPOSE" down >&2 || dr_log "warn: compose down returned non-zero"

# Wipe the live DB dirs so the DB containers re-init fresh; the dumps repopulate them.
dr_log "wiping live DB dirs"
if [ -z "${DR_STACK_DIR}" ] || [ "${DR_STACK_DIR}" = "/" ]; then
  dr_die "unsafe DR_STACK_DIR: '${DR_STACK_DIR}'"
fi
rm -rf "${DR_STACK_DIR:?}/data/db" "${DR_STACK_DIR:?}/data/keycloak/db"

dr_log "restoring ./data + edulution.env"
tar -xzpf "${WORK}/data.tar.gz" -C "${DR_STACK_DIR}"
chmod 0600 "${DR_STACK_DIR}/data/master.key"

dr_log "starting DB layer"
docker compose -f "$DR_COMPOSE" up -d edu-db edu-keycloak-db >&2

db_cid="$(dr_container edu-db)"
pg_cid="$(dr_container edu-keycloak-db)"

dr_wait_ready() {
  local desc="$1"; shift
  local attempt=0
  until "$@" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -ge 60 ] && dr_die "timeout waiting for ${desc}"
    sleep 2
  done
}

dr_log "waiting for mongo"
dr_wait_ready mongo docker exec "$db_cid" mongosh --quiet --eval 'db.adminCommand({ ping: 1 })'
dr_log "waiting for postgres"
dr_wait_ready postgres docker exec "$pg_cid" pg_isready

dr_log "mongorestore"
{ read -r mongo_user; read -r mongo_pass; } < <(dr_mongo_env)
export DR_MONGO_PW="$mongo_pass"
# shellcheck disable=SC2016
docker exec -i -e DR_MONGO_PW "$db_cid" sh -c \
  'mongorestore --username "$1" --password "$DR_MONGO_PW" --authenticationDatabase admin --archive --gzip --drop' \
  dr-mongorestore "$mongo_user" <"${WORK}/mongo.archive.gz"
unset DR_MONGO_PW

dr_log "postgres restore (keycloak)"
{ read -r pg_user; read -r pg_pass; read -r pg_db; } < <(dr_pg_env)
export PGPASSWORD="$pg_pass"
docker exec -i -e PGPASSWORD "$pg_cid" psql -v ON_ERROR_STOP=1 -U "$pg_user" -d "$pg_db" <"${WORK}/keycloak.sql"
unset PGPASSWORD

dr_log "starting full stack"
docker compose -f "$DR_COMPOSE" up -d >&2

dr_log "DR RESTORE OK"
