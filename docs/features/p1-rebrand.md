# P1 — Rebrand-Pass (Deny/Allowlist) · Spec

Slug: `p1-rebrand` · Phase P1 · Abhängt von: `p0-supply-chain-inventory`
Kalibrierung: P1 = voll ausführbare, konkrete Tasks (nächste Wochen).

## Problem / Motivation
Der Fork erbt von edulution.io CE (Netzint GmbH) an vielen Stellen fremde Marke, fremde
Registry, fremde Außen-URLs und einen Pre-Commit-Header, der **Netzint-Copyright „all rights
reserved" + einen kommerziellen Lizenz-Arm** in jede **neue** Datei stempelt. Solange das so
bleibt, würde Kevins eigener Code automatisch Fremd-Copyright tragen (Widerspruch zum
AGPL-only-Fork), `nx affected` liefe gegen die tote Basis `dev`, veröffentlichte Images
zeigten auf `ghcr.io/edulution-io/*`, und die App verlinkt live auf `docs.edulution.io`, den
Apple-App-Store-Eintrag der Fremd-Mobile-App und einen QR-Login gegen eben diese App.
Zusätzlich fehlen **NOTICE/Attribution**, die Klarstellung der **dualen Lizenz** (AGPL-Arm)
und die Grundlage für das später hinzuzufügende **AGPL-§13-Feature**.

Dies ist ein **Rebrand-Pass mit Deny/Allowlist** (kein naives `sed`): user-sichtbare/
veröffentlichte edulution-Referenzen raus, aber Wiring-Tokens (`@edulution-io/ui-kit`-Alias,
`edu-*`, `isEdulutionApp`, `EDULUTION_MANAGER_*`, `/opt/edulution/api`-Pfade, Realm-/
Klassennamen) bleiben.

## Ziel & Nicht-Ziele (YAGNI)
**Ziel**
- Veröffentlichte Image-/Registry-Refs `ghcr.io/edulution-io/edulution-{ui,api}` → eigene Org
  (Empfehlung `ghcr.io/faircomp/linuxmuster-{ui,api}`, s. OF1) in Workflows + `package.json` + `README`.
- `scripts/addLicenseHeader.ts`: `licenseText` → eigener `SPDX-License-Identifier:
  AGPL-3.0-or-later`-Header (Copyright Kevin Stenzel, **kein** Netzint-Kommerz-Arm), idempotent.
- `nx.json:3` `defaultBase: "dev" → "main"`.
- In-App-Fremd-URLs: `EDU_DOCS_URL` (`urls.ts:22`), `EDU_APP_APPSTORE_URL` (`urls.ts:20`),
  `webdavTutorialLinks.ts` (3× `docs.edulution.io`) repointen/ausblenden; **QR-Login** +
  **Mobile-Access-Kachel** hinter Feature-Flag verbergen (Empfehlung, OF4).
- User-sichtbarer Produktname: `index.html` (Title/Description/OG), Favicon/Loader-Logo
  neutralisieren, user-sichtbare i18n-Produktnamen-Strings (DE+EN).
- Legal-Grundlage: `NOTICE`, Fork-`CHANGELOG.md`, `LICENSE_EXCEPTIONS.md` → eigenes
  Trademark-Statement, `README` mit Attribution + **dualer-Lizenz-Klarstellung** + **§13-Vorbereitung**.
- `AGENTS.md`/`CLAUDE.md` Rebrand-Prüfung (nur wegen „edulution"-Nennungen, **kein** Netzint-Copyright).
- Rebrand-Schlussaudit (Denylist-grep als Regressions-Guard).

**Nicht-Ziele (bewusst raus)**
- **`EDU_PLUGINS_GITHUB_URL` (`urls.ts:21`)** — App-Store-Compose-Fetch → gehört ins
  Supply-Chain-/DockerService-Paket (§5.3/§3.4), **hier nicht angefasst**.
- **CI-Architektur**: Green-Gate, `permissions:`-Block, Löschen der redundanten
  `api-tag.yml`/`frontend-tag.yml`, `docker/metadata-action`, Build-Metadaten → separates
  CI-Härtungs-Paket (§5.1). Hier **nur** die Refs repointen (OF6).
- **§13-UI-Feature selbst** (Quellcode-Angebot im UI) → separates P1-Feature; hier nur die
  Vorbereitung (Konstanten + Attribution + Handoff-Notiz).
- **Netzint-Copyright-Header auf Bestandsdateien** — **NICHT anfassen**.
- **Installer-Repo** (`ghcr.io/edulution-io/*`, `get.edulution.io`, Public-Page) → eigenes
  Paket `p1-installer` (§5.2).
- Lizenzserver-Subsystem stubben (§2.5/OF) → separates Paket.
- Finales Logo-/Marken-Design (nur neutraler Platzhalter, OF5).
- Default-Config-Härtung (CORS/Realm) → separates Härtungs-Paket.

## Betroffene Komponenten & Dateien (konkrete Pfade)
**Registry/Refs (12 Treffer `ghcr.io/edulution-io/edulution-{ui,api}`)**
- `.github/workflows/container-build.yml:47,57`
- `.github/workflows/build-and-test.yml:48,106`
- `.github/workflows/api-tag.yml:20`
- `.github/workflows/frontend-tag.yml:20`
- `package.json:19,20,21,22`
- `README.md:100,101`

**Pre-Commit-Header**
- `scripts/addLicenseHeader.ts` (`licenseText`-Konstante ~Z.23–39; `hasLicenseHeader` ~Z.46).
  `scripts/checkTranslations.ts`/`scripts/checkErrorMessages.ts` tragen denselben Header **als
  Bestandsdatei** (nur Kommentar, kein Stempel) → **nicht anfassen**.

**nx**
- `nx.json:3` `defaultBase`.

**In-App-URLs / FE-Fremdbezüge**
- `libs/src/common/constants/urls.ts:20,22` (`EDU_APP_APPSTORE_URL`, `EDU_DOCS_URL`).
- `libs/src/filesharing/constants/webdavTutorialLinks.ts:21,25,29` (3× `docs.edulution.io`).
- `apps/frontend/src/pages/UserSettings/MobileAccess/MobileFileAccessSetupBox.tsx:32`
  (`EDU_APP_SETUP_URL = ${EDU_DOCS_URL}/docs/edulution-app/setup`).
- `apps/frontend/src/pages/LoginPage/LoginPage.tsx` (QR-Login-Toggle `showQrCode`, Z.85/269/409ff).
- `apps/frontend/src/router/routes/getPrivateRoutes.tsx:28,38,95,96` (`MOBILE_ACCESS_PATH` +
  `UserSettingsMobileAccess`-Route).

**Produktname / Assets**
- `apps/frontend/index.html:26,29,41` (Title/Description/OG), `:47` favicon-Ref + Loader-SVG (Z.51ff Base64-Logo).
- `apps/frontend/public/favicon.svg` (bzw. Ablageort der Favicon-Datei).
- `apps/frontend/src/locales/{de,en}/translation.json` (user-sichtbare „edulution"-Displaystrings, s.u.).

**Legal**
- neu: `NOTICE`, `CHANGELOG.md`; umbenennen/ersetzen: `LICENSE_EXCEPTIONS.md` → `TRADEMARK.md`;
  `README.md`. `LICENSE` (AGPLv3) **unverändert**.

**Rebrand-Prüfung (kein Netzint-Copyright, nur „edulution"-Check)**
- `AGENTS.md`, `CLAUDE.md` (aktuell verifiziert **ohne** „edulution"/„netzint"-Treffer → Guard-Task).

**Allowlist — bleibt (verifiziert)**: `@edulution-io/ui-kit`-Import-Specifier (tsconfig-Alias),
`edu-*`-Wiring, `isEdulutionApp`/`EDULUTION_APP_AGENT_IDENTIFIER`, `EDULUTION_MANAGER_APPLICATION_NAME`,
`edulution-manager`, `edu_`-Icon-Pfade, `settings.globalSettings.ldap.edulution-binduser-*`-Keys,
`/opt/edulution/api`-WORKDIR (Dockerfiles), Issue-URL-Kommentare (`github.com/edulution-io/edulution-ui/issues/...`,
Provenienz).

## Quelle des Solls
Kein Rekonstruktions-Nachbau — reine Rebrand-/Legal-Änderung. Belege aus dem 1.6-Repo-Ist
(verifiziert in dieser Planung): `PLAN-openedulution-fork.md` §2.3/§2.4/§2.5/§4.1/§9 (Z.69,76–83,
89,93,95,97,99,202,454), `nx.json:3`, `scripts/addLicenseHeader.ts:23–39`, `urls.ts:20–22`,
`webdavTutorialLinks.ts`, die 4 Workflow-Dateien, `package.json:19–22`, `README.md`,
`LICENSE_EXCEPTIONS.md`, `apps/frontend/index.html`. Kein main.js-Anker, kein Rescue-Branch,
keine Baseline nötig.

## Datenmodell / API / Migrationen
**Keine.** Keine neuen Routen/DTOs/Mongoose-Schemas, **keine DB-Migration**, kein
`schemaVersion++`. **Kein Contract-Drift** (API↔DTO↔FE↔appconfig) — die Ref-/URL-/Text-Änderungen
berühren keinen Wire-Contract. Ausnahme QR-Login: nur das **FE** wird verborgen; der BE-Endpoint
`AUTH_ENDPOINT/AUTH_QRCODE` (SSE, `createQrCodeSlice.ts`) bleibt unverändert bestehen.

## Auth / Guards
Keine Guard-Änderung. Das Verbergen der QR-Login-/Mobile-Access-**FE** entfernt **nicht** den
zugehörigen BE-Endpoint bzw. dessen `@Public`/Guard-Dekoration — BE bleibt intakt (kein
Bypass-Risiko, aber auch keine Abschaltung; falls die BE-Route stillgelegt werden soll → separates
Paket). Explizit: keine `@Public`/`AdminGuard`/`IsPublicAppGuard`-Deklaration wird verändert.

## Externe Integrationen
Funktional keine Änderung. `EDU_DOCS_URL`/`webdavTutorialLinks`/`EDU_APP_APPSTORE_URL` sind nur
UI-Deeplinks (Repoint/Verbergen). **`EDU_PLUGINS_GITHUB_URL` bleibt unangetastet** (DockerService-
App-Store-Fetch, eigenes Paket). Keine Berührung von linuxmuster-api7, Keycloak, WebDAV/SOGo,
Mailcow, Collabora.

## Secrets / Env / master.key
Keine neuen Env-Vars, kein Keycloak-Client-Secret, **keine Berührung von `MASTER_ENCRYPT_KEY`/
gewrappten User-Keys**. Der Registry-Rebrand ändert nur das Push-Ziel (GHCR-Org) — die
tatsächliche GHCR-Auth/`permissions:`-Umstellung ist CI-Härtungs-Paket. Kein Backup-/Rollback-
Kopplungspunkt.

## Trade-offs & Alternativen (mit Empfehlung)
- **Refs: Strings ersetzen vs. zentrales `env: REGISTRY_ORG`.** Empfehlung: **Strings ersetzen**
  (12 Stellen, disjunkt), das Heben in eine zentrale Workflow-`env` + Löschen der redundanten
  Tag-Workflows dem CI-Härtungs-Paket überlassen — hält `p1-rebrand` klein und ohne
  CI-Architektur-Risiko.
- **QR-Login/Mobile-Access: verbergen vs. repointen.** Empfehlung: **verbergen** hinter
  `MOBILE_APP_ENABLED=false` (§9 Dec 13) — es gibt keine eigene Mobile-App; ein Repoint würde ins
  Leere zeigen. Rückholbar durch Flag-Umschalten, sobald eine eigene App existiert.
- **Docs-Deeplinks: repointen vs. ausblenden.** Empfehlung: **an `MOBILE_APP_ENABLED`/eine
  `PRODUCT_DOCS_URL`-Konstante koppeln**; solange keine eigenen Docs existieren, Tutorial-Deeplinks
  + MobileFileAccess-Box ausblenden statt auf tote/fremde Docs zu zeigen.
- **Logo/Favicon: neutraler Platzhalter jetzt vs. finales Design abwarten.** Empfehlung:
  **neutraler Platzhalter jetzt** (das markenrechtlich geschützte edulution-Blatt-Logo **muss**
  vor jedem Image-Publish raus), finales Logo als späterer Design-Schritt (OF5).
- **`hasLicenseHeader`-Idempotenz.** Empfehlung: neuer Header behält die Phrase „GNU Affero
  General Public License" (→ `hasLicenseHeader` matcht unverändert weiter) **und** enthält
  `SPDX-License-Identifier: AGPL-3.0-or-later` — kein Logik-Umbau nötig, Bestands-Netzint-Dateien
  bleiben als „hat Header" erkannt und werden übersprungen.

## Risiken & Rollback
- **Risiko**: Über-eifriges Ersetzen bricht Wiring (`@edulution-io/ui-kit`-Alias,
  `isEdulutionApp`, `/opt/edulution/api`) → Build/Runtime-Bruch. **Gegenmaßnahme**: strikte
  Allowlist, `npm run build` + `npm run lint` als Verify je Task, Schluss-Denylist-Audit (T16).
- **Risiko**: neuer `licenseText` nicht idempotent → doppelte Header bei jedem Commit.
  **Gegenmaßnahme**: Verify läuft `addLicenseHeader` zweimal und prüft „genau ein Header".
- **Risiko**: `check-translations` bricht bei i18n-Wert-Sweep (Key-Parität). **Gegenmaßnahme**:
  nur **Werte** ändern, keine Keys entfernen/hinzufügen; `npm run check-translations` als Verify.
- **Rollback**: reine Datei-/Config-Änderungen, **keine Migration, kein `master.key`** →
  `git revert` des jeweiligen Task-Commits genügt. Kein DB-Dump nötig.

## Doku-Impact (Augenmaß)
Dies **ist** überwiegend Doku/Legal: `NOTICE`, `CHANGELOG.md`, `TRADEMARK.md`, `README.md`
(Attribution + duale-Lizenz-Klarstellung + §13-Vorbereitung). Zusätzlich zwei knappe ADRs unter
`docs/adr/` (Naming/Registry OF1; QR-/Mobile-Access-Verbergen OF4). Kein weiterer `docs/`-Bedarf.

## i18n-Impact (DE+EN)
- **Keine neuen Keys zwingend.** T14 ändert **Werte** user-sichtbarer „edulution"-Displaystrings
  (DE+EN, `check-translations`-Parität bleibt gewahrt). Betroffen u. a.
  `appstore.edulutionIcons` („edulution Icons"), `mobileAccessSetup.scanAccessInfo` („edulution
  App"), `auth.errors.EdulutionConnectionFailed` („edulution Server"). Der Key-**Name**
  `EdulutionConnectionFailed`/`edulutionIcons` bleibt (Wiring), nur der **Wert** wird neutralisiert.
- `fr/translation.json` existiert als dritte Locale; DE+EN sind Pflicht, FR-Werte optional
  mitziehen (Key-Parität ist bereits gegeben).
- Allowlist: `settings.globalSettings.ldap.edulution-binduser-*` (Feld-Keys) **nicht** umbenennen.

## Offene Fragen
- **OF1 — Produktname + exakte ghcr-Image-Namen.** Empfehlung: Org `faircomp`, Images
  `ghcr.io/faircomp/linuxmuster-{ui,api}`, Anzeigename „linuxmuster". Hinweis: „linuxmuster" ist
  selbst eine Marke (linuxmuster.net e.V.) — Kevin betreibt LMN, ggf. formal abklären. **Blockiert
  die konkreten Ref-/Title-Zielwerte** (Tasks nutzen bis dahin diese Empfehlung als Platzhalter).
- **OF2 — Eigene Docs-Domain für `EDU_DOCS_URL`/`webdavTutorialLinks`.** Empfehlung: bis eigene
  Docs existieren, Tutorial-Deeplinks + MobileFileAccess-Box **ausblenden** (an `MOBILE_APP_ENABLED`
  koppeln); alternativ `PRODUCT_DOCS_URL` auf das Repo-README zeigen.
- **OF3 — Apple-App-Store-URL** (keine eigene Mobile-App). Empfehlung: Link **entfernen/ausblenden**.
- **OF4 — QR-Login + Mobile-Access-Kacheln verbergen vs. behalten.** Empfehlung: **verbergen**
  (`MOBILE_APP_ENABLED=false`), solange keine eigene Mobile-App (§9 Dec 13). T10/T11 setzen die
  Empfehlung um; bei „behalten + repointen" ändern sie sich.
- **OF5 — Finales Logo/Favicon.** Empfehlung: neutraler Platzhalter jetzt, echtes Logo als
  separater Design-Schritt.
- **OF6 — CI-Architektur-Bestätigung.** `p1-rebrand` repointet **nur** die Refs; Green-Gate,
  `permissions:`, Löschen von `api-tag.yml`/`frontend-tag.yml`, `metadata-action`/Build-Metadaten
  bleiben dem CI-Härtungs-Paket. Bestätigen.
- **OF7 — Duale-Lizenz-Formulierung.** Bestätigen: Fork läuft ausschließlich unter dem
  **AGPL-3.0-or-later-Arm**; neuer Code trägt **keinen** Netzint-Kommerz-Arm; Netzint-Copyright auf
  Bestandsdateien bleibt unverändert.
