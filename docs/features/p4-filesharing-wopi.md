# Filesharing / WOPI / Collabora-Editing + ACTIVE_DOCUMENT_EDITOR — Spec

> Kalibrierungs-Hinweis (P4): Dies ist ein **solides, geerdetes Rekonstruktions-Ledger**, kein
> Wochen-genauer Ausführungsplan. Die Task-Granularität schärft sich nach der P0-Basis-Drift-Analyse
> (echtes 1.6→2.0-Delta im Filesharing-Ordner) und nach dem Chat-Piloten (P2), an dem sich die
> Muster für „neuer BE-Service + neuer @Public-Controller + neuer FE-Preview" erstmals bewähren.
> Abhängt-von: `p2-chat` (etablierte Muster für Store/eduApi/Guard-Portierung).

## Problem / Motivation
edulution 1.6 kann Office-Dokumente aus dem Filesharing nur mit **OnlyOffice** bearbeiten
(`OnlyofficeService`, FE `FilePreview/OnlyOffice`, appconfig-Keys `ONLY_OFFICE_URL` /
`ONLY_OFFICE_JWT_SECRET`). edulution 2.0 führt einen **zweiten Editor (Collabora Online)** ein und
einen **Umschalter `ACTIVE_DOCUMENT_EDITOR`** (OnlyOffice ↔ Collabora), der pro Instanz in der
Filesharing-appconfig gewählt wird. Collabora spricht das **WOPI-Protokoll**, d. h. es braucht einen
neuen `WopiController` (CheckFileInfo / GetFile / PutFile), einen `CollaboraService`
(WOPI-Access-Token-Signierung + WebDAV-Anbindung) und eine neue Editor-Token-Route. Der Umschalter
greift außerdem in den `DockerService` ein: je nach gewähltem Editor wird beim App-Rollout der
Container `edulution-onlyoffice` **oder** `edulution-collabora` aufgelöst.

Der Fork muss dieses Delta nachbauen, damit Instanzen, die in 2.0 Collabora aktiviert haben, nach der
Migration weiter Dokumente editieren können.

## Ziel & Nicht-Ziele (YAGNI)
**Ziel**
- `ACTIVE_DOCUMENT_EDITOR`-Selektor in der Filesharing-appconfig (Default `onlyoffice`), inkl.
  Settings-UI (Dropdown) und Contract in `libs`.
- Collabora-Editing end-to-end: `CollaboraService` (WOPI-Token) + `WopiController`
  (`@Public`, Token-Auth via `access_token`-Query) + `POST filesharing/collabora-token`-Route +
  FE-Preview-Komponente + FE-Editor-Auswahl in `FileRenderer`.
- `DockerService.resolveContainerName`: FILE_SHARING → `edulution-onlyoffice`/`edulution-collabora`
  je nach `ACTIVE_DOCUMENT_EDITOR`.
- Neue appconfig-`extendedOptions`-Keys `COLLABORA_URL`, `COLLABORA_WOPI_SECRET`,
  `ACTIVE_DOCUMENT_EDITOR` (+ Settings-Felder).
- **Fork-Härtung:** die bestehende Non-Admin-Maskierung von `ONLY_OFFICE_JWT_SECRET` auf
  `COLLABORA_WOPI_SECRET` ausweiten (der WOPI-Secret darf niemandem außer Admins ausgeliefert werden,
  sonst sind WOPI-Tokens fälschbar → Lese/Schreibzugriff über den `@Public`-`WopiController`).

**Nicht-Ziele**
- **Keine** DB-Schema-Migration und **kein** `schemaVersion`-Bump: alle drei neuen Keys sind
  `extendedOptions` (schemafreies Objekt im appConfig-Dokument); die MigrationService-Delta-Analyse
  (Plan §3.3) listet **keine** Filesharing/Collabora-Migration (nur `010`/`011`/`012`).
- **Keine** OnlyOffice-Key-Config-Migration: der im Plan (§3.3, Modul-5-Note) als „Config-Migration"
  vermutete `main.js:1726 delete extendedOptions.ONLY_OFFICE_JWT_SECRET` ist **keine** Migration,
  sondern pre-existierende Secret-Maskierung im Non-Admin-Lesepfad — **identisch schon in 1.6**
  (`apps/api/src/appconfig/appconfig.service.ts:258`). Es wird nichts migriert; siehe „Datenmodell".
- **Kein** Umbau/Refactor des bestehenden OnlyOffice-Pfads (bleibt 1:1 als Default-Editor).
- **Kein** eigener Collabora-Companion-Image-Build in diesem Paket (App-Store-Engine + Image-Policy =
  §3.4/§5.3, P0/P4-App-Store-Verifikation) — hier nur die Container-Namens-Auflösung.

## Betroffene Komponenten & Dateien (konkrete Pfade)

### libs (Contract, zuerst)
- `libs/src/appconfig/constants/extendedOptionKeys.ts` — 3 Keys ergänzen
  (`COLLABORA_URL`, `COLLABORA_WOPI_SECRET`, `ACTIVE_DOCUMENT_EDITOR`).
- `libs/src/filesharing/constants/activeDocumentEditor.ts` *(neu)* — `ACTIVE_DOCUMENT_EDITOR`
  const-Objekt `{ ONLY_OFFICE: 'onlyoffice', COLLABORA: 'collabora' }` (const statt enum).
- `libs/src/docker/constants/filesharingDockerContainers.ts` *(neu)* — Map
  Editor → `edulution-onlyoffice`/`edulution-collabora`.
- `libs/src/filesharing/constants/wopi.ts` *(neu)* — `WOPI_TOKEN_EXPIRY='24h'`,
  `WOPI_TOKEN_TTL_MS=86400000`, `WOPI_BASE_PATH='wopi/files'`.
- `libs/src/filesharing/constants/fileSharingApiEndpoints.ts` — `COLLABORA_TOKEN='collabora-token'`
  ergänzen.
- `libs/src/filesharing/types/collaboraTokenBodyDto.ts`, `.../collaboraTokenResponseDto.ts`,
  `.../wopiTokenPayload.ts`, `.../wopiFileInfo.ts` *(neu)*.
- `libs/src/filesharing/types/filePreviewType.ts` — `COLLABORA: 'collabora'` ergänzen.
- `libs/src/appconfig/constants/appConfigSectionsKeys.ts` — Sektions-Key `collabora` (bzw.
  `documentEditor`) ergänzen.
- `libs/src/appconfig/constants/extendedOptions/collabora.ts` *(neu)* — `COLLABORA_EXTENDED_OPTIONS`
  (URL-input + WOPI-Secret-password) und die `ACTIVE_DOCUMENT_EDITOR`-Dropdown-Option (Analog zu
  `extendedOptions/onlyOffice.ts`).

### apps/api
- `apps/api/src/filesharing/collabora.service.ts` *(neu)* + `.spec.ts` — main.js `CollaboraService`.
- `apps/api/src/filesharing/wopi.controller.ts` *(neu)* + `.spec.ts` — main.js `WopiController`.
- `apps/api/src/filesharing/filesharing.controller.ts` — `POST collabora-token`.
- `apps/api/src/filesharing/filesharing.service.ts` — `getCollaboraToken(username, filePath, share)`.
- `apps/api/src/filesharing/filesharing.module.ts` — `CollaboraService` (Provider) +
  `WopiController` (Controller) registrieren.
- `apps/api/src/docker/docker.service.ts` — `resolveContainerName` FILE_SHARING-Sonderfall.
- `apps/api/src/appconfig/appconfig.service.ts` — Non-Admin-Maskierung um `COLLABORA_WOPI_SECRET`
  erweitern (Fork-Härtung).

### apps/frontend
- `apps/frontend/src/pages/Settings/AppConfig/appConfigOptions.ts` — `COLLABORA_EXTENDED_OPTIONS` +
  Editor-Selektor unter `APPS.FILE_SHARING`.
- `apps/frontend/src/pages/FileSharing/hooks/useCollabora.ts` *(neu)* — Token holen + Collabora-URL
  bauen (Analog `hooks/useOnlyOffice.ts`).
- `apps/frontend/src/pages/FileSharing/FilePreview/Collabora/Collabora.tsx` *(neu)* + Store — WOPI-
  Iframe (Analog `FilePreview/OnlyOffice/OnlyOffice.tsx`).
- `apps/frontend/src/pages/FileSharing/FilePreview/FileRenderer.tsx` — Editor-Auswahl (OnlyOffice ↔
  Collabora abhängig von `ACTIVE_DOCUMENT_EDITOR` + Konfigurationsstatus).
- `apps/frontend/src/locales/{de,en}/translation.json` — neue i18n-Keys.

## Quelle des Solls (Rekonstruktion — kein dedizierter Rescue-Branch für Collabora/WOPI)
- **`ACTIVE_DOCUMENT_EDITOR`-Key:** `main.js:2114` (ExtendedOptionKeys); const-Objekt
  `main.js:27180–27184` (`ONLY_OFFICE:'onlyoffice'`, `COLLABORA:'collabora'`).
- **Docker-Container-Map:** `main.js:27148–27151` (`FILESHARING_DOCKER_CONTAINERS`);
  `DockerService.resolveContainerName` `main.js:26538–26545` (Default `ONLY_OFFICE`).
- **CollaboraService:** `main.js:40352–40447` (`getWopiSecret`, `generateWopiToken`, `getFileStat`,
  `validateWopiToken`); WOPI-Konstanten `main.js:40457–40462`.
- **WopiController:** `main.js:43199–43328` (`checkFileInfo` `GET :fileId`, `getFile`
  `GET :fileId/contents`, `putFile` `POST :fileId/contents`; alle `@Public`,
  `@Controller('wopi/files')`).
- **Collabora-Token-Route:** `main.js:37560–37572` (`POST collabora-token`), Endpoint-Enum
  `main.js:37726`, Service-Delegation `main.js:38597–38598`.
- **Collabora-DTOs:** `CollaboraTokenResponseDto` `main.js:42259–42271`, `CollaboraTokenBodyDto`
  `main.js:42468–42475`.
- **Modul-Registrierung:** `main.js:37205–37245` (FilesharingModule: 3 Controller inkl.
  `wopi_controller`, Provider inkl. `collabora_service`).
- **Non-Admin-Secret-Maskierung (bereits 1.6):** `main.js:1726`
  (= `apps/api/src/appconfig/appconfig.service.ts:258`).
- **Base (1.6-Source im Repo):** `apps/api/src/filesharing/onlyoffice.service.ts`,
  `apps/frontend/src/pages/FileSharing/FilePreview/OnlyOffice/OnlyOffice.tsx`,
  `apps/frontend/src/pages/FileSharing/hooks/useOnlyOffice.ts`,
  `libs/src/appconfig/constants/extendedOptions/onlyOffice.ts` — strukturelle Vorlagen.
- **FE-Collabora-Preview hat KEINEN main.js-Anker** (main.js = API-Bundle). Soll = WOPI-Contract +
  Collabora-Online-SDK (`cool.html?WOPISrc=…` + `access_token`-Form-POST) + `OnlyOffice.tsx`-Analogie
  + Baseline-Screenshots (`scratchpad/real/*`, falls 2.0-Box online).

## Datenmodell / API / Migrationen
**Neue Routen**
- `POST /edu-api/filesharing/collabora-token` (auth: eingeloggt, `@GetCurrentUsername`).
- `GET  /edu-api/wopi/files/:fileId` (checkFileInfo, **`@Public`**, `access_token`-Query).
- `GET  /edu-api/wopi/files/:fileId/contents` (getFile, **`@Public`**).
- `POST /edu-api/wopi/files/:fileId/contents` (putFile, **`@Public`**, Raw-Body octet-stream).

**Neue DTOs:** `CollaboraTokenBodyDto { filePath: string; share: string; canWrite?: boolean }`,
`CollaboraTokenResponseDto { accessToken: string; accessTokenTTL: number }`, interner
`WopiTokenPayload { username, filePath, share, canWrite, origin, jti }`, `WopiFileInfo`
(BaseFileName, Size, OwnerId/UserId/UserFriendlyName, UserCanWrite, UserCanNotWriteRelative=true,
PostMessageOrigin, LastModifiedTime, Version).

**DB-Migration:** **nein.** Die drei Keys leben in `appConfig.extendedOptions` (flexibles Objekt);
kein Feld an einem Mongoose-Schema, kein `schemaVersion++`. Bestands-Instanzen ohne die Keys erhalten
Default `ACTIVE_DOCUMENT_EDITOR = onlyoffice` (Fallback im Code, `main.js:26542`) und leere
Collabora-Config → Collabora erst nach Admin-Konfiguration aktiv. Der bestehende OnlyOffice-Bootstrap
(`OnlyofficeService.onModuleInit`, schon in 1.6) bleibt unangetastet.

**Contract-Drift-Kette (prüfen):** appconfig `extendedOptionKeys` (libs) ↔ Settings-UI
(`appConfigOptions.ts` + `extendedOptions/collabora.ts`) ↔ BE-Lesezugriffe (`CollaboraService`,
`DockerService`) ↔ DTOs (`collabora-token`) ↔ FE-Hook/Store. Endpoint-Enum
(`fileSharingApiEndpoints.ts`) muss BE-Route == FE-Call spiegeln.

## Auth / Guards (mit-portieren)
- **`WopiController`: alle drei Methoden `@Public()`** (`main.js:43283/43300/43320`) — der Guard-Bypass
  ist **beabsichtigt**, weil Collabora serverseitig ohne Keycloak-Session zugreift; die Autorisierung
  läuft **ausschließlich** über das signierte `access_token` (JWT mit `COLLABORA_WOPI_SECRET`), das
  `CollaboraService.validateWopiToken` prüft. Beim Nachbau **exakt** so portieren: `@Public` **plus**
  Token-Validierung in **jeder** Methode (kein ungeprüfter Pfad). `putFile` prüft zusätzlich
  `tokenData.canWrite` (403 bei read-only). Path-Traversal-Schutz (`filePath.includes('..')`) in
  `generateWopiToken` mit-portieren.
- **`POST collabora-token`:** normale eingeloggte Route (`@GetCurrentUsername`), Klassen-Guards der
  `FilesharingController` gelten — nicht `@Public`.
- **Non-Admin-Maskierung** (`appconfig.service.ts`): Admin-Check via `getIsAdmin(ldapGroups,
  adminGroups)`; Non-Admins bekommen `extendedOptions` mit gestrippten Secrets. Neu:
  `COLLABORA_WOPI_SECRET` mit strippen (sonst forgebarer WOPI-Token).

## Externe Integrationen
- **Collabora Online** (WOPI-Client, Companion-Container `edulution-collabora`): lädt Dokumente über
  `GET wopi/files/:fileId(/contents)`, speichert über `POST …/contents`. Muss die eduApi unter
  `<base>/edu-api/wopi/files/…` erreichen (Netzwerk/DNS zwischen Collabora-Container und API →
  Deployment-Contract). WOPISrc + `access_token` werden vom FE beim Iframe-Aufbau gesetzt.
- **WebDAV/SOGo** (bestehend): `CollaboraService.getFileStat` (PROPFIND) und `WopiController.getFile/
  putFile` gehen über `WebDavService`/`WebdavSharesService` — dieselbe Infrastruktur wie OnlyOffice.
- **DockerService/App-Store** (`DockerService.resolveContainerName`): löst FILE_SHARING auf den
  Editor-Container auf. Der **Compose-Inhalt** für `edulution-collabora` kommt live von
  `edulution-plugins` (§3.4/§5.3) — dieser Fetch muss für die Voll-Stack-Verifikation umgebogen sein
  (nicht Teil dieses Pakets).

## Secrets / Env / master.key
- **`COLLABORA_WOPI_SECRET`**: **kein** Env, sondern `extendedOptions`-Wert (Admin setzt ihn in der
  Settings-UI; im App-Store-Rollout injiziert die Collabora-`docker-compose.yml` denselben Wert als
  Container-Env). **Contract:** appconfig `COLLABORA_WOPI_SECRET` == Collabora-Container-`WOPI_SECRET`
  müssen übereinstimmen, sonst schlägt die Token-Verifikation fehl. Der Wert darf **nie** an
  Non-Admins ausgeliefert werden (Maskierungs-Task).
- **Kein neuer Env-Default** in `.env.default` (anders als `EDULUTION_ONLYOFFICE_JWT_SECRET`, das nur
  den OnlyOffice-Bootstrap füttert; Collabora hat keinen `onModuleInit`-Bootstrap).
- **`master.key`/gewrappte User-Keys: nicht berührt.** WOPI-Token nutzt `COLLABORA_WOPI_SECRET`, nicht
  den Master-Key. Kein Backup-/Rollback-Kopplung an `master.key`.

## Trade-offs & Alternativen (mit Empfehlung)
- **A) Vollständige Rekonstruktion (Empfehlung)** — WOPI-Stack + Selektor + Docker-Auflösung wie in
  2.0. Vorteil: Verhaltensgleichheit, Instanzen mit Collabora migrieren sauber. Nachteil: neuer
  `@Public`-Controller = Sicherheits-Sorgfalt nötig.
- **B) Nur OnlyOffice behalten, Collabora weglassen** — weniger Code, aber Instanzen, die in 2.0
  Collabora nutzen, verlieren ihren Editor; `ACTIVE_DOCUMENT_EDITOR=collabora` würde ins Leere laufen.
  Verworfen (Bruch der Migrations-Kompatibilität).
- **C) Editor-Selektor als Env statt appconfig** — einfacher, aber inkonsistent mit dem 2.0-Design
  (Wert lebt in `extendedOptions`, wird pro Instanz per UI gesetzt) und mit `resolveContainerName`,
  das aus appconfig liest. Verworfen.
- **Selektor-Feldtyp:** `ExtendedOptionField.dropdown` existiert bereits → **kein** neuer Feldtyp
  nötig (Empfehlung dropdown mit zwei Optionen).

## Risiken & Rollback
- **R1 — `@Public`-WopiController als Angriffsfläche.** Fehlende/fehlerhafte Token-Prüfung = anonymer
  WebDAV-Zugriff. Mitigation: Token-Validierung in **jeder** Methode, `canWrite`-Check in `putFile`,
  Path-Traversal-Guard, Non-Admin-Maskierung des Secrets. Test mit ungültigem/fehlendem Token → 401,
  read-only-Token auf `putFile` → 403.
- **R2 — Secret-Leak.** Wird `COLLABORA_WOPI_SECRET` nicht maskiert, kann jeder eingeloggte Non-Admin
  über `GET /appconfigs` den Secret lesen und WOPI-Tokens fälschen. Mitigation: Maskierungs-Task +
  Test.
- **R3 — Raw-Body/PutFile.** `putFile` liest `req` als Stream. Der App-Bootstrap hat
  `bodyParser:false` (`main.js:73159`) und registriert `express.json`/`urlencoded` global
  (`main.js:546`); da beide nur nach Content-Type (`application/json` bzw. urlencoded) greifen und
  Collabora `application/octet-stream` sendet, bleibt der Stream intakt — **kein** Sonderausschluss
  nötig, aber im Test verifizieren (Binär-PUT kommt unverändert am WebDAV an).
- **R4 — Docker-Namens-Auflösung.** `resolveContainerName` darf nicht-FILE_SHARING-Apps unverändert
  lassen (Fallback `dockerApplicationList[app] ?? app`). Test: Nicht-Filesharing-App → alte Auflösung.
- **Rollback:** rein additiv, keine Migration → Rollback = vorheriger Image-Tag; kein DB-Dump/
  `master.key` nötig. Bestehende OnlyOffice-Instanzen sind unbetroffen (Default bleibt onlyoffice).

## Doku-Impact (Augenmaß)
- Admin-Doku (`docs/` DE+EN): kurzer Abschnitt „Dokumenteneditor wählen (OnlyOffice/Collabora)" +
  nötige `COLLABORA_URL`/`COLLABORA_WOPI_SECRET`-Konfiguration und der Contract zum Collabora-
  Container-Secret. Neue Route-Übersicht (WOPI) nur intern relevant.
- **Keine** Env-/Port-Doku-Änderung (kein neuer Env-Default).

## i18n-Impact (DE+EN, Pflicht)
Neue Keys (DE **und** EN):
- `appExtendedOptions.collaboraUrl`, `appExtendedOptions.collaboraUrlTitle`
- `appExtendedOptions.collaboraWopiSecretTitle`, `appExtendedOptions.collaboraWopiSecretDescription`
- `appExtendedOptions.activeDocumentEditorTitle`, `appExtendedOptions.activeDocumentEditorDescription`
- Option-Labels für Editor-Auswahl (`onlyoffice`, `collabora`)
- Settings-Sektionstitel `collabora` (bzw. `documentEditor`)
- Filesharing-Fehlermeldung `WopiTokenInvalid` (DE+EN); `AppNotProperlyConfigured` existiert bereits.
`npm run check-translations` muss grün sein (DE/EN-Parität).

## Offene Fragen
1. **COLLABORA_WOPI_SECRET-Maskierung:** Im 2.0-Snapshot maskiert `main.js:1726` **nur**
   `ONLY_OFFICE_JWT_SECRET`, nicht das WOPI-Secret. Ist das ein bewusster Upstream-Zustand oder ein
   latentes Leck? **Empfehlung:** im Fork **beide** maskieren (Sicherheit sticht Verhaltensgleichheit).
   Entscheidung am Gate.
2. **Wo lebt der Editor-Selektor in der Settings-UI?** Eigene Sektion `documentEditor` (mit dem
   Dropdown + Collabora-Feldern) vs. in die bestehende `onlyOffice`-Sektion mischen.
   Empfehlung: eigene Sektion, damit OnlyOffice-/Collabora-Felder getrennt bleiben.
3. **Collabora-Iframe-Integration (FE):** exakte URL-Form (`<COLLABORA_URL>/browser/dist/cool.html`
   vs. `/cool.html`, Discovery vs. fixe URL) — Detail schärft sich an der laufenden 2.0-Box /
   Collabora-Version. Kein main.js-Anker (API-only).
4. **App-Store-Rollout von `edulution-collabora`:** hängt am umgebogenen `edulution-plugins`-Compose-
   Fetch (§3.4/§5.3) und an einer Image-Policy — Voraussetzung für die Voll-Stack-Verifikation,
   nicht Teil dieses Pakets. Klären, ob die Verifikation hier End-to-End laufen kann.
5. **`OVERRIDE_FILE_SHARING_DOCUMENT_VENDOR_MS_WITH_OO`** ist OnlyOffice-spezifisch — gilt bei
   aktivem Collabora irrelevant? (Vermutlich ja; im FE-Editor-Auswahlpfad ignorieren.)
6. **`dockerApplicationList.filesharing`-Eintrag:** behalten (als Default/Fallback) oder entfernen,
   da `resolveContainerName` FILE_SHARING nun über die Map auflöst? Empfehlung: Map ist maßgeblich,
   Alt-Eintrag als Fallback belassen.
