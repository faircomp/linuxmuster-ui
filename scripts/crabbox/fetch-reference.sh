#!/bin/bash
# Holt eine Soll-Referenz (un-minifiziertes Backend-main.js + Frontend-Bundle) aus den
# oeffentlichen ghcr-Images in ein DURABLES, gitignoriertes Verzeichnis `.reference/<version>/`.
# Idempotent + reproduzierbar — NICHT nach /tmp (wird geleert). Aus edulution-ui/ ausfuehren.
#
# Default bleibt die 2.0.200-Rekonstruktionsbasis. Seit upstream weiterbaut (`:latest` ist
# inzwischen 2.1.0) ist der Aufruf versionierbar, damit eine neue Referenz NEBEN der alten
# entsteht statt sie zu ueberschreiben:
#   REF_VERSION=2.1.0 REF_TAG=latest EXPECT_LINES=0 bash scripts/crabbox/fetch-reference.sh
# Der Versions-Pin bleibt scharf: passt das Image-Label nicht zu REF_VERSION, bricht das
# Skript ab, BEVOR Layer extrahiert werden.
set -uo pipefail
EXPECT_VER="${REF_VERSION:-2.0.200}"
REF_TAG="${REF_TAG:-latest}"
REF=".reference/${EXPECT_VER}"
EXPECT_LINES="${EXPECT_LINES-73240}"
mkdir -p "$REF/api" "$REF/ui"

pull_layers() { # repo, min-size, dest — extrahiert alle Layer < min-size (App-Layer)
  local repo="$1" maxsize="$2" dest="$3"
  local tok; tok=$(curl -s "https://ghcr.io/token?scope=repository:${repo}:pull" | jq -r .token)
  local ACC="Accept: application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json"
  local mani; mani=$(curl -s -H "Authorization: Bearer $tok" -H "$ACC" "https://ghcr.io/v2/${repo}/manifests/${REF_TAG}")
  local sub; sub=$(echo "$mani" | jq -r '.manifests[]? | select(.platform.architecture=="amd64") | .digest' | head -1)
  [ -n "$sub" ] && mani=$(curl -s -H "Authorization: Bearer $tok" -H "$ACC" "https://ghcr.io/v2/${repo}/manifests/${sub}")
  # Versions-Pin pruefen
  local cfg ver; cfg=$(echo "$mani" | jq -r '.config.digest')
  ver=$(curl -sL -H "Authorization: Bearer $tok" "https://ghcr.io/v2/${repo}/blobs/${cfg}" | jq -r '.config.Labels."org.opencontainers.image.version"')
  [ "$ver" = "$EXPECT_VER" ] || { echo "ABBRUCH: $repo :$REF_TAG ist $ver, erwartet $EXPECT_VER — Anker wuerden driften"; exit 1; }
  REV=$(curl -sL -H "Authorization: Bearer $tok" "https://ghcr.io/v2/${repo}/blobs/${cfg}" | jq -r '.config.Labels."org.opencontainers.image.revision" // "unknown"')
  local d; for d in $(echo "$mani" | jq -r ".layers[] | select(.size<$maxsize) | .digest"); do
    curl -sL -H "Authorization: Bearer $tok" "https://ghcr.io/v2/${repo}/blobs/${d}" | tar xz -C "$dest" 2>/dev/null
  done
}

echo "[ref] Backend (main.js + package.json)"
t=$(mktemp -d); pull_layers edulution-io/edulution-api 5000000 "$t"
cp "$t"/opt/edulution/api/main.js "$REF/api/main.js"
cp "$t"/opt/edulution/api/package*.json "$REF/api/" 2>/dev/null; rm -rf "$t"
lines=$(wc -l < "$REF/api/main.js")
if [ -n "$EXPECT_LINES" ] && [ "$EXPECT_LINES" != "0" ] && [ "$lines" != "$EXPECT_LINES" ]; then
  echo "[ref] WARNUNG: main.js hat $lines Zeilen (erwartet $EXPECT_LINES) — Anker pruefen!"
fi

echo "[ref] Frontend-Bundle (nginx html)"
t=$(mktemp -d); pull_layers edulution-io/edulution-ui 25000000 "$t"
if [ -d "$t/usr/share/nginx/html" ]; then rm -rf "$REF/ui"; cp -r "$t/usr/share/nginx/html" "$REF/ui"; fi
rm -rf "$t"

printf '%s  edulution-{api,ui} :%s = %s (rev %s, main.js=%s Zeilen)\n' \
  "$(date -u +%FT%TZ)" "$REF_TAG" "$EXPECT_VER" "${REV:-unknown}" "$lines" > "$REF/PROVENANCE.txt"
echo "[ref] fertig: $REF (main.js=$lines Zeilen, ui-assets=$(ls "$REF/ui/assets" 2>/dev/null | wc -l))"
echo "[ref] Baselines-Screenshots (scratchpad/real) werden separat beim ersten Voll-Stack-Verify erzeugt."
