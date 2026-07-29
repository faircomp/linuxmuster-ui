#!/bin/bash
# Voll-Stack-Deploy auf der warmen crabbox: 7-Service-Stack aus dem BRANCH-Build,
# gebunden an einen echten linuxmuster.net-Server (LDAP-Federation + linuxmuster-api7).
# Laeuft AUF DER BOX (via scripts/crabbox/iter.sh deploy).
#
# Erwartet: gestagte Templates in scripts/crabbox/.templates (stage-templates.sh) und die
# LMN-Zugaenge als Env (LMN_HOST, LMN_BINDUSER_DN, LMN_BINDUSER_PW, ...) aus
# .claude/settings.local.json. Secrets werden nie geloggt.
set -uo pipefail

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TEMPLATES_DIR="${EDU_TEMPLATES_DIR:-$HOME/.edulution-templates}"
WORKDIR="${EDU_WORKDIR:-$HOME/edulution-stack}"
API_IMAGE="${EDU_API_IMAGE:-linuxmuster-api:test}"
UI_IMAGE="${EDU_UI_IMAGE:-linuxmuster-ui:test}"
COMPOSE="docker compose"

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] FEHLER: %s\n' "$*" >&2; exit 1; }

# LMN-Zugaenge: liegen box-lokal ausserhalb des Repo-Baums (600), werden per stdin gepusht.
LMN_ENV_FILE="${LMN_ENV_FILE:-$HOME/.edulution-lmn.env}"
if [ -f "$LMN_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$LMN_ENV_FILE"
  set +a
fi

[ -d "$TEMPLATES_DIR" ] || fail "Templates fehlen ($TEMPLATES_DIR) — stage-templates.sh auf der Dev-Box laufen lassen"
: "${LMN_HOST:?LMN_HOST fehlt}" ; : "${LMN_BINDUSER_DN:?LMN_BINDUSER_DN fehlt}" ; : "${LMN_BINDUSER_PW:?LMN_BINDUSER_PW fehlt}"

EXTERNAL_DOMAIN="${EDU_EXTERNAL_DOMAIN:-$(hostname -I | awk '{print $1}')}"
log "workdir=$WORKDIR external=$EXTERNAL_DOMAIN lmn=$LMN_HOST images=$API_IMAGE,$UI_IMAGE"

# 1) Eigene Images muessen lokal vorliegen (aus dem Branch gebaut).
for img in "$API_IMAGE" "$UI_IMAGE"; do
  docker image inspect "$img" >/dev/null 2>&1 || fail "Image $img fehlt — erst aus dem Branch bauen"
done

# Optionaler Clean-Slate (EDU_RESET=1): noetig, wenn edulution.env und die bereits
# initialisierten DB-Datenverzeichnisse auseinanderlaufen (Postgres/Mongo uebernehmen ihr
# Passwort nur beim Erst-Init).
if [ "${EDU_RESET:-0}" = "1" ] && [ -d "$WORKDIR" ]; then
  log "reset: Stack + Datenverzeichnisse werden verworfen"
  (cd "$WORKDIR" && $COMPOSE down -v --remove-orphans >/dev/null 2>&1)
  docker rm -f edu-kc-import >/dev/null 2>&1
  docker run --rm -v "$WORKDIR:/w" alpine:3.20 sh -c 'rm -rf /w/data /w/edulution.env /w/realm-edulution.json' >/dev/null 2>&1 \
    || sudo rm -rf "$WORKDIR/data" "$WORKDIR/edulution.env" "$WORKDIR/realm-edulution.json"
fi

mkdir -p "$WORKDIR/data/traefik/config" "$WORKDIR/data/traefik/ssl" "$WORKDIR/data/db" "$WORKDIR/data/keycloak/db"

# 2) Compose aus dem Installer-Template, Images auf die Branch-Builds umbiegen.
sed -e "s#image: ghcr.io/faircomp/linuxmuster-api:[^[:space:]]*#image: $API_IMAGE#" \
    -e "s#image: ghcr.io/faircomp/linuxmuster-ui:[^[:space:]]*#image: $UI_IMAGE#" \
    "$TEMPLATES_DIR/docker-compose.yml.template" > "$WORKDIR/docker-compose.yml"
grep -q "$API_IMAGE" "$WORKDIR/docker-compose.yml" || fail "Image-Override griff nicht"

# 2b) LDAPS gegen den LMN: dessen Zertifikat ist von der LMN-eigenen CA ausgestellt, die dem
#     Java-Truststore von Keycloak unbekannt ist (PKIX: unable to find valid certification path).
#     Die CA wird box-lokal bereitgestellt und in Keycloaks Truststore gemountet.
LMN_CA_FILE="${LMN_CA_FILE:-$HOME/.edulution-lmn-ca.crt}"
if [ -f "$LMN_CA_FILE" ]; then
  cp "$LMN_CA_FILE" "$WORKDIR/data/lmn-ca.crt"
  # Das LMN-Serverzertifikat traegt KEINE SAN-Eintraege (nur CN=server.<domain>). Javas
  # LDAPS-Endpoint-Identification verlangt aber SANs -> "No subject alternative names present".
  # Deshalb wird ausschliesslich die Hostnamen-Pruefung abgeschaltet; TLS-Verschluesselung und
  # CA-Vertrauen (Truststore) bleiben aktiv. Test-Harness-Kompromiss, bewusst dokumentiert.
  cat > "$WORKDIR/docker-compose.override.yml" <<'OVERRIDE'
services:
  edu-keycloak:
    volumes:
      - ./data/lmn-ca.crt:/opt/keycloak/conf/truststores/lmn-ca.crt:ro
    environment:
      KC_TRUSTSTORE_PATHS: /opt/keycloak/conf/truststores
      JAVA_OPTS_APPEND: -Dcom.sun.jndi.ldap.object.disableEndpointIdentification=true
OVERRIDE
  log "LDAPS: LMN-CA gemountet; Hostname-Verification aus (Zertifikat ohne SAN)"
else
  log "WARNUNG: keine LMN-CA ($LMN_CA_FILE) — LDAPS wird scheitern (PKIX)"
fi

# 3) edulution.env + gepatchtes Realm + Traefik-Dynamic-Config erzeugen.
EDU_WORKDIR="$WORKDIR" EDU_TEMPLATES_DIR="$TEMPLATES_DIR" EDU_EXTERNAL_DOMAIN="$EXTERNAL_DOMAIN" \
  python3 "$REPO_DIR/scripts/crabbox/generate_env.py" || fail "generate_env fehlgeschlagen"

cd "$WORKDIR" || fail "workdir nicht betretbar"

# 4) Prepare-Phase: Keycloak einmalig mit --import-realm starten, damit das Realm in Postgres
#    landet (der produktive `start`-Befehl importiert nicht).
log "prepare: Keycloak-Realm-Import"
$COMPOSE up -d edu-keycloak-db >/dev/null 2>&1 || fail "keycloak-db start fehlgeschlagen"
for i in $(seq 1 30); do
  $COMPOSE exec -T edu-keycloak-db pg_isready -U keycloak -d keycloak >/dev/null 2>&1 && break
  sleep 2
done

docker run --rm -d --name edu-kc-import --network "$(basename "$WORKDIR")_default" \
  --env-file "$WORKDIR/edulution.env" \
  -e KC_DB=postgres -e KC_DB_URL=jdbc:postgresql://edu-keycloak-db/keycloak \
  -e KC_DB_URL_DATABASE=keycloak -e KC_DB_SCHEMA=public \
  -e KC_HTTP_RELATIVE_PATH=/auth -e KC_HOSTNAME_STRICT=false -e KC_HEALTH_ENABLED=true \
  -v "$WORKDIR/realm-edulution.json:/opt/keycloak/data/import/realm-edulution.json:ro" \
  quay.io/keycloak/keycloak:26.4 start-dev --import-realm >/dev/null 2>&1 \
  || fail "Keycloak-Import-Container startete nicht"

log "prepare: warte auf Realm-Import"
IMPORTED=0
for i in $(seq 1 60); do
  if docker logs edu-kc-import 2>&1 | grep -qE "Imported realm|Realm 'edulution' imported|already exists"; then IMPORTED=1; break; fi
  sleep 3
done
docker logs edu-kc-import 2>&1 | tail -5 | sed 's/^/[kc-import] /'
docker rm -f edu-kc-import >/dev/null 2>&1
[ "$IMPORTED" = "1" ] || log "WARNUNG: Import-Marker nicht gefunden — pruefe Realm nach dem Hochlauf"

# 5) Infrastruktur zuerst — OHNE api/ui: die API liest data/edulution.pem beim Start,
#    das erst aus dem laufenden Keycloak-Realm gewonnen werden kann.
log "up: Infrastruktur (keycloak, db, redis, traefik)"
$COMPOSE up -d edu-keycloak edu-db edu-redis edu-traefik || fail "Infrastruktur-Start fehlgeschlagen"

log "warte auf Keycloak-Health"
KC_OK=0
for i in $(seq 1 60); do
  if docker exec edulution-keycloak bash -c 'echo > /dev/tcp/127.0.0.1/9000' >/dev/null 2>&1; then KC_OK=1; break; fi
  sleep 3
done
[ "$KC_OK" = "1" ] || fail "Keycloak wurde nicht gesund"

# 6) RS256-Realm-Public-Key als PEM ablegen (die API verifiziert damit die Tokens).
log "hole Realm-Public-Key -> data/edulution.pem"
# Das Keycloak-Image (UBI micro) hat kein curl -> vom Host ueber Traefik abfragen.
PUBKEY=""
for i in $(seq 1 20); do
  PUBKEY="$(curl -sk --max-time 10 "https://localhost/auth/realms/edulution" \
            | python3 -c 'import json,sys; print(json.load(sys.stdin).get("public_key",""))' 2>/dev/null)"
  [ -n "$PUBKEY" ] && break
  sleep 3
done
[ -n "$PUBKEY" ] || fail "Realm-Public-Key nicht abrufbar (Realm importiert?)"
{
  echo "-----BEGIN PUBLIC KEY-----"
  printf '%s' "$PUBKEY" | fold -w 64
  echo ""
  echo "-----END PUBLIC KEY-----"
} > "$WORKDIR/data/edulution.pem"
chmod 644 "$WORKDIR/data/edulution.pem"

# 7) Jetzt erst api+ui: das PEM liegt vor, die AuthGuard-Initialisierung findet es.
log "up: api + ui"
$COMPOSE up -d || fail "docker compose up (api/ui) fehlgeschlagen"

# /edu-api/health/check ist @Public() ABER @UseGuards(LocalhostGuard) — von aussen bewusst 401.
# Der ehrliche Indikator ist deshalb der Container-Healthcheck (laeuft im Container, 127.0.0.1).
log "warte auf API-Health (Container-Healthcheck)"
API_OK=0
for i in $(seq 1 40); do
  if [ "$(docker inspect --format '{{.State.Health.Status}}' edulution-api 2>/dev/null)" = "healthy" ]; then API_OK=1; break; fi
  sleep 3
done

echo ""
log "Status:"
docker ps --format '  {{.Names}}\t{{.Status}}' | sort
echo ""
log "Endpunkt-Checks:"
printf '  ui         HTTP=%s (erwartet 200)\n' "$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 https://localhost/ 2>/dev/null)"
printf '  keycloak   HTTP=%s (erwartet 200)\n' "$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 https://localhost/auth/realms/edulution 2>/dev/null)"
printf '  edu-api    HTTP=%s (erwartet 200, oeffentliche OIDC-Config-Route)\n' "$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 "https://localhost/edu-api/auth/.well-known/openid-configuration" 2>/dev/null)"
printf '  edu-api    health=%s (Container-Healthcheck; extern 401 ist korrekt: LocalhostGuard)\n' "$(docker inspect --format '{{.State.Health.Status}}' edulution-api 2>/dev/null)"
printf '  lmn-api7   HTTP=%s (erwartet 200, openapi liegt ohne /v1)\n' "$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 "https://$LMN_HOST:8001/openapi.json" 2>/dev/null)"
printf '  lmn-api7   via traefik HTTP=%s (erwartet 200)\n' "$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 https://localhost/api/openapi.json 2>/dev/null)"

[ "$API_OK" = "1" ] || { log "API-Health nicht 200 — Logs:"; docker logs edulution-api 2>&1 | tail -20; exit 1; }
log "DEPLOY-OK external=https://$EXTERNAL_DOMAIN/"
