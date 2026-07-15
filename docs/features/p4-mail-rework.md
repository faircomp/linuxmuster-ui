# p4-mail-rework — Mail kann BEIDES: nativer Client + SOGo-Iframe, EINE App, per `ACTIVE_MAIL_CLIENT`-Selektor

> Kalibrierung: **P4 — geerdetes Rekonstruktions-Ledger**, phasiert, kein durchgetakteter Wochenplan.
> Die **BE-Struktur ist 1:1 aus `main.js` verifiziert** (Controller/Routen/Guards/Migration/appconfig
> mit Zeilenankern). Die **Selektor-Mechanik ist 1:1 aus `ACTIVE_DOCUMENT_EDITOR` abgeleitet** (dieselbe
> `extendedOption`-Plumbing, verifiziert `main.js:2114 / 26541 / 27148–27152 / 27180–27184`). Die
> **native FE hat weder Source noch Rescue-Branch noch Baseline-Screenshot** — Rekonstruktion allein
> gegen die Live-2.0-Referenz + den (aus `main.js` sicher rekonstruierten) API/DTO-Contract.
> Master-Plan §4.3, §8 P4, §9 Entscheidung 10 (§9.10).

## Entscheidung §9.10 (getroffen — ersetzt die frühere Offene Frage „nativ vs. Iframe")

**Mail kann BEIDES — nativer 2.0-Webmail-Client UND der bewährte 1.6-SOGo-Iframe — als EINE App, per
Selektor umgeschaltet, phasiert ausgerollt.** Die frühere Offene Frage „nativ bauen vs. SOGo-Iframe
behalten vs. Split" ist **entschieden**: kein Entweder-Oder, sondern ein selektor-gegateter Blend.

- **Mechanik (Selektor):** ein globaler `ACTIVE_MAIL_CLIENT`-`extendedOption` (`native` ⟷ `sogo`),
  1:1 die `ACTIVE_DOCUMENT_EDITOR`-Plumbing (OnlyOffice ⟷ Collabora). Default `sogo` → null Regression.
- **Rollout (phasiert):** vier entkoppelte Phasen. Mailcow-Admin **flag-unabhängig**; die native FE
  landet inkrementell hinter Default-`sogo`; der Default-Flip kommt zuletzt.
- **Ziel-UX (Endzustand):** SOGo wird vom „ganzen Bildschirm" zum eingebetteten **„Erweitert"-Tab** im
  nativen Client (Escape-Hatch für Sieve-Filter/Abwesenheit/SOGo-Kalender/Kontakte). Erst hier wird
  „BEIDES" für den **Nutzer** (nicht nur den Admin) real.

**Zwei orthogonale Achsen — so zerfällt „BEIDES" sauber:**
1. **End-User-Webmail-Oberfläche = `native` ⟷ `sogo`** (der Selektor).
2. **Mailcow-Admin-Panel = immer nativ, immer verfügbar** (der rein additive 2.0-Wert, den SOGo
   **nicht** kann — nicht Teil des Selektors, kein Flag).

**Ehrlicher Kernpunkt (kein Over-Selling):** Der Selektor spart **keinen** PT am teuren Block (nativer
Client, ~25–40 PT) — er macht ihn nur **inkrementell mergebar, pilotierbar und ein-Klick-rückrollbar**.
Und die Präzedenz-Analogie trägt nur die *Plumbing*: `ACTIVE_DOCUMENT_EDITOR` schaltet **Docker-Container**
(`FILESHARING_DOCKER_CONTAINERS`, `main.js:27148–27152`), `ACTIVE_MAIL_CLIENT` schaltet **nur die
FE-Oberfläche** auf **einem** Mailcow-Stack. Es ist ein FE-Render-/Admin-Policy-Flag im appconfig-Kleid,
**kein** Backend-Backend-Selektor. Konsequenz: **kein** 403-Guard „IMAP-Routen nur wenn native" (YAGNI).

## Problem / Motivation

edulution 2.0 ersetzt den Mail-Zugang durch einen **vollen nativen Webmail-Client** (Ordnerbaum,
Mailliste, Detailansicht, Compose mit Anhängen, Entwürfe) **plus ein Mailcow-Admin-Panel**
(Domains/Mailboxen/ACL/Delegates) und **löscht SOGo**. In der 1.6-Basis (Fork `1.6.266`) ist Mail
dagegen **nur ein SOGo-Iframe**: `MailPage.tsx = <NativeFrame appName={APPS.MAIL} />`
(`apps/frontend/src/pages/Mail/MailPage.tsx:24`), im `NativeFrameManager.tsx:64` verdrahtet. Der
`MailsController` hat in 1.6 **10 Routen**, in 2.0 **36 Routen** → **26 neue Routen**.

SOGo liefert Fähigkeiten, die der native 2.0-Client **nicht** hat (Sieve-Filter, Abwesenheits-Assistent,
SOGo-Kalender/Kontakte). Der Fork will beides: die 2.0-Geschwindigkeit + Mailcow-Admin fürs Tagesgeschäft
**und** SOGo als Long-Tail-Escape-Hatch. Deshalb wird SOGo **nicht** gelöscht, sondern per Selektor als
dauerhafter, wählbarer Wert erhalten (auch als Ops-Kill-Switch).

Belegte Realität (aus `main.js`, un-minifiziert):
- **BE komplett rekonstruierbar.** `MailsController` `main.js:23140–24941` (36 Route-Methoden,
  `@Controller('mails')` `main.js:23888`). Pfade über `MAIL_ENDPOINT_PATHS` (`main.js:23896`).
  Service-Split: `MailsService` (`main.js:25203`), **neu** `MailImapService` (`main.js:27545`, IMAP via
  `imapflow`), **neu** `MailSmtpService` (`main.js:28650`, SMTP via `nodemailer`), `MailIdleService`
  (`main.js:28907`, existiert im Fork). Guard-Neu: `MailRequestSizeGuard` (`main.js:32604`).
- **Selektor-Präzedenz verifiziert:** Key `ACTIVE_DOCUMENT_EDITOR: 'ACTIVE_DOCUMENT_EDITOR'`
  (`main.js:2114`), Lesung mit Caller-Default `?? ONLY_OFFICE` (`main.js:26541–26542`), Container-Map
  `FILESHARING_DOCKER_CONTAINERS` (`main.js:27148–27152`), Const-Objekt `ACTIVE_DOCUMENT_EDITOR`
  (`main.js:27180–27184`).
- **Fork hat bereits die halbe BE-Basis** (`mails.service.ts`, `mail-idle.service.ts`,
  `mail-provider.schema.ts`, DTOs `mail.dto`/`mailProviderConfig.dto`/`mailcow-*-sync-job*.dto`,
  Notification-DTOs, `provider-config`-CRUD, `sync-job`, `connection-stats`, SOGo-Theme-Check). Die
  **Idle/Push-Plumbing existiert also schon**.
- **Neu gegenüber Fork-Basis:** der **IMAP-Client** + das **Mailcow-Admin-Panel** (BE **und** native FE)
  **plus** der **`ACTIVE_MAIL_CLIENT`-Selektor** (Fork-Divergenz — 2.0 hat SOGo gelöscht).
- **`imapflow` + `@types/imapflow` + `@types/mailparser` sind bereits in `package.json`**; es fehlen die
  Runtime-Deps **`nodemailer`** (`8.0.5`) und **`mailparser`** (`3.9.8`).

## Der Selektor-Mechanismus (`ACTIVE_MAIL_CLIENT`) — Vorgabe

### Setting
- **Const/Type:** `ACTIVE_MAIL_CLIENT = { SOGO: 'sogo', NATIVE: 'native' } as const` + derived Type, neu
  in `libs/src/mail/constants/activeMailClient.ts` (SPDX-AGPL) — Fork-Analog zu `ACTIVE_DOCUMENT_EDITOR`
  (`main.js:27180`). **SOGO zuerst = Default.**
- **Key:** `ACTIVE_MAIL_CLIENT: 'ACTIVE_MAIL_CLIENT'` in
  `libs/src/appconfig/constants/extendedOptionKeys.ts` (neben den vorhandenen `MAIL_*`-Keys, Z.23–28).
  Fließt automatisch in `ExtendedOptionKeysType` (`extendedOptionKeysType.ts` = derived) →
  **keine separate DTO-Pflege, kein neuer API-Endpunkt.**
- **Ort:** globaler `MAIL`-appconfig-`extendedOptions`, exakt wie `ACTIVE_DOCUMENT_EDITOR` im
  `FILE_SHARING`-appconfig. Gelesen über einen **einzigen** Thin-Helper
  `getActiveMailClient(appConfigs)` = `getExtendedOptionsValue(appConfigs, APPS.MAIL,
  ExtendedOptionKeys.ACTIVE_MAIL_CLIENT) ?? ACTIVE_MAIL_CLIENT.SOGO`. `getExtendedOptionsValue`
  (`libs/src/appconfig/utils/getExtendedOptionsValue.ts`) liefert bewusst **kein** Default → Caller-`?? SOGO`,
  gespiegelt an `main.js:26541`.
- **Default:** `sogo` — null Regressionsrisiko, heutiges Verhalten bleibt.
- **Granularität:** **global pro Instanz** (faithful zum Präzedenzfall). **Per-User bewusst NICHT im
  Kern** — das `user-preferences`-Modul (`apps/api/src/user-preferences/`) existiert und macht Per-User
  später baubar (~+3–5 PT: Flag zusätzlich aus User-Preference lesen, appconfig als Fallback), **aber das
  „Erweitert"-Tab-Modell macht Per-User weitgehend überflüssig** (SOGo ist ohnehin für jeden als Tab
  erreichbar). → Per-User = dokumentierter Zukunfts-Hook, nicht Teil dieses Ledgers.

### Permanente Semantik (auch im Endzustand load-bearing)
Der Flag wählt **dauerhaft** die primäre Oberfläche:
- `native` (empfohlener End-Default nach Phase 4): **nativer Client = Landing**, SOGo als eingebetteter
  **„Erweitert"-Tab**.
- `sogo` (permanenter Opt-out + Kill-Switch): **reiner SOGo-Iframe wie 1.6**, nativer Tab ausgeblendet.
- **Mailcow-Admin-Panel: in beiden Werten** in Settings/Admin (`AdminGuard`) verfügbar.

### A2-Verdrahtung (zwei Schaltpunkte, SOGo-Persistenz erhalten)
Beide Punkte lesen **denselben** Key über **denselben** `getActiveMailClient`-Helfer, damit sie **nicht
driften** (verwaiste SOGo-Session, wenn der Iframe im `native`-Modus nicht sauber genullt wird — die
einzige nicht-triviale Integrationsstelle):
- **`NativeFrameManager.tsx`** (`case APPS.MAIL`, heute `:64` `return <MailPage/>`): den SOGo-`NativeFrame`
  **nur** rendern, wenn `getActiveMailClient(appConfigs) === SOGO`, sonst `null`. → SOGo behält seine
  Overlay-Persistenz (kein Reload/Re-Login-Flash beim Navigieren, weil `loadedEmbeddedFrames` den Frame
  gemountet hält).
- **`NativeAppPageManager.tsx`** (`nativeAppPages`-Map `:30–38`, heute **ohne** MAIL): `[APPS.MAIL]` →
  native `MailPage`-Shell **nur**, wenn `=== NATIVE`; sonst leere Route → das SOGo-Overlay greift durch.

Der A1-Kompromiss (**ein** Schaltpunkt, SOGo lädt bei jeder `/mail`-Navigation neu) ist **verworfen** —
A2 kostet einen zweiten Ein-Zeilen-Guard, erhält aber die heute funktionierende SOGo-Persistenz.

### Wie „BEIDES" für den Nutzer real wird
- **Interim (Phase 1–3, Default `sogo`):** „BEIDES" auf **Instanz-Ebene** — Admin/Seed wählt; der
  `native`-Zweig rendert bis zur Reife eine Platzhalter-Shell. **Die Admin-Dropdown-Option wird bewusst
  erst spät (Phase 4) sichtbar**, damit kein Admin auf einen leeren Screen flippt (löst den berechtigten
  „Scheinwahlschalter"-Einwand). Der Key wird also **früh** eingeführt, die **UI-Wahl erst spät**
  freigeschaltet.
- **Endzustand (Phase 4, Default `native`):** SOGo wird im nativen Shell zum lazy-gemounteten
  „Erweitert"-Tab (danach `display:none`-gemountet → kein Re-Auth beim Hin/Her). „In SOGo öffnen"-Deep-
  Links aus Detail/Aktionen (Filter/Abwesenheit) über den bestehenden `useFrameDeepLinkSync`/
  `FRAME_URL_SYNC_*`-Mechanismus (`apps/frontend/src/hooks/useFrameDeepLinkSync.ts`,
  `NativeFrame.tsx:69/79`). **Ehrliche Grenze:** Deep-Linking ist nur so gut wie SOGos URL-Schema —
  realistisch oft nur „grob ins Modul", nicht in den exakten Sieve-Dialog.
- **Auth:** **kein neuer Pfad** — der Iframe-Token-Handoff (`NativeFrame.tsx:136–140`, `eduApiToken` in die
  SOGo-Proxy-URL, gleiches JWT wie `/mails/*`-Bearer) und der Single-Logout (`scriptOnStop`,
  `NativeFrame.tsx:143–146`) werden 1:1 wiederverwendet. **Zu testen (Phase 4):** Token-Rotation mitten in
  der Session re-injiziert **nicht** automatisch → Iframe-Reload-Watcher nötig, sonst veraltet die
  SOGo-Session.

## Ziel & Nicht-Ziele (YAGNI)

**Ziel:**
- **`ACTIVE_MAIL_CLIENT`-Selektor** (`native` ⟷ `sogo`, Default `sogo`) + A2-Verdrahtung + `getActiveMailClient`.
- **Mailcow-Admin-Panel nativ, flag-unabhängig** (Wert auch neben SOGo): BE-Routen unter
  `mailcow-mailboxes/*` hinter `AdminGuard` + FE-Admin-Panel (Domains/Mailboxen/ACL/Delegates).
- **Nativer IMAP/SMTP-Webmail-Client** hinter dem Flag: `MailImapService`/`MailSmtpService` +
  IMAP-Client-Routen + native FE (Ordnerbaum/Liste/Detail/Compose/Anhänge/Entwürfe).
- **Contract-/appconfig-Angleichung:** `MAIL_ENDPOINT_PATHS`, gesplittete IMAP/SMTP-Host-/Port-Keys,
  `MAIL_MAILBOX_TABLE`/`MAIL_SIGNATURE`/`MAIL_PROVIDER_CONFIG_TABLE`, + **forward-only Migration**
  (`schemaVersion++`).
- **Endzustand:** Default-Flip → `native`, SOGo als eingebetteter „Erweitert"-Tab + „In SOGo öffnen"-Deep-Links.
- Guards mit-portiert (`MailRequestSizeGuard`, `AdminGuard`, globale JWT-Auth bleibt).

**Nicht-Ziel (YAGNI):**
- **Kein 403-„nur-wenn-native"-Route-Guard.** Der Selektor ist ein FE-Render-Flag; die 36 Routen teilen
  **einen** Mailcow-Stack und sind JWT-/`AdminGuard`-geschützt, im `sogo`-Modus schlicht ungenutzt.
- **Keine Container-Umschaltung.** Anders als `ACTIVE_DOCUMENT_EDITOR` schaltet der Mail-Selektor **keine**
  Docker-Container — beide Clients laufen gegen denselben Mailcow-Stack.
- **Kein pixel-/verhaltensgleicher SOGo-Nachbau.** Der native Client zielt auf Funktions-, nicht
  Layout-Parität mit SOGo.
- **Per-User-Selektor nicht im Kern** (dokumentierter Zukunfts-Hook via `user-preferences`).
- **SOGo/Mailcow-Container-Stack, Mailcow-Sync-Jobs, SOGo-Theme-Switching, IMAP-Idle-Push** bleiben
  unverändert. Kein neuer SSE-/Gateway-Endpoint (Idle läuft über `MailIdleService`). Keine
  MobileDevices-/Satellite-Kopplung, keine KC-Realm-Rollen-Änderung.

## Betroffene Komponenten & Dateien (konkrete Pfade)

**Selektor (libs + FE)**
- **neu** `libs/src/mail/constants/activeMailClient.ts` (`ACTIVE_MAIL_CLIENT` Const + Type).
- **neu** `libs/src/mail/utils/getActiveMailClient.ts` (einziger Lesepunkt, wrappt `getExtendedOptionsValue … ?? SOGO`).
- `libs/src/appconfig/constants/extendedOptionKeys.ts` — `+ ACTIVE_MAIL_CLIENT`.
- `libs/src/appconfig/constants/extendedOptions/mailGeneralExtendedOptions.ts` — Dropdown-Eintrag nach
  dem `MAIL_SOGO_THEME`-Muster (`:28–41`), **ohne** `requiredContainers` (native Option darf nicht am
  SOGo-Container hängen), **erst Phase 4 sichtbar** eingehängt.
- `apps/frontend/src/pages/Mail/MailPage.tsx` — von blankem `<NativeFrame>` → native Shell (Phase 1
  Platzhalter; Phase 3 echt; Phase 4 + SOGo-„Erweitert"-Tab). **Rollback-Anker:** Ein-Zeilen-Revert auf
  `<NativeFrame appName={APPS.MAIL}/>`.
- `apps/frontend/src/components/structure/framing/Native/NativeFrameManager.tsx` — MAIL-Case selektor-gaten.
- `apps/frontend/src/components/structure/layout/NativeAppPageManager.tsx` — MAIL in `nativeAppPages`,
  selektor-gaten.

**Backend (`apps/api/src/mails/`)**
- `mails.controller.ts` — von 10 auf 36 Routen (bestehende bleiben, 26 neu).
- **neu** `mail-imap.service.ts` (`MailImapService`), `mail-smtp.service.ts` (`MailSmtpService`),
  `mailcow-admin.service.ts` (Admin-Kohäsion, Contract unverändert).
- `mails.module.ts` — neue Provider registrieren.
- **neu** `apps/api/src/mails/guards/mail-request-size.guard.ts` (`MailRequestSizeGuard`).
- `apps/api/src/appconfig/migrations/migration012.ts` + `appConfigMigrationsList.ts` — neue Migration.

**libs (`libs/src/mail/`, `libs/src/appconfig/`)**
- **neu** `libs/src/mail/constants/mailEndpointPaths.ts` (`MAIL_ENDPOINT_PATHS`), `mailDefaultPorts.ts`.
- neue/erweiterte DTOs in `libs/src/mail/types/`: `mail-detail.dto`, `folderAction.dto`, `deleteMails.dto`,
  `moveMails.dto`, `updateMailStatus.dto`, `sendMail.dto`, `saveDraft.dto`, `recipient.dto`, `mailbox.dto`,
  `mailProviderPublicConfigResponse.dto`, sowie Mailcow-Admin-DTOs `mailcowDomain.dto`, `createMailbox.dto`,
  `updateMailbox.dto`, `deleteMailboxes.dto`, `mailboxAcl.dto`, `mailboxDelegates.dto`.
- `libs/src/appconfig/constants/extendedOptionKeys.ts` + `extendedOptions/mailGeneralExtendedOptions.ts` —
  Mail-Key-Set (URL→HOST-Split + neue Keys), Form-Felder.
- `libs/src/mail/types/mailsStore.ts` — Store-Interface erweitern.

**Frontend (`apps/frontend/src/pages/Mail/`, `.../Settings/AppConfig/mails/`)**
- `useMailsStore.ts` — IMAP-Client- + Mailcow-Admin-Actions über `eduApi`.
- **neu** Komponenten: Ordnerbaum, Mailliste, Detailansicht, Compose-Dialog, Anhang-Handling,
  Mailcow-Admin-Panel, SOGo-„Erweitert"-Tab.

## Quelle des Solls (Zeilenanker / Rescue / Baseline)

- **Selektor-Präzedenz:** `ACTIVE_DOCUMENT_EDITOR` — `main.js:2114` (Key), `26541–26542` (Lesung `?? ONLY_OFFICE`),
  `27148–27152` (`FILESHARING_DOCKER_CONTAINERS`), `27180–27184` (Const). Fork-Utils:
  `libs/src/appconfig/utils/getExtendedOptionsValue.ts`, `.../constants/extendedOptionKeys.ts:23–28`,
  `.../extendedOptions/mailGeneralExtendedOptions.ts:28–41`.
- **FE-Ist:** `apps/frontend/src/pages/Mail/MailPage.tsx:24`,
  `.../framing/Native/NativeFrameManager.tsx:64`, `.../layout/NativeAppPageManager.tsx:30–38`. Auth-Handoff:
  `.../framing/Native/NativeFrame.tsx:136–140`. Deep-Link: `apps/frontend/src/hooks/useFrameDeepLinkSync.ts`.
- **BE (primär):** `main.js:23140–24941` (`MailsController`, 36 Routen), Decorator-Block `23307–23842`,
  `@Controller('mails')` `23888`, `MAIL_ENDPOINT_PATHS` `23896`. Services `25203`/`27545`/`28650`/`28907`.
  Guard `MailRequestSizeGuard` `32604`.
- **Migration:** `main.js:4119` (`012-unify-mail-server-config`), `MAIL_DEFAULT_PORTS` `main.js:2158`
  (`IMAP_SSL:993, SMTP_SUBMISSION:587, SMTPS_IMPLICIT_TLS:465`). appconfig-Keys `ExtendedOptionKeys`
  `main.js:2078–2117`. Fork-appConfig-Migrationsstand = `009` (`apps/api/src/appconfig/migrations/`).
- **Rescue-Branch:** `upstream/997-mail-rework-imap-flow-and-add-additional-logging` ist **KEINE belastbare
  Quelle für den nativen Client** — 1.6-Zweig (10 Routen, `MailPage` weiterhin `<NativeFrame>`); nur
  Struktur-Referenz für `provider-config`/`sync-job`/Idle.
- **FE-Client:** **kein** Source, **kein** Rescue, **kein** Baseline-Screenshot → Live-2.0-crabbox +
  rekonstruierter Contract. **Baseline-Shot muss erst aufgenommen werden** (Task im Ledger).

## Datenmodell / API / Migrationen

**API (36 Routen, Basis `/mails`), verifizierte Pfade + Guards** — **selektor-unabhängig** (der Flag
schaltet nur die FE-Oberfläche, nicht die Routen):

| # | Methode + Pfad | Handler | Guard (zusätzl. zur globalen JWT-Auth) | im Fork? | Phase |
|---|---|---|---|---|---|
| 1 | `GET /` | getMails | – | ja | – |
| 2 | `GET mailboxes` | listMailboxes | – | neu | 3 |
| 3 | `GET messages` | getMailsByFolder (`folder,page,limit,query,unreadOnly`) | – | neu | 3 |
| 4 | `GET messages/:uid` | getMailDetail | – | neu | 3 |
| 5 | `DELETE messages` | deleteMails | – | neu | 3 |
| 6 | `PATCH messages/destination` | moveMails | – | neu | 3 |
| 7 | `PATCH messages/status` | updateStatus | – | neu | 3 |
| 8 | `POST mailboxes` | createFolder | – | neu | 3 |
| 9 | `DELETE mailboxes/:path` | deleteFolder | – | neu | 3 |
| 10 | `PATCH mailboxes` | renameFolder | – | neu | 3 |
| 11 | `GET messages/:uid/attachments/:partId` | downloadAttachment | – | neu | 3 |
| 12 | `POST outbox` | sendMail | **MailRequestSizeGuard** | neu | 3 |
| 13 | `POST drafts` | saveDraft | **MailRequestSizeGuard** | neu | 3 |
| 14 | `PUT drafts/:uid` | replaceDraft | **MailRequestSizeGuard** | neu | 3 |
| 15 | `GET provider-config/public` | getPublicMailProviderConfigs | – (jeder Auth-User) | neu | 3 |
| 16 | `GET provider-config` | getExternalMailProviderConfig | **AdminGuard** | ja | – |
| 17 | `POST provider-config` | postExternalMailProviderConfig | **AdminGuard** | ja | – |
| 18 | `DELETE provider-config/:mailProviderId` | deleteExternalMailProviderConfig | **AdminGuard** | ja | – |
| 19 | `GET sync-jobs` | getSyncJob | – | ja¹ | – |
| 20 | `POST sync-jobs` | postSyncJob | – | ja¹ | – |
| 21 | `DELETE sync-jobs` | deleteSyncJobs | – | ja¹ | – |
| 22 | `GET <SOGo-version-check>` | checkSogoThemeVersion | **AdminGuard** | ja | – |
| 23 | `POST <…>/update` | updateSogoThemeManually | **AdminGuard** | ja | – |
| 24 | `GET connection-stats` | getConnectionStats | **AdminGuard** | ja | – |
| 25 | `GET mailcow-mailboxes/domains` | getMailcowDomains | **AdminGuard** | neu | 2 |
| 26 | `GET mailcow-mailboxes` | getMailcowMailboxes | **AdminGuard** | neu | 2 |
| 27 | `POST mailcow-mailboxes` | createMailcowMailbox | **AdminGuard** | neu | 2 |
| 28 | `PATCH mailcow-mailboxes` | updateMailcowMailbox | **AdminGuard** | neu | 2 |
| 29 | `DELETE mailcow-mailboxes` | deleteMailcowMailboxes | **AdminGuard** | neu | 2 |
| 30 | `POST mailcow-mailboxes/acl` | updateMailboxAcl | **AdminGuard** | neu | 2 |
| 31 | `GET recipients/search` | searchRecipients (`q`) | – | neu | 3 |
| 32 | `GET mailcow-mailboxes/folders/:mailbox` | listMailboxFolders | **AdminGuard** | neu | 2 |
| 33 | `GET mailcow-mailboxes/delegates` | getSharedMailboxes | **AdminGuard** | neu | 2 |
| 34 | `GET mailcow-mailboxes/delegates/:mailbox` | getMailboxDelegates | **AdminGuard** | neu | 2 |
| 35 | `POST mailcow-mailboxes/delegates` | setMailboxDelegates | **AdminGuard** | neu | 2 |
| 36 | `DELETE mailcow-mailboxes/delegates/:mailbox` | deleteSharedMailbox | **AdminGuard** | neu | 2 |

¹ Contract-Drift: Fork nutzt `sync-job` (Singular), 2.0 `sync-jobs` (Plural, `SYNC_JOBS`). Pfad angleichen
(BE-Route **und** FE-Store).

**Selektor: 0 Backend-Routen, 0 Container-Umschaltung, 0 Migration.** Der `?? SOGO`-Fallback deckt
Bestandsdokumente (wie `?? ONLY_OFFICE`); `extendedOptions` ist ein freies Objekt
(`@Prop({ type: Object, default: {} })`) → **kein Mongo-Schema-Change**.

**DB-Migration nötig? Ja — aber nur für den nativen-IMAP-Pfad (Phase 3), forward-only, `schemaVersion++`.**
`main.js:4119` (`012-unify-mail-server-config`) benennt `MAIL_IMAP_URL`/`MAIL_SMTP_URL` → **`MAIL_HOST`
(einfach)**, entfernt `MAIL_IMAP_SECURE`/`MAIL_SMTP_SECURE`, leitet Ports aus URL ab (Fallback
`MAIL_DEFAULT_PORTS`). **Achtung — Blind-Port ist falsch:**
1. Upstream-`012` erzeugt `MAIL_HOST` (einfach), das finale 2.0-Key-Set enthält aber **`MAIL_IMAP_HOST` +
   `MAIL_SMTP_HOST` (getrennt)** (`main.js:2081/2084`) → **nicht 1:1 übernehmen**.
2. **Fork-Baseline weicht ab:** Fork hat `MAIL_IMAP_URL, MAIL_IMAP_PORT, MAIL_IMAP_SECURE,
   MAIL_IMAP_TLS_REJECT_UNAUTHORIZED` (`extendedOptionKeys.ts:23–26`) — **kein `MAIL_SMTP_URL`**.
→ **Eigene forward-only Migration** (Fork-Baseline → 2.0-Key-Set getrennt IMAP/SMTP Host+Port),
`MAIL_IMAP_SECURE` entfernen, Ports aus URL/Default ableiten, `schemaVersion++`. Nummer/Reihenfolge klärt
`p0-migrations-inventory` / `p1-migration-upgrade-test` (Fork bei `009`; 2.0 kennt `010-add-uses-push-
notifications`, `011-add-is-pinned`, `012-unify-mail-server-config`) — die Mail-Migration reiht sich
forward-only in die **fork-eigene** Sequenz ein.

**Contract-Drift (API ↔ DTO ↔ FE ↔ appconfig):** `sync-job` → `sync-jobs`; appconfig-Mail-Keys
`MAIL_IMAP_URL/…_SECURE` → `MAIL_IMAP_HOST/PORT` + `MAIL_SMTP_HOST/PORT` + `MAIL_TLS_REJECT_UNAUTHORIZED` +
`MAIL_MAILBOX_TABLE` + `MAIL_SIGNATURE` + `MAIL_PROVIDER_CONFIG_TABLE`; `MailsStore` um IMAP-Client-/
Mailcow-Admin-Actions erweitern.

## Auth / Guards (welche mit-portieren)

- **Globale JWT-Auth-Guard** bleibt (App-Level) — **alle** 36 Mail-Routen sind auth-pflichtig; keine
  `@Public`-Route (Route 15 `provider-config/public` ist **nicht** `@Public`, nur nicht-admin).
- **`AdminGuard`** (`apps/api/src/common/guards/admin.guard.ts`): auf `provider-config`-CRUD, SOGo-Theme,
  `connection-stats` **und alle Mailcow-Admin-Routen** (25–30, 32–36).
- **`MailRequestSizeGuard`** (`main.js:32604`, **neu**): auf `outbox` (12), `drafts` (13, 14). **Muss
  mit-portiert werden.**
- **Kein selektor-abhängiger Guard.** Der `ACTIVE_MAIL_CLIENT`-Flag steuert keine Autorisierung; im
  `sogo`-Modus sind die IMAP-Client-Routen einfach ungenutzt (kein 403-„nur-wenn-native", YAGNI).
- Guard-Regressionsrisiko: die 26 neuen Routen dürfen **nicht** ungeguarded landen. Verify-Assertion pro
  Route-Task: 401 ohne Token, 403 als Nicht-Admin auf Admin-Routen.

## Externe Integrationen

- **IMAP** (`imapflow`) gegen Mailcow/Dovecot, **SMTP** (`nodemailer`) gegen Mailcow-Submission. Host/Port
  aus appconfig-ExtendedOptions (nach Migration), TLS via `MAIL_TLS_REJECT_UNAUTHORIZED`.
- **Mailcow-Admin-API** über vorhandenen Mailcow-API-Key (Env). Kein neuer Companion, kein neuer KC-Client.
- **SOGo/Mailcow-Container-Stack** unverändert, inkl. SOGo-Theme-Fetch (`main.js:25091–25092`,
  raw.githubusercontent — separater Supply-Chain-Punkt P0/§5.3, **bleibt** als Kosten von „BEIDES").
- `mailparser` (Parsen eingehender MIME), `nodemailer` (Aufbau ausgehender MIME).

## Secrets / Env / master.key

- **Keine neuen Secrets.** Mailcow-API-Key + IMAP/SMTP-Zugang existieren (Companion-Secrets, Master-Plan
  §2.6). Provider-Config-Passwörter bleiben verschlüsselt (`mail-provider.schema.ts` +
  `mailEncryption.type.ts`, `MASTER_ENCRYPT_KEY`) — Verschlüsselungspfad beim DTO-Erweitern **nicht** brechen.
- `EDUI_MAIL_IMAP_TIMEOUT` (Env, im Fork vorhanden) bleibt für IMAP-Timeouts relevant.
- `master.key`/Secrets **nie ins Repo**. Keine echten Schüler-PII in crabbox → synthetische Fixtures
  (Mail ist PII-tragend, §2.7/R12).

## Phasen & Aufwand (grob)

| Phase | Inhalt | PT | Migration | Wert |
|---|---|---:|:--:|---|
| **1 — Selektor-Harness** | Const + Key + `getActiveMailClient` + A2-Schaltpunkte, Default `sogo`, `native`-Platzhalter, **Dropdown versteckt**; i18n-Gerüst DE/EN/FR; ADR | 2–4 | nein | Mail unverändert (SOGo), Merge-Harness steht |
| **2 — Mailcow-Admin nativ** | Admin-Service + Routen (`AdminGuard`) + FE-Panel, **flag-unabhängig** | 8–12 | nein | Das, was SOGo **nicht** kann — sofort neben SOGo |
| **3 — Nativer Webmail-Client hinter Flag** | nodemailer/mailparser, DTOs, IMAP/SMTP-Services, `MailRequestSizeGuard`, Client-Routen, appconfig-Key-Split + Migration, native FE — alle **default-off** | 25–40 | **ja** | Voll-nativ, opt-in pilotierbar, Mail nie kaputt |
| **4 — Endbild + Default-Flip** | Dropdown sichtbar, Default → `native`, SOGo als „Erweitert"-Tab + Deep-Links + Token-Rotations-Watcher | 4–6 | nein | „BEIDES" für den Nutzer: nativ + SOGo-Escape-Hatch |

**Gesamt bis „nativ als Default mit SOGo-Tab": ~40–55 PT** — Wert landet **inkrementell**, Mail ist zu
**keinem** Zeitpunkt kaputt. Menschliches Go bleibt Pflicht **vor Phase 3** (teurer/riskanter Block).
**Phase 2 liefert eigenständigen Wert, auch wenn Phase 3 nie kommt.**

## Ehrliche Grenzen & Trade-offs (kein Over-Selling)

- **Der Selektor spart keinen PT** am teuren nativen Client — er macht ihn nur inkrementell mergebar,
  pilotierbar und ein-Klick-rückrollbar.
- **Die Präzedenz trägt nur die Plumbing, nicht die Semantik:** `ACTIVE_DOCUMENT_EDITOR` schaltet
  Container auf zwei Backends, `ACTIVE_MAIL_CLIENT` schaltet nur die FE-Oberfläche auf **einem** Backend.
  Es ist bewusst ein FE-Render-Flag im appconfig-Kleid.
- **Permanente Wartungslast:** Jede künftige 2.0-Mail-Änderung muss gegen den SOGo-Pfad geprüft werden
  („noch heil?"). Zweiter schwerer Iframe im Speicher (Endzustand). State-Drift native↔SOGo (IMAP-Roundtrip
  nötig, damit der native Client eine in SOGo gesetzte Änderung sieht). Token-Rotations-Kante.
- **SOGo-Theme-Supply-Chain bleibt** (`main.js:25091–25092`, raw.githubusercontent) — Kosten von „BEIDES".
- **Deep-Linking ist nur so gut wie SOGos URL-Schema** — realistisch oft nur grob ins Modul.
- **Native FE ohne Source/Baseline** = höchstes Schätzrisiko (R1). Milderung: Default `sogo` = Ein-Klick-
  Fallback; Phasierung; Chat-Pilot-Muster zuerst.

## Risiken & Rollback

- **R1 (FE-Kosten):** native Webmail-FE ohne Source/Baseline → höchstes Schätzrisiko. Milderung:
  Default `sogo` (Iframe bleibt Fallback), Phasierung, Chat-Pilot zuerst.
- **Auth-Bypass:** 26 neue Routen, Guard muss exakt sitzen. Milderung: Guard-Assertions pro Task.
- **Selektor-Drift:** zwei Schaltpunkte lesen denselben Key → **verwaiste SOGo-Session**, wenn einer nicht
  gated. Milderung: **einziger** `getActiveMailClient`-Lesepunkt, beide Stellen importieren ihn; Test.
- **Migrations-Datenverlust:** falsche URL→HOST-Abbildung killt Mail-Config. Milderung: forward-only,
  `p1-migration-upgrade-test`, `master.key` im Backup-Set.
- **IMAP/SMTP-Robustheit:** Timeouts/Idle-Races. Milderung: `EDUI_MAIL_IMAP_TIMEOUT`, bestehende
  `MailIdleService`-Logik erben.
- **Rollback:** additiv. `ACTIVE_MAIL_CLIENT = sogo` ist der dokumentierte **Ein-Klick-Kill-Switch**
  (Ops-Runbook). Harter Rollback = FE-Route zurück auf `<NativeFrame appName={APPS.MAIL}/>`
  (Ein-Zeilen-Revert `MailPage.tsx`) + Migration nicht ausrollen. Kein Datenverlust, solange die Migration
  noch nicht lief.

## Doku-Impact (Augenmaß)

- **ADR** unter `docs/adr/` (Verzeichnis neu): `ACTIVE_MAIL_CLIENT` als **bewusste Fork-Divergenz** (2.0 hat
  SOGo gelöscht, ging voll-nativ). Festhalten: (a) permanente Wartungslast „jede 2.0-Mail-Änderung gegen
  SOGo-Pfad prüfen"; (b) `ACTIVE_MAIL_CLIENT = sogo` als dokumentierter Kill-Switch; (c) die ungeschönten
  Kosten von „BEIDES" (SOGo-Theme-Supply-Chain, zweiter Iframe, State-Drift, Token-Rotations-Kante).
- `docs/` (DE+EN+FR): Mailcow-Admin-Panel-Abschnitt (Admin-Rolle, Domains/Mailboxen/ACL/Delegates);
  Webmail-Nutzerkurz-Doku + „SOGo als Erweitert-Tab"-Hinweis (Phase 3/4).
- Ops-Runbook: `ACTIVE_MAIL_CLIENT`-Selektor + Kill-Switch, Mail-appconfig-Keys (IMAP/SMTP Host+Port, TLS),
  Migrations-Hinweis, Mailcow-API-Key.

## i18n-Impact (DE + EN + FR)

FR ist ab jetzt **Pflicht** (Kevin pflegt FR mit) — die Locale existiert bereits
(`apps/frontend/src/locales/fr/translation.json`, in `i18n.ts:35` registriert).
- Bestehende `mails.*`-Keys bleiben.
- **Selektor:** `appExtendedOptions.activeMailClient*` (Titel/Beschreibung/Optionslabels `native`/`sogo` +
  Feature-Gefälle-Warnhinweis „SOGo-Filter/Abwesenheit sind im nativen Client nicht enthalten"),
  `mail.tabs.native`/`mail.tabs.sogo`, `mail.openInSogo.*`.
- **Nativer Client:** `mail.folders.*`, `mail.list.*`, `mail.detail.*`, `mail.compose.*`,
  `mail.attachments.*`, `mail.actions.*`, `mail.emptyState.*`.
- **Mailcow-Admin:** `mailcowAdmin.*` (domains/mailboxes/acl/delegates/create/update/delete).
- **appconfig-Keys:** `appExtendedOptions.mailImapHost*/mailSmtpHost*/mailTlsReject*/mailSignature*`.
Keys inline pro FE-Task, **DE+EN+FR im selben Commit**.

## Offene Fragen (native-vs-iframe ist ENTSCHIEDEN — siehe §9.10 oben)

1. **Migration-Key-Set:** finales Key-Set ist `MAIL_IMAP_HOST/…_SMTP_HOST` (getrennt), Upstream-`012`
   erzeugt `MAIL_HOST` (einfach). Verifikation gegen eine **laufende 2.0-DB** (crabbox), welches Key-Set die
   2.0-Instanz real trägt — falls dort doch `MAIL_HOST`, ist der `ExtendedOptionKeys`-Auszug ein
   Bundle-Artefakt. Bis dahin: fork-eigene Migration aufs **getrennte** Key-Set.
2. **Migrations-Nummer** hängt an `p0-migrations-inventory` (landen 010/011 vor dem Mail-Rework?).
3. **Baseline-Screenshot** existiert nicht → vor der FE-Arbeit (Phase 3) einen 2.0-Mail-Shot aufnehmen
   (`scratchpad/real/`), damit Visual-Diff möglich ist.
4. **Mailcow-Admin-Service-Ort:** in `main.js` keine separate `MailcowService`-Klasse — Admin-Logik liegt
   in `MailsService`. Beim Nachbau in einen eigenen `mailcow-admin.service.ts` fassen (Kohäsion), ohne
   Contract zu ändern.
5. **Menschliches Go vor Phase 3** (nativer IMAP/SMTP-Client): der teure/riskante Block startet erst nach
   ausdrücklicher Freigabe. Phase 1/2/4-Mechanik ist entschieden; nur der Zeitpunkt des Phase-3-Starts ist offen.
