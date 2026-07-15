#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Kevin Stenzel
#
# DR backup: mongodump + pg_dump + ./data tar -> encrypted bundle.
# Order is load-bearing: the DB dumps run BEFORE the ./data tar so the master.key
# tarred at the end matches the encryptKeys captured in the dumps.
#
# Usage: dr-backup.sh [--quiesce]
# Env: DR_STACK_DIR, DR_COMPOSE, DR_OUT_DIR (see dr-lib.sh);
#      DR_AGE_RECIPIENT | DR_GPG_RECIPIENT (one is REQUIRED — no plaintext backups);
#      DR_OFFSITE_CMD (optional; runs with DR_BACKUP_FILE set to the written bundle).

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/dr-lib.sh
. "${SCRIPT_DIR}/dr-lib.sh"

QUIESCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --quiesce) QUIESCE=1; shift ;;
    -h | --help) grep '^#' "$0" | grep -v '!/usr/bin' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) dr_die "unknown option: $1" ;;
  esac
done

dr_require docker
dr_require tar
dr_require sha256sum

# Preflight — refuse to back up without the key material (a dump without it is worthless).
[ -d "${DR_STACK_DIR}/data" ] || dr_die "missing ${DR_STACK_DIR}/data (Totalverlust-Risiko)"
[ -f "${DR_STACK_DIR}/data/master.key" ] || dr_die "missing ${DR_STACK_DIR}/data/master.key (Totalverlust-Risiko)"
[ -f "${DR_STACK_DIR}/edulution.env" ] || dr_die "missing ${DR_STACK_DIR}/edulution.env (Totalverlust-Risiko)"

# Preflight — decide encryption up front so we fail fast (before stopping edu-api / dumping).
if [ -n "${DR_AGE_RECIPIENT:-}" ]; then
  dr_require age
  DR_ENC=age
elif [ -n "${DR_GPG_RECIPIENT:-}" ]; then
  dr_require gpg
  DR_ENC=gpg
else
  dr_die "no encryption recipient (set DR_AGE_RECIPIENT or DR_GPG_RECIPIENT) — refusing to write an unencrypted backup"
fi

# Preflight — containers reachable (resolve once; dr_container dies if the stack is down).
db_cid="$(dr_container edu-db)"
pg_cid="$(dr_container edu-keycloak-db)"

QUIESCED=0
WORK="$(mktemp -d)"
# Cleanup ALWAYS restarts edu-api if we quiesced it, then removes the plaintext workdir.
# shellcheck disable=SC2154  # rc is assigned as the first statement inside the trap body
trap 'rc=$?; [ "$QUIESCED" = 1 ] && docker compose -f "$DR_COMPOSE" start edu-api >/dev/null 2>&1 || true; rm -rf "$WORK"; exit $rc' EXIT INT TERM

if [ "$QUIESCE" -eq 1 ]; then
  dr_log "quiesce: stopping edu-api"
  docker compose -f "$DR_COMPOSE" stop edu-api >&2 || dr_log "warn: could not stop edu-api"
  QUIESCED=1
fi

dr_log "mongodump edulution"
{ read -r mongo_user; read -r mongo_pass; } < <(dr_mongo_env)
export DR_MONGO_PW="$mongo_pass"
# Password travels via forwarded env (-e NAME), never on the host-visible docker argv.
# shellcheck disable=SC2016
docker exec -e DR_MONGO_PW "$db_cid" sh -c \
  'mongodump --username "$1" --password "$DR_MONGO_PW" --authenticationDatabase admin --archive --gzip' \
  dr-mongodump "$mongo_user" >"${WORK}/mongo.archive.gz"
unset DR_MONGO_PW

dr_log "pg_dump keycloak"
{ read -r pg_user; read -r pg_pass; read -r pg_db; } < <(dr_pg_env)
export PGPASSWORD="$pg_pass"
docker exec -e PGPASSWORD "$pg_cid" pg_dump -U "$pg_user" "$pg_db" >"${WORK}/keycloak.sql"
unset PGPASSWORD

if [ "$QUIESCE" -eq 1 ]; then
  dr_log "quiesce: starting edu-api"
  docker compose -f "$DR_COMPOSE" start edu-api >&2 || dr_log "warn: could not start edu-api"
  QUIESCED=0
fi

dr_log "tar ./data (incl master.key, excl live DB dirs) + edulution.env"
tar -czf "${WORK}/data.tar.gz" -C "${DR_STACK_DIR}" \
  --exclude='data/db' --exclude='data/keycloak/db' \
  data edulution.env

dr_log "bundle + sha256 manifest"
(cd "$WORK" && sha256sum mongo.archive.gz keycloak.sql data.tar.gz >manifest.sha256)
tar -cf "${WORK}/bundle.tar" -C "$WORK" mongo.archive.gz keycloak.sql data.tar.gz manifest.sha256

mkdir -p "$DR_OUT_DIR"
timestamp="$(date +%Y%m%dT%H%M%SZ)"
if [ "$DR_ENC" = age ]; then
  out="${DR_OUT_DIR}/edulution-dr-${timestamp}.tar.age"
  age -r "$DR_AGE_RECIPIENT" -o "$out" "${WORK}/bundle.tar"
else
  out="${DR_OUT_DIR}/edulution-dr-${timestamp}.tar.gpg"
  gpg --batch --yes --encrypt -r "$DR_GPG_RECIPIENT" -o "$out" "${WORK}/bundle.tar"
fi
chmod 0600 "$out"
dr_log "backup written: $out"

if [ -n "${DR_OFFSITE_CMD:-}" ]; then
  dr_log "offsite: ${DR_OFFSITE_CMD}"
  DR_BACKUP_FILE="$out" bash -c "$DR_OFFSITE_CMD"
fi

dr_log "DR BACKUP OK"
