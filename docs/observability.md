<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- SPDX-FileCopyrightText: 2026 Kevin Stenzel -->

# Observability

Bilingual (DE / EN) operations doc for the API's health, logging, and Sentry contract.
The build-metadata plumbing (how `version`/`commitSha`/`buildDate`/`buildNumber` reach the
running image) lives in [`docs/ci-release.md`](ci-release.md) (package `p1-own-ci-registry`) —
this document only covers how they are exposed and observed.

---

## Deutsch

### Health-Endpoints als Monitoring-Contract

Drei Endpoints (Basis `/edu-api/health`):

| Endpoint | Auth | Zweck |
| --- | --- | --- |
| `GET /edu-api/health` | globaler AuthGuard | Liveness (Mongo-Ping) |
| `GET /edu-api/health/check` | **`@Public` + `LocalhostGuard`** | Readiness (nur vom Host); Mongo + Disk |
| `GET /edu-api/health/stats` | globaler AuthGuard | Mongo + Auth-Server + WebDAV + Disk |

Jede Antwort ist eine `@nestjs/terminus`-`HealthCheckResult` (`status`/`info`/`error`/`details`),
**angereichert um die Build-Metadaten** `version`, `commitSha`, `buildDate`, `buildNumber`
(via `HealthService.onModuleInit` aus `ConfigService`). So liefert ein Monitoring-Scrape zugleich
den laufenden Image-Stand. Der Disk-Schwellwert kommt aus `EDUI_DISK_SPACE_THRESHOLD`
(Default 0.95).

### Observability-Env-Inventar

| Variable | Default | Wirkung |
| --- | --- | --- |
| `EDUI_LOG_LEVEL` | leer | leer → `error,warn,log` bei `NODE_ENV=production`, sonst alle Level; `off` → keine Logs |
| `EDUI_DISK_SPACE_THRESHOLD` | `0.95` | Disk-Health-Schwelle (0–1); leer/ungültig → 0.95 |
| `ENABLE_SENTRY` | `false` | Sentry-Opt-in (BE + FE) |
| `SENTRY_EDU_API_DSN` / `SENTRY_EDU_UI_DSN` | leer | eigener DSN, **nur** mit `ENABLE_SENTRY=true` |

### Sentry-Telemetrie-Entscheidung

Sentry ist **standardmäßig aus** (`ENABLE_SENTRY=false`). Es wird **nie ein Fremd-DSN**
(z. B. von edulution.io) geerbt — die DSN-Zeilen bleiben leer; ein eigener DSN wird nur explizit
gesetzt. **Datenschutz-Härtung (R12) — entschieden 2026-07-27:** Sentry ist ein Dritt-Empfänger.
Für eine Schul-/Minderjährigen-Plattform weicht der Fork hier **bewusst vom 2.0-SOLL ab**:
`sendDefaultPii = false` und `tracesSampleRate`/`profilesSampleRate = 0.1` statt der 2.0-Werte
`true` / `1.0`. Die Werte stehen als gemeinsame Konstanten in
`libs/src/common/constants/sentryTelemetry.ts` und gelten für **BE und FE** gleichermaßen.
Damit landen auch bei aktiviertem Sentry keine Nutzer-PII (IP, Header, Request-Bodies)
automatisch beim Dritt-Empfänger, und das Trace-Volumen bleibt auf 10 %. Solange Sentry aus
ist (Default), verlässt ohnehin kein PII das System.

---

## English

### Health endpoints as the monitoring contract

Three endpoints (base `/edu-api/health`):

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /edu-api/health` | global AuthGuard | liveness (Mongo ping) |
| `GET /edu-api/health/check` | **`@Public` + `LocalhostGuard`** | readiness (host-only); Mongo + disk |
| `GET /edu-api/health/stats` | global AuthGuard | Mongo + auth server + WebDAV + disk |

Every response is a `@nestjs/terminus` `HealthCheckResult` (`status`/`info`/`error`/`details`)
**enriched with the build metadata** `version`, `commitSha`, `buildDate`, `buildNumber`
(set in `HealthService.onModuleInit` from `ConfigService`), so a monitoring scrape also reports
the running image revision. The disk threshold comes from `EDUI_DISK_SPACE_THRESHOLD`
(default 0.95).

### Observability env inventory

See the table above (`EDUI_LOG_LEVEL`, `EDUI_DISK_SPACE_THRESHOLD`, `ENABLE_SENTRY`,
`SENTRY_EDU_API_DSN` / `SENTRY_EDU_UI_DSN`).

### Sentry telemetry decision

Sentry is **off by default** (`ENABLE_SENTRY=false`); no foreign DSN is ever inherited (the DSN
lines stay empty), and an own DSN is only set explicitly. **Privacy hardening (R12) - decided 2026-07-27:** Sentry is a
third-party recipient. For a school / minors' platform this fork **deliberately deviates from
the 2.0 baseline**: `sendDefaultPii = false` and `tracesSampleRate`/`profilesSampleRate = 0.1`
instead of 2.0's `true` / `1.0`. The values live as shared constants in
`libs/src/common/constants/sentryTelemetry.ts` and apply to **both API and frontend**. Even with
Sentry enabled, no user PII (IP, headers, request bodies) is sent automatically, and trace volume
stays at 10%. While Sentry is off (the default), no PII leaves the system anyway.
