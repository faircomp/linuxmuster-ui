<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# Upgrade-Pfad 1.6.266 → 2.0.200 (DB-Migrationen)

Delta + Owner-Map + Terminal-`schemaVersion` + Runbook + Guardrails. Vollständiges Inventar =
`2.0-migrations-inventory.md`. Namensbelege: 1.6 = `apps/api/src/**` (Grep leer = existiert nicht),
2.0 = `.reference/2.0.200/api/main.js`.

## Delta 1.6→2.0 & Owner-Map (T3)

**Baseline:** 1.6 = **33** Migrationsnamen, 2.0 = **44** → **11 neue Mongoose-Migrationen, 0
entfernt/umbenannt** (die 33 1.6-Namen sind in 2.0 alle erhalten). **Keycloak-Delta = 0** (identische
6 Realm-Skripte). → Der Upgrade-Pfad ist **rein additiv**: 11 neue Objekt-Literale, an bestehende
Modell-Listen angehängt bzw. 3 Modelle erstmals verdrahtet.

### Die 11 neuen Migrationen → Modell, Vor-Abhängigkeit, Owner-Paket

| Neue Migration | Modell | Vor-Abhängigkeit | Owner-Feature-Paket |
|---|---|---|---|
| 000-wrap-encrypt-keys-with-master-key | users | `master_key_util` (`wrapEncryptKey`) | `p1-master-key-provisioning` / DR |
| 000-migrate-public-shares-acl-and-directory | publicShares | `createReadonlyAclSection` (ACL) | `p4-filesharing-wopi` |
| 001-backfill-missing-isDirectory-from-filePath | publicShares | — (aus `filePath` ableiten) | `p4-filesharing-wopi` |
| 000-survey-notification-should-link-to-participation-page | notifications | `SURVEY_PARTICIPATION` sourceType | Surveys/Notifications (Bestand) |
| 002-rename-accessibleByRoles-to-accessGroups | surveyTemplates | neues `accessGroups`-Feld | Surveys (Bestand) |
| 003-normalize-accessGroups-to-objects | surveyTemplates | `accessGroups`-Objekt-Shape | Surveys (Bestand) |
| 003-fix-corrupted-nested-answers | surveyAnswers | — (Datenreparatur) | Surveys (Bestand) |
| 007-add-organizationType | globalSettings | `organizationType`-Feld | `p1-rebrand`/Settings |
| 010-add-uses-push-notifications | appConfig | `usesPushNotifications`-Feld (Basis-Drift T6) | appconfig cross-cutting / Push |
| 011-add-is-pinned | appConfig | `isPinned`-Feld | appconfig cross-cutting |
| 012-unify-mail-server-config | appConfig | `mailDefaultPorts` | `p4-mail-rework` |

### 3 neu-verdrahtete Modelle (1.6 hatte dort KEIN `runMigrations`)

`grep -rn runMigrations apps/api/src/{users,notifications,filesharing}` == **0** (verifiziert). In
2.0 kommen hinzu: **users** (7801), **notifications** (20680), **publicShares** (38245) — d. h. die
Migrations-Engine muss beim Nachbau in diese 3 Services **neu ins `onModuleInit` verdrahtet** werden
(nicht nur neue Listen-Einträge).

### Nicht-Migrationen (Abgrenzung)

`delete ONLY_OFFICE_JWT_SECRET` (`main.js:1726`) ist eine **Read-Projection** (Secret aus der
Response ausblenden), **keine** Migration — nicht in die Portierungs-Liste aufnehmen.

## Terminal-`schemaVersion` je Modell (T4)

Zielwerte nach vollem Migrations-Lauf (Assertion-Basis für das T5-Skript; entspricht der letzten
`newSchemaVersion` je Modell-Liste):

| Modell | Terminal-`schemaVersion` | # Migrationen |
|---|:--:|:--:|
| appConfig | **13** | 13 |
| globalSettings | **8** | 8 |
| surveyTemplates | **4** | 4 |
| surveyAnswers | **4** | 4 |
| notifications | **2** | 1 |
| publicShares | **2** | 2 |
| surveys | **2** | 2 |
| users | **1** | 1 |
| webdavShares | **1** | 1 |
| bulletinCategory | **1** | 1 |
| bulletins | **1** | 1 |

**Fresh-Install-Bezug:** Ein Fresh-Install muss dieselben Terminalwerte erreichen (die Seed-Daten
sind bereits „terminal"). Das separate `defaultAppConfig`-Fresh-Install-Diff (Basis-Drift T7:
Seed 6→7 Apps + `usesPushNotifications`/`isPinned`) deckt das **Seed-Layout** ab — hier bewusst
**keine** `defaultAppConfig`-Detailanalyse (YAGNI). Cross-Verweis: `base-drift-2.0.200.md` §T7.

## Upgrade-Test-Runbook (T5)

**Ziel:** einen echten 1.6-DB-Stand auf das Fork-Image heben und die Terminalwerte + Spot-Checks
assertieren. **`master.key` ist Teil des Sicherungs-Sets** (sonst Datenverlust, s. Guardrails).

1. **Sichern (gekoppelt!):** `mongodump --uri "$MONGO_URI" --out dump/` **UND** `cp ./data/master.key
   backup/master.key` — beides zusammen, sonst ist der Restore unlesbar (users/publicShares-Wrap).
2. **Fork-Image booten** gegen die wiederhergestellte 1.6-DB (dieselbe `master.key` mounten).
3. **Migrationen laufen** automatisch im `onModuleInit` jedes Service (seriell, idempotent).
4. **Assertion:** `scripts/migrations/assert-schema-versions.ts` gegen die Mongo laufen lassen →
   pro Modell `max(distinct(schemaVersion))` == Terminalwert **plus** Spot-Checks:
   - appConfig-MAIL-`extendedOptions` enthält **kein** `MAIL_IMAP_URL` mehr (unified, `main.js:4119`),
   - `users.encryptKey` beginnt mit dem Wrap-Prefix (`WRAPPED_KEY_PREFIX`, `main.js:9238`),
   - `publicShares` besitzen ein `acl`-Feld (`main.js:41430`).

**Selbsttest der Sollwerte:** Gegen die **2.0.200-Instanz** (die bereits auf Terminalwerten steht)
ausgeführt, muss das Skript **grün** sein — das validiert die dokumentierten Zielwerte.

> **Verify-Status (Loop):** Das Skript + Runbook sind das Deliverable und stehen. Der **remote-Lauf
> gegen die crabbox-2.0.200-Mongo ist aktuell zurückgestellt** — die warme Box ist down (Sync-Stufe
> `22:auth`, s. [[crabbox-setup-openedulution]]) und es läuft keine 2.0.200-Instanz. Der Selbsttest
> ist an den **P1-Voll-Stack-Verify** gekoppelt (dort steht die 2.0.200-Mongo ohnehin) → dann grün
> nachziehen. `npm run lint` des Skripts ebenso (remote-only) → mit P1.

## Guardrails (T6)

1. **Forward-only, kein `down()`.** `grep -c '\bdown:' main.js` == **0** — es gibt keinen
   Rollback-Code. Jede Migration erhöht `schemaVersion` → ein Downgrade würde die Idempotenz-Filter
   nie wieder treffen. **Rollback = Dump + `master.key` + Vor-Image** (nie „Migration rückwärts").
2. **`master.key`-Backup-Kopplung.** `users/000-wrap-encrypt-keys-with-master-key` wrappt **jede**
   `encryptKey`, `publicShares/000` wrappt das Share-`password` — beide via `wrapEncryptKey`
   (`main.js:9238`, **24×** referenziert). **Restore ohne die passende `master.key` = unlesbare
   Secrets/Passwörter.** → `master.key` gehört **immer** ins selbe Backup-Set wie der Dump.
3. **Regel für künftige Fork-Migrationen.** Neue Migration ⇒ (a) neues Objekt-Literal
   `{ name, version, execute }`, (b) `schemaVersion++` (nie eine bestehende Nummer wiederverwenden),
   (c) **an die Modell-Liste anhängen — nie umsortieren** (die `reduce`-Reihenfolge ist der Vertrag),
   (d) idempotenter `find({ schemaVersion: <prev> })`-Filter (leere Menge = No-Op).
4. **Geteilte Vor-Abhängigkeit `master_key_util`** trägt zwei Migrationen (users + publicShares) →
   beim Nachbau **zuerst** `master_key_util`/`wrapEncryptKey` portieren (Owner: `p1-master-key-
   provisioning`), sonst brechen beide `000`-Migrationen.
