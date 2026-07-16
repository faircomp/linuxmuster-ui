#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Kevin Stenzel
#
# DR drill: backup -> simulate total loss -> restore -> assert the round-trip.
# This is the recurring TEST of the DR set. It DESTROYS and rebuilds ./data, so it
# refuses to run unless DR_STACK_DIR names a drill/staging stack (never production).
#
# Usage: dr-drill.sh
# Env: DR_STACK_DIR (must contain 'drill' or 'staging'), DR_COMPOSE, DR_OUT_DIR;
#      DR_AGE_RECIPIENT|DR_GPG_RECIPIENT + DR_AGE_IDENTITY (backup/restore crypto);
#      DR_DRILL_BASE_URL (default https://localhost);
#      DR_DRILL_COLLECTION (core Mongo collection to count, default appconfigs).

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/dr-lib.sh
. "${SCRIPT_DIR}/dr-lib.sh"

DR_DRILL_BASE_URL="${DR_DRILL_BASE_URL:-https://localhost}"
DR_DRILL_COLLECTION="${DR_DRILL_COLLECTION:-appconfigs}"

dr_require docker
dr_require curl

# Hard blast-radius guard: refuse to wipe anything that isn't an explicit drill/staging stack.
case "$DR_STACK_DIR" in
  *drill* | *staging*) ;;
  *) dr_die "refusing destructive drill: DR_STACK_DIR '${DR_STACK_DIR}' is not a drill/staging stack (its path must contain 'drill' or 'staging')" ;;
esac
# And never let the wipe target contain the backup we depend on.
case "${DR_OUT_DIR}/" in
  "${DR_STACK_DIR}/data/"*) dr_die "DR_OUT_DIR '${DR_OUT_DIR}' is under the wipe target ${DR_STACK_DIR}/data — the backup would be deleted" ;;
esac

mongo_count() {
  local cid="$1" user="$2"
  export DR_MONGO_PW="$3"
  # shellcheck disable=SC2016
  docker exec -e DR_MONGO_PW "$cid" sh -c \
    'mongosh --quiet --username "$1" --password "$DR_MONGO_PW" --authenticationDatabase admin \
       --eval "db.getSiblingDB(\"edulution\").getCollection(\"$2\").countDocuments({})"' \
    dr-mongocount "$user" "$DR_DRILL_COLLECTION"
}

http_code() {
  curl -sk -o /dev/null -w '%{http_code}' "$1"
}

db_cid="$(dr_container edu-db)"
{ read -r mongo_user; read -r mongo_pass; } < <(dr_mongo_env)

dr_log "drill: baseline count of ${DR_DRILL_COLLECTION}"
count_before="$(mongo_count "$db_cid" "$mongo_user" "$mongo_pass")"
[ -n "$count_before" ] || dr_die "empty baseline count for ${DR_DRILL_COLLECTION} — aborting before any destructive step"
dr_log "baseline ${DR_DRILL_COLLECTION}=${count_before}"

dr_log "drill: backup"
bash "${SCRIPT_DIR}/dr-backup.sh" --quiesce

# RTO clock starts at the simulated loss event, not at the backup.
start_ts="$(date +%s)"

dr_log "drill: simulating total loss (down + wipe ./data)"
docker compose -f "$DR_COMPOSE" down >&2
if [ -z "${DR_STACK_DIR}" ] || [ "${DR_STACK_DIR}" = "/" ]; then
  dr_die "unsafe DR_STACK_DIR: '${DR_STACK_DIR}'"
fi
rm -rf "${DR_STACK_DIR:?}/data"

dr_log "drill: restore"
bash "${SCRIPT_DIR}/dr-restore.sh" --confirm

rto="$(( $(date +%s) - start_ts ))"

dr_log "asserting round-trip"
db_cid="$(dr_container edu-db)"
{ read -r mongo_user; read -r mongo_pass; } < <(dr_mongo_env)

# (a) core-collection doc count identical
count_after="$(mongo_count "$db_cid" "$mongo_user" "$mongo_pass")"
[ -n "$count_after" ] || dr_die "assert(a) empty post-restore count for ${DR_DRILL_COLLECTION}"
[ "$count_before" = "$count_after" ] \
  || dr_die "assert(a) doc-count mismatch: before=${count_before} after=${count_after}"
dr_log "assert(a) doc-count ${count_after} == baseline OK"

# (b) keycloak OIDC discovery (proves the Postgres restore)
oidc_code="$(http_code "${DR_DRILL_BASE_URL}/auth/realms/edulution/.well-known/openid-configuration" || true)"
[ "$oidc_code" = 200 ] || dr_die "assert(b) OIDC discovery HTTP ${oidc_code} != 200"
dr_log "assert(b) OIDC discovery 200 OK"

# (c) master.key round-trip — the API must NOT have generated a fresh key
api_cid="$(dr_container edu-api)"
if docker logs "$api_cid" 2>&1 | grep -q 'Generated new master key'; then
  dr_die "assert(c) master.key was regenerated — wrapped secrets are now unreadable"
fi
dr_log "assert(c) no 'Generated new master key' in edu-api log OK"

# (d) login smoke — the app root serves
login_code="$(http_code "${DR_DRILL_BASE_URL}/" || true)"
[ "$login_code" = 200 ] || dr_die "assert(d) app root HTTP ${login_code} != 200"
dr_log "assert(d) app root 200 OK"

dr_log "DRILL PASS (RTO ${rto}s)"
