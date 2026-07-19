#!/bin/bash
# Warme Box abbauen (bei Branch-Wechsel / Feierabend / nach dem PR). Warme Boxen self-reapen
# ohnehin per -ttl/-idle-timeout; dieses Skript stoppt sofort + räumt warm.env weg.
set -uo pipefail
SLUG="$(grep -m1 '^SLUG=' .crabbox/warm.env 2>/dev/null | cut -d= -f2)"
SLUG="${SLUG:-${CRABBOX_SLUG:-lmnui}}"
crabbox stop --id "$SLUG" 2>/dev/null || true
rm -f .crabbox/warm.env
echo "[reap] $SLUG gestoppt. Offene Leases prüfen:"
crabbox list
