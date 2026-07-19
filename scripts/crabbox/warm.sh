#!/bin/bash
# Warme, wiederverwendbare crabbox-Dev/Test-Box für linuxmuster-ui. IDEMPOTENT:
# beim ersten feature-build-Loop einmal ausführen, danach reused es die Box.
# Provider/Node/Template/Bridge + Proxmox-Token kommen aus .claude/settings.local.json.
# Aus edulution-ui/ ausführen (Repo-Root, wegen .crabbox.yaml + Tree-Sync).
set -uo pipefail
REQ_SLUG="${CRABBOX_SLUG:-lmnui}"
ENVF=".crabbox/warm.env"
mkdir -p .crabbox/out

# 1) Reuse, wenn die zuletzt geleaste Box noch bereit ist. Die crabbox-CLI (>=0.39) hängt
#    der -slug einen Suffix an (lmnui -> lmnui-37c2); die ECHTE Slug steht in warm.env.
SLUG="$REQ_SLUG"
[ -f "$ENVF" ] && SLUG="$(grep -m1 '^SLUG=' "$ENVF" | cut -d= -f2)"
SLUG="${SLUG:-$REQ_SLUG}"
if [ -f "$ENVF" ] && crabbox status --id "$SLUG" 2>/dev/null | grep -q 'state=ready'; then
  echo "[warm] reuse: $SLUG ($(grep -m1 VMID "$ENVF"))"
  exit 0
fi

echo "[warm] lease $REQ_SLUG"
crabbox warmup -slug "$REQ_SLUG" -ttl 24h -idle-timeout 8h
# Echte Slug + VMID aus der Lease-Liste holen (CLI-Suffix!).
LINE="$(crabbox list | awk -v s="slug=$REQ_SLUG" '$0 ~ s {print; exit}')"
VMID="$(printf '%s\n' "$LINE" | awk '{print $1}')"
SLUG="$(printf '%s\n' "$LINE" | grep -oE 'slug=[^ ]+' | head -1 | cut -d= -f2)"
[ -n "$VMID" ] && [ -n "$SLUG" ] || { echo "[warm] konnte VMID/Slug nicht ermitteln"; exit 1; }
echo "[warm] VMID=$VMID SLUG=$SLUG"

# 2) CPU-Fix (PFLICHT): kvm64 hat kein avx/x86-64-v2 → Keycloak(UBI9) + Mongo7 crashen.
PVE="${CRABBOX_PROXMOX_API_URL:?}/api2/json"; NODE="${CRABBOX_PROXMOX_NODE:?}"
AUTH="Authorization: PVEAPIToken=${CRABBOX_PROXMOX_TOKEN_ID:?}=${CRABBOX_PROXMOX_TOKEN_SECRET:?}"
if ! curl -sk -H "$AUTH" "$PVE/nodes/$NODE/qemu/$VMID/config" | grep -q '"cpu":"host"'; then
  echo "[warm] set cpu=host, 4 cores, 8G + reboot"
  curl -sk -H "$AUTH" -X POST "$PVE/nodes/$NODE/qemu/$VMID/config" \
       --data-urlencode cpu=host --data-urlencode cores=4 --data-urlencode memory=8192 >/dev/null
  curl -sk -H "$AUTH" -X POST "$PVE/nodes/$NODE/qemu/$VMID/status/stop"  >/dev/null; sleep 10
  curl -sk -H "$AUTH" -X POST "$PVE/nodes/$NODE/qemu/$VMID/status/start" >/dev/null; sleep 20
fi

# 3) Box provisionieren: docker + node 22 + git/rsync (idempotent). /tmp ist nach Reboot leer.
echo "[warm] provision (docker + node 22)"
crabbox run --id "$SLUG" -no-sync -- 'set -e
  command -v docker >/dev/null || { curl -fsSL https://get.docker.com | sudo sh; sudo usermod -aG docker "$USER" || true; }
  command -v node   >/dev/null || { curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - >/dev/null 2>&1 && sudo apt-get install -y -qq nodejs; }
  sudo apt-get install -y -qq rsync git >/dev/null 2>&1 || true
  echo "node=$(node -v)  docker=$(docker --version | cut -d, -f1)"' || { echo "[warm] provision FEHLGESCHLAGEN"; exit 1; }

# 4) Tree syncen + einmal `npm ci` (node_modules bleibt box-lokal via .crabbox.yaml).
echo "[warm] npm ci (einmalig, danach inkrementell)"
crabbox run --id "$SLUG" -- 'npm ci' || { echo "[warm] npm ci FEHLGESCHLAGEN"; exit 1; }

printf 'SLUG=%s\nVMID=%s\n' "$SLUG" "$VMID" > "$ENVF"
echo "[warm] bereit: $SLUG (VMID $VMID). Iterieren mit scripts/crabbox/iter.sh, reapen mit reap.sh."
