# p1-observability — Observability, Health-/Build-Metadaten & Sentry-Entscheidung

## Problem / Motivation
Der Fork erbt drei Observability-Lücken aus dem edulution-2.0.200-Stand (Master-Plan §5.5,
Audit-Punkt 11, §9-Entscheidung 12):

1. **Health liefert „unknown".** Der Health-Endpoint spiegelt Build-Metadaten
   (`version/commitSha/buildDate/buildNumber`) — im 2.0-SOLL liest die `HealthService`
   diese Werte in `onModuleInit` aus dem `ConfigService` und **spreadet sie in jede
   Health-Antwort** (`main.js:56941–56961`). Im aktuellen Repo-Stand (1.6-Basis) tut die
   `health.service.ts` das **nicht**: sie injiziert keinen `ConfigService`, hat kein
   `buildInfo`, und die drei Antworten (`check`/`readiness`/`getStats`) enthalten **keine**
   Build-Metadaten. Selbst wenn die CI die Metadaten ins Image bäckt, sieht der
   Monitoring-Contract sie nie → Health bleibt effektiv leer/„unknown".
2. **Sentry-Telemetrie ohne bewusste Entscheidung.** `enableSentryForNest`
   (`main.js:59762–59795`, im Repo bereits 1:1 vorhanden) und der FE-Store
   (`useSentryStore.ts`) sind opt-in (`ENABLE_SENTRY` + DSN), senden aber bei Aktivierung
   `sendDefaultPii: true` und `tracesSampleRate: 1.0`. Es fehlt die dokumentierte
   Default-Entscheidung (deaktiviert / eigener DSN, **nie** Fremd-DSN erben) und ein
   gehärtetes `.env.default`. Sentry ist zugleich Dritt-Empfänger im DSGVO-Inventar (R12).
3. **Logging/Observability-Basics undokumentiert.** `EDUI_LOG_LEVEL` (`main.js:948`) hat via
   `getLogLevels` bereits einen sinnvollen Prod-Default (`[error,warn,log]` bei
   `NODE_ENV=production`), aber ohne Regressions-Test und ohne dokumentierten
   Monitoring-Contract. Health-Endpoints, Log-Level und Disk-Threshold sind nirgends als
   Betriebs-Contract beschrieben.

## Ziel & Nicht-Ziele (YAGNI)
**Ziel**
- Die `HealthService` liefert Build-Metadaten in allen drei Health-Antworten (SOLL-Treue zu
  2.0.200) — der fehlende Bindeglied-Schritt, der „Health ≠ unknown" am Endpoint erst wahr
  macht.
- Sichere Sentry-Defaults im `apps/api/.env.default` (deaktiviert, keine Fremd-DSN) + eine
  dokumentierte Telemetrie-Entscheidung.
- Regressions-Test, der den Prod-Default von `EDUI_LOG_LEVEL` festnagelt.
- Ein Betriebs-/Monitoring-Dokument (DE+EN): Health-Endpoints als Contract,
  Observability-Env-Inventar, Sentry-Entscheidung.

**Nicht-Ziele (bewusst raus)**
- **Build-Metadaten-Plumbing** (`configuration.ts`, `Dockerfile ARG/ENV/LABEL`,
  `container-build.yml` `metadata-action`/Build-Args, CI-Release-Runbook) — **gehört
  vollständig zu `p1-own-ci-registry`** (dortige Tasks T3/T4/T5/T11). Dieses Paket
  **konsumiert** nur die dort bereitgestellten Config-Keys, dupliziert sie nicht.
- **§13-Versionsanzeige im UI** (About/Footer) — eigenes P1-Paket; kein UI-String hier.
- **Prometheus/Filebeat/Kibana/Elasticsearch-Stack** (`upstream/1166`) — bewusst **nicht**
  übernommen (schwergewichtig, eigener Companion-Stack, kein LMN-Bedarf in P1). Als Umriss/
  offene Frage vermerkt, nicht implementiert.
- Neue Metrik-Endpoints, kein `/metrics`, kein APM.

## Betroffene Komponenten & Dateien (konkrete Pfade)
- `apps/api/src/health/health.service.ts` — `ConfigService`-Injektion, `buildInfo`,
  `onModuleInit`, Spread in `checkEduApiResponding`/`checkEduApiHealth`/`getEduApiStats`.
- `apps/api/src/health/health.service.spec.ts` (**neu**) — Unit-Test buildInfo-Spread +
  `getThresholdPercent`.
- `apps/api/src/logging/getLogLevels.spec.ts` (**neu**) — Prod-Default-Regressions-Test.
- `apps/api/.env.default` — Sentry-/Logging-/Disk-Abschnitt härten (Kommentare + Defaults).
- `apps/api/src/sentry/enableSentryForNest.ts` + `apps/frontend/src/store/useSentryStore.ts`
  — **nur bei Freigabe** der Härtungs-Entscheidung (T4, `[?]`).
- `docs/observability.md` (**neu**, DE+EN) — Monitoring-Contract + Env-Inventar + Sentry.
- **Nicht angefasst** (Fremd-Ownership `p1-own-ci-registry`): `apps/api/src/config/configuration.ts`,
  `apps/api/Dockerfile`, `apps/frontend/Dockerfile`, `.github/workflows/container-build.yml`.
- **Unverändert** (Guard-Invariante): `apps/api/src/health/health.controller.ts`,
  `apps/api/src/health/health.module.ts` (`ConfigModule` ist global,
  `app.module.ts:77–79 isGlobal:true, load:[configuration]` → `ConfigService` ohne
  Modul-Edit injizierbar).

## Quelle des Solls
- **HealthService buildInfo/onModuleInit/Spread:** `main.js:56941–56961`; Disk-Threshold-Env
  `main.js:56932`, `getThresholdPercent` `main.js:57023–57029`.
- **HealthController (Routen/Guards, unverändert übernehmen):** `main.js:56789–56851`
  (`check` = kein `@Public` → globaler AuthGuard; `readiness` = `@Public` + `LocalhostGuard`;
  `getStats` = AuthGuard).
- **configuration-Contract (Fremd-Paket, nur Referenz):** `main.js:59716–59723`
  (`version: process.env.APP_VERSION || rootPackage.version`, `commitSha/buildDate/buildNumber`
  aus `process.env.* || 'unknown'`).
- **Sentry BE:** `enableSentryForNest` `main.js:59762–59795`; **Sentry-Config-Endpoint (BE)**
  `getSentryConfig` `main.js:54486–54495`; FE-Init `useSentryStore.ts:44–63`.
- **Logging:** `LoggingInterceptor`/`logLevel` `main.js:948`; `getLogLevels` (Prod-Fallback).
- **Rescue-Branch (bewusst nicht übernommen):** `upstream/1166-logging-add-kibana-prometheus`
  (Commit `ae0781076`: Prometheus/Filebeat/Kibana/Elasticsearch + `docker-compose.yml`,
  `prometheus.yml`, `filebeat.yml`, `app.module.ts` — Umriss für spätere Observability-Ausbaustufe).
- **Baseline-Screenshot:** keiner (reines BE/Env/Ops-Feature, keine UI-Fläche).

## Datenmodell / API / Migrationen
- **Keine DB-Migration.** Kein Mongoose-Schema berührt, kein `schemaVersion`-Bump.
- **Keine neuen Routen/DTOs.** Die drei Health-Routen existieren bereits; `buildInfo` wird nur
  in die bestehenden Antworten gespreadet (Plain-Object, für Swagger unsichtbar). Ein
  optionaler `HealthCheckResponseDto` (im 2.0-SOLL vorhanden) ist **nicht** Teil dieses Pakets
  (Swagger-Completeness-Gate regressiert nicht, da die Routen aktuell schon ohne
  `@ApiResponse`-DTO grün sind) — siehe Offene Fragen.
- **Contract-Drift (paket-übergreifend):** `health.service.ts` konsumiert die Config-Keys
  `version/commitSha/buildDate/buildNumber`, die **`p1-own-ci-registry:T5`** in
  `configuration.ts` bereitstellt. Ist T5 noch nicht gemerged, liefert der Endpoint für diese
  Felder `undefined` (graceful degradation) — der Unit-Test von T1 mockt den `ConfigService`
  und ist dadurch selbst-verifizierend/unabhängig. Der reale „≠ unknown"-Nachweis ist die
  Voll-Stack-Prüfung (deckt sich mit `p1-own-ci-registry:T11`).

## Auth / Guards
- **Keine Guard-Änderung.** `health.controller.ts` bleibt unangetastet; die Invariante aus dem
  SOLL wird bewahrt: `readiness` (`/edu-api/health/check`) = `@Public` **+** `LocalhostGuard`
  (nur Loopback/Reverse-Proxy), `check` (`/edu-api/health`) und `getStats`
  (`/edu-api/health/stats`) hinter globalem AuthGuard.
- **Exposure-Hinweis:** Build-Metadaten erscheinen dadurch auf der localhost-gebundenen
  Readiness-Probe und den authentifizierten Endpoints — kein breit-öffentliches
  Version-Fingerprinting. Bewusst SOLL-treu (2.0.200 spreadet identisch). Siehe Offene Fragen,
  falls `commitSha` auf `/health/check` unerwünscht ist.

## Externe Integrationen
- **Sentry** (`@sentry/nestjs`, `@sentry/react`) als optionaler Dritt-Empfänger — Default
  **aus**. Kein Laufzeit-Fetch, keine geerbte DSN. Kopplung an DSGVO-Dritt-Empfänger-Liste
  (Master-Plan §2.7/R12) und Lieferketten-Inventar (§5.3).
- **Prometheus/Kibana** (`upstream/1166`) — nicht integriert.
- Keine Berührung von linuxmuster-api7 / Keycloak / WebDAV / Mailcow / Collabora.

## Secrets / Env / master.key
- **Kein master.key-Bezug**, keine gewrappten User-Keys, keine neuen KC-Client-Secrets.
- **Env (bestehend, nur Defaults/Kommentare):** `ENABLE_SENTRY` (Default `false`),
  `SENTRY_EDU_UI_DSN` / `SENTRY_EDU_API_DSN` (leer lassen — **nie** Fremd-DSN erben),
  `EDUI_LOG_LEVEL` (leer → Prod-Default `[error,warn,log]`), `EDUI_DISK_SPACE_THRESHOLD`
  (leer → `0.95`).
- **Build-Metadaten-Env** (`COMMIT_SHA/BUILD_DATE/BUILD_NUMBER/APP_VERSION`): nicht geheim, in
  `p1-own-ci-registry` ins Image gebacken — **nicht** in `.env.default` (Image-provided),
  optionaler Runtime-Override wird dokumentiert.
- **Kein Secret ins Repo:** DSNs bleiben leere Platzhalter.
- **Installer-Kopplung:** `.env.default` ist nur die Repo-Vorlage; der reale Runtime-Env kommt
  aus der Installer-`edulution.env` (Provisioning). Der `ENABLE_SENTRY=false`-Default muss dort
  gespiegelt werden → Koordination mit `p1-installer-repoint` (dort, nicht hier).

## Trade-offs & Alternativen (mit Empfehlung)
- **health.service.ts hier vs. in `p1-own-ci-registry`.** `p1-own-ci-registry` liefert die
  Config-Keys + CI-Plumbing, wired aber den Endpoint nicht. Empfehlung: **die
  Endpoint-Verdrahtung gehört ins Observability-Paket** (Applikations-Observability), das
  Infra-Plumbing bleibt im CI-Paket. Zusammen erfüllen sie die „Health ≠ unknown"-Aussage von
  `p1-own-ci-registry:T11` — dessen Verify hängt an diesem T1. **Diese Kopplung ist am
  Design-Gate zu bestätigen** (Alternative: beide Hälften in ein Paket ziehen; nicht empfohlen,
  weil CI-YAML und App-Code disjunkte Review-/Test-Flächen sind).
- **Sentry-Default aus vs. eigener DSN.** Empfehlung: **aus** (opt-in bleibt), DSN leer, keine
  Fremd-DSN. Eigener DSN ist jederzeit per Env nachrüstbar, ohne Code.
- **PII/Sampling-Härtung jetzt vs. später.** `sendDefaultPii:true` + `tracesSampleRate:1.0`
  sind für Schul-/Minderjährigen-PII heikel, greifen aber nur bei aktivem Sentry. Empfehlung:
  Härtung als **separate, freigabepflichtige Task (T4, `[?]`)** vorbereiten, nicht ungefragt
  Verhalten ändern.
- **Observability-Ausbau (Prometheus).** `upstream/1166` zeigt den echten 1.5-Weg. Empfehlung:
  **deferred** — erst nach P0-Basis-Drift + Chat-Pilot bewerten; hier nur als Umriss.

## Risiken & Rollback
- **Risiko (klein):** `health.service.ts`-Injektion eines 7. Konstruktor-Parameters kann DI im
  Test/Bootstrap brechen, wenn `ConfigModule` nicht global wäre — verifiziert: **ist** global
  (`app.module.ts:78`), Unit-Test mockt DI. 
- **Risiko (klein):** `.env.default`-Änderung könnte einen bestehenden Deploy überschreiben —
  nein, `.env.default` ist nur Vorlage; Laufzeit nutzt `apps/api/.env`/Installer-Env.
- **Rollback:** rein forward-code, keine Migration/kein Zustand → `git revert` des jeweiligen
  Task-Commits genügt; kein DB-Dump/master.key nötig.

## Doku-Impact (Augenmaß)
Ein **neues** Betriebs-Dokument `docs/observability.md` (DE+EN): Health-Monitoring-Contract
(Pfade/Guards/Response-Shape inkl. Build-Metadaten), Observability-Env-Inventar
(`EDUI_LOG_LEVEL`, `EDUI_DISK_SPACE_THRESHOLD`, Sentry-Vars) und die dokumentierte
Sentry-Default-Entscheidung. Cross-Link auf `docs/ci-release.md` (aus `p1-own-ci-registry`) für
das Build-Metadaten-Plumbing, um Duplikate zu vermeiden. Kein README/CHANGELOG-Zwang.

## i18n-Impact (DE+EN)
**Keine UI-i18n-Keys.** Reines BE-/Env-/Ops-Feature ohne UI-Fläche (die Versionsanzeige ist das
separate §13-Paket). `npm run check-translations` bleibt unberührt. Doku wird bilingual (DE+EN)
geführt.

## Offene Fragen
1. **Sentry-Telemetrie-Default (§9-Entscheidung 12).** Bestätigung: Default **deaktiviert**
   (`ENABLE_SENTRY=false`, DSN leer, nie Fremd-DSN) — empfohlen. Alternative: eigener DSN
   provisionieren. Steuert, ob T4 (Härtung) überhaupt greift.
2. **Sentry-PII/Sampling-Härtung (T4).** Falls Sentry je aktiviert wird: `sendDefaultPii` auf
   `false` und `tracesSampleRate`/`profilesSampleRate` senken (z. B. `0.1`) — Verhaltens-/
   Abweichung vom 2.0-SOLL. Freigeben (T4 umsetzen) oder SOLL-treu belassen?
3. **Ownership-Kopplung health.service ↔ CI-Paket.** Bestätigen, dass `health.service.ts`
   (T1) hier lebt und `p1-own-ci-registry:T11`-Verify auf T1 wartet (serielle Reihenfolge:
   ci-registry:T5 → dieses T1 → ci-registry:T11-Voll-Stack).
4. **`HealthCheckResponseDto` / Swagger-Parität.** Der 2.0-SOLL hat einen Response-DTO +
   `@ApiResponse` auf den Health-Routen; der Repo-Stand nicht. Nachziehen (Swagger-Completeness
   näher am SOLL) oder YAGNI belassen? Empfehlung: YAGNI, separat, falls das
   Swagger-Completeness-Gate es später erzwingt.
5. **`commitSha` auf `/health/check`.** LocalhostGuard begrenzt die Readiness-Probe auf
   Loopback/Reverse-Proxy; Build-Metadaten dort sind SOLL-treu und risikoarm. Belassen (empf.)
   oder Build-Metadaten nur auf den Auth-Endpoints spreaden?
