<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# P0 — Basis-Drift-Analyse (32 Bestandsklassen, libs/, appconfig, SSE, Guards)

> **Kalibrierung:** Dies ist ein **P0-Analyse-Arbeitspaket** — **Investigations-Tasks, kein
> Produktivcode.** Ergebnis ist ein **Drift-Report** unter `docs/analysis/` plus die
> **Fixierung der Aufwände** der Modul-Pakete (P2–P5). Jede Task ist ein Vergleich zweier
> Stände (1.6.266-Source ↔ 2.0.200-`main.js`) mit konkretem, wiederholbarem Verify
> (**„Diff erzeugt / dokumentiert"**), **nicht** ein crabbox-Runtime-Test. Die
> crabbox-Zeilen im Ledger-Kopf sind die Standard-Vorlage und laufen hier faktisch leer;
> der reale Verify jeder Task ist ein `grep`/`diff` gegen `scratchpad/api-img/.../main.js`
> und die Repo-Source.

## Problem / Motivation

Die zentrale Fork-Prämisse „der 1.6→2.0-Sprung ist **rein additiv**" ist bislang nur auf
**Modul-Ebene** belegt (32 Modul-Verzeichnisse → 38, nichts entfernt) — siehe
`PLAN-openedulution-fork.md` §3.0. **Nicht** belegt ist, dass die **32 Bestandsmodule**,
die **29 Bestands-Controller**, die **Services**, die geteilten **`libs/`-Strukturen**, die
**`appconfig`-Shapes**, der **SSE-Contract** und die **Guards/RBAC** über den Major-Bump
unverändert sind. Ein Major-Refactor fasst fast immer Bestandscode an; jedes neu
nachzubauende Modul referenziert genau diese Shared-Strukturen → **Integrationsreibung auf
jedem Modul** (Risiko **R2**, §9). Der Master-Plan verhängt deshalb pauschal **+20–30 %
Puffer** auf alle Backend-Schätzungen — **als Annahme, nicht als Messung**.

Erste Stichproben-Messung (bereits im Rahmen dieser Planung, siehe „Quelle des Solls") **belegt
messbaren Drift** und widerlegt „unverändert":

| Fingerprint | 1.6.266-Source | 2.0.200-`main.js` | Delta |
|---|---|---|---|
| `class …Module` | 32 | 38 | **+6** (bekannt: neue Module) |
| `class …Controller` | 29 | 39 | **+10** |
| `SchemaFactory.createForClass` | 29 | 39 | **+10** |
| `class …Guard` | 7 | **9** | **+2** (MailRequestSizeGuard, ThrottleGuard) |
| `class …Gateway` | 1 | 2 | **+1** (SatellitesGateway) |
| `new Queue(` | 4 | 11 | **+7** |
| `sseMessageType`-Vorkommen | wenige (nur `sse`-Domäne) | **68** | breit gestreut über Module |

Die Guard- und Queue-Deltas beweisen: der Bump ist **nicht** additiv-nur-auf-Modulebene.
Zwei neue Guards (`ThrottleGuard`, `MailRequestSizeGuard`) und 68 `sseMessageType`-Nutzungen
zeigen, dass **Cross-Cutting-Schichten** (Auth, SSE, Queues) angefasst wurden — genau die,
auf denen jedes neue Modul aufsetzt. **Ohne diese Analyse sind alle P2–P5-Aufwände geraten.**

## Ziel & Nicht-Ziele (YAGNI)

**Ziel:**
1. Den Drift jeder Cross-Cutting-/Bestands-Schicht **messen** (grep beide Stände, diff) und in
   einem Report `docs/analysis/base-drift-2.0.200.md` festhalten — mit konkreten Zahlen und
   Zeilen-Ankern, nicht mit Annahmen.
2. Die **These „additiv"** je Schicht mit **bestätigt / gedriftet / gebrochen** bewerten.
3. Den **+20–30 %-Basis-Drift-Puffer** je Modul-Paket (P2–P5) **bestätigen oder verfeinern** →
   die Aufwände der Module-Pakete **fixieren** (Rückwirkung in §3.2/§8 des Master-Plans).
4. Nebeneffekt für P1b: die **verifizierten Fingerprint-Anker** (inkl. der, die im gebundelten
   `main.js` eine **abweichende Form** haben — z. B. `@Cron(` → 0 Treffer) für die
   Tracking-Pipeline dokumentieren.

**Nicht-Ziele (bewusst raus):**
- **Kein Produktivcode**, kein Modul-Nachbau, keine Migration, keine Route. Nur Report.
- **Migrations-Parität / Migrations-Inventar** (12 `runMigrations`, 32 Namen) — **eigenes
  P0-Arbeitspaket** (§3.3), *nicht* hier. **Ausnahme:** der `defaultAppConfig`-Seed-Diff ist per
  §3.0 explizit der Basis-Drift zugeordnet (Fresh-Install-Fidelity) → **eine** Task hier.
- **Lieferketten-Inventar, Realm-Export-Diff, Env-/Secret-Inventar, DSGVO/PII, DR-Runbook** —
  jeweils eigene P0-Pakete, nicht hier.
- **Vollständiger Service-Handler-Byte-Diff** — die Handler-Logik ist die teure, gegen echten
  LMN/Mongo zu verifizierende Arbeit; hier nur **Signal-Ebene** (Methoden-/Signatur-Anzahl,
  DTO-/Endpoint-Referenzen), keine zeilenweise Semantik-Analyse.
- **Pixel-/Verhaltens-Diff des Frontends** — das 2.0-Bundle ist minifiziert (keine
  Quell-Namen); FE-App-Shell-Drift wird nur **signal-/live-referenzbasiert** angerissen (§4.1),
  nicht grep-both-source gemessen.

## Betroffene Komponenten & Dateien

Analyse liest — **schreibt nur** den Report + (optional) ein Helper-Skript:

**1.6-Source (Ist-Fork-Stand):**
- `apps/api/src/**` — 32 Module, 29 Controller, 41 Service-Klassen, SSE-Modul (`apps/api/src/sse/`).
- `libs/src/**` — geteilte Domänen (37 Verzeichnisse), u. a. `libs/src/sse/`,
  `libs/src/appconfig/`, `libs/src/common/`, `libs/src/auth/`.
- `libs/src/appconfig/constants/**` — `appConfigOptionKeys.ts`, `extendedOptionKeys.ts`,
  `extendedOptions/*` (15 Dateien), `appConfigSectionsKeys.ts`, `appConfigPaths.ts`,
  `appDisplayLocations.ts`, `appIntegrationVariant.ts`, `defaultAppConfig.ts`,
  `eventEmitterEvents.ts`.
- Guards: `apps/api/src/**/*guard*.ts` (AccessGuard, AdminGuard, AuthGuard,
  DynamicAppAccessGuard, IsPublicAppGuard, LocalhostGuard, WebhookGuard).

**Report-Deliverable (neu, wird geschrieben):**
- `docs/analysis/base-drift-2.0.200.md` — der aggregierte Drift-Report (DE, intern).
- (optional) `scripts/drift/anchors.sh` — nur falls die Greps DRY-fähig gebündelt werden;
  siehe Offene Frage 1.

## Quelle des Solls

- **`scratchpad/api-img/opt/edulution/api/main.js`** (73.240 Zeilen, un-minifiziert,
  Originalnamen) — **primäre 2.0.200-Soll-Quelle**. Verifizierte Zeilen-Anker aus dieser Planung:
  - Guards: `AdminGuard`@11219 · `MailRequestSizeGuard`@32604 · `DynamicAppAccessGuard`@56393 ·
    `IsPublicAppGuard`@56551 · `LocalhostGuard`@56883 · `AccessGuard`@59854 · `AuthGuard`@59956 ·
    `WebhookGuard`@63161 · `ThrottleGuard`@64484.
  - SSE: `SseService`@10661 · `SseController`@55022 · `sseMessageType` breit (10656/10702/10735/
    10752/1546/1581/19300/19351/…, 68 Vorkommen).
  - Gateways: `TLDrawSyncGateway`@55581 · `SatellitesGateway`@65115.
  - `defaultAppConfig`-Seed: `initializeCollection`@2335, Array `main.js:2380–2468`.
  - appConfig-Migrationsnamen `010/011/012`@3992/4046/4119 (nur als Kontext; Inventar = §3.3).
- **1.6.266-Source im Repo** (`apps/api/src`, `libs/src`) — der **andere** Diff-Stand.
- **Fingerprint-Methode** = `PLAN-openedulution-fork.md` §7c (verifizierte Anker) + §3.0.
- **Rescue-Branches** `origin/upstream/*`: hier nur als **Quer-Beleg** relevant (z. B. bestätigt
  `SatellitesGateway`/Chat-SSE-Nutzung), nicht als Primärquelle dieser Analyse.

## Datenmodell / API / Migrationen

**Keine.** Analyse-Paket — es entstehen **keine** neuen Routen, DTOs, Mongoose-Schemas oder
Migrationen. Die Analyse **misst** Contract-Drift (Schema-Felder, DTO-Basisklassen,
Endpoint-Konstanten, appconfig-Shapes), **erzeugt** aber keinen. Der einzige Schreibvorgang ist
Markdown unter `docs/analysis/`. `schemaVersion` wird **nicht** angefasst.

## Auth / Guards

**Keine neuen Guards** (Analyse). Aber Guards sind ein **zentraler Analyse-Gegenstand**: Task T9
difft die 7 Bestands-Guards 1.6↔2.0 und inventarisiert die 2 neuen (`ThrottleGuard`,
`MailRequestSizeGuard`). Relevanz: die Bestands-Guards schützen sowohl bestehende als auch die
neu nachzubauenden Routen — eine unbemerkte Verhaltensänderung (z. B. anderes `canActivate`,
neue `@Public`-Semantik) ist ein **Auth-Bypass-Risiko** beim späteren Nachbau (§3.2). Dieses
Paket **findet** solche Drifts, es portiert nichts.

## Externe Integrationen

**Keine.** Rein statische Analyse gegen zwei lokale Quellen (Repo-Source + `scratchpad/main.js`).
Kein LMN-API7, kein Keycloak, kein WebDAV, keine crabbox-Runtime nötig.

## Secrets / Env / master.key

**Keine.** Keine neuen Env-Vars, kein Keycloak-Client-Secret, keine Berührung von
`MASTER_ENCRYPT_KEY`/`./data/master.key`. Das Env-/Secret-Inventar ist ein **separates**
P0-Paket. `scratchpad/` bleibt außerhalb des Repos (kein Secret-Leak).

## Trade-offs & Alternativen

- **Granularität pro Controller/Service vs. pro Schicht.** Ein Task-je-Bestands-Controller wären
  29 Tasks — zu fein, hoher Overhead. **Empfehlung (gewählt):** **eine Task pro Cross-Cutting-
  Schicht** (Module, Controller-Routen, Services, DTO/Schema, libs, appconfig, defaultAppConfig,
  SSE, Guards, Gateway/Queue/Cron) + eine Synthese-Task. Jede Task erzeugt intern eine
  **Tabelle pro Bestands-Klasse**, sodass Granularität im Report, nicht in der Task-Liste liegt.
- **Grep-Harness jetzt vs. in P1b.** Ein wiederverwendbares `fingerprint.sh` entsteht ohnehin in
  P1b (§7). **Empfehlung:** hier die Greps **inline** in den Task-Verifies halten (throwaway,
  YAGNI); die verifizierten Anker (inkl. Formabweichungen) als Report-Anhang an P1b übergeben.
  Siehe Offene Frage 1.
- **Signal- vs. Semantik-Tiefe bei Services.** Voller Handler-Diff wäre teuer und ist bis zum
  Modul-Nachbau ohnehin nötig. **Empfehlung:** hier nur **Signal** (Methoden-Anzahl, geänderte
  Signaturen, neue Abhängigkeiten) — reicht, um den Puffer zu kalibrieren.

## Risiken & Rollback

- **Analyse-Risiko: Anker-Blindheit.** Fingerprint-Greps sind nur so gut wie die
  Namenskonvention. Belegt: `@Cron(` liefert im gebundelten `main.js` **0** Treffer (Form
  weicht ab), `registerAs('` ebenso — d. h. naive Anker **untertreiben** Drift. Gegenmaßnahme:
  jede Task, die 0/unerwartet-niedrig zählt, muss die **alternative Anker-Form** im `main.js`
  suchen und dokumentieren (Teil des Verify), nicht „kein Drift" schließen.
- **Fehlmessung fixiert falschen Puffer.** Zu niedrig gemessener Drift → zu knappe P2–P5-Budgets.
  Gegenmaßnahme: Synthese-Task (T12) muss je Modul-Paket **bestätigt/verfeinert** mit Zahl belegen,
  nicht pauschal „+25 %" übernehmen.
- **Rollback:** trivial — reiner Doku-Commit unter `docs/analysis/`. `git revert`. Keine DB, kein
  Image, kein Datenpfad betroffen.

## Doku-Impact (Augenmaß)

Das **Deliverable ist** die Doku: `docs/analysis/base-drift-2.0.200.md` (DE, intern). **Kein**
nach außen sichtbares Feature, **kein** API-/Env-/Port-/Config-Change → **kein** `README`/
`CHANGELOG`-Eintrag, **keine** DE+EN-Pflicht (interner Analyse-Report, nicht Anwender-Doku). Die
Rückwirkung auf `PLAN-openedulution-fork.md` §3.2/§8 (fixierte Aufwände) ist Teil der
Synthese-Task und passiert im selben oder Folge-Commit.

## i18n-Impact (DE+EN)

**Keine.** Kein Produktcode, keine UI-Strings, keine Locale-Keys. `npm run check-translations`
ist nicht betroffen.

## Offene Fragen

1. **Grep-Harness jetzt anlegen?** `scripts/drift/anchors.sh` (SPDX AGPL) als DRY-Sammlung der
   verifizierten Anker — spart Wiederholung und **seedet die P1b-`fingerprint.sh`**. *Empfehlung:*
   **nein** in diesem Paket (YAGNI/„kein Produktivcode"); Anker als Report-Anhang an P1b geben.
   Entscheidung am Gate.
2. **FE-App-Shell-Drift-Tiefe.** §4.1 ordnet Routing/`NativeAppPageManager`/Store-**Struktur**-
   Drift der §3.0-Analyse zu, aber das 2.0-Bundle ist minifiziert → nur String-Signal +
   Live-Referenz. *Empfehlung:* **eine** leichte Signal-Task (T11) mit ehrlichem Methoden-Vorbehalt;
   die tiefe FE-Struktur-Bewertung erst im FE-Rekonstruktions-Plan je Seite. Reicht das für die
   Aufwands-Fixierung, oder braucht P0 einen laufenden crabbox-2.0.200 als Live-Referenz?
3. **Report-Ablage.** `docs/analysis/` (gewählt) vs. `docs/features/`. *Empfehlung:* `docs/analysis/`
   — trennt Investigations-Artefakte von Feature-Specs.
4. **Puffer-Format.** Soll die Synthese den Puffer als **eine Zahl je Paket** (z. B. „Chat +15 %,
   Wiki +30 %") oder als **Drift-Ampel** (grün/gelb/rot je Schicht) ausgeben? *Empfehlung:* beides —
   Ampel je Schicht, daraus abgeleitete Prozentzahl je Modul-Paket.
