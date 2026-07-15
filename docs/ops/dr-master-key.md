<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# DR: Master-Key & Backup-Kopplung

Verbindliche Ops-Regeln für die Sicherung des Master-Encrypt-Keys. **Der Master-Key wrappt
jedes gespeicherte Passwort** (LMN-Binduser, Mail, Guacamole, App-Zugänge). Geht er verloren
oder wird er rotiert, sind **alle** gespeicherten Passwörter unwiederbringlich unlesbar.

## 1. Key und DB gehören zwingend zusammen ins Backup

Der Master-Key liegt an genau einer der beiden Stellen (je nach Deployment-Stand):

- **`MASTER_ENCRYPT_KEY`** in `/srv/docker/edulution-ui/edulution.env` (vom Installer provisioniert,
  s. `p1-master-key-provisioning`), **oder**
- **`./data/master.key`** im `edulution-api`-Bind-Mount (Auto-Generierung durch `getMasterKey`,
  wenn keine Env gesetzt ist).

**Regel:** Ein `mongodump` der `edulution`-DB und der zugehörige Master-Key (`edulution.env`
**und** `./data/master.key`) müssen **immer gemeinsam** ins Backup-/Rollback-Set — **nie einzeln**.
Ein DB-Dump ohne den passenden Key ist wertlos (alle gewrappten Passwörter sind Müll); ein Key
ohne Dump nützt nichts.

## 2. Restore-Reihenfolge

1. `edulution.env` (mit `MASTER_ENCRYPT_KEY`) **und** `./data/master.key` an ihre Orte
   zurückspielen — **vor** oder **zusammen mit** dem DB-Restore.
2. `mongorestore` des passenden Dumps.
3. Erst danach `edulution-api` starten. Bootet die API mit dem korrekten Key, erscheint **keine**
   Auto-Generierungs-Warnung (`No master key found. Generated new master key`).

## 3. Warnung: Neustart ohne persistentes `./data` + Env = Totalverlust

Wird der Stack ohne persistiertes `./data`-Volume **und** ohne gesetzte `MASTER_ENCRYPT_KEY`-Env
neu gestartet, generiert `getMasterKey` einen **neuen** Key → **Totalverlust** aller bereits
gespeicherten Passwörter (sie lassen sich nicht mehr entschlüsseln). Der Installer erhält daher
einen bereits vorhandenen `MASTER_ENCRYPT_KEY` beim Re-Run (Erhalt-Garantie, s.
`p1-master-key-provisioning` T2); Betrieb/DR muss dieselbe Garantie über das Backup sicherstellen.

## 4. Owner der Skript-Umsetzung

Das eigentliche Voll-DR-Skript (`mongodump` + `pg_dump` + `./data`-Tar, Plan §5.6) liegt im
DR-Runbook-Paket (`p1-dr-runbook`). Dieses Dokument ist die **harte Anforderung** an dieses
Skript: die Master-Key-Kopplung aus §1 ist nicht optional und muss im Backup-Set erzwungen werden.

## 5. Escrow / Bus-Factor

Zusätzlich zum Backup gehört der Master-Key (bzw. das Key-Material) in ein **Escrow** außerhalb
des Betriebs-Backups (Plan §10.1, Bus-Factor) — damit ein Verlust des gesamten Backup-Satzes nicht
gleichzeitig den Key mitnimmt.

Siehe auch `docs/datenschutz/verschluesselung-master-key.md` und
`docs/features/p0-migrations-inventory.md`.
