<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# Basis-Drift-Analyse 1.6.266 → 2.0.200

Paket `p0-base-drift-analysis`. Misst, wie stark sich der **Bestand** (die 32 aus 1.6.266
geforkten Module + geteilte `libs/` + `appconfig` + SSE-Contract + Auth-Guards) zwischen der
Fork-Basis **v1.6.266** und dem Ziel-Image **2.0.200** verändert hat. Zweck: die „rein
additiv"-These belegen oder widerlegen und die Integrationsreibung je Modul-Nachbau beziffern
(fixiert die Aufwände im Backlog).

**Quellen:** 2.0.200 = `.reference/2.0.200/api/main.js` (un-minifiziert, 73.240 Zeilen, rev
`7356c68`) · 1.6.266 = `apps/api/src` + `libs/src` (dieser Branch). Kürzel `MJ` = die main.js.

**Legende (Drift-Bewertung je Zeile):**
`bestätigt` = unverändert/kompatibel · `gedriftet` = geänderte Signatur/Felder/Routen, beim
Nachbau zu beachten · `gebrochen` = inkompatible Änderung an einem geteilten Contract (blockiert
oder erzwingt Migration).

---

## T1 — Modul-Inventar (32 ↔ 38)

**Zählung (Verify):** `MJ` `class …Module ` = **38** · 1.6 `apps/api/src` `class …Module` = **32**.
Differenz = **6 neue** Module, **0 entfernt**, **0 umbenannt** → die additive-These gilt **auf
Modul-Ebene** (Controller-/Service-/Schema-Drift *innerhalb* der Bestandsmodule folgt in T2–T4).

### Bestandsmodule (32) — 1:1 in 2.0.200 vorhanden

Jedes 1.6-Modul existiert unter identischem Klassennamen in 2.0.200 (belegt via
`comm -13`: kein 1.6-Modul fehlt in `MJ`). Modul-Level-Bewertung = `bestätigt`; die reale
Drift steckt in Controllern/Services/Schemas (T2–T4) und ist hier je Modul vorgemerkt.

| # | Modul (1.6 = 2.0) | Drift-Verdacht (Vertiefung) |
|---|---|---|
| 1 | AppConfigModule | T4: `defaultAppConfig`-Seed + neue App-Slugs (appConfig `schemaVersion` 2.0 hoch) |
| 2 | AppModule | Root-Wiring: 6 neue Module registriert |
| 3 | AuthModule | T6-Guards; Login-Flow (`/edu-api/auth`, silent-login) |
| 4 | BulletinBoardModule | gering |
| 5 | BulletinCategoryModule | gering |
| 6 | ConferencesModule | prüfen (BBB) |
| 7 | DockerModule | **hoch** — App-Store-Engine (Companion-Images, Plugins-Fetch), s. Backlog `p4-app-store-verify` |
| 8 | FilesharingModule | **hoch** — WOPI/Collabora, `ACTIVE_DOCUMENT_EDITOR` (T2-Split) |
| 9 | FileSystemModule | prüfen |
| 10 | GlobalSettingsModule | Branding/`public/theme`, neue Settings |
| 11 | GroupsModule | LMN-Gruppen (Sync-Interval-Envs) |
| 12 | HealthModule | T-Observability: Build-Metadaten (`… || 'unknown'`) |
| 13 | LdapKeycloakSyncModule | Realm-Mapper (s. `p0-realm-diff-baseline`) |
| 14 | LicenseModule | **hoch** — `license.edulution.io` (Backlog `p1-installer-repoint`) |
| 15 | LmnApiModule | linuxmuster-api7-Proxy (Linbo-Routen, s. `p5-linbo`) |
| 16 | MailsModule | **sehr hoch** — 10→36 Routen, IMAP-Client + Mailcow-Admin, Migration 012 |
| 17 | MetricsModule | prüfen |
| 18 | MobileAppModule | QR-Login/Mobile-Access (Backlog: verbergen §9.13) |
| 19 | NotificationsModule | SSE-/Push-Bezug (T7) |
| 20 | ScriptsModule | Provisioning-Skripte (Realm-Boot) |
| 21 | SseModule | **Contract** — T6 (neue SSE-MessageTypes für Chat etc.) |
| 22 | SurveysModule | Survey-Schemas (mehrere `schemaVersion`) |
| 23 | TLDrawSyncModule | Whiteboard-Sync (bereits 1.6) |
| 24 | UserPreferencesModule | Basis für ggf. per-User-Settings (Mail-Client-Flag) |
| 25 | UsersModule | User-Provisioning bei Login (`POST /edu-api/users`) |
| 26 | VdiModule | prüfen |
| 27 | VeyonModule | prüfen |
| 28 | WebDavModule | Filesharing-Unterbau |
| 29 | WebdavSharesModule | Share-Schema (`schemaVersion`) |
| 30 | WebhookClientsModule | prüfen |
| 31 | WebhookModule | Guard `WebhookGuard` (T6) |
| 32 | WireguardModule | Satellites-Bezug (deferred) |

### Neue Module in 2.0.200 (6) — eigene Backlog-Abschnitte

| Modul | Backlog-Abschnitt | Quelle |
|---|---|---|
| ChatModule | `p2-chat` (Pilot) | `upstream/1851-*` + `MJ:68378–69512` |
| ParentChildPairingModule | `p3-parent-child-pairing` | `upstream/1717-*` + `MJ` |
| WikiModule | `p3-wiki` | `MJ` (kein Rescue-Branch) |
| CalendarModule | `p5-calendar` | `MJ` (CalDAV/tsdav) |
| MobileDevicesModule | `p6-mobile-devices` (deferred) | `upstream/1546-*` + `MJ` |
| SatellitesModule | `p6-satellites` (deferred) | `MJ` |

**T1-Fazit:** additiv auf Modul-Ebene bestätigt (32 unverändert + 6 neu). Der **Nachbau-Aufwand
sitzt nicht im Modul-Set, sondern in der Controller-/Service-/Schema-/Contract-Drift der
Bestandsmodule** — v. a. Mails, Filesharing, Docker, License, Sse. Diese Drift beziffern T2–T12.

---

## T2 — Controller-Route-Drift (29 Bestands-Controller)

**Zählung (Verify):** `MJ` `class …Controller ` = **39** · 1.6 = **29** → **10 neue** Controller.
Route-Zählung = `@(Get|Post|Put|Patch|Delete|All)`-Dekoratoren je Controller (1.6: Quelle;
2.0: kompilierte `(0, common_*.<Verb>)(`-Dekoratoren je Klasse in `MJ`).

### Drift der 29 Bestands-Controller (Routen 1.6 → 2.0)

| Controller | 1.6 | 2.0 | Δ | Bewertung |
|---|---:|---:|---:|---|
| **MailsController** | 10 | 36 | **+26** | **gebrochen/neu** — voller IMAP-Client + Mailcow-Admin (Backlog `p4-mail-rework`) |
| FilesharingController | 19 | 18 | −1 | **gedriftet+gesplittet** — + neu `PublicFilesharingController` (14) + `WopiController` (3) → Backlog `p4-filesharing-wopi` |
| LmnApiController | 38 | 42 | +4 | gedriftet — + Linbo als eigener `LinboController` (11) ausgegliedert (`p5-linbo`) |
| NotificationsController | 6 | 9 | +3 | gedriftet (Push/Inbox) |
| WebdavSharesController | 4 | 6 | +2 | gedriftet |
| UsersController | 12 | 13 | +1 | gedriftet (+ `ProfilePictureController` (4) neu) |
| GlobalSettingsController | 5 | 6 | +1 | gedriftet (Branding/theme) |
| VdiController | 5 | 4 | −1 | gedriftet |
| SurveysController | 21 | 21 | 0 | bestätigt |
| WireguardController | 19 | 19 | 0 | bestätigt |
| FileSystemController | 9 | 9 | 0 | bestätigt |
| PublicSurveysController | 8 | 8 | 0 | bestätigt |
| ConferencesController | 8 | 8 | 0 | bestätigt |
| BulletinBoardController | 8 | 8 | 0 | bestätigt |
| AuthController | 8 | 8 | 0 | bestätigt (Guards separat, T6) |
| AppConfigController | 8 | 8 | 0 | bestätigt |
| DockerController | 6 | 6 | 0 | bestätigt (Engine-Logik driftet, nicht Routen — s. T3) |
| BulletinCategoryController | 6 | 6 | 0 | bestätigt |
| VeyonController | 4 | 4 | 0 | bestätigt |
| TLDrawSyncController | 4 | 4 | 0 | bestätigt |
| WebhookClientsController | 3 | 3 | 0 | bestätigt |
| UserPreferencesController | 3 | 3 | 0 | bestätigt |
| HealthController | 3 | 3 | 0 | bestätigt (Body driftet: Build-Metadaten) |
| MobileAppController | 2 | 2 | 0 | bestätigt |
| LicenseController | 2 | 2 | 0 | bestätigt (Server-URL driftet, nicht Routen) |
| GroupsController | 2 | 2 | 0 | bestätigt |
| WebhookController | 1 | 1 | 0 | bestätigt |
| MetricsController | 1 | 1 | 0 | bestätigt |
| SseController | 0 | 0 | 0 | bestätigt (Contract driftet: neue MessageTypes, T6) |

### 10 neue Controller in 2.0.200

Modul-Controller der 6 neuen Module + **Splits** aus Bestands-Modulen:
`PublicFilesharingController` (14) + `WopiController` (3) ← aus Filesharing · `LinboController` (11)
← aus LmnApi · `ProfilePictureController` (4) ← aus Users · sowie `MobileDevicesController` (11),
`SatellitesController` (11), `WikiController` (9), `CalendarController` (7),
`ParentChildPairingController` (6), `ChatController` (6).

**T2-Fazit:** **23 von 29** Bestands-Controllern haben **0 Routen-Drift** → additiv bestätigt.
Echte Drift konzentriert sich auf **Mail** (+26, Neubau), **Filesharing** (Split + Wopi) und die
**Ausgliederungen** (Linbo, ProfilePicture). Diese sind bereits als eigene Backlog-Abschnitte
erfasst — die Route-Zahlen dort als Aufwands-Anker nutzen.

<!-- T3–T12 hängen hier ihre Abschnitte an (Report ist das Deliverable dieses Pakets). -->
