#!/bin/bash
# Pusht die Stack-Templates aus dem INSTALLER-Repo box-lokal nach ~/.edulution-templates.
# Bewusst KEINE Kopie im ui-Repo (Single Source of Truth bleibt linuxmuster-ui-installer,
# Contract-Sync-Regel) und bewusst nicht ueber den Tree-Sync (waere eine zweite Wahrheit).
# Auf der Dev-Box vor `iter.sh deploy` ausfuehren (aus edulution-ui/).
set -uo pipefail
SRC="${INSTALLER_TEMPLATES_DIR:-../edulution-installer/apps/public-page/public/download}"
DST="${EDU_TEMPLATES_DIR:-.edulution-templates}"
SLUG="$(grep -m1 '^SLUG=' .crabbox/warm.env 2>/dev/null | cut -d= -f2)"
SLUG="${SLUG:-${CRABBOX_SLUG:-lmnui}}"

[ -d "$SRC" ] || { echo "[stage] Installer-Templates nicht gefunden: $SRC"; exit 1; }

FILES=(docker-compose.yml.template realm-edulution.json.template traefik.yml.template edulution-default.yml.template)
for f in "${FILES[@]}"; do
  [ -f "$SRC/$f" ] || { echo "[stage] fehlt: $SRC/$f"; exit 1; }
done

SSHLINE="$(crabbox ssh --id "$SLUG" 2>/dev/null | head -1)"
KEY="$(printf '%s' "$SSHLINE" | grep -oE "/[^']*id_ed25519" | head -1)"
HOST="$(printf '%s' "$SSHLINE" | grep -oE "crabbox@[0-9.]+" | head -1)"
[ -n "$KEY" ] && [ -n "$HOST" ] || { echo "[stage] konnte SSH-Zugang der Box nicht ermitteln (warm.sh gelaufen?)"; exit 1; }

SSH_OPTS=(-i "$KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR)

tar -C "$SRC" -cf - "${FILES[@]}" \
  | ssh "${SSH_OPTS[@]}" "$HOST" "umask 077; rm -rf \"\$HOME/$DST\"; mkdir -p \"\$HOME/$DST\"; tar -C \"\$HOME/$DST\" -xf -; ls -1 \"\$HOME/$DST\" | wc -l" \
  || { echo "[stage] Push fehlgeschlagen"; exit 1; }

printf '[stage] %s Templates -> %s:~/%s (Quelle: %s)\n' "${#FILES[@]}" "$HOST" "$DST" "$SRC"
