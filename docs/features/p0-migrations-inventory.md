# P0 — DB-Migrations-Inventar & Upgrade-Pfad 1.6→2.0 (Spec)

> ANALYSE-Paket (Phase P0). Produziert Referenz-Doku + Test-Plan + Owner-Map, **keinen**
> Feature-Code. Die eigentliche Portierung der Delta-Migrationen passiert **in den jeweils
> besitzenden Feature-Paketen** (Mail, Push, Public-Shares, Master-Key …), nicht hier.
> Task-Granularität ist hier bewusst analyse-/doku-orientiert; sie schärft sich nach der
> Basis-Drift-Analyse (`p0-base-drift-analysis`) und dem Chat-Piloten.

## Problem / Motivation

Der Fork basiert auf **1.6.266**. Die 2.0-API fährt beim Start Schema-Migrationen über
`MigrationService.runMigrations(model, list)` (`main.js:2676`). Wer nur 1.6 forkt und Module
additiv hinzufügt, dem fehlt der **Upgrade-Pfad einer bestehenden 1.6-DB auf den 2.0-Datenstand**
— und Fresh-Installs erhalten falsche/veraltete `schemaVersion`-Terminalwerte, sobald die neuen
Felder (z. B. `usesPushNotifications`, `isPinned`, `acl`, gewrappte `encryptKey`) eingeführt
werden.

Der Master-Plan (`PLAN-openedulution-fork.md` §3.3, Zeilen 162–166) nennt „12× `runMigrations`,
32 Migrationsnamen inkl. 010/011/012". Die **Zahl 32 ist ein Under-Count**: das im Plan
verwendete Grep-Muster ist lowercase-only (`[0-9]{3}-[a-z0-9-]+`) und übersieht alle
**camelCase-Namen** (`001-add-deploymentTarget`, `004-add-adminGroups`, `007-add-organizationType`,
`001-backfill-missing-isDirectory-from-filePath`, `002-rename-accessibleByRoles-to-accessGroups`,
`003-normalize-accessGroups-to-objects`) sowie alle 6 Keycloak-Realm-Skripte. Die **korrekten
Zahlen** (verifiziert, s. u.): **38 Mongoose-Migrationen über 11 Modelle** (11 Aufruf-Stellen von
`runMigrations`) **+ 6 Keycloak-Realm-Config-Skripte** (getrennter Runner). Diese Spec fixiert
das vollständige Inventar, den exakten 1.6→2.0-Delta, die Owner-Map und den Upgrade-Test-Plan.

## Ziel & Nicht-Ziele (YAGNI)

**Ziel**
- Vollständiges, verifiziertes Inventar aller 2.0-Migrationen (Modell · Name · `version` ·
  `previousSchemaVersion → newSchemaVersion` · Zweck · `main.js`-Anker).
- Exakter **Delta 1.6-Repo → 2.0** (welche Migrationen neu, welche Modelle bekommen neu
  `runMigrations`), inkl. jeder Vor-Abhängigkeit (`master_key_util`, `SURVEY_PARTICIPATION`,
  `createReadonlyAclSection`, `mailDefaultPorts`, neue Schema-Felder).
- **Owner-Map**: jede Delta-Migration ist genau einem späteren Feature-Paket zugeordnet, das sie
  mit-portiert (Contract: Migration reist mit ihrem Feature).
- **Per-Modell Ziel-`schemaVersion`** (Terminalwert nach vollem Migrationslauf) als Prüf-Assertion.
- **Upgrade-Test-Runbook** + ein **wiederverwendbares Assertion-Skript**, das gegen eine laufende
  Mongo die Terminal-`schemaVersion` pro Modell prüft (P1 führt es gegen eine echte 1.6→Fork-DB aus).
- Guardrail-Doku: forward-only, `master.key`-Backup-Kopplung, `schemaVersion++`-Regel für künftige
  Migrationen.
- Anker-/Zähl-Korrektur zurück ins Tracking (`fingerprint.sh`) und in §3.3 des Plans.

**Nicht-Ziele (bewusst raus)**
- **Keine Portierung** der Delta-Migrationen selbst — sie referenzieren Felder/Enums/Utils, die
  erst ihr besitzendes Feature einführt (z. B. `APPS.MAIL`, `accessGroups`, `isPinned`,
  `wrapEncryptKey`); vorab portiert würden sie `schemaVersion` für nicht existente Felder bumpen.
- **Kein `master_key_util`-Nachbau** (eigenes P1-Paket `master-key-provisioning`; hier nur als
  Vor-Abhängigkeit dokumentiert).
- **Keine `defaultAppConfig`-Fresh-Install-Diff** im Detail (eigenes P0-Paket; hier nur der
  Terminal-`schemaVersion`-Bezug).
- **Keine tatsächliche Ausführung** des Upgrade-Tests gegen eine echte 1.6-DB (das ist P1 und
  benötigt einen echten 1.6-Dump — s. Offene Fragen).
- Kein `down()`/Rollback-Migrationscode (2.0 ist forward-only).

## Betroffene Komponenten & Dateien

**Neu (dieses Paket schreibt):**
- `docs/migrations/2.0-migrations-inventory.md` — das vollständige Inventar (T2).
- `docs/migrations/upgrade-1.6-to-2.0.md` — Delta + Owner-Map + Runbook (T3–T6).
- `scripts/migrations/assert-schema-versions.ts` (oder `.sh` via `mongosh`) — Assertion-Skript (T5).

**Referenz (nur gelesen, Soll-Quelle):**
- 2.0: `scratchpad/api-img/opt/edulution/api/main.js` (Anker s. u.).
- 1.6-Baseline im Repo: `apps/api/src/migration/migration.service.ts`,
  `apps/api/src/migration/migration.type.ts`,
  `apps/api/src/{appconfig,global-settings,webdav/shares,surveys,bulletinboard,bulletin-category}/migrations/*`,
  `apps/api/src/scripts/keycloak/*`.

**Später betroffen (Owner der Delta-Migrationen — nur Verweise, hier kein Code):**
- `apps/api/src/users/` (Master-Key), `apps/api/src/notifications/`,
  `apps/api/src/filesharing/` (Public-Shares-ACL), `apps/api/src/appconfig/migrations/` (010/011/012),
  `apps/api/src/global-settings/migrations/` (007), `apps/api/src/surveys/migrations/`
  (surveyTemplates 002/003, surveyAnswers 003).

## Quelle des Solls (`main.js`-Anker)

**Engine (identisch 1.6↔2.0):** `MigrationService.runMigrations` `main.js:2676`; Typ
`Migration<T> = {name, version, execute(model)}` (= `apps/api/src/migration/migration.type.ts`).
Migrationen sind **Objekt-Literale** (nicht Klassen) → für `class *`-Anker unsichtbar.

**11 Mongoose-`runMigrations`-Aufruf-Stellen (alle in `onModuleInit`):**
appConfig `1601` · webdavShares `4938` · globalSettings `5499` · users `7801` · notifications
`20680` · publicShares `38245` · surveys `44391` · surveyTemplates `46418` · surveyAnswers `47807`
· bulletinCategory `51355` · bulletins `52464`.

**Listen-Definitionen (Länge fixiert):** appConfig `main.js:2728` (13) · webdavShares `5368` (1) ·
globalSettings `5943` (8) · users `7796` (1) · notifications `21931` (1) · publicShares `41391` (2)
· surveys `44663` (2) · surveyTemplates `46529` (4) · surveyAnswers `48299` (4) · bulletinCategory
`51690` (1) · bulletins `53016` (1).

**Keycloak-Realm-Skripte (getrennter Runner):** `keycloakConfigScripts` Liste `main.js:57252`,
invoke via `this.runScripts(keycloakConfigScripts)` `main.js:57200`. 6 Skripte
`000-removeRealmRoles`…`005-disableLdapConnectionPoolingAndPagination`. **Delta = 0** — 1.6-Repo
hat identische Namen (`apps/api/src/scripts/keycloak/keycloakConfigScripts.ts`).

**Bemerkenswerte einzelne Migrations-Anker:** `000-wrap-encrypt-keys-with-master-key` `9312`
(depends `master_key_util` `main.js:9214`) · `000-migrate-public-shares-acl-and-directory` `41424`
+ `001-backfill-missing-isDirectory-from-filePath` `41539` (depends `master_key_util` +
`createReadonlyAclSection`) · `000-survey-notification-should-link-to-participation-page` `21963`
(depends `NOTIFICATION_SOURCE_TYPE.SURVEY_PARTICIPATION`) · `010-add-uses-push-notifications` `3992`
· `011-add-is-pinned` `4046` · `012-unify-mail-server-config` `4119` (depends `mailDefaultPorts`
`main.js:102`-Modul) · `007-add-organizationType` `6430` · `002-rename-accessibleByRoles-to-accessGroups`
`47630` + `003-normalize-accessGroups-to-objects` `47692` · `003-fix-corrupted-nested-answers` `48683`.

## Datenmodell / API / Migrationen

Kein neues Datenmodell, keine neuen Routen, **kein Contract-Drift** in diesem Paket (reine Analyse).

**Inventar-Kern (11 Modelle · 38 Mongoose-Migrationen):**

| Modell | # | Namen (Terminal-`schemaVersion`) | Delta ggü. 1.6 |
|---|---|---|---|
| appConfig | 13 | 000…012 → **13** | +010,+011,+012 |
| globalSettings | 8 | 000…007 → **8** | +007 (`organizationType`) |
| webdavShares | 1 | 000 → 1 | — |
| users | 1 | 000-wrap-encrypt-keys-with-master-key → 1 | **+Modell neu verdrahtet** |
| notifications | 1 | 000-…participation-page → 2* | **+Modell neu verdrahtet** |
| publicShares | 2 | 000-acl-and-directory, 001-backfill-isDirectory → **2** | **+Modell neu verdrahtet** |
| surveys | 2 | 000,001 → 2 | — |
| surveyTemplates | 4 | 000…003 → 4 | +002,+003 (accessGroups) |
| surveyAnswers | 4 | 000…003 → 4 | +003 (fix-corrupted-nested) |
| bulletinCategory | 1 | 000 → 1 | — |
| bulletins | 1 | 000 → 1 | — |

\* notifications-Migration setzt `newSchemaVersion=2` (prev=1/undefined), s. `main.js:21969`.

**Idempotenz-Muster:** jede `execute` filtert `model.find({ schemaVersion: previousSchemaVersion })`
(bzw. `$or: [{$exists:false}, {…prev}]`), transformiert, setzt `newSchemaVersion`. Leere Menge →
No-Op. Daher gefahrlos wiederholbar. `appConfig/000` nutzt `previousSchemaVersion = undefined`
(Docs ohne Feld).

**11 neue Mongoose-Migrationen (Delta) + 3 neu verdrahtete Modelle** — Owner-Map:

| Delta-Migration | Modell | Vor-Abhängigkeit | Owner-Paket (portiert mit) |
|---|---|---|---|
| 000-wrap-encrypt-keys-with-master-key | users (neu) | `master_key_util` | P1 `master-key-provisioning` |
| 000-…survey…participation-page | notifications (neu) | `SURVEY_PARTICIPATION`-Enum | Notifications/Push-Paket |
| 000-migrate-public-shares-acl-and-directory | publicShares (neu) | `master_key_util`, `createReadonlyAclSection` | Public-Shares-ACL-Paket |
| 001-backfill-missing-isDirectory-from-filePath | publicShares (neu) | — | Public-Shares-ACL-Paket |
| 010-add-uses-push-notifications | appConfig | `usesPushNotifications`-Feld, `APPS.MAIL` | Push-Notifications-Paket |
| 011-add-is-pinned | appConfig | `isPinned`-Feld | Sidebar-Pin-Paket |
| 012-unify-mail-server-config | appConfig | `mailDefaultPorts`, Mail-Rework | P4 Mail |
| 007-add-organizationType | globalSettings | `organizationType`-Feld | Global-Settings/Organization |
| 002-rename-accessibleByRoles-to-accessGroups | surveyTemplates | `accessGroups`-Rework | Surveys-accessGroups |
| 003-normalize-accessGroups-to-objects | surveyTemplates | `accessGroups`-Rework | Surveys-accessGroups |
| 003-fix-corrupted-nested-answers | surveyAnswers | (reine Datenkorrektur) | Surveys |

**Keine der 11 Delta-Migrationen ist isoliert portierbar** — jede bumpt `schemaVersion` für ein
Feld/Enum/Util, das erst ihr Feature einführt → Portierung **lazy, ko-lokalisiert** mit dem Feature
(Empfehlung, s. Trade-offs).

**Nicht-Migration (Korrektur zu Plan §3.2/§9-24):** `delete extendedOptions.ONLY_OFFICE_JWT_SECRET`
(`main.js:1726`) ist **keine** DB-Migration, sondern ein **Read-Projection-Strip** im
`AppConfigService`-Lesepfad (DTO wird beim Ausliefern bereinigt). Es existiert keine
OnlyOffice-Key-Migration.

## Auth / Guards

Kein Endpunkt, keine Guards in diesem Paket. **Wichtiger Guard-nahe Hinweis für Owner-Pakete:**
`runMigrations` läuft in `onModuleInit` **ungeschützt vor jeder Auth** beim Boot — die Migration
selbst braucht keinen Guard, aber die von ihr eingeführten neuen Routen/Felder (z. B.
Public-Shares-ACL, Mail) müssen ihre Guards separat mit-portieren (im jeweiligen Feature-Paket).

## Externe Integrationen

- **Keycloak-Realm-Skripte** (getrennter Runner) berühren die Realm-Config über
  `KEYCLOAK_API/KEYCLOAK_EDU_UI_REALM/KEYCLOAK_ADMIN(_PASSWORD)` — **Delta 0**, bereits im Fork.
  Sie gehören ins Realm-Provisioning-Inventar (eigenes P0/P1-Track), hier nur als Abgrenzung
  („nicht Mongoose") dokumentiert.
- Keine linuxmuster-api7 / WebDAV / Mailcow / Collabora-Berührung in diesem Analyse-Paket.

## Secrets / Env / master.key

- **`master.key` ist backup-/rollback-gekoppelt** (Plan §2.6/§3.3/§5.6-DR): Migration
  `000-wrap-encrypt-keys-with-master-key` wrappt **jede** `user.encryptKey` mit dem Master-Key
  (`wrapEncryptKey`, `main.js:9238`); Public-Shares-Migration wrappt zusätzlich `publicShare.password`.
  Ein DB-Restore **ohne** den passenden `./data/master.key` (bzw. `MASTER_ENCRYPT_KEY`) macht alle
  gewrappten Keys/Passwörter **unlesbar**. → Der Upgrade-Test-Runbook (T5) schreibt zwingend vor:
  `mongodump` **+ `./data/master.key` gemeinsam** sichern, nie einzeln.
- Neue Env-Vars führt dieses Paket nicht ein. `MASTER_ENCRYPT_KEY`-Provisioning ist P1-Thema.

## Trade-offs & Alternativen

1. **Delta-Migrationen lazy (ko-lokalisiert) vs. eager (eigenes Migrations-Paket).**
   *Empfehlung: lazy.* Jede Delta-Migration setzt `schemaVersion` für ein Feld/Enum/Util, das erst
   ihr Feature bereitstellt; eager portiert würden sie fehlende Referenzen (`APPS.MAIL`,
   `accessGroups`, `wrapEncryptKey`) brechen oder Felder ohne Consumer bumpen. Die Owner-Map (T3)
   macht den lazy-Ansatz sicher: sie ist der Vertrag „Migration reist mit Feature".
2. **`master_key_util` als geteilte Vor-Abhängigkeit (users-000 **und** publicShares-000).**
   *Empfehlung: eigenes P1-Paket `master-key-provisioning`*, von beiden Feature-Paketen als
   `Abhängt von` referenziert — statt den Util in einem der beiden zu verstecken.
3. **Assertion-Skript Sprache: `mongosh`-JS vs. NestJS-Test.** *Empfehlung: standalone
   `mongosh`-Skript unter `scripts/migrations/`* — läuft remote gegen die crabbox-Mongo ohne
   App-Boot, und die 2.0.200-Baseline (bereits auf Terminalwerten) doppelt als sofort grüner
   Selbsttest der dokumentierten Ziel-`schemaVersion`.

## Risiken & Rollback

- **Analyse-Risiko:** Zähl-/Anker-Fehler propagieren in Owner-Pakete. Mitigation: jede
  Inventar-Zeile trägt einen `main.js`-Anker; Verify-Assertionen greppen gegen genau diesen Anker.
- **Grep-Pitfall (Ursache des „32"-Fehlers):** camelCase-Namen. `fingerprint.sh`-Anker muss
  `[A-Za-z0-9-]+` **plus** die `const name = '…'`-Form matchen (T7).
- **Rollback (dieses Paket):** reine Doku/Skript-Dateien → `git revert`, kein DB-Impact.
- **Rollback (Upgrade-Kontext, für Owner-Pakete):** Migrationen sind forward-only (kein `down()`,
  erhöhter `schemaVersion` bricht Downgrade) → Rollback = `mongodump` **+ `./data/master.key`** +
  vorheriger Image-Tag.

## Doku-Impact (Augenmaß)

Intern/dev-facing: neue Referenz-Docs unter `docs/migrations/`. **Keine** nach-außen-sichtbare
Feature-/API-/Env-Änderung → kein `README`/`CHANGELOG`-Eintrag nötig. Kein user-facing i18n.

## i18n-Impact (DE+EN)

**Keine** — kein UI-Text, keine Übersetzungs-Keys. (Interne Migrations-Referenz-Doku wird auf
Deutsch geführt, Bezeichner original.)

## Offene Fragen

1. **Verzeichnis der Inventar-Doku:** `docs/migrations/` (neu) — konsistent mit
   `docs/features/`? *Empfehlung: `docs/migrations/`.* [Entscheidung am Gate]
2. **Echter 1.6.266-DB-Dump für den Upgrade-Test:** dieses Paket **draftet** nur Runbook +
   Assertion-Skript; die reale Ausführung (P1, „echte 1.6-DB → eigenes Image") **braucht einen
   produktions-/staging-nahen 1.6-Dump**. Existiert einer, oder muss eine 1.6-Instanz zum Seeden
   aufgesetzt werden? **Blocker für die P1-Ausführung, nicht für dieses Analyse-Paket.**
3. **Lazy vs. eager Portierung** (Trade-off 1) — Bestätigung des lazy/ko-lokalisierten Ansatzes
   am Gate, da er die Struktur aller nachfolgenden Feature-Ledger prägt.
4. **`master-key-provisioning` als eigenes P1-Paket** (Trade-off 2) — bestätigen, damit users-000
   und publicShares-000 eine gemeinsame `Abhängt-von`-Kante bekommen.
5. **Keycloak-Realm-Skripte**: hier nur abgegrenzt; gehören sie ins Realm-Template-Diff-P0-Paket
   (Plan §7 „Realm-Export-Diff") statt ins Migrations-Inventar? *Empfehlung: dort, hier nur Verweis.*
