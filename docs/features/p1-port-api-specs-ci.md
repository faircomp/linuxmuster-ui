# P1 — API-Specs als CI-Green-Gate + Smoke/Contract-Tests · Spec

Slug: `p1-port-api-specs-ci` · Phase P1 · Abhängt von: `p1-own-ci-registry`
Kalibrierung: P1 = voll ausführbare, konkrete Tasks (nächste Wochen).

## Problem / Motivation
Der Fork rekonstruiert Backend-Module aus un-minifiziertem `main.js` von Hand. Bei
hand-rekonstruiertem Bundle-Code sind Unit-Tests der **Hauptschutz gegen stillen Logik-Drift**
(PLAN §6/Zeile 317). Der Bestand bringt eine gute Grundlage mit: **28 `*.spec.ts`** unter
`apps/api/src`, aber **0 Frontend-Tests** und **kein e2e** (PLAN §6). Diese 28 Specs sind
kostenlos übernehmbar, weil sie aus der 1.6.266-Fork-Basis stammen und nativ laufen — sie
müssen aber **verbindlich als Green-Gate** in die CI verdrahtet werden, sonst schützen sie nur
zufällig.

Zweite Lücke: von **29 Controllern** haben nur **15** eine `*.controller.spec.ts`; **14
Controller haben gar keinen Test** — darunter sicherheitskritische wie `docker`, `mails`,
`webhook`, `webdav-shares`. Jeder neue/rekonstruierte Controller kann heute ungetestet
mergen. Der PLAN fordert deshalb ausdrücklich: „**pro rekonstruiertem Modul Specs verlangen
inkl. Auth-Spec** (§3.2); minimalen Contract-/Smoke-Test je neuem Controller in
`build-and-test.yml` verdrahten" (PLAN §6/Zeile 317, §8-P1/Zeile 362).

Dritte Lücke (Auth-Contract, PLAN §3.2/Zeile 156, §6.8/Zeile 314): Die Autorisierung sitzt in
denselben `__decorate`-Blöcken wie die Routen. Ein vergessenes `@UseGuards(AdminGuard)` oder
ein fälschlich gesetztes `@Public()` = **Auth-Bypass**, den weder Visual-Diff noch
Route-Fingerprint fangen. Die globalen `AuthGuard` + `AccessGuard`
(`apps/api/src/app/app.module.ts:150–158`) schützen **jede** Route per Default, `@Public()`
opt-tet aus — genau diese Opt-outs müssen getestet festgeschrieben sein.

Dieses Arbeitspaket macht die 28 Specs zum verbindlichen Merge-Gate, füllt die 14
Controller-Lücken mit **minimalen Smoke/Contract-Tests** (inkl. Guard-/`@Public`-Assertions)
und installiert einen **Spec-Coverage-Guard**, der ab sofort **pro Controller einen Spec
erzwingt**.

## Ziel & Nicht-Ziele (YAGNI)
**Ziel**
- Die 28 Bestands-Specs laufen deterministisch und sind das **Green-Gate** von
  `build-and-test.yml` (eigener, benennbarer CI-Step → per Branch-Protection erzwingbar).
- **14 fehlende Controller** bekommen je einen minimalen **Smoke-Test** (Controller
  instanziierbar = DI-Wiring korrekt) **plus Contract-Assertion** (Class-/Route-Guards und
  `@Public()`-Opt-outs sind die erwarteten — Schutz gegen Auth-Bypass durch Guard-Drift).
- Ein **Spec-Coverage-Guard** (`scripts/checkSpecCoverage.ts`) failt, sobald ein
  `*.controller.ts` keine kolokierte `*.controller.spec.ts` hat — in CI **und** Pre-Commit
  verdrahtet. Damit ist „pro künftigem Modul Specs verlangen" mechanisch erzwungen.
- Ein wiederverwendbarer, jest-freier **Reflection-Helper** für die Auth-Contract-Assertions,
  damit jeder künftige Controller-Spec die Guard-Dimension billig mitschreibt.
- Doku (Test-/Spec-Policy) dokumentiert die Spec-Pflicht und die Auth-Spec-Konvention für
  künftige Module.

**Nicht-Ziel (bewusst YAGNI)**
- **Kein** vollständiger verhaltensbasierter Auth-Spec (echtes 401 ohne Token / 403 als
  Nicht-Admin über `supertest` + kompilierte App) für **alle 29 Bestands-Controller**
  nachrüsten. Das braucht einen HTTP-Harness + gemockte JWTs und ist teuer; es gehört als
  **going-forward-Pflicht ab dem P2-Chat-Piloten** an jedes neue/rekonstruierte Modul (siehe
  Offene Fragen OF1). Hier: metadaten-basierter Contract-Test (billig, fängt Guard-Drift).
- **Kein** Frontend-Test-Harness (Vitest ist verdrahtet, 0 Tests) — eigenes Paket.
- **Kein** e2e/Playwright — läuft über den `test`-Skill (crabbox), nicht über Unit-CI.
- **Keine** Coverage-Schwellen (`coverageThreshold`) jetzt — separat entscheidbar (OF3).
- **Keine** Service-Spec-Pflicht jetzt (nur ~13 von ~58 Services haben einen Spec → würde
  breit failen); erst später zuschaltbar (OF2).
- **Keine** Umstrukturierung der CI-Architektur (Jobs, `permissions:`, Release-Green-Gate,
  `defaultBase→main`) — das ist `p1-own-ci-registry` / CI-Härtungs-Paket. Hier nur die
  Test-/Spec-Steps.

## Betroffene Komponenten & Dateien (konkrete Pfade)
**Bestand (Green-Gate + Referenzmuster):**
- `.github/workflows/build-and-test.yml` (Job `test`, Zeile 154–187; heute laufen die Specs im
  Sammel-Step „Run Checks and Tests" via `npm run test`, Zeile 186).
- `package.json` (`test` Zeile 6 = `nx run-many --target=test --projects=api`; `test:api`
  Zeile 7).
- `apps/api/jest.config.ts`, `apps/api/tsconfig.spec.json`, `apps/api/project.json`.
- Muster-Specs: `apps/api/src/sse/sse.controller.spec.ts`,
  `apps/api/src/users/users.controller.spec.ts`, `apps/api/src/common/cache-manager.mock.ts`.
- Pre-Commit: `.husky/pre-commit`. Check-Script-Muster: `scripts/checkFilenames.ts`.

**Neu (Contract-Helper, 14 Smoke-Specs, Guard, Doku):**
- `apps/api/src/common/controllerContractReflection.ts` (neu, Reflection-Helper).
- 14 neue `*.controller.spec.ts` (kolokiert):
  `auth`, `bulletin-category`, `docker`, `filesharing`, `health`, `license`, `mails`,
  `metrics`, `mobileAppModule/mobileApp`, `notifications`, `user-preferences`,
  `webdav/shares/webdav-shares`, `webhook-clients`, `webhook`.
- `scripts/checkSpecCoverage.ts` (neu) + `package.json`-Script `check-spec-coverage`.
- `docs/testing/spec-policy.md` (neu, DE) — Test-/Spec-Policy.

**Controller ohne Spec (Ist-Stand, `find`-verifiziert, 14):**
`auth`, `bulletin-category`, `docker`, `filesharing`, `health`, `license`, `mails`,
`metrics`, `mobileApp`, `notifications`, `user-preferences`, `webdav-shares`,
`webhook-clients`, `webhook`. (Die restlichen 15 haben bereits einen Controller-Spec.)

## Quelle des Solls
- Kein `main.js`-Rekonstruktions-Nachbau — dies ist ein **CI-/Test-Infra-Paket auf
  Bestandscode**. Soll = PLAN + Bestand:
  - PLAN §6/Zeile 317 (Test-/CI-Strategie: 28 Specs übernehmen, Auth-Spec je Modul,
    Contract-/Smoke-Test je Controller in `build-and-test.yml`).
  - PLAN §5.1/Zeile 252 + §6/Zeile 315 (Green-Gate; Release-Gate ist Nachbar-Paket).
  - PLAN §3.2/Zeile 156 + §6.8/Zeile 314 (Auth-Contract; Guard-Klassen-Anker
    `main.js:11219` `AdminGuard`, `:56551` `IsPublicAppGuard`, `:56883` `LocalhostGuard`,
    `:59956` `AuthGuard`, `:63161` `WebhookGuard`).
  - PLAN §8-P1/Zeile 362 („28 Specs in CI").
- Guard-/Public-Realität im Fork-Code (die eigentliche Assertion-Quelle):
  `apps/api/src/app/app.module.ts:150–158` (globaler `AuthGuard`+`AccessGuard`),
  `apps/api/src/common/decorators/public.decorator.ts` (`@Public` → `PUBLIC_ROUTE_KEY`),
  `apps/api/src/health/health.controller.ts:37–38` (`@Public`+`LocalhostGuard`),
  `apps/api/src/webhook/webhook.controller.ts:32–33` (`@Public`+`WebhookGuard`),
  `apps/api/src/docker/docker.controller.ts:34/63` (Class-`AdminGuard` + eine `@Public`-Route),
  `apps/api/src/metrics/metrics.controller.ts:28` (`AdminGuard`).
- Baseline-Screenshots: **nicht relevant** (keine UI in diesem Paket).

## Datenmodell / API / Migrationen
- **Keine** DB-Migration. **Keine** neuen Routen, DTOs oder Schemas. **Kein** Contract-Drift
  (API↔DTO↔FE↔appconfig) — es entstehen ausschließlich Tests, ein Check-Script, ein
  CI-Step und Doku. `schemaVersion` bleibt unberührt.

## Auth / Guards (welche mit-portieren)
- **Keine neuen Routen** ⇒ keine neuen Guards zu portieren. Das Paket **prüft** stattdessen
  die vorhandenen Guards: Die Smoke/Contract-Specs assertieren pro betroffenem Controller,
  dass die erwarteten Guards und `@Public()`-Opt-outs vorhanden sind (Reflection über
  `GUARDS_METADATA` aus `@nestjs/common/constants` und `PUBLIC_ROUTE_KEY` aus
  `@libs/auth/constants/appAccessKeys`).
- Damit wird der Auth-Contract (PLAN §3.2) für die 14 bisher ungetesteten Controller
  test-festgeschrieben; künftige Guard-Entfernungen/`@Public`-Fehlsetzungen brechen die CI.

## Externe Integrationen
- **Keine.** Unit-Tests mocken alle injizierten Services/Models (Muster
  `sse.controller.spec.ts`/`users.controller.spec.ts`); es wird **kein** Mongo/Redis/LDAP/
  CalDAV/IMAP kontaktiert. Läuft offline auf der warmen crabbox.

## Secrets / Env / master.key
- **Keine** Secrets, keine `.env`-Änderung, kein `master.key`-Bezug. Der Check-Script liest
  nur den Dateibaum unter `apps/api/src`.

## Trade-offs & Alternativen (mit Empfehlung)
1. **Contract-Test: metadaten-basiert (Reflection) vs. verhaltensbasiert (supertest 401/403).**
   Verhaltensbasiert ist stärker, braucht aber einen kompilierten App-Kontext + gemockte JWTs
   + globale Guard-Provider je Spec. Für 14 Bestands-Controller zu teuer.
   **Empfehlung:** jetzt metadaten-basiert (fängt exakt die Guard-Drift/`@Public`-Fehlsetzung,
   die der PLAN fürchtet); verhaltensbasierter Auth-Spec ab P2 pro **neuem** Modul (OF1).
2. **Reflection-Helper: purer Getter (`getClassGuards`/`isRoutePublic`) vs. `expect`-Wrapper.**
   Ein `expect`-Wrapper würde jest-Globals in eine Nicht-Spec-Datei ziehen (Lint-/Env-Reibung).
   **Empfehlung:** purer Getter, der Guard-Arrays/Boolean zurückgibt; die Assertion (`expect`)
   bleibt im Spec.
3. **Spec-Coverage-Guard: eigenes `tsx`-Script vs. ESLint-Rule vs. jest-Coverage-Threshold.**
   Coverage-Threshold misst Zeilen, nicht „Datei existiert"; eine ESLint-Rule wäre schwerer.
   **Empfehlung:** eigenes `tsx`-Script analog `scripts/checkFilenames.ts`/`checkTranslations.ts`
   — passt ins bestehende Check-Muster, in CI **und** Pre-Commit gleich verdrahtbar.
4. **Deterministik: `test:api:ci` (jest `--ci --runInBand`, `--skip-nx-cache`) vs. Bestands-`test`.**
   Der Green-Gate soll nicht auf nx-Cache vertrauen und deterministisch laufen.
   **Empfehlung:** separater `test:api:ci`-Script für CI; `test`/`test:api` bleiben fürs Dev.

## Risiken & Rollback
- **R-A: Ein Bestands-Spec ist im Fork bereits rot** (Basis-Drift ggü. 1.6.266). Mitigierung:
  T1 verifiziert alle 28 remote **zuerst**; ein roter Spec wird als eigener Fund gemeldet
  (Blocker/Fix vor Gate-Aktivierung), nicht stumm übergangen.
- **R-B: Smoke-Spec instanziiert Controller nicht** (Provider-Token/Model fehlt im
  TestingModule, z. B. `getModelToken`, `CACHE_MANAGER`). Mitigierung: Muster aus
  `users.controller.spec.ts` (Model-/Cache-Mocks) übernehmen; jeder Spec einzeln remote grün,
  bevor committed.
- **R-C: Spec-Coverage-Guard failt CI, bevor die 14 Specs existieren.** Mitigierung:
  Reihenfolge — Guard (T9/T10) hängt **nach** allen 14 Smoke-Specs (T4–T8); optionaler
  `SPEC_NOT_REQUIRED`-Allowlist im Script (default leer) für begründete Ausnahmen.
- **R-D: `@RequireAppAccess`/Interceptor-Dekoratoren** (z. B. `filesharing`, `auth`
  `CacheInterceptor`) stören das TestingModule. Mitigierung: Contract-Assertion nur lesend
  über Reflection; DI nur mit gemocktem Service — kein Guard-/Interceptor-Wiring nötig.
- **Rollback:** rein additiv (neue Testdateien, ein Script, ein CI-Step, Doku). Rücknahme =
  Revert der Commits; kein Laufzeit-/DB-/Deploy-Impact.

## Doku-Impact (Augenmaß)
- Neu: `docs/testing/spec-policy.md` (DE) — „Jeder Controller braucht einen
  `*.controller.spec.ts` (Smoke + Contract); jedes neue Modul zusätzlich einen
  verhaltensbasierten Auth-Spec ab P2; wie der Reflection-Helper genutzt wird; wie der
  Spec-Coverage-Guard lokal läuft." Kurz, entwickler-gerichtet.
- Kein README-Change nötig (AGENTS.md „Testing Guidelines" deckt Basics bereits ab).

## i18n-Impact (DE+EN)
- **Keine** i18n-Keys. Es entstehen keine user-sichtbaren App-Strings — nur Tests, ein
  entwickler-gerichtetes Check-Script (Konsolen-Output Englisch, nicht i18n) und Dev-Doku.
  Damit ist die DE+EN-Pflicht für dieses Paket gegenstandslos (in jeder Task „i18n: keine").

## Offene Fragen
- **OF1 (Empfehlung: ja, ab P2):** Verhaltensbasierter Auth-Spec (echtes 401/403 via
  `supertest`) als **Pflicht ab jedem neuen/rekonstruierten Modul** (Start: Chat-Pilot P2),
  statt Retrofit auf alle 29 Bestands-Controller. Braucht einen kleinen HTTP-Test-Harness
  (kompilierte App + gemockter JWT/`edulution.pem`) — eigenes kleines Paket, referenziert in
  der Spec-Policy.
- **OF2 (Empfehlung: später):** Spec-Coverage-Guard zusätzlich auf `*.service.ts` ausweiten?
  Heute haben nur ~13 von ~58 Services einen Spec → sofort zu streng. Zuschaltbar, sobald der
  Service-Spec-Bestand aufgeholt ist.
- **OF3 (Empfehlung: nein, jetzt):** jest `coverageThreshold` als hartes Gate? YAGNI, bis der
  Spec-Bestand breit genug ist; sonst blockiert es Module ohne echten Nutzen.
- **OF4:** Soll der API-Test ein **eigener CI-Job** (parallel, per Branch-Protection einzeln
  erzwingbar) werden oder ein benannter **Step** im `test`-Job? Abhängig davon, wie
  `p1-own-ci-registry` `build-and-test.yml` final schneidet (Empfehlung: benannter Step jetzt,
  eigener Job optional, wenn die Laufzeit stört).
