#!/bin/bash
# Eine Iteration auf der WARMEN Box (kein lokales Testen). Setzt scripts/crabbox/warm.sh voraus.
# Der Tree wird pro Lauf inkrementell gesynct (node_modules/dist bleiben box-lokal → schnell).
# Usage:
#   iter.sh lint | test:api | test:frontend | test | i18n | build | check | all
#   iter.sh cmd '<beliebiger Befehl im Repo-Root der Box>'
#   iter.sh deploy   # Voll-Stack gegen echten LMN hochziehen (siehe /test)
#   iter.sh shots    # Playwright-Login-/Modul-Screenshots + Pull
set -uo pipefail
SLUG="${CRABBOX_SLUG:-lmnui}"
mkdir -p .crabbox/out
T="${1:?"Ziel angeben (lint|test:api|test:frontend|test|i18n|build|check|all|cmd|deploy|shots)"}"; shift || true
case "$T" in
  lint)          CMD='npm run lint';;
  test:api)      CMD='npx nx run api:test';;
  test:frontend) CMD='npx nx test frontend';;
  test)          CMD='npm run test && npx nx test frontend';;
  i18n)          CMD='npm run check-translations && npm run check-error-message-translations';;
  build)         CMD='npm run build:all';;
  check)         CMD='npm run lint && npm run test && npx nx test frontend && npm run check-translations';;
  all)           CMD='npm run lint && npm run test && npx nx test frontend && npm run build:all && npm run check-translations';;
  cmd)           CMD="$*";;
  deploy)        CMD='bash scripts/crabbox/deploy.sh';;
  shots)         CMD='/tmp/pw/bin/python3 scripts/crabbox/shots.py';;
  *) echo "unbekanntes Ziel: $T"; exit 2;;
esac
echo "[iter:$T] auf $SLUG …"
crabbox run --id "$SLUG" -keep-on-failure \
  -capture-stdout .crabbox/out/last.out -capture-stderr .crabbox/out/last.err \
  -- "$CMD"
rc=$?
if [ $rc -ne 0 ]; then
  echo "[iter:$T] FAIL (rc=$rc) — Fehler in .crabbox/out/last.err:"
  tail -20 .crabbox/out/last.err 2>/dev/null
fi
exit $rc
