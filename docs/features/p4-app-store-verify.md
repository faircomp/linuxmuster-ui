# p4-app-store-verify — App-Store-/DockerService-Engine end-to-end verifizieren (+ 2.0-Drift schließen)

> Kalibrierung: P4 — solides, geerdetes Rekonstruktions-/Verify-Ledger. Der **Kern-Deliverable ist die
> End-to-End-Verifikation** des App-Store-Rollouts auf der crabbox (OnlyOffice/Collabora/Moodle/
> Guacamole über die UI). Die vorgelagerten **Drift-Close-Tasks (T1–T11)** sind hier provisorisch
> verortet, weil die Verifikation ohne sie nicht grün werden kann (die geerbte 1.6-Engine kann
> Moodle nicht mit Keycloak-Client provisionieren, kennt den OnlyOffice/Collabora-Split nicht und
> schreibt Compose-Dateien noch in den alten Pfad). **Ehrliche Notiz:** Der genaue Zuschnitt und die
> Zuordnung dieser Drift-Tasks (P0-Engine-Arbeitspaket §3.4 vs. dieses P4-Paket) schärfen sich nach
> der **P0-Basis-Drift-Analyse** (`docs/features/p0-base-drift-analysis.md`) und dem Chat-Piloten.
> Bis dahin gilt: T1–T11 = Rekonstruktion aus `main.js` (Anker unten), T12–T17 = committer P4-Verify.

## Problem / Motivation

Der DockerService ist die **On-Demand-Container-/App-Store-Engine** (Plan §3.4, P0-kritisch): Ein
Global-Admin rollt über die UI (Settings → App-Store bzw. AppConfig/DockerIntegration) eine
Companion-App aus. Der Ablauf ist ein **dreistufiger Fetch + Orchestrierung**:

1. Der **Compose-Inhalt** wird **im Browser** live von `edulution-plugins` geladen
   (`EDU_PLUGINS_GITHUB_URL`, `urls.ts:21`; Consumer `useDockerApplicationStore.ts:153/183`,
   `axios.get …/<app>/<container>/docker-compose.yml?ts=…` und `…/<app>.yml` Traefik-Config).
2. Das FE parst das YAML, sammelt Env-Platzhalter in einem Formular und POSTet
   `{applicationName, containerName, containers, originalComposeConfig}` an `POST docker/container`.
3. Der **DockerService** ersetzt Env-Variablen (inkl. generierter Secrets + Keycloak-Client bei
   Moodle), pullt Images, erzeugt/startet die Container sequenziell und persistiert die aufgelöste
   `docker-compose.yml` nach `./data/apps/<app>/<container>/docker-compose.yml`.

Zwei Realitäten machen das zu einem echten Arbeitspaket statt „nur draufklicken":

- **Lieferketten-Abhängigkeit:** Stirbt `edulution-plugins` (wie `edulution-ui`), lässt sich **keine**
  App mehr ausrollen → das bricht die gesamte §6-App-Store-Verifikation (Plan §3.4/§5.3, R3). Der
  Fetch muss auf einen eigenen Endpoint umgebogen sein — der URL-Repoint selbst liegt in
  `p1-installer-repoint` (dessen Ziel 5), die **CSP-/Proxy-Entscheidung** ist laut
  `p0-supply-chain-inventory` §174–175 explizit **hier** (P4) zu treffen.
- **2.0-Drift:** Die im Repo geerbte 1.6-Engine (`apps/api/src/docker/docker.service.ts`) ist
  **nicht** identisch zum 2.0-Soll (`main.js:26371ff`). Neu in 2.0: pro-Container-Compose-Subdir +
  Migration, `resolveContainerName` (OnlyOffice/Collabora-Split über `ACTIVE_DOCUMENT_EDITOR`),
  `readSavedEnvValues` (Secret-Persistenz über Recreate), Moodle-Sonderpfad
  (`MOODLE_GENERATE_SECRETS` + `ensureKeycloakClient`), tiefe Env-Auflösung mit `:-`-Default-Syntax,
  `containerName` im Contract (DTO/Controller/FE-Store).

Ohne diese Drift-Close-Tasks würde die Verifikation von Moodle (Keycloak-Client fehlt) und der
OnlyOffice/Collabora-Umschaltung fehlschlagen, und persistierte Compose-Dateien landeten im falschen
Pfad (kein Upgrade-sauberer Zustand gegenüber 2.0).

## Ziel & Nicht-Ziele (YAGNI)

**Ziel**
1. Die im Repo vorhandene Docker-Engine auf **2.0-Funktionsparität** heben (BE + Contract + FE),
   soweit für den App-Store-Rollout der vier Ziel-Apps nötig.
2. Den **Store-Fetch-Contract** gegen den (in `p1-installer-repoint` umgebogenen) eigenen Endpoint
   verifizieren und die **CSP-/BE-Proxy-Frage** entscheiden.
3. **End-to-End auf crabbox** beweisen: OnlyOffice, Collabora, Moodle, Guacamole rollen über die UI
   aus, laufen, und die Lifecycle-Aktionen (start/stop/restart/delete) + Protected-Guard + SSE-Update
   funktionieren.

**Nicht-Ziele (bewusst raus)**
- **Kein** Repoint von `EDU_PLUGINS_GITHUB_URL` selbst — das ist `p1-installer-repoint` T? (Ziel 5);
  hier nur **Konsum + Contract-Verify + CSP-Entscheidung**.
- **Kein** Bauen/Mirrorn der Companion-Images (`edulution-{onlyoffice,collabora,moodle,guacamole}`) —
  das ist `p0-supply-chain-inventory` / Installer §5.2. Hier werden sie nur **konsumiert**.
- **Kein** Nachbau des vollen `ACTIVE_DOCUMENT_EDITOR`-Toggle-**UI-Feldes** (Settings-Schalter) — das
  ist das Schwester-Paket „Filesharing/WOPI/Collabora + ACTIVE_DOCUMENT_EDITOR-Toggle" (Plan §8/P4).
  Hier nur die **Konstante + BE-Resolver**, damit `resolveContainerName` und die Editor-Umschaltung
  im Rollout greifen (Default `ONLY_OFFICE`).
- **Kein** `getContainerStats`-Endpoint/Dashboard-Widget (existiert als Service-Methode, ist aber
  nicht Teil des Rollout-Kernpfads).
- **Kein** Umbau von `updateEduManagerAgentContainer` (Manager-Agent-Selfupdate) — der bleibt wie
  geerbt; nur der `@Public`-Guard wird als Contract-Parität mitgeführt.
- **Kein** MobileDevices/Satellites-Bezug.

## Betroffene Komponenten & Dateien (konkrete Pfade)

**libs (Konstanten/Typen — neue Dateien AGPL-SPDX)**
- `libs/src/docker/constants/dockerApplicationList.ts` (Update: `learningmanagement: 'edulution-moodle'`)
- `libs/src/docker/constants/filesharingDockerContainers.ts` (**neu**)
- `libs/src/docker/constants/activeDocumentEditor.ts` (**neu**, `ACTIVE_DOCUMENT_EDITOR`-Const-Objekt)
- `libs/src/docker/constants/moodleGenerateSecrets.ts` (**neu**)
- `libs/src/docker/constants/dockerComposeEnvVarPattern.ts` (**neu**)
- `libs/src/docker/types/create-container.dto.ts` (Update: `containerName: string`)
- `libs/src/appconfig/constants/extendedOptionKeys.ts` (ggf. `ACTIVE_DOCUMENT_EDITOR`-Key, s. Schwester-Paket)

**apps/api (BE)**
- `apps/api/src/docker/docker.service.ts` (Ausbau: onModuleInit, migrate/resolve/readSavedEnv/replaceEnv/saveCompose/createContainer)
- `apps/api/src/docker/docker.controller.ts` (Contract-Parität: `@ApiAuth()` + Swagger-Response-DTOs)
- `apps/api/src/docker/utils/ensureKeycloakClient.ts` (**neu**, Keycloak-Client-Provisionierung für Moodle)
- `apps/api/src/docker/docker.service.spec.ts` (**neu/erweitert**, Unit-Tests)

**apps/frontend (FE)**
- `apps/frontend/src/pages/Settings/AppConfig/DockerIntegration/useDockerApplicationStore.ts` (`containerName` im Payload; Editor-Resolver für filesharing)
- `apps/frontend/src/pages/Settings/AppConfig/DockerIntegration/CreateDockerContainerDialog.tsx` (`containerName` durchreichen)
- `apps/frontend/src/pages/Settings/AppConfig/appStore/AppStorePage.tsx` (nur falls Rollout-Auslöser betroffen)

**i18n**
- `apps/frontend/src/locales/{de,en}/translation.json` (Sektion `docker.events`/`docker.error` — bereits vorhanden, ggf. Moodle-Provisioning-Keys ergänzen)

**Verify-Infra**
- `scripts/crabbox/iter.sh` (`deploy`, `shots`, `cmd`) — bereits vorhanden.

## Quelle des Solls

- **`main.js`-Zeilenanker** (un-minifiziert, Originalnamen):
  - `DockerService` gesamt: `main.js:26371`
  - `onModuleInit` (+`migrateDockerComposeFiles()`): `main.js:26382`, Methode `:26522`
  - `resolveContainerName`: `main.js:26538` (FILE_SHARING→`filesharingDockerContainers[activeEditor]`, Default `ONLY_OFFICE` `:26542`)
  - `readSavedEnvValues` (static): `main.js:26485`
  - `replaceEnvVariables` (Ausbau: Moodle `:26550`, `:-`-Default + deep resolve `:26576`): `main.js:26547`
  - `saveDockerCompose` (mit `containerName`, Subdir): `main.js:26601`
  - `createContainer` (mit `containerName`, sequenzielles `reduce`): `main.js:26617`
  - `checkProtectedContainer` / `executeContainerCommand`: `main.js:26647`
  - `updateContainer` / `getContainerNameByIp` / `updateEduManagerAgentContainer`: `main.js:26722`
  - `DockerController` (`@ApiAuth()`, `@UseGuards(AdminGuard)`, `@Public()` auf Agent-Route): `main.js:32732` / `:32835` / `:32846`
  - `CreateContainerRequestDto` (mit `containerName`): `main.js:33073`
  - `DOCKER_APPLICATION_LIST` (2.0, `learningmanagement:'edulution-moodle'`): `main.js:27112`/`:27118`
  - `FILESHARING_DOCKER_CONTAINERS`: `main.js:27147`
  - `ACTIVE_DOCUMENT_EDITOR` (`onlyoffice`/`collabora`): `main.js:27180`
  - `MOODLE_GENERATE_SECRETS`: `main.js:27212`
  - `DOCKER_COMPOSE_ENV_VAR_PATTERN` = `/\${([^}]+)}/g`: `main.js:27243`
  - `ensureKeycloakClient`: `main.js:27299`
  - `extendedOptionKeys.ACTIVE_DOCUMENT_EDITOR`: `main.js:2114`
- **1.6-Bestandsquelle im Repo** (Ausgangs-Delta): `apps/api/src/docker/docker.{service,controller,module}.ts`,
  `libs/src/docker/**`, `apps/frontend/src/pages/Settings/AppConfig/{DockerIntegration,appStore}/**`,
  `libs/src/common/constants/urls.ts`.
- **upstream/-Rescue-Branch:** keiner spezifisch (die Docker-Engine ist Bestandscode seit 1.6; kein
  dedizierter 2.0-Feature-Branch im Set). Primärquelle daher `main.js`.
- **Baseline-Screenshot:** `scratchpad/real/18-settings.png` (Settings-Shell, App-Store liegt darunter).

## Datenmodell / API / Migrationen

- **DB-Migration:** **nein.** Der DockerService persistiert keinen Mongoose-State; er schreibt
  `docker-compose.yml`-Dateien ins Volume. `schemaVersion` ist **nicht** betroffen.
- **Dateisystem-Migration (kein DB-Schema):** `migrateDockerComposeFiles()` verschiebt beim Boot
  `./data/apps/<app>/docker-compose.yml` → `./data/apps/<app>/<container>/docker-compose.yml`
  (idempotent, nur wenn Ziel fehlt). Forward-only, aber **nicht** über den Mongoose-Migrations-Runner.
  Für den crabbox-Upgrade-Test (1.6-Volume → Fork-Image) relevant und in
  `p1-migration-upgrade-test` mit abzudecken.
- **API-Routen (Contract, unverändert im Pfad, DTO erweitert):**
  - `GET  docker/container?applicationNames=…`
  - `POST docker/container` — Body `CreateContainerDto` **+ `containerName`** (Contract-Drift!)
  - `PUT  docker/container/:id/:operation` (start|stop|restart|kill)
  - `DELETE docker/container/:id`
  - `PATCH docker/container/:id` (update)
  - `PATCH docker/edu-manager-agent/container` (`@Public`, IP-restricted)
- **Contract-Drift (Pflicht-Sync):** `CreateContainerDto` (BE) ↔ `create-container.dto` (libs) ↔
  `createAndRunContainer`-Payload (FE-Store) müssen das neue `containerName` gemeinsam führen.
  **Wichtig:** Die 2.0-Route `POST docker/container` trägt **keine** `ValidationPipe`
  (`main.js:32771–32785` — kein `@UsePipes`, und es gibt keine globale Pipe); ein fehlendes
  `containerName` wirft dort also **nicht** 400 — das Feld ist reiner Typ-/Contract-Vertrag, die
  Container-Namensauflösung geschieht ohnehin serverseitig via `resolveContainerName` (T5).
- **Inkrementeller Landeweg (T4→T9/T10):** T4 führt das Feld in `create-container.dto` (libs)
  vorerst als **`@IsOptional() @IsString() containerName?: string`** ein — 2.0 hat es `required`,
  aber der geerbte 1.6-FE sendet es noch nicht; `optional` hält den FE-Compile grün, bis die
  Producer (T9 Store-Payload, T10 Dialog mit filesharing-Editor-Resolver) den Wandel nachziehen.
  Sobald der FE den Namen zuverlässig sendet, kann das Feld auf `required` verschärft werden.

## Auth / Guards (welche mit-portieren)

- **`@UseGuards(AdminGuard)`** auf Controller-Klassenebene — **Pflicht mit-portieren** (existiert in
  1.6 bereits). Der gesamte Docker-Controller ist Global-Admin-only.
- **`@ApiAuth()`** (`api_auth_decorator`, `main.js:32846`) — in 2.0 zusätzlich auf Klassenebene
  (Swagger-Bearer-Security). Contract-Parität, mit-portieren.
- **`@Public()`** auf `updateEduManagerAgentContainer` (`main.js:32835`) — **Pflicht mit-portieren**
  (existiert in 1.6). Der Bypass ist bewusst und durch **IP-Whitelist im Service** abgesichert
  (`getContainerNameByIp` == `EDULUTION_MANAGER_CONTAINER_NAME`, sonst 403). Beim Nachziehen der
  Route den IP-Check **nicht** entfernen — sonst Auth-Bypass.
- **Protected-Container-Guard:** `checkProtectedContainer` (403 bei geschützten Containern) —
  mit-portieren; in 2.0 speist sich die Protected-Liste aus `dockerApplicationList` +
  `filesharingDockerContainers` (`main.js:32967`). Beim Editor-Split sicherstellen, dass sowohl
  `edulution-onlyoffice` als auch `edulution-collabora` geschützt bleiben.

## Externe Integrationen

- **`edulution-plugins`-Raw-Fetch** (Browser → GitHub bzw. eigener Mirror): Compose + Traefik-Config
  je App. Repoint-Ziel aus `p1-installer-repoint`. **CSP-Aspekt:** Der Browser erreicht den Host
  direkt; die FE-nginx-CSP (`connect-src`) muss den (Mirror-)Host erlauben — zu verifizieren.
- **Keycloak Admin-API** (nur Moodle-Rollout): `ensureKeycloakClient` legt/liest den KC-Client
  `edulution-moodle` an und liefert das Client-Secret. Braucht Keycloak-Admin-Creds (`KEYCLOAK_*`,
  s. Secrets). Fehlt der KC-Zugang, schlägt nur der Moodle-Rollout fehl (nicht die anderen drei).
- **Docker-Daemon** via `/var/run/docker.sock` (dockerode) — der API-Container braucht den
  gemounteten Socket. Auf crabbox durch den Voll-Stack-Deploy gegeben.
- **Companion-Images:** `edulution-onlyoffice`, `edulution-collabora`, `edulution-moodle`,
  `edulution-guacamole` (+ deren Compose-Nachbarn) werden zur Laufzeit gepullt.

## Secrets / Env / master.key

- **Moodle-Secrets** (`MOODLE_GENERATE_SECRETS`): `MOODLE_DB_PASSWORD`, `MOODLE_DB_ROOT_PASSWORD`,
  `KEYCLOAK_MOODLE_CLIENT_SECRET` — werden bei Erst-Rollout via `generateSecureToken` erzeugt und
  über `readSavedEnvValues` aus der persistierten Compose-Datei **stabil wiederverwendet** (kein
  Neu-Würfeln bei Recreate). Diese Persistenz hängt am Volume `./data/apps` **und** am `master.key`
  (gewrappte Werte) → in DR-/Rollback-Set (Plan §5.6).
- **Keycloak-Admin-Creds:** `ensureKeycloakClient` braucht Admin-Zugang (`KEYCLOAK_*` in
  `apps/api/.env.default`). Kein neues Secret, aber Boot-Voraussetzung für den Moodle-Rollout.
- **WireGuard:** `EDU_WG_API_KEY` aus AppConfig-Options (Bestand, unverändert).
- **Kein** `master.key`-Schreibpfad in diesem Paket; nur Konsum der bestehenden Verschlüsselung.
- **Keine** Secrets ins Repo. Neue Env-Refs (falls Moodle-KC-Client-Provisionierung eigene Env
  braucht) ins Env-/Secret-Inventar (`p0-supply-chain-inventory`, `.env.default`).

## Trade-offs & Alternativen (mit Empfehlung)

1. **Store-Fetch: eigener Raw-Endpoint vs. BE-Proxy durch die API.**
   - *Raw-Endpoint (Mirror):* minimal (nur `EDU_PLUGINS_GITHUB_URL` umbiegen), aber Browser →
     externer Host bleibt CSP-/Erreichbarkeits-abhängig, und der Client muss GitHub-Raw-Header
     sprechen.
   - *BE-Proxy (`GET docker/app-store/:app/compose`):* API holt das YAML serverseitig, FE ruft nur
     die eigene API → löst CSP **und** die Tot-Risiko-Kopplung an einem Punkt, kostet aber eine neue
     Route/DTO/Store-Änderung.
   - **Empfehlung:** In P4 **zunächst Raw-Mirror** (aus `p1-installer-repoint`) verifizieren; **falls
     die FE-nginx-CSP den Mirror-Host blockt** oder der Mirror-Host nicht CORS-fähig ist, auf
     **BE-Proxy** wechseln (eigene Task, dann als Contract-erweiterndes BE→FE-Paar). Entscheidung
     fällt an der CSP-Verify-Task (T11).
2. **Editor-Split-Tiefe (OnlyOffice/Collabora).** Voller `ACTIVE_DOCUMENT_EDITOR`-Toggle (UI-Feld +
   WOPI-Verdrahtung) vs. nur BE-Resolver + Default. **Empfehlung:** Hier nur BE-Resolver + Konstante
   (Default `ONLY_OFFICE`); das UI-Feld liefert das Schwester-Paket. So bleibt P4 fokussiert und die
   Verifikation beider Editoren ist über den Default + gesetzte `extendedOptions` trotzdem machbar.
3. **Drift-Close-Verortung (P0-Engine vs. P4-Verify).** Alles in P0 vs. Verify-nahe Drift hier.
   **Empfehlung:** T1–T11 hier belassen, aber im Ledger als „provisorisch, migriert ggf. ins
   P0-Engine-Paket" markieren — Entscheidung nach P0-Basis-Drift-Analyse.

## Risiken & Rollback

- **R1 — `edulution-plugins`-Mirror nicht bereit.** Ohne den umgebogenen Endpoint (Dependency
  `p1-installer-repoint`) rollt keine App aus → gesamte Verifikation blockiert. *Mitigation:* T11
  hängt hart an `p1-installer-repoint`; bis dahin Rollout gegen den Original-Upstream nur als
  Zwischen-Smoke.
- **R2 — CSP blockt Browser→Mirror.** *Mitigation:* T11 misst `connect-src`; Fallback BE-Proxy
  (Trade-off 1).
- **R3 — Keycloak-Admin-Zugang fehlt/anders auf crabbox.** Moodle-Rollout schlägt fehl, andere drei
  laufen. *Mitigation:* T15 isoliert den KC-Pfad; `ensureKeycloakClient` loggt und wirft gezielt.
- **R4 — Compose-Migration verschiebt Dateien falsch.** `migrateDockerComposeFiles` ist idempotent
  (nur wenn Ziel fehlt) und nur ein `moveSync`. *Rollback:* Datei zurückschieben; keine DB-Wirkung.
- **Rollback gesamt:** Branch `feat/p4-app-store-verify` verwerfen. Kein DB-Schema, kein
  `schemaVersion` — reiner Code-/Dateisystem-Effekt. Auf crabbox ausgerollte Container per
  `docker rm -f` + `./data/apps/<app>` löschen.

## Doku-Impact (Augenmaß)

- Kurzer Betriebs-Abschnitt „App-Store: App über die UI ausrollen" (welche vier Apps, welche Secrets
  Moodle braucht, wo die Compose-Datei landet) — DE+EN, knapp.
- Verweis im DR-Runbook (`p1-dr-runbook`), dass `./data/apps/<app>/<container>/docker-compose.yml`
  (persistierte Secrets) mit ins Backup gehört.
- Contract-Notiz in der API-Doku/Swagger: `containerName` im `POST docker/container`.

## i18n-Impact (DE+EN)

- Sektion `docker.events` / `docker.error` **existiert bereits** (DE+EN verifiziert) und deckt den
  Rollout-Fortschritt ab.
- **Neu, falls Moodle-Provisioning eigenes Feedback braucht:** z. B.
  `docker.events.provisioningKeycloakClient` — dann DE+EN Pflicht.
- Editor-Umschaltung: kein neuer Key hier (UI-Feld im Schwester-Paket).

## Offene Fragen

1. **BE-Proxy vs. Raw-Mirror für den Store-Fetch** — Entscheidung an T11 (CSP-Messung). Trade-off 1.
   *Design-Entscheidung, gehört nicht in eine einzelne Task.*
2. **`ACTIVE_DOCUMENT_EDITOR`-extendedOptionKey** — liefert das Schwester-Paket „Filesharing/Collabora
   -Toggle" den Key/das UI-Feld, oder legen wir die bare Konstante hier ab? (T5 hängt daran.)
3. **Keycloak-Admin-Creds auf crabbox** — sind die im Voll-Stack-Deploy vorhanden/ausreichend für
   `ensureKeycloakClient`? Falls nein, Moodle-Verify (T15) auf „blockiert" bis geklärt.
4. **Companion-Image-Herkunft** — ziehen wir für die Verifikation die Original-`edulution-io`-Images
   oder bereits eigene Mirror-Digests? (Hängt an `p0-supply-chain-inventory`.)
5. **`getContainerStats`/Dashboard** — später eigenes Paket oder nie? (Nicht-Ziel hier.)
