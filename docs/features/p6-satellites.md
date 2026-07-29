# P6 — Satellites (Multi-Host / WireGuard-Föderation)

> **DEFERRED-Stub — Status: blockiert.** Dieses Dokument ist ein geerdeter Umriss, KEINE
> ausführbare Spec. Satellites wird **dauerhaft zurückgestellt** (Master-Plan §Roadmap P6,
> §9.8) bis realer Bedarf + Fremd-Infra (2. Host) vorliegen. Es entstehen jetzt keine
> Tasks; das Modul wird erst geplant, wenn der Blocker fällt. Aufwandsschätzung Plan:
> **Spike 15–25 PT** (`PLAN-openedulution-fork.md:150`, `:368`).

## Problem / Motivation

edulution 2.0 kann mehrere physische Standorte/Appliances („Satelliten") an einen zentralen
Hub anbinden: ein Satellit ist eine eigenständige Appliance an einem entfernten Schulstandort,
der über einen **WireGuard-Tunnel** mit dem Haupt-Host föderiert wird und dessen API der Hub
**durchreicht** (Proxy) bzw. per **WebSocket-Gateway** steuert. Der Fork erbt das Modul aus dem
Ziel-Image (`SatellitesModule`, `main.js:63311`), aber ohne einen **zweiten Host** und die
zugehörige `edulution-satellite-appliance`-/`edulution-wireguard`-Lieferkette ist es weder
bau- noch verifizierbar. Für den linuxmuster-Fork ist der Nutzen zudem unklar, solange kein
Multi-Standort-Szenario real ansteht.

## Ziel & Nicht-Ziele (YAGNI)

**Ziel (des Stubs):** Den Ist-Zustand des Moduls im Ziel-Image faktentreu festhalten (Schema,
Endpunkte, Gateway, Guards, Env), damit eine spätere Planung nicht bei null beginnt, und den
harten Blocker benennen.

**Nicht-Ziele (jetzt bewusst NICHT):**
- Kein Nachbau von `SatellitesModule`, `SatellitesController`, `SatellitesGateway`,
  `SatellitesService`, keiner DTOs, keines Schemas.
- Kein `edulution-satellite-appliance`-Image, kein `edulution-wireguard`-Provisioning.
- Keine Frontend-Seite / kein Zustand-Store / kein appconfig-Slug-Wiring.
- Keine QR-Pairing-UI, kein Heartbeat-Monitoring-Dashboard.
- Keine Migration, kein i18n, keine Doku-User-Guides — alles erst nach Blocker-Wegfall.

## Betroffene Komponenten & Dateien (Rekonstruktions-Ziel, NICHT jetzt)

Bei späterer Umsetzung neu anzulegen (Pfade indikativ, an 1.6-Struktur orientiert):

- Backend: `apps/api/src/satellites/` — `satellites.module.ts`, `satellites.controller.ts`,
  `satellites.service.ts`, `satellites.gateway.ts`, `satellite.schema.ts` und die DTOs
  `register-satellite.dto.ts`, `pair-satellite.dto.ts`, `pair-satellite-response.dto.ts`,
  `satellite-status-response.dto.ts`, `satellite-state-change-response.dto.ts`,
  `assign-school.dto.ts`.
- Constants: `libs/src/satellites/` — `satelliteStatus.ts` (Status-Const-Objekt),
  `satellitesDefaults.ts`, `satellitesErrorMessages.ts`; `apps.SATELLITES = 'satellites'`
  (existiert bereits als Slug-Konstante, `main.js:228`).
- Docker: `libs/src/docker/constants/dockerApplicationList.ts` — Einträge
  `satellite-appliance` + `wireguard` (im Ziel-Image bereits gelistet, Plan §170).
- Frontend: `apps/frontend/src/pages/Satellites/` (Admin-Liste/Pairing) + Zustand-Store mit
  `eduApi` — **im geretteten 2.0-Source NICHT vorhanden** (kein Rescue-Branch, s. u.), daher
  Vollrekonstruktion aus `main.js`-Backend-Contract + Baseline-Screenshots (falls vorhanden).

## Quelle des Solls

Reines **2.0-Image-Feature**; **kein** Rescue-Branch (`git branch -a | grep -iE
'satellit|wireguard|federat'` → leer), **keine** 1.6-Source-Spur
(`grep -r satellite apps libs` → leer außer Slug). Einzige Quelle: **`main.js`** (un-minifiziert):

- Modul: `main.js:63311` (`SatellitesModule`, MongooseFeature `Satellite`)
- Slug-Konstante: `main.js:228` (`SATELLITES: 'satellites'`)
- Schema `Satellite`: `main.js:63357–63453` — Felder: `name`, `url`, `apiKey`, `sharedSecret`,
  `status` (enum), `capabilities`, `lastHeartbeat`, `systemInfo`, `school`, `serialNumber`,
  `model`, `macAddresses`, `pairingMethod`, `wgTunnelIp`, `wgPublicKey`, `wgServerPublicKey`,
  `wgServerEndpoint`, `wgAllowedIps`.
- Status-Const: `main.js:63481` — `PENDING | PAIRED | ACCEPTED | REJECTED`.
- Service: `main.js:63516ff` — WG-Config-Push, `proxyApiRequest` (WS-getunnelte API-Weiterleitung,
  `main.js:63858`), Socket-Registry (`registerSocket`/`disconnectSocket`/`isOnline`),
  `updateHeartbeat`.
- Controller: `main.js:64060–64338` — Klassen-Guard `admin_guard`, `@Controller('satellites')`.
- Gateway: `main.js:65115ff` — `@WebSocketGateway({ path: '/edu-api/satellites/ws' })`,
  apiKey-Handshake-Auth, Auto-Resend WG-Config bei Reconnect.
- WG-Client-Defaults: `main.js:61789` (`DEFAULT_WIREGUARD_URL =
  'http://edulution-wireguard:8000/api/wireguard'`).
- Plan-Anker: `PLAN-openedulution-fork.md:150` (Modulzeile), `:368` (P6-Roadmap), `:274`
  (`satellite-appliance` in Lieferkette), `:385` (R7 externe Infra: 2. Host).

## Datenmodell / API / Migrationen

**Datenmodell (Ziel):** neues Mongoose-Schema `Satellite` (Felder s. o.). **Neues Modell ⇒
DB-Migration nötig** (forward-only, `schemaVersion++` über alle Modelle — Guardrail). Da
Satellites im 1.6-Bestand nicht existiert, ist es reiner Zuwachs; die Migration muss nur die
Collection anlegen/initialisieren, keine Datentransformation. **Erst bei Umsetzung.**

**API (Ziel, Hub-seitig, alle unter `admin_guard`, ApiBearerAuth):**

| Methode | Pfad | Zweck |
| --- | --- | --- |
| POST | `satellites/register` | Satellit registrieren (zusätzlich `throttle_guard`) |
| POST | `satellites/pair` | Pairing per QR/Code abschließen |
| POST | `satellites/:id/unpair` | Pairing lösen |
| GET  | `satellites/schools` | verfügbare Schulen (Zuordnung) |
| GET  | `satellites` | alle Satelliten (findAll) |
| POST | `satellites/:id/accept` | Registrierung annehmen |
| POST | `satellites/:id/reject` | Registrierung ablehnen |
| DELETE | `satellites/:id` | entfernen |
| POST | `satellites/:id/school` | Schule zuweisen |
| POST | `satellites/:id/reconfigure-wg` | WG-Config neu ausrollen |
| ALL  | `satellites/:id/proxy/*path` | API-Proxy auf den Satelliten (ApiExcludeEndpoint) |

**WS-Gateway:** `path=/edu-api/satellites/ws`, apiKey-basierter Handshake, trägt Heartbeat +
`proxyApiRequest`-Round-Trip (Timeout `SATELLITE_PROXY_REQUEST_TIMEOUT_MS`).

**Contract-Drift (bei Umsetzung zu synchronisieren):** API↔DTO↔FE↔appconfig
(`satellites`-Slug + Sidebar-Eintrag), Schema↔Migration, ghcr-Ref
(`edulution-satellite-appliance`, `edulution-wireguard`) ↔ Installer, Env↔`.env.default`.

## Auth / Guards (mit-portieren)

- **Klassen-Guard:** `admin_guard` auf dem gesamten `SatellitesController` — der Hub-seitige
  CRUD ist admin-only. **Muss mit-portiert werden.**
- **Zusatz-Guard:** `throttle_guard` auf `POST register` (Anti-Bruteforce der Registrierung).
- **KEIN `@Public`** im Controller — der Satellit authentisiert sich **nicht** über die
  Web-Session, sondern über den **apiKey im WS-Handshake** (Gateway `main.js:65120ff`:
  „connection without/invalid apiKey — rejecting") und lehnt Verbindungen nicht-`ACCEPTED`-ter
  Satelliten ab. `sharedSecret`/`apiKey` sind Satelliten-Credentials, kein Keycloak-Token.
- `strictValidationPipe` auf mutierenden Endpunkten.

## Externe Integrationen

- **`edulution-wireguard`** (Companion-Image): WG-Server-API unter
  `http://edulution-wireguard:8000/api/wireguard` (`DEFAULT_WIREGUARD_URL`), verwaltet Tunnel,
  Keys, Sites. Ausrollung über `DockerService`.
- **`edulution-satellite-appliance`** (Companion-Image): das auf dem 2. Host laufende Gegenstück.
- **2. physischer Host** an einem entfernten Standort — **der harte Blocker**.
- Provisioning-Endpoint (`PROVISIONING_URL` / `DEFAULT_PROVISIONING_URL`).

## Secrets / Env / master.key

Bei Umsetzung ins Env-Inventar (P0-Tabelle) aufzunehmen — **nicht ins Repo**:

- `EDU_WG_API_URL` (Default `http://edulution-wireguard:8000/api/wireguard`)
- `WIREGUARD_TUNNEL_ROUTE` (Default aus `satellitesDefaults`)
- `PROVISIONING_URL` (Default `DEFAULT_PROVISIONING_URL`)
- WireGuard-Keypaars (Server-/Client-Public/Private) — pro Satellit in DB (`wgPublicKey`,
  `wgServerPublicKey`), Private-Keys **nie** ins Repo/Backup-Klartext.
- Satelliten-`apiKey` + `sharedSecret` — pro Satellit generiert, in der `Satellite`-Collection;
  gehören ins DR-/Backup-Set (Verlust = Satellit muss neu gepairt werden), damit über
  `master.key`-Verschlüsselung abgedeckt (Guardrail: `master.key` ins DR-Set).

## Trade-offs & Alternativen (mit Empfehlung)

1. **Zurückstellen (empfohlen).** Kein 2. Host, kein realer Multi-Standort-Bedarf im
   linuxmuster-Kontext, hoher Infra-/Betriebsaufwand (WG-Föderation, Appliance-Image-Pflege,
   Sicherheits-Exposure durch API-Proxy). Master-Plan §9.8 empfiehlt „dauerhaft zurückstellen".
2. **Als Spike bauen, sobald 2. Host da ist.** 15–25 PT, erst nach P0-Basis-Drift + Chat-Pilot,
   und nur bei realem Zweitstandort. Reihenfolge dann: WG-Companion + Appliance-Image-Repoint →
   BE-Schema/Service/Gateway → BE-Controller (Guards) → FE-Admin-Seite → Voll-Stack-Verify gegen
   2. Host.
3. **Feature ersatzlos streichen.** Reduziert Angriffsfläche (Host-Docker-Socket + eingehender
   WG + API-Proxy), aber verwirft geerbte Funktion irreversibel. Nur wenn strategisch klar
   „Single-Host für immer".

**Empfehlung:** (1) — Stub führen, Modul im Fork **nicht** aktivieren; (2) nur bei konkretem
Beschaffungs-Trigger neu planen (dann via `/feature-plan`).

## Risiken & Rollback

- **R (Sicherheit):** Der API-Proxy (`ALL :id/proxy/*path`) und der eingehende WG-Tunnel
  vergrößern die Angriffsfläche erheblich. Solange deferred: **Modul im Fork nicht mounten**
  (kein `SatellitesModule`-Import), damit Endpunkte/Gateway gar nicht existieren.
- **R7 (Fremd-Infra):** Verifizierbarkeit hängt vollständig am 2. Host + Appliance-Image
  (`PLAN:385`).
- **Rollback:** trivial, weil nichts gebaut wird — dieser Stub ist rein dokumentarisch.

## Doku-Impact (Augenmaß)

Jetzt: dieser Stub + Ledger-Eintrag „blockiert". Keine User-Doku. Bei späterer Umsetzung:
Admin-Runbook (Pairing-Flow, WG-Ausrollung, DR für `apiKey`/`sharedSecret`) DE+EN.

## i18n-Impact (DE+EN)

Jetzt **keine** Keys (kein FE). Bei Umsetzung: neuer Namespace `satellites` DE+EN Pflicht
(Liste, Pairing-Dialog, Statuswerte `pending/paired/accepted/rejected`, Fehlermeldungen).

## Offene Fragen

1. **Braucht der linuxmuster-Fork Multi-Host überhaupt?** (strategische Entscheidung, Plan §9.8
   „P6-Scope: dauerhaft zurückstellen vs. anstreben") — bestimmt, ob (1) oder (3) oben gilt.
2. **Beschaffung 2. Host + Betrieb der `edulution-satellite-appliance`/`edulution-wireguard`-
   Images** — Rebuild/Repoint/Mirror-Entscheidung (koppelt an P0-Lieferkette).
3. **QR-Pairing-Flow im Detail** — `pairingMethod`, `submit-pairing-code`/`update-pairing-status`-
   DTOs (`main.js:60801ff`) gehören ggf. zu einem separaten Pairing-Subflow; bei Umsetzung
   Abgrenzung zu ParentChildPairing (anderes Modul) klären.
4. **FE existiert im geretteten Source nicht** — Vollrekonstruktion nur aus BE-Contract; ist der
   Aufwand (Teil der 15–25 PT) akzeptabel oder Admin-only-Minimal-UI ausreichend?
