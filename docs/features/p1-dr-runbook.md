<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# p1-dr-runbook — Betriebs-/Disaster-Recovery-Runbook + Backup-/Restore-Skript (Spec)

> **Kalibrierungshinweis (Detailtiefe):** P1-Ops-Paket, **kein** Feature-Nachbau. „Soll" ist
> hier kein 2.0-UI-Verhalten, sondern die **Betriebs-Topologie des Ziel-Stacks** (Container,
> Volumes, `./data`-Layout, `master.key`-Kopplung), belegt aus `docker-compose.yml.template`
> und `main.js`. Deliverables sind (a) ein **Runbook-Dokument** und (b) **ausführbare
> Shell-Skripte** (Backup/Restore/Drill) unter `scripts/ops/`. Es entsteht **kein Produktcode,
> keine Migration, keine neue API-Route/Guard**. Die Skripte laufen auf dem **Betreiber-Host**
> (Prod-LMN) bzw. im **crabbox-Restore-Drill**; sie werden per `scripts/crabbox/iter.sh cmd`
> verifiziert. Abhängt von **`p1-master-key-provisioning`** (dieses schreibt `MASTER_ENCRYPT_KEY`
> deterministisch in `edulution.env`; das DR-Set sichert genau diese Kopplung).

## Problem / Motivation

Der laufende Stack hält **alle gespeicherten Nutzer-Passwörter verschlüsselt**: der `master.key`
(`./data/master.key`, `getMasterKey` `main.js:9214–9235`) wrapped jede `user.encryptKey`, die
wiederum `user.password`/`useraccounts.accountPassword` AES-GCM-verschlüsselt. Die bisher in
§3.3/§6.2 dokumentierte Rollback-Prozedur war **datenverlust-gefährlich**: ein DB-Restore **ohne
den passenden `master.key`** macht alle gewrappten Passwörter **unlesbar** (Master-Plan §5.6,
§2.6, R4). Zusätzlich liegen kritische Daten in **zwei getrennten Datenbanken** (App-Mongo +
Keycloak-Postgres) und in **Dateien** (`master.key`, `apps/`, Traefik-SSL, `edulution.pem`), und
`edu-redis` ist bewusst **flüchtig** (`--save "" --appendonly no`, `main.js:8854–8856` BullMQ) —
es gibt heute **kein reproduzierbares, offsite-fähiges, gemeinsam konsistentes** Backup und
**keinen geprüften Restore-Weg**. Master-Plan §5.6 fordert: `mongodump` **+** `pg_dump`
(Keycloak-Postgres) **+** Tar von `./data` (inkl. `master.key`/`apps`/SSL), **DB-Dump VOR
`./data`-Tar**, offsite, als **wiederkehrender crabbox-Restore-Drill**, plus die Warnung
„Neustart ohne persistentes `./data`+Env = Totalverlust".

## Ziel & Nicht-Ziele (YAGNI)

**Ziel:**
- **DR-Runbook** (`docs/ops/dr-runbook.md`, DE): Topologie (was liegt wo), **Backup-Reihenfolge
  + Begründung** (DB-Dump vor `./data`-Tar), `master.key`-Kopplung, Verschlüsselung/Offsite,
  **RPO/RTO**, **Restore-Drill-Kadenz**, die **Totalverlust-Warnung**, Restore-Schritte.
- **`scripts/ops/dr-backup.sh`** — `mongodump` (ganze Instanz) → `pg_dump` (Keycloak-DB) →
  **danach** Tar von `./data` (inkl. `master.key`/`apps`/`traefik/ssl`/`letsencrypt`/
  `edulution.pem`) **+** `edulution.env`; Bundle **verschlüsselt** (age, gpg-Fallback) +
  `sha256`-Manifest; parametrisierter **Offsite-Push**; **Preflight** (bricht ab, wenn `./data`/
  `master.key`/`edulution.env` fehlen → Totalverlust-Guard).
- **`scripts/ops/dr-restore.sh`** — Bundle entschlüsseln → **`master.key` prüfen (sonst Abbruch)**
  → `./data` zurückspielen → `mongorestore` → Keycloak-Postgres restore → Stack hochfahren →
  Health; erfordert `--confirm`.
- **`scripts/ops/dr-drill.sh`** — **wiederkehrender crabbox-Restore-Drill**: Stack seed →
  Backup → `./data`+Volumes wipen → Restore → **Assertions** (Mongo-Count-Parität, Keycloak-Realm
  erreichbar, **`master.key`-Round-Trip** = ein gewrappt-gespeichertes Secret ist nach Restore
  wieder entschlüsselbar, Login 200) → Pass/Fail + RTO-Zeit.
- **Verdrahtung**: `package.json`-Aliasse (`dr:backup`/`dr:restore`/`dr:drill`) + Timer-/Cron-
  Vorlage für die wiederkehrende Ausführung.

**Nicht-Ziele (bewusst raus):**
- **Kein** Redis/BullMQ-Backup — `edu-redis` ist by-design flüchtig; Queue-Jobs sind nicht
  durable (Master-Plan §5.6-Runtime-Runbook). Wird im Runbook nur **dokumentiert**, nicht
  gesichert.
- **Keine** raw-Kopie von `./data/db` bzw. `./data/keycloak/db` ins Tar — die **logischen**
  Dumps (`mongodump`/`pg_dump`) ersetzen sie; ein Tar der laufenden DB-Dateien wäre inkonsistent
  (torn files) und mongo-/pg-versionsgebunden. Diese zwei Pfade werden **exkludiert**.
- **Kein** Offsite-Backend fest verdrahtet (S3/rclone/rsync) — nur ein **Hook** (`DR_OFFSITE_CMD`);
  konkretes Ziel + Escrow-Key sind Betreiber-Entscheidung (Offene Frage).
- **Keine** neue API-Route, kein UI, keine Migration, kein `schemaVersion`-Bump.
- **Kein** Ersatz für das Code-/History-Backup (`git bundle`, Master-Plan §10.1) — das ist ein
  **getrenntes** Runbook und darf nie mit der Laufzeit-DR verwechselt werden.

## Betroffene Komponenten & Dateien (konkrete Pfade)

**Neu (Deliverables):**
- `docs/ops/dr-runbook.md` — Runbook (DE), SPDX-Header.
- `scripts/ops/dr-lib.sh` — geteilte Helfer (Container-Auflösung via Compose-Service, Cred-Quelle
  aus Container-Env, Logging, Fail-Fast), SPDX.
- `scripts/ops/dr-backup.sh` — Backup-Skript, SPDX.
- `scripts/ops/dr-restore.sh` — Restore-Skript, SPDX.
- `scripts/ops/dr-drill.sh` — crabbox-Restore-Drill (Integrationstest des DR-Sets), SPDX.
- `scripts/ops/dr-drill.timer.example` + `scripts/ops/dr-drill.service.example` — systemd-Timer-
  Vorlage (bzw. Cron-Zeile) für die wiederkehrende Ausführung, SPDX.
- `package.json` — Aliasse `dr:backup`/`dr:restore`/`dr:drill` (delegieren an `scripts/ops/*`).

**Referenziert (nicht geändert, „Contract"-Quelle):**
- `../edulution-installer/apps/public-page/public/download/docker-compose.yml.template` — Container-
  namen/Services, Volumes, `env_file: edulution.env`.
- Laufzeit-Layout auf dem Host: `./data/` (Bind-Mount `./data:/opt/edulution/api/data`) mit
  `master.key`, `db/`, `keycloak/db/`, `apps/`, `traefik/config`, `traefik/ssl`, `letsencrypt/`,
  `edulution.pem`; Sibling `edulution.env`.

## Quelle des Solls (Rekonstruktion)

- **Master-Plan** `PLAN-openedulution-fork.md`: **§5.6** (DR-Runbook, Reihenfolge, Restore-Drill,
  Warnung) · §2.6 (Master-Key-Provisioning + Backup-Kopplung) · §6.2/§10.1 (Rollback = Dump +
  `master.key` + Image-Tag) · **R4** (Datenintegrität) · R9 (`edulution.pem`).
- **`main.js`**: `getMasterKey`/`MASTER_KEY_FILE_PATH`/`MASTER_KEY_ENV`/`writeMasterKeyToFile`
  (Mode `0600`) **`:9207–9235`**; `AuthGuard` `PUBLIC_KEY_FILE_PATH='./data/edulution.pem'`
  **`:55805`**; BullMQ-Queues/flüchtiges Redis **`:8854–8856`**; `EDUI_DISK_SPACE_THRESHOLD`
  **`:56932/57024`**.
- **`docker-compose.yml.template`**: `edu-db` (mongo:7) `:60–68`, Mount `./data/db` `:64`;
  `edu-keycloak-db` (postgres:16, `POSTGRES_DB=keycloak`, User `keycloak`) `:147–162`, Mount
  `./data/keycloak/db` `:155`; `edu-api`-Mount `./data:/opt/edulution/api/data` + `env_file:
  edulution.env`; `edu-redis` `--save "" --appendonly no` `:88–89`.
- **Kein Rescue-Branch** (`upstream/*`) und **kein Screenshot** — reines Ops-Paket.

## Datenmodell / API / Migrationen

**Keine** neuen Mongoose-Schemas, **keine** DTOs, **keine** API-Route, **keine** DB-Migration,
**kein** `schemaVersion`-Bump.

**Contract-Drift (relevant, ohne Schema):** Die Skripte koppeln an **Installer-Artefakte** —
Compose-**Service-Namen** (`edu-db`, `edu-keycloak-db`, `edu-api`), die **`./data`-Unterpfade**
und die **`edulution.env`-Variablennamen** (Mongo-Root-Creds, `POSTGRES_USER=keycloak`/
`POSTGRES_PASSWORD`, `MASTER_ENCRYPT_KEY`). Gegenmaßnahme: Container **nicht per `container_name`
hardcoden**, sondern per Compose-**Service** auflösen (`docker compose -f <compose> ps -q edu-db`),
und DB-Credentials **aus der Container-Env** ziehen (`docker exec … printenv`), nicht im Skript
duplizieren. Die exakten Mongo-Root-Variablennamen in `edulution.env` sind installer-generiert
und **auf crabbox zu verifizieren** (Offene Frage 4). Wird ein Service/Volume im Installer
umbenannt, muss `dr-lib.sh` mitgezogen werden → im Runbook als **Sync-Punkt** notiert.

## Auth / Guards

**Keine** — dieses Paket fügt **keine** HTTP-Route hinzu; es gibt nichts zu bewachen. Die Skripte
laufen als Host-Prozess mit Docker-Zugriff. **Guardrail statt Auth-Guard:** `dr-restore.sh`
verweigert ohne `--confirm` und bricht ab, wenn der `master.key` im Bundle fehlt; Bundles sind
**verschlüsselt** (enthalten `master.key` + `edulution.env` = Secrets).

## Externe Integrationen

- **Docker/Compose** (lokaler Daemon, `docker exec`/`docker compose`).
- **mongo:7** (`mongodump`/`mongorestore` **im Container** via `docker exec`).
- **postgres:16** (`pg_dump`/`pg_restore`/`psql` **im Container** via `docker exec`, DB `keycloak`,
  User `keycloak`).
- **Verschlüsselung**: `age` (empfohlen) mit `gpg`-Fallback — beide gängig/offline.
- **Offsite**: nur ein Hook `DR_OFFSITE_CMD` (z. B. `rclone copy`) — kein festes Backend.
- Keine Netzint-/edulution.io-Fremdreferenz.

## Secrets / Env / master.key

**Zentral für dieses Paket.** Das DR-Bundle enthält **`./data/master.key`** (`0600`) **und**
`edulution.env` (mit `MASTER_ENCRYPT_KEY` + Mongo-/Postgres-/Keycloak-Secrets). Daraus folgt:
- **Bundle immer verschlüsselt** vor Offsite (age/gpg an einen **Escrow-Recipient**) — Klartext-
  Bundles nie ablegen, **nie ins Repo** (`.gitignore` deckt `scripts/ops/*.tar*`, `*.age`, `*.gpg`,
  Backup-Ausgabeverzeichnisse ab — im Runbook + `.gitignore`-Task sicherstellen).
- **`master.key` + Dumps nur gemeinsam** (Master-Plan §2.6/§5.6) — die Skripte erzwingen das per
  Bundle-Struktur (ein Backup = ein atomares, verschlüsseltes Archiv).
- Neue Env-Var nur **skript-intern**: `DR_OFFSITE_CMD`, `DR_AGE_RECIPIENT` (bzw.
  `DR_GPG_RECIPIENT`), `DR_STACK_DIR`, `DR_OUT_DIR` — **keine** neue App-/Container-Env.
- Abhängigkeit `p1-master-key-provisioning`: sobald `MASTER_ENCRYPT_KEY` **deterministisch** in
  `edulution.env` steht, ist der `master.key` im Bundle **zusätzliche Absicherung** (Env gewinnt
  in `getMasterKey`); der Drill deckt **beide** Wege ab (Env gesetzt / nur Datei).

## Trade-offs & Alternativen

1. **Logischer Dump vs. Volume-Snapshot.** *Empfehlung: logisch* (`mongodump`/`pg_dump`).
   Portabel, versionstoleranter, in einen **frischen** Stack restaurierbar (genau das prüft der
   Drill). Raw-Tar von `./data/db` wäre schneller, aber bei laufender DB inkonsistent und an die
   exakte Mongo-/PG-Version gebunden → die zwei DB-Pfade werden aus dem `./data`-Tar **exkludiert**.
2. **Konsistenzfenster Mongo↔Postgres.** Beide werden Sekunden auseinander gedumpt; die App hat
   **keine** store-übergreifende Transaktion (Keycloak-Identitäten ↔ App-Daten sind lose via
   Username gekoppelt) → akzeptabel. *Empfehlung:* optionaler `--quiesce`-Flag stoppt `edu-api`
   kurz für **geplante** Backups (Writer ruhig), Hot-Backup für Ad-hoc.
3. **Reihenfolge DB-Dump VOR `./data`-Tar** (Master-Plan-Vorgabe). *Begründung/Empfehlung:* Erst
   die logischen DB-Dumps, **dann** den `master.key` ins Tar — so ist garantiert der Key im
   Bundle, der die **gerade gedumpten** `user.encryptKey` wrappt; eine Key-Rotation zwischen
   Key-Capture und DB-Dump würde sonst Ciphertext ohne passenden Key hinterlassen. Reihenfolge ist
   also **korrektheitsrelevant**, nicht kosmetisch — der Drill assertet sie.
4. **Verschlüsselung age vs. gpg.** *Empfehlung: age* (ein Recipient-Key, simpel, modern), gpg als
   Fallback für Bestandsschlüsselringe.
5. **Restore-Ziel „über laufenden Stack" vs. „frische Instanz".** *Empfehlung:* Restore fährt den
   Stack **herunter**, spielt zurück, fährt hoch; „über laufend" nur mit `--force` (Datenverlust-
   Risiko). Der Drill restauriert immer in eine **frisch gewipte** Instanz.

## Risiken & Rollback

- **Falscher/fehlender `master.key` beim Restore** → unlesbare Passwörter. *Gegenmaßnahme:*
  Restore bricht ohne `master.key` im Bundle ab; der Drill prüft den **Round-Trip** aktiv.
- **Secret-Leak** (Bundle enthält Klartext-Secrets). *Gegenmaßnahme:* Pflicht-Verschlüsselung,
  `.gitignore`-Härtung, `0600` auf Ausgabe, Klartext-Zwischendateien in `mktemp -d` + `trap`-Cleanup.
- **Falsche Container-/Var-Namen nach Installer-Drift** → Backup läuft ins Leere. *Gegenmaßnahme:*
  Service-basierte Auflösung + Preflight, der die Ziel-Container/DBs **vorab pingt** und bei
  Nichterreichbarkeit **abbricht** (kein „leeres" Erfolgs-Bundle).
- **Torn/hot-copy inkonsistente DB.** *Gegenmaßnahme:* logische Dumps + optionaler `--quiesce`.
- **Rollback dieses Pakets:** rein additiv (neue Dateien) → Rollback = Skripte/Doku entfernen; **kein**
  Datenrisiko, solange die Skripte nicht ausgeführt werden. Die Skripte selbst berühren Produktions-
  daten nur bei **explizitem** Aufruf (`--confirm`).

## Doku-Impact (mit Augenmaß)

Deliverable ist selbst Doku: `docs/ops/dr-runbook.md` (DE). Zusätzlich **kurzer** Verweis im
Betriebsteil des `README`/Installer-Dok auf das Runbook + die **Totalverlust-Warnung** (ein Satz).
Kein CHANGELOG-Zwang (interne Ops-Tooling), aber ein Eintrag ist zulässig.

## i18n-Impact (DE+EN)

**Keine** — keine UI-Strings, keine neuen Übersetzungs-Keys (`npm run check-translations` unberührt).
Das **Runbook** ist DE (Betreiber-/Ops-Publikum, linuxmuster.net-Umfeld). Eine EN-Fassung ist
optional und **deferred** (Offene Frage 3).

## Offene Fragen

1. **Offsite-Backend + Kadenz.** Welches Ziel (rclone-Remote/S3/rsync-Host) und welcher Rhythmus
   (täglich + vor jedem Upgrade?)? → setzt `DR_OFFSITE_CMD` + RPO im Runbook. **Empfehlung:**
   täglich verschlüsselt via `rclone` + Pflicht-Backup vor jedem crabbox-Upgrade (Master-Plan §6.2).
2. **Escrow-Recipient für die Bundle-Verschlüsselung.** Welcher age/gpg-Key verschlüsselt die
   Offsite-Bundles, und wo liegt der private Key (Bus-Factor/Escrow, Master-Plan §Exit-Longevity
   „`master.key`-Escrow")? Blockiert nicht die Skripte, aber die Prod-Nutzung.
3. **EN-Fassung des Runbooks** jetzt oder deferred? **Empfehlung:** deferred (DE-only, YAGNI).
4. **Exakte Mongo-Root-Variablennamen** in der installer-generierten `edulution.env`
   (`MONGO_INITDB_ROOT_USERNAME/PASSWORD` vs. andere) — auf crabbox aus `docker exec edulution-db
   printenv` verifizieren; Skript zieht sie generisch aus der Container-Env, aber der Drill muss
   den realen Namen bestätigen.
5. **Kadenz/Automatisierung des Drills.** Timer/Cron auf der Dev-Box vs. manuell vor Releases? Der
   Drill braucht eine crabbox-Lease (Proxmox-Creds lokal) → **keine** GitHub-Action. **Empfehlung:**
   monatlicher manueller `npm run dr:drill` + Pflicht vor jedem Release, Timer-Vorlage als Angebot.
