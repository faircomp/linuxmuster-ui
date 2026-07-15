# p1-installer-repoint — Installer-Umbiegung, ui-kit inlinen, Lizenzserver stubben, §13-Feature, App-Store-Mirror

> Kalibrierung: P1 — voll ausführbares Paket (nächste Wochen). Konkrete Tasks, keine Rekonstruktions-
> Unsicherheit. Einzige „weiche" Stelle: die exakten Zielwerte (ghcr-Org, gepinnter Tag, Mirror-Host)
> kommen aus den Abhängigkeiten `p1-own-ci-registry` (Org/Tag) und `p0-supply-chain-inventory`
> (Mirror-Entscheidung) bzw. aus `p1-rebrand` OF1 (`faircomp` / `linuxmuster-*`). Bis dahin
> Platzhalter, in den Tasks klar markiert.

## Problem / Motivation
Der Fork soll ausschließlich aus **eigener** Lieferkette laufen. Im geerbten Stand ziehen mehrere
Pfade weiterhin auf `edulution-io`-Infrastruktur, die (a) für Fremde nicht zugänglich (privates
GitHub-npm-Registry), (b) potenziell tot (Netzint-Lizenzserver, `edulution-plugins`-Raw-Fetch) oder
(c) markenrechtlich/AGPL-rechtlich zu ersetzen ist:

- **Installer-Compose-Template** (`linuxmuster-ui-installer`) referenziert `image: ghcr.io/edulution-io/edulution-{ui,api}` **ohne gepinnten Tag** → jeder Deploy zieht ein fremdes, unversioniertes Image.
- **Installer-Self-Pull** zieht `ghcr.io/edulution-io/edulution-installer:${TAG}` + Bootstrap-Raw von `edulution-io/edulution-installer`.
- **`@edulution-io/ui-kit@^0.0.1`** wird im Installer-Repo aus dem **privaten** `npm.pkg.github.com`-Registry gezogen (`.npmrc` mit `${GITHUB_TOKEN}`) → ein AGPL-Nutzer ohne Netzint-Token kann den Installer nicht bauen.
- **`license.edulution.io/api/v1`** (Netzint-Lizenzserver) wird als axios-baseURL benutzt; das gesamte Community-Lizenz-Subsystem telefoniert nach Netzint (`sign`/`verify`, periodisch). AGPL-Arm braucht das nicht.
- **AGPL §13** verlangt ein prominentes Quellcode-Angebot an Netzwerk-Nutzer. Das existiert im UI **nicht** (Plan §2.4/Zeile 81) — es muss als neues Feature ergänzt werden.
- **`EDU_PLUGINS_GITHUB_URL`** (`urls.ts:21`) fetcht die App-Store-/DockerService-Compose-Dateien live von `raw.githubusercontent.com/edulution-io/edulution-plugins` → 3. Laufzeit-Fetch, tot-Risiko (Plan §5.3/R3).

Ziel des Pakets: alle diese Außenreferenzen auf eigene Registry/eigenen Mirror/eigenen Quellcode
umbiegen bzw. stubben, plus das §13-Feature nachrüsten.

## Ziel & Nicht-Ziele (YAGNI)
**Ziel**
1. Installer-Compose-/Realm-/Traefik-Templates + Installer-Self-Pull → **eigene ghcr-Org + gepinnter Tag**.
2. Privaten `@edulution-io/ui-kit` im Installer-Repo **inlinen** (Quelle vendorn, Import-Specifier behalten, privates Registry droppen).
3. `license.edulution.io` **stubben** (Community-/AGPL-Modus, env-gated) — Empfehlung stub statt Hard-Delete.
4. **AGPL-§13-Quellcode-Angebot** als UI-Feature (Settings/Info + Login-Footer), Repo-URL + laufende Version.
5. `EDU_PLUGINS_GITHUB_URL` → **eigener Mirror** (env-konfigurierbar), inkl. Verify des Store-Fetch-Contracts.

**Nicht-Ziele (bewusst raus)**
- **Kein** Rebrand der veröffentlichten `ghcr.io/edulution-io/*`-Refs **im `edulution-ui`-Repo** (Workflows/`package.json`/`README`) — das ist `p1-rebrand`. Hier nur die **Installer-Repo**-Refs (die `p1-rebrand` explizit an dieses Paket delegiert, Spec `p1-rebrand` §Nicht-Ziele Z48–49).
- **Kein** Umbenennen des Import-Specifiers `@edulution-io/ui-kit` (Allowlist in `p1-rebrand`) — nur die Auflösung (tsconfig-Path) und die npm-Bezugsquelle ändern.
- **Kein** Repoint von `EDU_DOCS_URL`/`EDU_APP_APPSTORE_URL`/`webdavTutorialLinks` (`urls.ts:20,22`) — das ist `p1-rebrand` T9.
- **Kein** Mirror/Vendoring der 2× SOGo-Theme-CSS (`main.js:25091–25092`) — Mail-Paket.
- **Kein** Mirror der Third-Party-Companion-Images (mongo/redis/traefik/keycloak/postgres) — `p0-supply-chain-inventory`.
- **Kein** BE-Proxy für den App-Store-Fetch (größere Design-Änderung) — reiner URL-Repoint; BE-Proxy als offene Frage.
- **Kein** Anlegen der ghcr-Org/-Tags/-Pipeline und **kein** Aufsetzen des Mirror-Hosts selbst — das leisten `p1-own-ci-registry` bzw. `p0-supply-chain-inventory`; hier nur die Konsumenten-Seite.
- **Keine** Hard-Deletion des Lizenz-Subsystems (Schema/Route/DTO bleiben, nur neutralisiert) — vermeidet Contract-/Health-Drift.

## Betroffene Komponenten & Dateien (konkrete Pfade)

### Repo `linuxmuster-ui-installer` (`/home/kevin/Dev/faircomp/openedulution/edulution-installer`, Remote `faircomp/linuxmuster-ui-installer`)
- `apps/public-page/public/download/docker-compose.yml.template` — `edu-ui`/`edu-api` Image-Refs (Z4, Z18) ohne Tag.
- `apps/public-page/public/download/traefik.yml.template` — **auditiert: keine first-party Image-/edulution-io-Ref** (kein Change nötig, nur Prüf-Assertion).
- `apps/public-page/public/download/realm-edulution.json.template` — **auditiert: keine ghcr-/edulution-io-Registry-Ref** (Realm-Client-Config, kein Registry-Belang; kein Change nötig).
- `apps/public-page/public/installer` (Shell-Script) — Z213/216 `docker pull … ghcr.io/edulution-io/edulution-installer:${EDULUTION_INSTALLER_TAG}`.
- `edulution-lmninstaller/bootstrap.sh` — Z14 `GITHUB_REPO="edulution-io/edulution-installer"`, Z16 `GITHUB_RAW=…`.
- `apps/webinstaller-api/app/main.py` — Z462 `BOOTSTRAP_URL = …raw.githubusercontent.com/edulution-io/edulution-installer/…`.
- `.npmrc` — `@edulution-io:registry=https://npm.pkg.github.com` + `_authToken=${GITHUB_TOKEN}`.
- `package.json` — Z15 `"@edulution-io/ui-kit": "^0.0.1"`; `package-lock.json` — Z1954 privater Registry-Download.
- `libs/shared-ui/…` — bestehendes lokales Lib-Muster; **neu** `libs/ui-kit/…` (vendorter Quelltext).
- `tsconfig.base.json` (Installer) — Path-Mapping für `@edulution-io/ui-kit`.

### Repo `edulution-ui` (nx-Monorepo, dieses Repo)
- `libs/src/license/constants/licenseServerUrl.ts` — `LICENSE_SERVER_URL='https://license.edulution.io/api/v1'`.
- `apps/api/src/license/license.service.ts` — axios-baseURL, `signLicense`/`verifyToken`/`checkLicenseValidity`.
- `apps/api/src/license/license.controller.ts` — GET/POST `license` (POST unter `AdminGuard`).
- `libs/src/license/types/license-info.dto.ts` — Response-Shape (Contract).
- `apps/frontend/src/pages/Settings/components/{LicenseOverview,RegisterLicenseDialog,LicenseField}.tsx` — kommerzielle Register-UI.
- `apps/frontend/src/pages/UserSettings/Info/{CommunityLicenseDialog.tsx,useCommunityLicenseStore.ts}` — Community-Lizenz-UI.
- `apps/frontend/src/pages/Settings/Info/InfoPage.tsx` — Trägerseite für das §13-Feature.
- `apps/frontend/src/pages/LoginPage/LoginPage.tsx` — Login-Footer für den prominenten §13-Link.
- `libs/src/common/constants/urls.ts` — Z21 `EDU_PLUGINS_GITHUB_URL` (**nur diese Zeile** — Z20/22 gehören `p1-rebrand` T9).
- `apps/frontend/src/pages/Settings/AppConfig/DockerIntegration/useDockerApplicationStore.ts` — `getDockerContainerConfig`/`getTraefikConfig` bauen den Fetch-URL.
- `apps/frontend/src/locales/{de,en,fr}/translation.json` — i18n.

## Quelle des Solls
- **`main.js:43800`** `LICENSE_SERVER_URL='https://license.edulution.io/api/v1'`; **`main.js:43629–43746`** `LicenseService` (sign/verify) — bestätigt, dass der 2.0.200-Stand identisch nach Netzint telefoniert. Stub = bewusste Fork-Abweichung.
- **`main.js:59719`** `commitSha: process.env.COMMIT_SHA || 'unknown'` (+ `:59720/59721` buildDate/buildNumber); **`main.js:56954–56956`** Health-Endpoint gibt sie aus → Quelle der „laufenden Version" fürs §13-Feature.
- **`libs/src/common/constants/urls.ts:21`** (1.6-Source im Repo) `EDU_PLUGINS_GITHUB_URL` — App-Store-Fetch-Basis; 2.0-Verhalten identisch (Konstante ist Frontend-seitig, nicht im API-`main.js`).
- **Installer-Repo-Dateien** (oben, mit Zeilenankern) — direkter Ist-Stand, kein Rekonstruktions-Zweifel.
- **Kein** Rescue-Branch relevant (Infrastruktur/Legal, kein gerettetes Feature).
- **Baseline:** `docs/features/p1-rebrand.md` (delegiert Installer + `EDU_PLUGINS` + §13 hierher, liefert `PRODUCT_SOURCE_URL`/`PRODUCT_NAME`), `docs/features/p0-supply-chain-inventory.md` (Mirror-Host-Entscheidung, Z39/42/174).

## Datenmodell / API / Migrationen
- **DB-Migration: NEIN.** Das `licenses`-Schema bleibt unverändert. Der Community-Modus wird **berechnet** (kein neues persistiertes Feld). `schemaVersion` bleibt.
- **Contract-Drift (bewusst, minimal):** `license-info.dto.ts` bekommt ein **berechnetes** `isCommunity: boolean` (BE-seitig gesetzt, wenn kein Lizenzserver konfiguriert). Betrifft die Kette libs-DTO → API-Response (`GET /license`) → FE-Konsum (Register-UI-Gate). Kein appconfig-Shape, kein Keycloak-Realm, kein ghcr-Ref betroffen.
- **Keine neue Route.** GET/POST `license` bleiben; POST wird im Community-Modus zur No-op-/409-Antwort (Design in T6), `AdminGuard` bleibt.
- **§13-Feature:** rein FE + eine libs-Konstante (aus `p1-rebrand` T8 wiederverwendet, `PRODUCT_SOURCE_URL`). Die laufende Version kommt best-effort aus dem bestehenden Health-Endpoint; **kein** neuer BE-Endpunkt.
- **App-Store-Fetch:** `EDU_PLUGINS_GITHUB_URL` ist eine reine Frontend-Konstante; kein DTO/Schema. Der Store-Fetch-Contract (Pfadlayout `<app>/<container>/docker-compose.yml` + `<app>.yml`) muss beim Mirror **layout-gleich** bleiben, sonst Store-Anpassung nötig (T11 verifiziert das).

## Auth / Guards (welche mit-portieren)
- **`AdminGuard`** auf `POST /license` (`license.controller.ts`) **bleibt** — im Community-Stub nicht entfernen, nur die Handler-Logik neutralisieren.
- **`GET /license`** bleibt wie gehabt (gecacht, `CacheInterceptor`).
- **§13-Feature Login-Footer (T9):** wird **vor** Auth gerendert → zeigt **nur** den statischen Repo-Link (kein API-Call, keine Version), damit kein neuer unauth. Endpoint entsteht. Der versionierte Teil (T8) läuft in der authentifizierten Settings/Info-Seite und nutzt den bestehenden Health-/Version-Pfad (kein neuer Guard).
- **App-Store-Store (T10/T11):** unverändert client-seitiger `axios.get` gegen Raw-Host (bisheriges Verhalten), keine Guard-Änderung.

## Externe Integrationen
- **Eigene ghcr-Org** (aus `p1-own-ci-registry` / `p1-rebrand` OF1): Platzhalter `ghcr.io/faircomp/linuxmuster-{ui,api}` + `ghcr.io/faircomp/linuxmuster-ui-installer`.
- **Eigener Plugins-Mirror** (aus `p0-supply-chain-inventory` §174): Platzhalter `raw.githubusercontent.com/faircomp/linuxmuster-plugins/main/apps` (eigener Fork von `edulution-plugins`) — Empfehlung Raw-Fork; Alternative BE-Proxy (offene Frage).
- **Netzint-Lizenzserver:** wird **entkoppelt** (kein Fremd-Call mehr im Default).
- **Keycloak-Realm** (`realm-edulution.json.template`): nur auditiert, kein Registry-Belang; Realm-Rebrand ist `p0-realm-diff-baseline`/`p1-rebrand`, nicht hier.

## Secrets / Env / master.key
- **Entfernt** eine Secret-Abhängigkeit: der `${GITHUB_TOKEN}` im Installer-`.npmrc` fällt weg (T5) → Installer baubar ohne Netzint-/Fremd-Token. Positiv fürs Supply-Chain-Risiko.
- **Neue optionale Env-Vars (Empfehlung, alle mit sicherem Default):**
  - API: `LICENSE_SERVER_URL` (Default **leer** → Community-Modus, kein Outbound-Call). (T6)
  - Frontend (Vite, build-time): `VITE_PLUGINS_BASE_URL` (Default = eigener Mirror-Raw). (T10)
  - Installer (Compose-Template, deploy-time): `EDULUTION_UI_TAG` / gepinnter Tag im Template. (T1)
- **master.key / `MASTER_ENCRYPT_KEY` / gewrappte User-Keys:** **nicht berührt**. Keine Backup-/Rollback-Kopplung durch dieses Paket.
- Es dürfen **keine** Secrets committet werden (Env-Defaults sind nicht-geheime URLs/Tags).

## Trade-offs & Alternativen (mit Empfehlung)
1. **Lizenzserver: stubben vs. hard-delete vs. eigener Endpoint.** — **Empfehlung: stubben (env-gated Community-Modus).** Schema/Route/DTO bleiben → kein Health-/appconfig-Contract-Drift, reversibel, kleiner Diff. Hard-Delete riskiert Folge-Referenzen (InfoPage, useCommunityLicenseStore, Cache-Key). Eigener Endpoint = unnötige Infrastruktur für einen AGPL-Arm ohne kommerzielle Lizenzen.
2. **ui-kit: vendorn vs. auf eigene Registry re-publishen.** — **Empfehlung: vendorn (Quelle in `libs/ui-kit` des Installers, Import-Specifier + tsconfig-Path behalten).** Installer ist winzig (Button + `cn` + tailwind-config); Vendoring braucht **kein** Registry-Auth beim Build. Re-Publish an eigene Org zöge wieder Token-/Pipeline-Kopplung (das ist ohnehin `p1-own-ci-registry`-Thema fürs UI-Monorepo). Import-Specifier bleibt `@edulution-io/ui-kit` (Rebrand-Allowlist).
3. **Plugins-Mirror: eigener Raw-Fork vs. BE-Proxy.** — **Empfehlung: eigener Raw-Fork**, layout-gleich → nur Konstante ändern, Store bleibt. BE-Proxy (API cached/liefert Compose) wäre robuster gegen Raw-Ausfälle, ist aber ein eigenes Feature (neue Route + Guard) → offene Frage, nicht hier.
4. **Registry-Refs: Strings ersetzen vs. `env: REGISTRY_ORG`.** — Konsistent mit `p1-rebrand`-Empfehlung: **Strings ersetzen** (deploy-time-Tag als Template-Var). Zentrale Env nur im Installer-Compose-Template sinnvoll.

## Risiken & Rollback
- **R — Falscher/instabiler Tag im Compose-Template.** Ein nicht existierender gepinnter Tag bricht jeden Neu-Deploy. Mitigation: Tag-Wert kommt verifiziert aus `p1-own-ci-registry` (erst-gepushtes Image), Voll-Stack-Verify auf crabbox vor Merge.
- **R — Mirror-Layout weicht ab.** Wenn der eigene Plugins-Fork das Verzeichnislayout ändert, liefert der Store leere `services` (App-Store leer). Mitigation: layout-gleich forken; T11-Test pinnt die URL-Konstruktion.
- **R — Community-Stub bricht InfoPage/Store.** `getLicenseDetails` muss weiter ein valides `LicenseInfoDto` liefern. Mitigation: T6-Jest-Test + FE-Gate liest `isCommunity`.
- **R — ui-kit-Vendoring driftet vom UI-Monorepo-ui-kit.** Zwei Kopien. Mitigation: Installer nutzt nur `Button`+`cn` (stabil); Divergenz ist tolerierbar, in ADR notiert.
- **Rollback:** rein additiv/config-seitig, keine Migration → Rollback = vorheriger Commit + vorheriger Image-Tag. **Kein** DB-Dump/master.key nötig (kein persistenter Zustand geändert).

## Doku-Impact (Augenmaß)
- **Installer-`README`** (Installer-Repo): kurzer Hinweis auf eigene Registry/Tag + dass kein privates npm-Token mehr nötig ist. (DE/EN nach vorhandenem Stand des Installer-Repos.)
- **`edulution-ui` `docs/`:** kurzer Eintrag zu (a) Community-/AGPL-Lizenzmodus (env `LICENSE_SERVER_URL` leer) und (b) §13-Quellcode-Angebot (wo im UI). DE+EN.
- **ADR** (`docs/adr/`): Lizenzserver-Stub-Entscheidung + Plugins-Mirror-Entscheidung (verweist auf `p0-supply-chain` §174 und Plan §9.5).
- **`.env.default`/`.env.development`:** neue optionale Vars dokumentieren (`LICENSE_SERVER_URL`, `VITE_PLUGINS_BASE_URL`).
- Reine Installer-Template-/Wiring-Änderungen: intern, keine Doku.

## i18n-Impact (DE+EN, fr mitziehen)
- **Neu (T8/T9, §13-Feature):** `settings.sourceOffer.title`, `settings.sourceOffer.description`, `settings.sourceOffer.repositoryLink`, `settings.sourceOffer.version` (+ Login-Footer-Reuse). DE **und** EN Pflicht; **fr** mitpflegen, da `scripts/checkTranslations.ts` Parität über alle vorhandenen Locales (de/en/fr) erzwingt.
- **T7 (Community-Gate):** ggf. `settings.license.communityNotice` (Ersatztext statt Register-Feld). DE+EN(+fr).
- Übrige Tasks: keine i18n.

## Offene Fragen
- **OF1 — Exakte ghcr-Org + Image-Namen + Installer-Image-Name.** Kommt aus `p1-own-ci-registry` / `p1-rebrand` OF1 (Empfehlung `faircomp` / `linuxmuster-{ui,api}` / `linuxmuster-ui-installer`). Bis Freigabe Platzhalter.
- **OF2 — Gepinnter Tag-Wert fürs Compose-Template.** Erst nach erstem eigenen Release-Build bekannt (`p1-own-ci-registry`). Versionsschema `2.0.x` (Plan §2). Bis dahin `:latest`-Verbot, Platzhalter `:<PINNED_TAG>`.
- **OF3 — Lizenzserver: stub vs. hard-delete.** Empfehlung stub (siehe Trade-offs). Braucht Kevin-Freigabe (Plan §9.5).
- **OF4 — Plugins-Mirror: eigener Raw-Fork vs. BE-Proxy vs. vorerst allowlisten.** Empfehlung Raw-Fork; koppelt an `p0-supply-chain-inventory` §174. Falls Mirror-Host noch nicht steht, bleibt der Repoint bis dahin auf den Fork-Raw als Zielwert konfiguriert.
- **OF5 — §13-Versionsquelle.** Health-Endpoint liefert `commitSha/buildDate/buildNumber` nur, wenn `p1-own-ci-registry` die Build-Metadaten (`COMMIT_SHA`/`BUILD_DATE`/`BUILD_NUMBER` via ARG/LABEL/metadata-action) verdrahtet (sonst „unknown"). §13-Link ist davon **unabhängig** (statisch); nur die Versionsanzeige degradiert graceful zu „unknown". Ist die separate Build-Metadaten-Verdrahtung Teil dieses Pakets oder von `p1-own-ci-registry`? Empfehlung: dort.
- **OF6 — Koordination geteilter Datei `urls.ts`.** `p1-rebrand` T9 editiert `urls.ts:20,22`, dieses Paket `urls.ts:21`. Seriell oder sorgfältiger Merge — am Gate klären (kein logischer Konflikt, nur Datei-Überlappung).
- **OF7 — `publish-ui-kit.yml` im UI-Monorepo.** Publiziert ui-kit weiter ins fremde `npm.pkg.github.com`. Neutralisieren/umbiegen gehört zu `p1-own-ci-registry` (CI→eigene Org), nicht hierher — nur als Handoff notiert.
