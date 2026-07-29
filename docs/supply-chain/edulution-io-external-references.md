<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# edulution-io-Außenreferenzen — Supply-Chain-Register

Menschenlesbare Fassung des maschinenlesbaren Manifests
`scripts/supply-chain/externalReferences.ts` (Quelle der Wahrheit; jede `id` unten entspricht
einem Manifest-Eintrag). **Dieses Register inventarisiert nur** — die *Umsetzung* jeder Policy
(Lizenzserver stubben, Plugins-Mirror, SOGo-Vendoring, Image-Pinning, Rebrand, Sentry-Härtung)
gehört den in „Folge-Paket" genannten Backlog-Paketen. Belege = `.reference/2.0.200/api/main.js`-
Zeilen bzw. Fork-Base-`libs/src`-Pfade.

Das Drift-Gate `npm run check-external-references` (T3) erzwingt maschinell, dass keine nicht
hier gelistete `edulution.io`-Referenz in `apps/**`/`libs/**` eingeschleust wird.

## Kategorie A — Laufzeit-Fetches (Egress zur Laufzeit) — 6

| id | Host | Datei:Zeile | Consumer | Break-Impact | Policy | Folge-Paket |
|---|---|---|---|---|---|---|
| `sogo-light-theme` | raw.githubusercontent.com | main.js:25090 | SOGo-Webmail | Theme-CSS-Fetch von fremdem GitHub; Ausfall bricht Mail-Theming | Theme-CSS ins eigene Mail-Image vendoren | `p4-mail-rework` |
| `sogo-custom-theme` | raw.githubusercontent.com | main.js:25094 | SOGo-Webmail | wie oben (Custom-Theme) | vendoren | `p4-mail-rework` |
| `plugins-appstore-fetch` | raw.githubusercontent.com | libs/src/common/constants/urls.ts:21 | App-Store/DockerService | Plugin-Apps live aus `edulution-plugins`; Ausfall bricht App-Installation | eigener Plugins-Mirror, `EDU_PLUGINS_GITHUB_URL` repointen | `p1-installer-repoint` |
| `cookie-test-page` | edulution-io.github.io | libs/src/common/constants/cookieTestUrl.ts:20 | Login-Cookie-Test | Egress zu fremder GitHub-Pages beim Login-Flow | `cookie-test.html` selbst hosten, URL repointen | `p1-rebrand` |
| `license-server` | license.edulution.io | main.js:43800 | LicenseService | Call an fremden Lizenzserver; Feature-Gating/Egress | Lizenz-Call stubben/deaktivieren (AGPL-Fork ohne Netzint-Gate) | `p1-installer-repoint` |
| `satellite-provisioning` | provisioning.satellite.edulution.io | main.js:64034 | SatellitesService | fremder Provisioning-Dienst | nur inventarisiert (P6 deferred) | `p6-satellites` |

## Kategorie B — Images (Pull bei Deploy/Install) — 12

Kern + Protected-Container (`DOCKER_PROTECTED_CONTAINERS`, main.js:26891) + Companion-Apps
(`dockerApplicationList.ts`). **Hinweis:** die Fork-Base `dockerApplicationList.ts` listet aktuell
nur 5 Companion-Apps; weitere kommen mit den 2.0-Modulen hinzu.

| id | Host | Datei:Zeile | Rolle | Policy | Folge-Paket |
|---|---|---|---|---|---|
| `image-edulution-api` | ghcr.io | main.js:26891 | Kern-API | aus eigenem ghcr/faircomp bauen+pinnen (Digest) | `p1-own-ci-registry` |
| `image-edulution-ui` | ghcr.io | main.js:26891 | Kern-UI | aus eigenem ghcr/faircomp bauen+pinnen | `p1-own-ci-registry` |
| `image-edulution-db` | ghcr.io | main.js:26891 | MongoDB (Infra) | Basisimage pinnen | `p1-installer-repoint` |
| `image-edulution-redis` | ghcr.io | main.js:26891 | Redis (Infra) | Basisimage pinnen | `p1-installer-repoint` |
| `image-edulution-traefik` | ghcr.io | main.js:26891 | Traefik (Infra) | Basisimage pinnen | `p1-installer-repoint` |
| `image-edulution-keycloak` | ghcr.io | main.js:26891 | Keycloak (Auth) | Basisimage pinnen | `p1-installer-repoint` |
| `image-edulution-keycloak-db` | ghcr.io | main.js:26891 | Keycloak-Postgres | Basisimage pinnen | `p1-installer-repoint` |
| `image-companion-mail` | ghcr.io | libs/src/docker/constants/dockerApplicationList.ts | Mailcow/SOGo | eigenes Companion-Image | `p4-mail-rework` |
| `image-companion-onlyoffice` | ghcr.io | libs/src/docker/constants/dockerApplicationList.ts | OnlyOffice/Collabora | eigenes Companion-Image | `p4-filesharing-wopi` |
| `image-companion-guacamole` | ghcr.io | libs/src/docker/constants/dockerApplicationList.ts | Guacamole/VDI | eigenes Companion-Image | `p4-app-store-verify` |
| `image-companion-veyon` | ghcr.io | libs/src/docker/constants/dockerApplicationList.ts | Veyon | eigenes Companion-Image | `p4-app-store-verify` |
| `image-companion-wireguard` | ghcr.io | libs/src/docker/constants/dockerApplicationList.ts | WireGuard/VPN | eigenes Companion-Image | `p4-app-store-verify` |

## Kategorie C — Telemetrie — 2

| id | Host | Datei:Zeile | Break-Impact | Policy | Folge-Paket |
|---|---|---|---|---|---|
| `sentry-edu-ui-dsn` | sentry.io | main.js:54486, apps/api/.env.default | `getSentryConfig` setzt `sendDefaultPii:true` + `tracesSampleRate:1.0` → PII-Egress an DSN wenn gesetzt | `ENABLE_SENTRY=false` default, nie Fremd-DSN erben, opt-in only | `p1-observability` |
| `sentry-edu-api-dsn` | sentry.io | main.js:59762, apps/api/.env.default | `enableSentryForNest` → API-Telemetrie/PII-Egress | wie oben | `p1-observability` |

## Kategorie D — Branding/Doku-Links (nur inventarisiert, kein Egress) — 4

| id | Host | Datei:Zeile | Art | Folge-Paket |
|---|---|---|---|---|
| `branding-docs-url` | docs.edulution.io | libs/src/common/constants/urls.ts:22 | Doku-Link (UI) | `p1-rebrand` |
| `branding-appstore-url` | apps.apple.com | libs/src/common/constants/urls.ts:20 | iOS-App-Link (UI) | `p1-rebrand` |
| `branding-issue-352` | github.com | main.js:53668 | Issue-Referenz (Kommentar) | `p1-rebrand` |
| `branding-issue-396` | github.com | main.js:26374 | Issue-Referenz (Kommentar) | `p1-rebrand` |

## Drift-Gate & Ausschlüsse

`npm run check-external-references` scannt `apps/**`+`libs/**` (ts/tsx/html/json/env) auf
`edulution.io`-/`edulution-io`-GitHub-Host-Muster und schlägt fehl (exit 1), sobald eine Fundstelle
**nicht** per Datei+Host im Manifest allowlistet ist — plus Fehler bei nicht-leerem
`SENTRY_*_DSN`-Literal. **Erzwungen** in `.husky/pre-commit` **und** im CI-Workflow
`.github/workflows/build-and-test.yml` (neben den Geschwister-`check-*`-Gates); der Fixture-Test
`scripts/checkExternalReferences.spec.ts` läuft über `npm run test:scripts` (`tsx --test`) in beiden.
**Bewusst ausgenommen:** das npm-Paket `@edulution-io/ui-kit` (Rebrand-Owner
`p1-installer-repoint`/`p1-rebrand`) und der Repo-Selbstverweis `github.com/edulution-io/edulution-ui`.
**Bekannte Grenze:** das Gate matcht nur URL-Formen (`https?://…edulution.io`, die zwei
GitHub-Muster); **bare** Host-Strings ohne Protokoll (z. B. `'edulution.io'` als Branding-Text) werden
bewusst **nicht** erfasst, um False-Positives auf Marken-/Übersetzungstexten zu vermeiden — solche
Branding-Vorkommen behandelt `p1-rebrand`, nicht dieses Egress-Gate.
