#!/bin/bash
# Warme, wiederverwendbare crabbox-Dev/Test-Box für linuxmuster-ui. IDEMPOTENT:
# beim ersten feature-build-Loop einmal ausführen, danach reused es die Box.
# Provider/Node/Template/Bridge + Proxmox-Token kommen aus .claude/settings.local.json.
# Aus edulution-ui/ ausführen (Repo-Root, wegen .crabbox.yaml + Tree-Sync).
set -uo pipefail
SLUG="${CRABBOX_SLUG:-lmnui}"
ENVF=".crabbox/warm.env"
mkdir -p .crabbox/out

# 1) Reuse, wenn die Box noch bereit ist.
if [ -f "$ENVF" ] && crabbox status --id "$SLUG" 2>/dev/null | grep -q 'ready=true'; then
  echo "[warm] reuse: $SLUG ($(grep -m1 VMID "$ENVF"))"
  exit 0
fi

echo "[warm] lease $SLUG"
crabbox warmup -slug "$SLUG" -ttl 24h -idle-timeout 8h
VMID="$(crabbox list | awk -v s="slug=$SLUG" '$0 ~ s {print $1; exit}')"
[ -n "$VMID" ] || { echo "[warm] konnte VMID nicht ermitteln"; exit 1; }
echo "[warm] VMID=$VMID"

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
  echo "node=$(node -v)  docker=$(docker --version | cut -d, -f1)"'

# 4) Tree syncen + einmal `npm ci` (node_modules bleibt box-lokal via .crabbox.yaml).
echo "[warm] npm ci (einmalig, danach inkrementell)"
crabbox run --id "$SLUG" -- 'npm ci'

printf 'SLUG=%s\nVMID=%s\n' "$SLUG" "$VMID" > "$ENVF"
echo "[warm] bereit: $SLUG (VMID $VMID). Iterieren mit scripts/crabbox/iter.sh, reapen mit reap.sh."
