<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# Betriebs- / DR-Runbook

Betriebs- und Disaster-Recovery-Runbook für einen linuxmuster-ui-Stack. Die ausführenden
Skripte liegen unter `scripts/ops/` (`dr-backup.sh`, `dr-restore.sh`, `dr-drill.sh`, geteilte
Bibliothek `dr-lib.sh`).

## Topologie

Compose-Stack unter `${DR_STACK_DIR}` (default `/srv/docker/edulution-ui`), Compose-Datei
`docker-compose.yml`, Secrets-Sibling `edulution.env`.

| Service (Compose) | Container | Rolle | Persistenz |
| --- | --- | --- | --- |
| `edu-api` | `edulution-api` | API | `./data` (`master.key`, `apps`) |
| `edu-db` | `edulution-db` | MongoDB 7 (`edulution`) | `./data/db` |
| `edu-keycloak` | `edulution-keycloak` | Keycloak | — (State in Postgres) |
| `edu-keycloak-db` | `edulution-keycloak-db` | Postgres 16 (`keycloak`) | `./data/keycloak/db` |
| `edu-redis` | `edulution-redis` | Redis (BullMQ) | **flüchtig** |
| `edu-traefik` | `edulution-traefik` | Reverse-Proxy | `./data/traefik/{config,ssl}`, `./data/letsencrypt` |
| `edu-ui` | `edulution-ui` | Frontend | — |

`./data`-Layout: `master.key` · `apps/` · `db/` (Mongo) · `keycloak/db/` (Postgres) ·
`traefik/config`, `traefik/ssl` · `letsencrypt/` · ggf. `edulution.pem`.

## Backup-Reihenfolge + Begründung

Die **Reihenfolge** ist verbindlich (das Skript `dr-backup.sh` erzwingt sie):

1. **Preflight** — Container erreichbar; `./data`, `./data/master.key` und `edulution.env`
   vorhanden. Fehlt der `master.key`/Env, bricht das Backup ab (**Totalverlust-Risiko**).
2. **`mongodump`** der ganzen Mongo-Instanz (`--archive --gzip`), Creds aus der Container-Env.
3. **`pg_dump`** der Keycloak-Postgres (`-U keycloak keycloak`).
4. **Danach** `tar` von `./data` **inkl.** `master.key`/`apps`/`traefik/ssl`/`letsencrypt`/
   `edulution.pem`, **exkl.** der DB-Live-Verzeichnisse `db/` und `keycloak/db/` (die kommen aus den
   Dumps), **plus** `edulution.env`.

**Warum DB-Dump VOR dem Tar:** die gedumpten, verschlüsselt gespeicherten `encryptKey`-Werte sind
nur mit **genau dem** `master.key` lesbar, der beim Dump aktiv war. Dump und `master.key` müssen
denselben Stand abbilden — daher erst dumpen, dann den Key mit-taren.

## `master.key`-Kopplung + Totalverlust-Warnung

`./data/master.key` bzw. `MASTER_ENCRYPT_KEY` (aus `edulution.env`) und die DB-Dumps gehören
**zwingend gemeinsam** ins Backup-/Rollback-Set — **nie einzeln**. Ein Dump ohne den passenden Key
ist wertlos.

> **Totalverlust-Warnung:** Ein Neustart ohne persistentes `./data` **und** ohne gesetzte
> `MASTER_ENCRYPT_KEY`-Env erzeugt einen neuen Master-Key → alle gewrappten Passwörter sind
> unwiederbringlich verloren. Siehe `docs/ops/dr-master-key.md`.

## Verschlüsselung / Offsite / Escrow

Das Bundle wird mit `age` (oder `gpg`) verschlüsselt, mit `sha256sum`-Manifest versehen und `0600`
abgelegt. Ein optionaler `DR_OFFSITE_CMD` schiebt es an einen zweiten Ort. Der Master-Key gehört
zusätzlich in ein **Escrow** außerhalb des Betriebs-Backups (Bus-Factor, Plan §10.1).

## RPO / RTO

- **RPO** (Recovery Point Objective): abhängig von der Backup-Kadenz (Timer-Vorlage
  `scripts/ops/dr-drill.timer.example`); Empfehlung täglich.
- **RTO** (Recovery Time Objective): Restore + Stack-Hochlauf; `dr-drill.sh` misst die reale RTO
  und gibt sie aus.

## Restore-Schritte

`dr-restore.sh --confirm` (reverse zu `dr-backup.sh`):

1. Bundle entschlüsseln + `sha256` prüfen; **`master.key` im Bundle verifizieren** (sonst Abbruch).
2. Stack herunterfahren.
3. `./data` zurückspielen (`master.key` mit `0600`).
4. `mongorestore --archive --gzip --drop`; Keycloak-Postgres `psql`/`pg_restore --clean`.
5. Stack hochfahren, auf Health warten.

## Restore-Drill-Kadenz

Der Restore-Drill (`dr-drill.sh`) ist der **Test** des DR-Sets: seed → backup → wipe → restore →
Assertions (Mongo-Doc-Count identisch, Keycloak-OIDC-Discovery 200, **`master.key`-Round-Trip**
ohne „Generated new master key", Login 200). Kadenz: regelmäßig (z. B. wöchentlich) über die
systemd-Timer-Vorlage; jede Änderung an Compose/`./data`-Layout triggert einen Ad-hoc-Drill.

## Redis flüchtig / kein Queue-Backup

`edu-redis` (BullMQ) ist **flüchtig** und wird **nicht** gesichert — Queue-Jobs sind
transient/rekonstruierbar; ein Restore darf keinen Redis-State erwarten.

## Contract-Sync-Punkt

Service-/Container-Namen (`edu-db`/`edulution-db`, `edu-keycloak-db`/`edulution-keycloak-db`) und
DB-Credential-Variablen (`MONGO_INITDB_ROOT_*`, `POSTGRES_*`) stammen aus den
Installer-Templates (`docker-compose.yml.template`, `edulution.env`). Ändern sich diese, müssen
`dr-lib.sh`/`dr-backup.sh`/`dr-restore.sh` mitgezogen werden (kein Hardcode von Creds — Auflösung
via `docker exec … printenv`).
