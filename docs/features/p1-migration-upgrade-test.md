# p1-migration-upgrade-test — Migrations-Upgrade-Test (echte 1.6-DB → eigenes Image)

> Kalibrierung: P1 — voll ausführbares Verify-Paket (nächste Wochen). Konkrete Tasks, kein
> Feature-Code. **Ehrliche Einordnung:** Dieses Paket baut und fährt die **Upgrade-Test-Harness**;
> es portiert **keine** Migration. Am P1-Stand ist der Migrations-Delta gegenüber 1.6 (near-)leer,
> weil die Delta-Migrationen (010/011/012, `users`-wrap, `publicShares`-acl …) **lazy, ko-lokalisiert
> mit ihrem Feature-Paket** portiert werden (Owner-Map `p0-migrations-inventory`). Der P1-Lauf
> validiert daher primär **die Harness selbst** + **Boot mit echten Bestandsdaten** (nicht nur
> Fresh-Install) + **Idempotenz** + **`master.key`-Backup-Kopplung**. Der eigentliche Nutzen ist,
> dass diese Harness zum **wiederkehrenden Phase-Exit-Gate** wird und Migrations-Regressionen
> abfängt, sobald in P2–P4 die Delta-Migrationen landen.

## Problem / Motivation

Der Fork basiert auf **1.6.266**. Die 2.0-API fährt beim Start Schema-Migrationen über
`MigrationService.runMigrations(model, list)` in `onModuleInit` (`main.js:2676`). Diese migrieren
**bestehende** Daten (per-Dokument-Feld `schemaVersion`). Wer von 1.6 forkt und nur additiv Module
hinzufügt, hat den **Upgrade-Pfad einer echten 1.6-DB auf den 2.0-Datenstand** nie ausgeführt —
Fresh-Install allein beweist ihn **nicht** (Fresh startet ohne Bestandsdokumente; jede
`execute()`-Filtermenge ist leer → No-Op). Migrations-Bugs (Straggler-Dokumente auf niedrigem
`schemaVersion`, Mongoose-`strict`-Reject alter Felder, Index-Konflikte, gebrochene
`master.key`-Kopplung) zeigen sich **nur** gegen reale Bestandsdaten.

Der Master-Plan (`PLAN-openedulution-fork.md`) verankert das doppelt:
- §6 Zeile 308: „vor jedem crabbox-Upgrade `mongodump` **+ `./data/master.key`** sichern; dann echte
  **1.6-DB → eigenes Image** hochfahren und die 2.0-Migrationen laufen lassen — **nicht nur
  Fresh-Install**. Als **Exit-Kriterium je Phase**."
- §8 Zeile 362 (P1): „**Migrations-Upgrade-Test 1.6-DB → eigenes Image**; … **Upgrade-Pfad grün**"
  als P1-Exit.
- §3.3 Zeile 166: Migrationen sind **forward-only** (kein `down()`); Rollback = DB-Dump **+
  `master.key`** + vorheriger Image-Tag.

`p0-migrations-inventory` hat das vollständige Inventar, die Owner-Map, die Ziel-`schemaVersion`
pro Modell und einen **gedrafteten** Runbook + Assertion-Skript geliefert; seine **Offene Frage 2**
lautet explizit: „Die reale Ausführung (P1, echte 1.6-DB → eigenes Image) **braucht einen
produktions-/staging-nahen 1.6-Dump**. Existiert einer, oder muss eine 1.6-Instanz zum Seeden
aufgesetzt werden? **Blocker für die P1-Ausführung.**" Genau diesen Blocker löst dieses Paket
(reproduzierbarer Seed) und führt den Test zum ersten Mal aus.

## Ziel & Nicht-Ziele (YAGNI)

**Ziel**
1. **Reproduzierbare 1.6-DB-Fixture** (mongodump-Archiv **+ passender `./data/master.key`** als
   untrennbares Paar) erzeugen — Auflösung von `p0`-OF2 ohne Abhängigkeit von Kevins Produktivdaten.
2. **`deploy.sh` um einen Seed-Restore-Modus** erweitern: infra zuerst, `mongorestore` der 1.6-Daten
   + `master.key` ins `data`-Bind-Mount **vor** dem api-Boot, damit die `onModuleInit`-Migrationen
   gegen **echte Bestandsdaten** laufen (nicht Fresh-Install).
3. **Wiederverwendbarer Upgrade-Test-Orchestrator** (`scripts/crabbox/upgrade-test.sh`), der die
   drei Assertionen fährt: (a) Boot ohne Migrations-Error, (b) **uniforme Terminal-`schemaVersion`
   pro Collection** (keine Straggler), (c) **Idempotenz** (zweiter Boot = No-Op).
4. **`master.key`-Kopplungs-Check**: Fixture-Key reist mit dem Dump; api regeneriert **keinen** Key
   (`getMasterKey` `main.js:9214`); gewrappte Keys bleiben lesbar (voll wirksam, sobald die
   `users`-wrap-Migration portiert ist).
5. **Ein-Befehl-Phase-Gate** verdrahten: `iter.sh upgrade`.
6. **Ausführungs-Runbook** + P1-Exit-Checkliste in `docs/migrations/upgrade-1.6-to-2.0.md`
   ergänzen (Guardrail: `mongodump` + `master.key` **gemeinsam** sichern).

**Nicht-Ziele (bewusst raus)**
- **Keine Portierung** irgendeiner Delta-Migration (010/011/012, `users`-wrap, `publicShares`-acl,
  `globalSettings`-007, survey-accessGroups …) — die reisen mit ihrem Feature-Paket (Owner-Map
  `p0-migrations-inventory`). Dieses Paket verifiziert nur.
- **Kein Nachbau** des `assert-schema-versions`-Skripts von Grund auf — es wird von
  `p0-migrations-inventory` (T5) gedraftet; hier nur konsumiert / um einen phase-agnostischen
  Modus ergänzt (T4).
- **Kein `master_key_util`-Nachbau** und **kein `MASTER_ENCRYPT_KEY`-Provisioning** — eigenes
  P1-Paket `master-key-provisioning`; hier nur als Verify-Konsument.
- **Keine Fresh-Install-`defaultAppConfig`-Fidelity-Prüfung** (`main.js:2380–2468`) — eigenes
  P0-Paket (`defaultAppConfig`-Diff). Hier nur als angrenzendes Exit-Kriterium referenziert, nicht
  besessen.
- **Keine** `down()`/Rollback-Migrationen (2.0 ist forward-only).
- **Kein** produktions-echter Kundendump als committetes Fixture (Secret/PII) — Fixture bleibt
  reproduzierbar-synthetisch **oder** ephemer auf der Box; `master.key` wird **nie** committet.

## Betroffene Komponenten & Dateien (konkrete Pfade)

**Neu (dieses Paket schreibt):**
- `scripts/crabbox/seed-1.6-db.sh` — erzeugt das 1.6-DB-Fixture-Paar (T1). SPDX AGPL.
- `scripts/crabbox/upgrade-test.sh` — Orchestrator + Assertionen (T3–T6). SPDX AGPL.

**Erweitert:**
- `scripts/crabbox/deploy.sh` — Seed-Restore-Modus via Env `SEED_DUMP`/`SEED_MASTERKEY` (T2).
  *Herkunft:* das Voll-Stack-Deploy-Skript der `/test`-Harness (aktuell in `scratchpad/edudeploy/`
  parametrisiert, wird beim crabbox-Verify-Setup nach `scripts/crabbox/deploy.sh` committet, s.
  `/test`-Skill Z18–20). Existiert es zum Build-Zeitpunkt noch nicht im Repo, landet T2 es mit.
- `scripts/crabbox/iter.sh` — neues Ziel `upgrade)` (T7).
- `scripts/migrations/assert-schema-versions.*` — aus `p0-migrations-inventory` (T5 dort); hier ggf.
  um phase-agnostischen **Uniform-Modus** ergänzt (T4).
- `docs/migrations/upgrade-1.6-to-2.0.md` — aus `p0`; Ausführungs-Runbook + P1-Exit-Checkliste
  ergänzen (T8).
- `.gitignore` — Fixture-Output-Verzeichnis + `master.key` ausschließen (T1).

**Fixture-Output (nicht committen):**
- `scratchpad/upgrade-fixtures/1.6.266/{dump.archive,master.key}` — box-lokal/scratchpad, gitignored.

**Referenz (nur gelesen, Soll-Quelle):**
- `scratchpad/api-img/opt/edulution/api/main.js` — Anker s. u.
- `docs/features/p0-migrations-inventory.md` + `docs/migrations/2.0-migrations-inventory.md` (p0).
- `apps/api/src/migration/migration.service.ts` + `migration.type.ts` (Engine, identisch 1.6↔2.0).
- `.crabbox.yaml`, `scripts/crabbox/{warm,iter,reap}.sh`, `/test`-Skill.

## Quelle des Solls

- **Migrations-Engine:** `MigrationService.runMigrations` `main.js:2676` (`= apps/api/src/migration/
  migration.service.ts`, verifiziert identisch). Log-Strings, gegen die die Boot-Assertion greppt:
  `Executing ${model.modelName}: ${N} migrations` und `Migration "${name}" completed`
  (`main.js:2678/2681`). Pro-Dokument-Feld `schemaVersion` (`apps/api/src/appconfig/migrations/
  migration000.ts`: `name '000-add-db-version-number', version 1, newSchemaVersion 1`).
- **11 `runMigrations`-Aufruf-Stellen (2.0):** appConfig `1601` · webdavShares `4938` ·
  globalSettings `5499` · users `7801` · notifications `20680` · publicShares `38245` · surveys
  `44391` · surveyTemplates `46418` · surveyAnswers `47807` · bulletinCategory `51355` · bulletins
  `52464`. **Am P1-Stand verdrahtet: nur die 1.6-Menge** (8 Modelle — appConfig, webdavShares,
  globalSettings, surveys, surveyTemplates, surveyAnswers, bulletinCategory, bulletins; `users`/
  `notifications`/`publicShares` erst mit ihrem Feature-Paket, s. `grep runMigrations apps/api/src`).
- **`master.key`-Kopplung:** `getMasterKey` `main.js:9214–9235` (Auto-Gen-Log „No master key found.
  Generated new master key…" ohne Env **und** ohne `./data/master.key`); `unwrapEncryptKey`
  `main.js:7950`; Wrap-Migration `000-wrap-encrypt-keys-with-master-key` `main.js:9312`.
- **Terminal-`schemaVersion`-Tabelle (2.0-final):** `docs/migrations/2.0-migrations-inventory.md`
  (p0) — Sekundär-Check, tightet sich pro Phase.
- **Voll-Stack-Deploy-Rezept:** `/test`-Skill (Ablauf 1–7) + `scripts/crabbox/deploy.sh`.
- **Kein Rescue-Branch relevant** (Infra/Verify, kein gerettetes Feature).
- **Baseline:** `scratchpad/real/*` (Dashboard-Screenshot nach erfolgreichem Login = Beweis, dass
  der Stack mit den migrierten Bestandsdaten funktionsfähig hochkam).

## Datenmodell / API / Migrationen

- **DB-Migration: NEIN** — dieses Paket schreibt/ändert **keine** Migration. Es **führt** die
  bestehenden aus und prüft ihr Ergebnis.
- **Contract-Drift: keiner.** Kein neues DTO, keine Route, kein appconfig-Shape, kein Schema, kein
  Keycloak-Realm, kein ghcr-Ref geändert. Reine Verify-Tooling + Doku.
- **Assertions-Invarianten (phase-agnostisch, DB-only):**
  1. **Uniformität:** In jeder migrierten Collection tragen **alle** Dokumente dieselbe (maximale)
     `schemaVersion` — keine Straggler unterhalb des Top-Werts. Das ist die eigentliche
     Upgrade-Aussage („jedes Bestandsdokument wurde hochmigriert") und in **jeder** Phase gültig.
  2. **Idempotenz:** Zweiter api-Boot → `execute()`-Filtermengen leer → 0 modifizierte Dokumente,
     Uniform-Terminal unverändert.
  3. **Boot-Sauberkeit:** kein Error/Exception/UnhandledRejection im api-Migrations-Boot-Log; api
     erreicht „Nest application successfully started".
- **Sekundär-Check (tightet pro Phase):** exakter Abgleich der Uniform-Terminal-Werte gegen die
  2.0-final-Tabelle des `p0`-Inventars — nur für Modelle, deren voller Delta bereits gelandet ist.
  Am P1-Stand liegen appConfig auf `10`, globalSettings auf `8`, surveyTemplates/surveyAnswers auf
  `4`, übrige auf ihrem 1.6-Terminal (s. `p0`-Inventar-Tabelle „Delta ggü. 1.6").

## Auth / Guards (welche mit-portieren)

- **Keine Route, kein Guard** in diesem Paket. `runMigrations` läuft in `onModuleInit`
  **ungeschützt vor jeder Auth** beim Boot (das ist so gewollt und Bestandsverhalten) — hier nur
  beobachtet, nichts neu exponiert.
- **Verify-nahe Auth-Berührung:** Die Playwright-Login-Verifikation (`shots.py`) authentifiziert
  über das edulution-eigene Login gegen den echten LMN — der `AuthGuard` verifiziert das JWT gegen
  `./data/edulution.pem` (`main.js:55805`). Das ist Bestandsverhalten der `/test`-Harness, kein
  neuer Guard.

## Externe Integrationen

- **Voll-Stack gegen echten LMN** (das ist der Kern dieses Verify-Pakets): MongoDB 7, Redis,
  Keycloak, Traefik, edu-api, edu-ui, gebunden an `LMN_HOST` (LDAP :389/:636 +
  `linuxmuster-api7` :8001 + WebDAV :443). Rezept = `/test`-Skill Ablauf 1–7.
- **1.6-Seed-Image:** zum Erzeugen der Fixture wird **einmalig, throwaway** ein echtes 1.6.266-Image
  fresh hochgezogen (`ghcr.io/edulution-io/edulution-api:1.6.266` — read-only Pull — **oder** das
  Fork-Basis-Image aus Tag `fork-base/v1.6.266`, s. OF1).
- **Keine** Mailcow/Collabora/WOPI-Berührung.

## Secrets / Env / master.key

- **`master.key` ist backup-/rollback-gekoppelt** (Plan §2.6/§3.3/§5.6-DR; `p0`-Inventar §Secrets):
  Die Fixture ist ein **untrennbares Paar** `dump.archive` **+** `master.key`. Ein Restore **ohne**
  den passenden Key macht — sobald die `users`-wrap-Migration portiert ist — alle gewrappten
  `user.encryptKey`/Passwörter **unlesbar**. Der Seed-Restore-Modus (T2) kopiert den Key **immer
  gemeinsam** mit dem Dump ins `data`-Mount; das Runbook (T8) schreibt „nie einzeln sichern" vor.
- **`master.key` wird NIE committet** — gitignored, box-lokal/scratchpad. Auch ein synthetisch
  geseedeter Key bleibt Secret (er verschlüsselt Test-Passwörter).
- **Neue Env-Vars (nur Deploy-/Test-seitig, keine App-Env):** `SEED_DUMP` (Pfad zum Dump-Archiv),
  `SEED_MASTERKEY` (Pfad zur `master.key`) — steuern `deploy.sh`; leer/ungesetzt = unverändertes
  Fresh-Install-Verhalten.
- **Kein** `MASTER_ENCRYPT_KEY`-Provisioning hier (P1-Paket `master-key-provisioning`).

## Trade-offs & Alternativen (mit Empfehlung)

1. **Fixture-Quelle: reproduzierbarer synthetischer Seed vs. echter Produktivdump.**
   *Empfehlung: reproduzierbarer synthetischer Seed (T1) als Default*, echter Dump als optionaler
   Drop-in. Der synthetische Seed (1.6.266-Image fresh hochziehen, minimal repräsentative Daten in
   jede migrierte Collection legen, `mongodump` + `master.key`) ist **CI-tauglich, ohne PII,
   jederzeit reproduzierbar** und deckt jede migrierte Collection. Ein echter Produktivdump ist
   realistischer (Randfälle, Volumen), aber PII-behaftet, nicht committbar und evtl. nicht
   verfügbar (`p0`-OF2). Die Harness akzeptiert **beide** über `SEED_DUMP`.
2. **Assertion-Modus: phase-agnostische Uniformität vs. 2.0-final-Exaktzahlen.**
   *Empfehlung: Uniformität als Gate*, Exaktzahl als tightening Sekundär-Check. Die
   2.0-final-Zahlen (appConfig=13 …) gelten erst, wenn **alle** Delta-Migrationen portiert sind;
   als hartes Gate würde die Harness an **jedem** Phasen-Exext vor P5 fälschlich rot. Uniformität
   („kein Straggler-Dokument") ist die korrekte, in jeder Phase gültige Upgrade-Aussage. `p0`s
   `assert-schema-versions` behält die 2.0-final-Zahlen als **Baseline-Selbsttest** (grün gegen die
   2.0.200-Baseline); mein Uniform-Modus ist das **Phase-Gate**.
3. **Restore-Injektionspunkt: phased bring-up vs. Init-Container/Mongo-Seed-Mount.**
   *Empfehlung: phased bring-up in `deploy.sh`* (infra hoch → `mongorestore` → `master.key` ins
   Mount → dann api/ui). Nutzt die vorhandene Compose-`depends_on: service_healthy`-Kette, minimal
   invasiv, keine Compose-Datei-Änderung. Ein Mongo-`/docker-entrypoint-initdb.d`-Mount liefe nur
   bei **leerem** Datenverzeichnis und kollidiert mit dem Root-User-Init (Plan/`/test`-Stolperstein
   „Mongo unhealthy nach up").
4. **Gate-Verdrahtung: eigenes `iter.sh`-Ziel vs. in `deploy` einklinken.**
   *Empfehlung: eigenes Ziel `iter.sh upgrade`* (T7) — hält Fresh-Install-Deploy (`iter.sh deploy`)
   und Upgrade-Test klar getrennt; beide sind valide, aber unterschiedliche Exit-Kriterien.

## Risiken & Rollback

- **R — Harness beweist am P1-Stand wenig (leerer Delta).** Ehrlich so: der P1-Wert liegt in
  Boot-mit-Bestandsdaten + Idempotenz + `master.key`-Disziplin + der **wiederverwendbaren Harness**.
  Mitigation: als **wiederkehrendes Phase-Gate** dokumentieren (T8); jede spätere Delta-Migration
  re-verifiziert die volle 1.6→aktuell-Kette.
- **R — Assertion gegen 2.0-final-Zahlen ist am P1-Stand rot.** Mitigation: Uniform-Modus als Gate
  (Trade-off 2), Exaktzahl-Check phasen-getightet.
- **R — `master.key`-Leak.** Ein Seed-Key verschlüsselt Test-Passwörter → nie committen.
  Mitigation: `.gitignore` (T1) + gitleaks-Gate (P1) + scratchpad-only.
- **R — `deploy.sh` existiert noch nicht im Repo.** Kommt aus der `/test`-Harness; falls zum
  Build-Zeitpunkt nur in `scratchpad/edudeploy/`, landet T2 es mit ins Repo (Fresh-Verhalten
  unverändert, Seed-Modus additiv).
- **R — `mongorestore`-Version-Mismatch** (1.6-Dump-Format ↔ Mongo 7 der Ziel-Compose). Mitigation:
  gleiche Mongo-Major (7) im Seed- und Ziel-Stack; `mongodump --archive` (versionsrobust) statt BSON-Verzeichnis.
- **Rollback (dieses Paket):** reine Skript-/Doku-Dateien → `git revert`, **kein DB-Impact, kein**
  Migrations-Impact. Der Upgrade-**Test** selbst läuft auf einer ephemeren, reapbaren crabbox
  (Vorher: `mongodump` + `master.key` sichern ist Teil des Runbooks für den realen Kontext, nicht
  für die throwaway-Box).

## Doku-Impact (Augenmaß)

- **`docs/migrations/upgrade-1.6-to-2.0.md`** (aus `p0`, erweitert): Ausführungs-Runbook-Abschnitt
  (Fixture erzeugen → `iter.sh upgrade` → Assertionen), P1-Exit-Checkliste, Guardrail „`mongodump`
  + `master.key` gemeinsam sichern", „Harness ist wiederkehrendes Phase-Gate". **Intern/dev-facing,
  Deutsch.**
- **Kein** `README`/`CHANGELOG`-Eintrag (keine nach-außen-sichtbare Feature-/API-/Env-Änderung; die
  neuen Env-Vars sind test-/deploy-intern).
- Reine Skript-Wiring-Tasks: intern, keine Doku.

## i18n-Impact (DE+EN)

**Keine** — kein UI-Text, keine Übersetzungs-Keys. (Interne Runbook-/Skript-Doku auf Deutsch,
Bezeichner original.)

## Offene Fragen

1. **OF1 — Seed-Image-Quelle: `ghcr.io/edulution-io/edulution-api:1.6.266` (authentisches Upstream-
   1.6, read-only Pull) vs. eigenes Fork-Basis-Image (`fork-base/v1.6.266`).** *Empfehlung:
   Upstream-1.6.266-Image für die authentischste 1.6-DB-Form* (unberührt von Fork-Änderungen); das
   Fork-Basis-Image ist funktional identisch, aber am P1-Stand evtl. noch nicht publiziert. [Gate]
2. **OF2 (aus `p0`-OF2) — Echter produktions-/staging-naher 1.6-Dump verfügbar?** Falls ja, als
   optionaler Drop-in gegen `SEED_DUMP` fahren (zusätzlich zum synthetischen Seed). Falls nein,
   bleibt der synthetische Seed die alleinige Quelle. **Kein Blocker mehr** (T1 löst ihn
   reproduzierbar), aber Kevin-Input erwünscht. [Gate]
3. **OF3 — Assertion-Modus** (Trade-off 2): Uniform-Gate + phasen-getighteter Exaktzahl-Check
   bestätigen? Prägt, ob `p0`s `assert-schema-versions` einen `--uniform`/`--from-baseline`-Flag
   bekommt. [Gate]
4. **OF4 — Repräsentativer Seed-Datenumfang.** Minimal = je 1 Dokument pro migrierter Collection
   (appConfig-Set, 1 user, 1 bulletin+category, 1 survey+template+answer, 1 webdavShare,
   globalSettings). Reicht das als Straggler-/Uniform-Nachweis, oder Mehr-Dokument-Varianz je
   Collection (mind. 1 Doc **ohne** `schemaVersion`-Feld, um `previousSchemaVersion=undefined`-Pfade
   zu treffen)? *Empfehlung: je Collection mind. 1 Doc mit und 1 ohne `schemaVersion`*, um beide
   Filterpfade zu decken. [Gate]
5. **OF5 — `defaultAppConfig`-Fresh-Install-Fidelity** (Plan §6 Z308, `main.js:2380–2468`): gehört
   dieses **zweite** Exit-Kriterium mit in diese Harness oder bleibt es im eigenen
   P0-`defaultAppConfig`-Diff-Paket? *Empfehlung: eigenes Paket; hier nur referenziert.* [Gate]
