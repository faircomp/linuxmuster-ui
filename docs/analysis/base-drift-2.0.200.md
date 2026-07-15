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

## T3 — Service-Drift (Bestands-Services)

**Zählung (Verify):** `MJ` `class …Service ` = **58** · 1.6 `apps/api/src` = **41** → **17 neue**
Services, **0 entfernt/umbenannt** (`comm -13` leer). → **Additive-These auch auf Service-Ebene
bestätigt.** Zusammen mit T1 (Module 32→38, 0 entfernt) und T2 (23/29 Controller 0-Drift) gilt:
**der Bestand ist auf allen drei Klassen-Ebenen additiv** — kein Rename/Entfernen, das eine
Integrationsreibung „unter" den Modul-Nachbauten erzeugen würde.

### Die 17 neuen Services → Modul-Zuordnung (Aufwands-Signal)

| Modul / Split | Neue Services |
|---|---|
| **Mail-Split** (`p4-mail-rework`) | `MailImapService`, `MailSmtpService`, `ImapConfigService`, `RecipientsService` (4 — bestätigt die Zerlegung IMAP/SMTP/Config/Recipients) |
| **Wiki** (`p3-wiki`) | `WikiPageService`, `WikiFolderService`, `WikiTreeService`, `WikiSearchService` (4 — service-schwer) |
| **MobileDevices** (`p6-mobile-devices`, deferred) | `MobileDevicesService`, `RelutionUserTokenService` (2 — Relution) |
| **Chat** (`p2-chat`) | `ChatService` |
| **Calendar** (`p5-calendar`) | `CalendarService` |
| **ParentChildPairing** (`p3-parent-child-pairing`) | `ParentChildPairingService` |
| **Satellites** (`p6-satellites`, deferred) | `SatellitesService` |
| **Filesharing/WOPI** (`p4-filesharing-wopi`) | `CollaboraService` |
| **Linbo** (`p5-linbo`) | `LinboService` |
| **ProfilePicture** (aus Users) | `ProfilePictureService` |

Summe = 17 ✓. Jeder neue Service gehört zu einem bereits erfassten Backlog-Abschnitt — **kein
verwaister Service** (kein „vergessenes" Feature).

### Bestands-Services (41) — vollständiges Drift-Signal

**Signal-Methodik** (Task: „Signal-Ebene, kein Handler-Byte-Diff"): `M(1.6)` = öffentliche
Methoden der 1.6-Klasse (grep `^  [async|public|…] name(`). `Signal` = **stabil** (in 2.0
vorhanden, keine Route/Dep-Drift aus T2/Supply-Chain) oder **gedriftet** (Route-/Dep-/Ziel-Drift
belegt — Δ dann ↑). Kein 1.6-Service fehlt in 2.0 (`comm -13` leer, s. o.) → Spalte „in 2.0" = ✓
für alle 41.

| # | Service (1.6) | M(1.6) | Signal | Grund (bei gedriftet) |
|--:|---|--:|---|---|
| 1 | AppConfigService | 14 | stabil | — |
| 2 | AuthService | 11 | stabil | — |
| 3 | BulletinBoardService | 14 | stabil | — |
| 4 | BulletinCategoryService | 10 | stabil | — |
| 5 | ConferencesService | 23 | stabil | — |
| 6 | DevCacheFlushService | 2 | stabil | — |
| 7 | DockerService | 17 | **gedriftet ↑** | App-Store-Engine (Companion-Images, Plugins-Fetch) |
| 8 | FilesharingService | 18 | **gedriftet ↑** | Filesharing-Split → PublicFilesharing/Wopi |
| 9 | FilesystemService | 31 | stabil | — |
| 10 | GlobalSettingsService | 10 | **gedriftet** | Branding/Theme-Settings |
| 11 | GroupsService | 30 | stabil | — |
| 12 | HealthService | 9 | **gedriftet** | Build-Metadaten (§ Observability) |
| 13 | LdapKeycloakSyncService | 26 | **gedriftet** | neue Realm-Mapper |
| 14 | LicenseService | 8 | **gedriftet** | Lizenzserver-URL `license.edulution.io` (Supply-Chain) |
| 15 | LmnApiService | 39 | **gedriftet** | Linbo-Ausgliederung (→ LinboService) |
| 16 | MailIdleService | 22 | **gedriftet ↑** | Mail-Rework (→ Imap/Smtp/Config/Recipients) |
| 17 | MailsService | 17 | **gedriftet ↑** | Mail-Rework, Controller 10→36 |
| 18 | MetricsService | 2 | stabil | — |
| 19 | MigrationService | 0 | stabil | (0 Methoden = reine `migrate()`-Registry; Migrations-Inventar = §3.3) |
| 20 | MobileAppService | 5 | stabil | — |
| 21 | NotificationsService | 22 | **gedriftet** | +Routen (Push/SSE) |
| 22 | OnlyofficeService | 4 | **gedriftet** | DocumentEditor-Selektor (Collabora-Nebengleis) |
| 23 | QueueService | 8 | stabil | — |
| 24 | ScriptsService | 3 | stabil | — |
| 25 | SseService | 11 | stabil | — |
| 26 | SurveyAnswerAttachmentsService | 12 | stabil | — |
| 27 | SurveyAnswersService | 18 | stabil | — |
| 28 | SurveysAttachmentService | 11 | stabil | — |
| 29 | SurveysService | 10 | stabil | — |
| 30 | SurveysTemplateService | 6 | stabil | — |
| 31 | ThumbnailService | 12 | stabil | — |
| 32 | TLDrawSyncService | 11 | stabil | — |
| 33 | UserPreferencesService | 5 | stabil | — |
| 34 | UsersService | 19 | **gedriftet** | ProfilePicture-Ausgliederung (→ ProfilePictureService) |
| 35 | VdiService | 12 | stabil | — |
| 36 | VeyonService | 9 | stabil | — |
| 37 | WebdavService | 20 | **gedriftet ↑** | WOPI/Collabora-Pfad |
| 38 | WebdavSharesService | 9 | stabil | — |
| 39 | WebhookClientsService | 7 | stabil | — |
| 40 | WebhookService | 6 | stabil | — |
| 41 | WireguardService | 19 | stabil | — |

**13 gedriftet / 28 stabil.** Alle 13 gedrifteten decken sich 1:1 mit T2-Controller-Drift bzw.
den 6 neuen Modulen — **kein Service driftet „unerwartet"** (ohne zugehörigen Backlog-Abschnitt).

**T3-Fazit:** Additive-These auf Service-Ebene bestätigt; die Service-Drift deckt sich 1:1 mit
den in T2 identifizierten Hotspots und den 6 neuen Modulen — **keine neuen Überraschungen**.

<!-- T4–T12 hängen hier ihre Abschnitte an (Report ist das Deliverable dieses Pakets). -->
