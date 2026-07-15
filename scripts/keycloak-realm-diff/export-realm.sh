#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Kevin Stenzel
#
# Realm-Export der laufenden edulution-Keycloak-Instanz (Template-unabhaengige Ist-Seite des
# Realm-Diffs). Holt ein admin-cli-Token per ROPC vom master-Realm (wie
# apps/api/src/scripts/keycloak/utilities/getKeycloakToken.ts) und schreibt Rohdateien nach
# scratchpad/ (NIE ins Repo committen — sie enthalten Secrets/Schluesselmaterial; erst
# normalize-realm.mjs scrubbt sie):
#   scratchpad/realm-export.raw.json      partial-export (Clients + Groups + Roles)
#   scratchpad/realm-components.raw.json  UserStorageProvider (LDAP-Federation) + Mapper + Keys
#   scratchpad/realm-combined.raw.json    Export + Components gemerged -> Scrub-Input fuer die Baseline
#
# Benoetigte Env (siehe apps/api/.env.default): KEYCLOAK_API, KEYCLOAK_ADMIN,
# KEYCLOAK_ADMIN_PASSWORD; optional KEYCLOAK_EDU_UI_REALM (Default: edulution).
#
# Fallback ohne Admin-REST (direkt im Container): kc.sh export
#   docker exec <keycloak> /opt/keycloak/bin/kc.sh export --realm edulution \
#     --dir /tmp/realm-export --users skip
#   docker cp <keycloak>:/tmp/realm-export scratchpad/realm-export-kc/
# (kc.sh maskiert Client-Secrets bereits, exportiert aber keine LDAP-bindCredential im Klartext.)

set -euo pipefail

REALM="${KEYCLOAK_EDU_UI_REALM:-edulution}"
: "${KEYCLOAK_API:?KEYCLOAK_API fehlt (z. B. http://keycloak:8080)}"
: "${KEYCLOAK_ADMIN:?KEYCLOAK_ADMIN fehlt}"
: "${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD fehlt}"

OUT_DIR="scratchpad"
mkdir -p "$OUT_DIR"

echo "[export-realm] hole admin-cli-Token vom master-Realm …"
TOKEN="$(curl -sf \
  -d 'grant_type=password' \
  -d 'client_id=admin-cli' \
  --data-urlencode "username=${KEYCLOAK_ADMIN}" \
  --data-urlencode "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  "${KEYCLOAK_API}/realms/master/protocol/openid-connect/token" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"

if [ -z "$TOKEN" ]; then
  echo "[export-realm] Token-Abruf fehlgeschlagen" >&2
  exit 1
fi

echo "[export-realm] partial-export von Realm '${REALM}' …"
curl -sf -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  "${KEYCLOAK_API}/admin/realms/${REALM}/partial-export?exportClients=true&exportGroupsAndRoles=true" \
  -o "${OUT_DIR}/realm-export.raw.json"

echo "[export-realm] components (LDAP-Federation + Mapper) …"
curl -sf \
  -H "Authorization: Bearer ${TOKEN}" \
  "${KEYCLOAK_API}/admin/realms/${REALM}/components" \
  -o "${OUT_DIR}/realm-components.raw.json"

# partial-export enthaelt KEINE Federation-/Key-Components → die flache /components-Antwort
# (LDAP bindCredential + KeyProvider privateKey/certificate IM KLARTEXT) nach providerType
# gruppieren und als realm.components in EINE kombinierte Rohdatei mergen, damit der
# anschliessende normalize-realm.mjs-Lauf ALLE Secrets scrubbt (sonst bliebe Klartext-
# Schluesselmaterial ungescrubbt liegen und der Baseline fehlte die Federation).
node -e '
  const fs = require("fs");
  const dir = process.argv[1];
  const realm = JSON.parse(fs.readFileSync(dir + "/realm-export.raw.json", "utf8"));
  const components = JSON.parse(fs.readFileSync(dir + "/realm-components.raw.json", "utf8"));
  const grouped = {};
  (Array.isArray(components) ? components : []).forEach((c) => {
    (grouped[c.providerType] = grouped[c.providerType] || []).push(c);
  });
  realm.components = grouped;
  fs.writeFileSync(dir + "/realm-combined.raw.json", JSON.stringify(realm, null, 2));
' "$OUT_DIR"

echo "[export-realm] geschrieben: ${OUT_DIR}/realm-combined.raw.json (Export+Components gemerged)"
echo "[export-realm] NAECHSTER SCHRITT: normalize-realm.mjs scrubbt realm-combined.raw.json vor dem Commit (Rohdateien nie committen)."
echo "[export-realm] HINWEIS: /components liefert LDAP-Mapper als parentId-verkettete Flach-Components,"
echo "[export-realm]          das Template nutzt geschachtelte subComponents — die Shape-Angleichung"
echo "[export-realm]          fuer den feldgenauen Component-Diff gehoert zu T4/T6 (Baseline-Erstellung)."
