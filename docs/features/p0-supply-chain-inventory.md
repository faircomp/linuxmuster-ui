<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# p0-supply-chain-inventory — Spec

> Phase **P0** · Analyse-Paket (Inventar + Policy + Drift-Gate). Kein Feature-Nachbau, sondern das
> belastbare Register aller `edulution-io`-Außenreferenzen des `edulution-ui`-Repos plus ein
> maschineller Wächter, der das Register ehrlich hält. Die konkreten *Umsetzungen* der einzelnen
> Policies (eigener Lizenzserver, Plugin-Repoint, SOGo-Vendoring, Rebrand) sind **anderen Paketen
> zugeordnet** und hier nur als Cross-Reference geführt.

## Problem / Motivation

Der Fork erbt einen Kranz harter Laufzeit-Abhängigkeiten an die tote `edulution-io`-Infrastruktur.
Verschwindet ein Upstream-Repo/-Dienst (wie `edulution-ui` selbst), brechen ohne Vorwarnung:
Mail-/Calendar-Theming (SOGo-CSS von `raw.githubusercontent.com`), der komplette App-Store-Rollout
(Compose-Inhalte live von `edulution-plugins`), der Cookie-Kompatibilitätstest (GitHub-Pages) und
der Lizenz-Check (`license.edulution.io`). Dazu ~12 Companion-Images und ein opt-in Sentry-Egress.
Diese Referenzen sind heute über das Repo verstreut, teils nur im minifizierten `main.js` sichtbar,
und es gibt **keinen** Mechanismus, der das Hinzukommen einer neuen `edulution-io`-Außenreferenz
bemerkt. Ohne vollständiges, versioniertes Inventar + Policy pro Referenz lässt sich weder die
Prämisse „rein additiv/autark" halten noch die spätere Ablösung planen (Plan §5.3, §3.4, §3.3).

## Ziel & Nicht-Ziele (YAGNI)

**Ziel:**
1. Ein vollständiges, **versioniertes** Inventar (`docs/supply-chain/edulution-io-external-references.md`
   + maschinenlesbares Manifest `scripts/supply-chain/externalReferences.ts`) aller
   `edulution-io`-Außenreferenzen mit Datei:Zeile, Typ, Break-Impact, **Policy** und
   **verantwortlichem Folge-Paket**.
2. Ein **Drift-Gate** (`scripts/checkExternalReferences.ts`, npm-Script), das jede nicht im Manifest
   allowlistete Netz-Referenz auf `*.edulution.io`, `edulution-io.github.io`,
   `raw.githubusercontent.com/edulution-io` bzw. `license.edulution.io` als Fehler meldet — damit das
   Inventar nicht altert.
3. Telemetrie-Egress (Sentry) mit **explizitem, dokumentiertem Default** absichern (aus; nie Fremd-DSN).

**Nicht-Ziele (bewusst, YAGNI — anderen Paketen zugeordnet):**
- **Kein** Bau eines eigenen Lizenzservers und **kein** Umbau des `LicenseService` (Design-Entscheidung,
  s. Offene Fragen; eigenes Lizenz-/CE-Paket).
- **Kein** Repoint von `EDU_PLUGINS_GITHUB_URL` auf einen eigenen Endpoint (App-Store-/DockerService-Paket P4).
- **Kein** Vendoring/Mirror der SOGo-CSS in den Laufzeitpfad (Mail-Paket).
- **Kein** Digest-Pinning der Companion-/Infra-Images — das passiert in den **anderen Repos**
  (`edulution-plugins`-Compose gespiegelt + Installer-Compose, Plan §5.2), nicht in `edulution-ui`.
- **Kein** Rebrand der Branding-/Doku-Links (`docs.edulution.io`, App-Store-Link, `@edulution-io/ui-kit`,
  Titel/Locales) — Rebrand-Paket §2.5; hier nur **inventarisiert**, nicht geändert.
- **Keine** CSP-/nginx-Härtung der Frontend-Auslieferung (Installer/Frontend-Dockerfile-Paket); hier nur
  als Wechselwirkung notiert.

## Betroffene Komponenten & Dateien

**Neu (dieses Paket):**
- `docs/supply-chain/edulution-io-external-references.md` — das Inventar-Register (Deutsch).
- `scripts/supply-chain/externalReferences.ts` — maschinenlesbares Manifest (typisierter const-Export, Quelle der Wahrheit für das Gate).
- `scripts/checkExternalReferences.ts` — Drift-Gate (Muster des bestehenden `scripts/checkTranslations.ts`).
- `scripts/checkExternalReferences.spec.ts` (oder co-lokiert) — Fixture-Test für das Gate.
- `package.json` — Script `check-external-references` + Einhängen in `check`/`precommit`.
- `apps/api/.env.default` — expliziter Sentry-Default.

**Nur inventarisiert (nicht geändert) — die Referenz-Fundstellen:**
- `libs/src/mail/constants/sogoTheme.ts:22,24` (SOGo-CSS, BE-Fetch)
- `libs/src/common/constants/urls.ts:20,21,22` (App-Store-Link, `EDU_PLUGINS_GITHUB_URL`, `EDU_DOCS_URL`)
- `apps/frontend/src/pages/Settings/AppConfig/DockerIntegration/useDockerApplicationStore.ts:153,183` (Plugin-Fetch, FE)
- `libs/src/common/constants/cookieTestUrl.ts:20` + `libs/src/common/utils/testCookieAccess.ts:25,38,53` (Cookie-Test, FE)
- `libs/src/license/constants/licenseServerUrl.ts:20` + `apps/api/src/license/license.service.ts:52,126,188` (Lizenzserver, BE)
- `libs/src/docker/constants/dockerApplicationList.ts` (Companion-Image-Namen)
- `libs/src/filesharing/constants/webdavTutorialLinks.ts:23,27,31`, `libs/ui-kit/package.json:8`,
  `libs/src/common/constants/applicationName.ts:20`, `apps/frontend/index.html:26,29,41`,
  `apps/frontend/src/main.ts` Swagger-Desc, Locales `.../loginWithQrDescription|infoQrCodeExpired` (Branding, Rebrand-Paket)

## Quelle des Solls

Regelfall = die **echten Fork-Base-Referenzen selbst** (v1.6.266) + Bestätigung/Extra-Anker aus dem
un-minifizierten Image-`main.js` (2.0.200):
- SOGo-Theme: `main.js:25090-25097` (`SOGO_THEME`), Consumer `main.js:25311-25354` (`updateSogoTheme`/`checkSogoThemeVersion`); Fork-Base `libs/src/mail/constants/sogoTheme.ts`.
- App-Store-Compose: `urls.ts:21`, Consumer `useDockerApplicationStore.ts:153/183`; DockerService `main.js:26371ff`, Protected `main.js:26891`.
- Cookie-Test: `cookieTestUrl.ts:20`, Consumer `testCookieAccess.ts` (kein `main.js`-Pendant — reiner FE-Pfad; im Repo als `docs/cookie-test.html` vorhanden).
- Lizenzserver: `main.js:43800` (`LICENSE_SERVER_URL`), `LicenseService` `main.js:43634-43773` (`sign`/`verify`, `@Interval` 24h `main.js:43797`); Fork-Base `apps/api/src/license/`.
- Companion-Images: `main.js` Zeilen 25091, 27083-27084, 27113-27118, 27149-27150, 32883, 33086, 41978, 61789, 62818, 64073; Fork-Base `libs/src/docker/constants/dockerApplicationList.ts` (6 von 12).
- Sentry: `getSentryConfig` `main.js:54486`, `enableSentryForNest` `main.js:59762` (`sendDefaultPii:true`, `tracesSampleRate:1.0`); Env `apps/api/.env.default:88-91`.

Kein Baseline-Screenshot relevant (Ops-/Analyse-Paket ohne UI-Änderung).

## Datenmodell / API / Migrationen

**Keine.** Dieses Paket ändert kein Schema, keine Route, kein DTO, kein `appconfig`-Shape.
- **DB-Migration nötig?** Nein — `schemaVersion` bleibt unverändert.
- **Contract-Drift?** Nein — API↔DTO↔FE↔appconfig unangetastet. Das Sentry-Feld
  (`getSentryConfig` in `GlobalSettings`) und die `licenses`-Collection existieren bereits im
  Fork-Base und werden **nicht** angefasst; nur der Sentry-Env-Default (Betriebs-Config) wird gesetzt.

## Auth / Guards

Keine neuen Routen, daher keine Guards zu portieren. **Kontext-Notiz für Folge-Pakete** (nicht hier):
Der bestehende `LicenseController` (`main.js:43486`) trägt `@ApiAuth()` auf Controller-Ebene und
`@UseGuards(AdminGuard)` auf `POST` (Sign) — wer den Lizenz-Pfad später neutralisiert/ersetzt, muss
diese Guards mit-portieren. Das Drift-Gate und die Doku sind unauthentifizierte Build-/Ops-Artefakte.

## Externe Integrationen

Das Inventar **ist** der Gegenstand. Kategorisierung (Details im Register):
- **A — Harte Laufzeit-Fetches (Break bei Upstream-Tod):** SOGo-CSS ×2 (BE), Plugin-Compose (FE),
  Cookie-Test (FE, **neu erkannt, nicht im Plan**), Lizenzserver (BE).
- **B — Companion-Images (Laufzeit-Docker-Pulls über Plugin-Compose):** ~12 `edulution-*` (+ 2 Kern-App-Images).
- **C — Telemetrie-Egress:** Sentry (opt-in).
- **D — Branding-/Doku-Links (kein harter Break):** `docs.edulution.io`, App-Store-Link, `@edulution-io/ui-kit`-Alias, Titel/Locales — Rebrand §2.5.

**Wechselwirkung CSP:** API-`helmet` setzt `contentSecurityPolicy: !isDevelopmentMode` (`main.js:73167`),
also aktiv in Prod — betrifft aber **API-Antworten**, nicht das von nginx ausgelieferte FE-Dokument.
Die Browser-Fetches nach GitHub (Plugin-Compose, Cookie-Test) laufen heute, weil das FE-Dokument
keine restriktive `connect-src` hat. Sobald das FE eine CSP bekommt (empfohlen), müssen Plugin- und
Cookie-Test-Host **allowlistet** werden — starkes Argument für den späteren BE-Proxy des Plugin-Fetches
(App-Store-Paket). Hier nur als Inventar-Notiz.

## Secrets / Env / master.key

- **Sentry:** `ENABLE_SENTRY`, `SENTRY_EDU_UI_DSN`, `SENTRY_EDU_API_DSN` (`.env.default:88-91`, heute leer=aus).
  Policy und einziger Env-Eingriff dieses Pakets: **`ENABLE_SENTRY=false` explizit** setzen + Kommentar
  „nie Fremd-DSN erben; eigener DSN nur opt-in". **Keine** DSN-Literale committen (Gate prüft das mit).
- **Lizenz:** kein Secret (der Lizenzschlüssel wird zur Laufzeit vom Admin eingegeben; DB-`token`).
- **master.key:** von diesem Paket **nicht** berührt; Cross-Ref DR-Runbook §5.6 bleibt bestehen.
- **Keine** Secrets ins Repo; das Manifest enthält nur öffentliche Host-Namen.

## Trade-offs & Alternativen (mit Empfehlung)

1. **Gate: eigenes tsx-Script vs. ESLint-`no-restricted-syntax` vs. reines `grep` in CI.**
   Empfehlung: **eigenes `tsx`-Script + Manifest-Allowlist** (wie `checkTranslations.ts`). Grund: die
   ~8 legitimen Referenzen müssen allowlistet werden (Datei+Host), was ESLint-Regex schlecht ausdrückt;
   das Script kann zugleich prüfen, dass keine Sentry-DSN-Literale committet sind, und speist später die
   §7-Tracking-Pipeline. Reines CI-`grep` verliert die Allowlist-Semantik.
2. **Manifest-Format: `.ts`-const vs. `.json`/`.yaml`.**
   Empfehlung: **typisierter `.ts`-const-Export** — bekommt SPDX-Header, wird typgeprüft, ist per `tsx`
   direkt importierbar. JSON kann keinen SPDX-Header tragen und ist untypisiert.
3. **Branding-Referenzen (Kategorie D) hier mit-ändern vs. nur inventarisieren.**
   Empfehlung: **nur inventarisieren.** Ein `sed`-Rebrand über `edulution.io` würde den `@edulution-io/ui-kit`-
   Alias und Locales mit-treffen (Deny/Allowlist-Problematik §2.5) und gehört ins Rebrand-Paket. Trennung
   hält beide Pakete testbar.
4. **Gate-Härte: Fehler (exit 1) vs. Warnung.**
   Empfehlung: **Fehler** für nicht-allowlistete Netz-Hosts, damit CI/precommit greift; Kategorie-D-Alias
   (`@edulution-io/ui-kit`, `github.com/edulution-io/edulution-ui`) wird bewusst **ignoriert** (kein Netz-Fetch),
   sonst rauscht das Gate bei hunderten Imports.

## Risiken & Rollback

- **R1 (Gate zu breit → false positives):** Muster trifft `@edulution-io/ui-kit`-Imports/Header-Kommentare.
  Mitigation: Muster strikt auf Netz-URL-Formen (`https://…edulution.io`, `raw.githubusercontent.com/edulution-io`,
  `edulution-io.github.io`, `license.edulution.io`) beschränken, Alias/Issue-TODOs explizit excludieren; Fixture-Test.
- **R2 (Gate zu schmal → false negatives):** Neue Referenz in ungescanntem Pfad. Mitigation: Scan über
  `apps/**` + `libs/**` (ts/tsx/html/json/env), `node_modules`/`dist` aus.
- **R3 (Inventar altert):** Fork zieht ein neues 2.0.x-Feature nach, das eine neue Referenz bringt.
  Mitigation: genau dafür das Gate; Backlog-Andockung an §7-Tracking.
- **Rollback:** rein additiv, keine Laufzeit-Wirkung. Rücknahme = Dateien löschen + `package.json`-Zeilen
  zurücknehmen. Kein DB-/Image-/`schemaVersion`-Effekt.

## Doku-Impact (Augenmaß)

Das **Register** selbst ist das primäre Doku-Artefakt (`docs/supply-chain/…`). Zusätzlich ein kurzer
Verweis im `README`/Ops-Doku auf das Gate (`npm run check-external-references`). Keine
Endnutzer-Doku. Die Datei ist die maschinelle Referenz für spätere Ablöse-Pakete und für §7.

## i18n-Impact (DE+EN)

**Keine neuen i18n-Keys.** Dieses Paket fügt keinen Endnutzer-UI-Text hinzu; alle Artefakte sind
Dev-/Ops-facing (Register + Script). Die bestehenden Branding-Locales (`edulution.io APP` in de/en/fr)
werden **nur inventarisiert**, nicht geändert (Rebrand-Paket).

## Offene Fragen

1. **Lizenzserver-Policy:** Für eine Community-Edition ohne echten Lizenzzwang — (a) eigenen minimalen
   Sign/Verify-Server betreiben, (b) den `LicenseService`-Egress default-neutralisieren (Community-Lizenz
   fest „aktiv"), oder (c) das Lizenz-Modul entfernen? Betrifft `communityLicenseStoreInitialValues.ts`,
   Guards und FE-Dialoge → **eigenes Paket**, Entscheidung §9.
2. **Cookie-Test-Host:** Der 3rd-Party-Cookie-Test braucht zwingend eine **Fremd-Origin**. Eigene
   `<org>.github.io/openedulution-ui/cookie-test.html`-Pages hosten (Quelle liegt als `docs/cookie-test.html`
   bereits im Repo) — hängt am Org-/Pages-Namen (§9). Bis dahin bleibt die Referenz allowlistet.
3. **Plugin-Compose-Endpoint:** eigenen Raw-Endpoint (`<org>/edulution-plugins`-Mirror) vs. BE-Proxy durch
   die API (löst zugleich die CSP-Frage). Entscheidung im App-Store-Paket (P4).
4. **SOGo-CSS:** Mirror auf eigenes `edulution-mail`-Fork-Raw vs. Vendoring der 2 CSS in Image/`./data`
   (entfernt die Laufzeit-GitHub-Abhängigkeit ganz). Entscheidung im Mail-Paket.
5. **Companion-Image-Policy je Image:** selbst bauen (mail/veyon/guacamole/manager/manager-agent/wireguard/
   thumbnails/eventhandler) vs. Upstream-Digest-Pinnen (onlyoffice/collabora/moodle = überwiegend
   Third-Party-Basis). Umsetzungs-/Pin-Ort = `edulution-plugins`-Compose + Installer §5.2.
6. **Gate-Verankerung in CI:** nur `precommit`/`check`-Aggregat (dieses Paket) vs. zusätzlich Blocking-Step
   in `build-and-test.yml` — Letzteres gehört ins CI-Härtungs-Paket §5.1.
