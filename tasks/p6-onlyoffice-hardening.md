## p6-onlyoffice-hardening — OnlyOffice/Collabora härten (Stage 1: Regression unter 2.0.200 schließen · Stage 2: 2.1.0-Niveau)

Spec: `docs/features/p6-onlyoffice-hardening.md` (wird in T11/T28 geschrieben) · Rekonstruktionsquelle:
`.reference/2.0.200/api/main.js` (OLD) und `.reference/2.1.0/api/main.js` (NEW), beide un-minifiziert.
Frontend-Anteile sind **Fork-Original-Design** — die Frontend-Bundles sind nicht rekonstruierbar, nur die API-Bundles.

**Befund (verifiziert am Code, nicht vermutet):**
- `apps/api/src/filesharing/filesharing.service.ts:223-225` signiert mit `generateOnlyOfficeToken(payload)`
  **wortwörtlich das, was der Client postet**. 2.0.200 hat davor zwei Schutzschichten, die im Fork komplett fehlen:
  `sanitizeOnlyOfficeConfig` (OLD:41673-41706) und `FilesharingService.assertDocumentUrlMatchesFile` (OLD:38570-38596).
  Folge: jeder authentifizierte Nutzer kann eine dokumentenserver-vertraute Config mit beliebiger `document.url`,
  beliebigen `permissions` und beliebiger `editorConfig.user`-Identität minten.
- `apps/api/src/filesharing/onlyoffice.service.ts:78-101` (`static handleCallback`) prüft **gar nichts**:
  keine Verifikation von `callbackData.token` gegen das OnlyOffice-Secret, kein Echo-Abgleich von status/url/key,
  kein Origin-Guard auf `callbackData.url` (→ SSRF: `FilesystemService.retrieveAndSaveFile` lädt jede URL).
  2.0.200 hat all das in `OnlyofficeService.handleCallback` (OLD:40243-40300, Instanzmethode).
- Der rohe Keycloak-Bearer in der Callback-URL (`getCallbackBaseUrl.ts:32`, `useOnlyOffice.ts:65-70`) ist
  **identisch in 2.0.200** (OLD:37637-37655 ist nicht `@Public`) — behoben erst in 2.1.0 via `eduCallbackToken`. → Stage 2.

**Reihenfolge ist bindend.** Stage 1 (T1–T11) ist eigenständig deploybar. Stage 2 (T12–T28) baut darauf auf;
innerhalb Stage 2 gilt die Kopplung T15+T16+T17+T18 (siehe Risiken).

### Stage 1 — 2.0.200-Niveau wiederherstellen (keine neuen Deps)

### T1 — ONLY_OFFICE_CALLBACK_STATUS als const-Objekt  [ ]
Komponente: libs · Dateien: `libs/src/filesharing/constants/onlyOfficeCallbackStatus.ts` (NEU)
Soll: OLD:37788-37796 / NEW:51731-51739, Modul-Export `ONLY_OFFICE_CALLBACK_STATUS`.
Änderung: NEUE Datei mit AGPL-SPDX-Header (`SPDX-License-Identifier: AGPL-3.0-or-later`, `Copyright (C) 2026 Kevin Stenzel`).
`const ONLY_OFFICE_CALLBACK_STATUS = { EDITING: 1, READY_FOR_SAVING: 2, SAVING_ERROR: 3, CLOSED_WITHOUT_CHANGES: 4, FORCE_SAVING: 6, FORCE_SAVING_ERROR: 7 } as const;` plus abgeleiteter Typ
`type OnlyOfficeCallbackStatus = (typeof ONLY_OFFICE_CALLBACK_STATUS)[keyof typeof ONLY_OFFICE_CALLBACK_STATUS];`
Default-Export `ONLY_OFFICE_CALLBACK_STATUS` am Dateiende (Muster: `libs/src/filesharing/constants/activeDocumentEditor.ts`).
Kein enum, keine Kommentare.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler; `bash scripts/crabbox/iter.sh lint` sauber.
i18n: keine
Doku: keine
Abhängt von: —

### T2 — Struktureller Typ für die Client-Config  [ ]
Komponente: libs · Dateien: `libs/src/filesharing/types/onlyOfficeClientConfig.ts` (NEU)
Soll: Aus dem Bundle **nicht** ableitbar — die Typen sind wegkompiliert. Die Feldmenge ist aber aus
OLD:41673-41706 (sanitize liest `document.{key,title,url}`, `documentType`, `editorConfig.{mode,callbackUrl}`,
`type`, `height`, `width`) und OLD:38570-38596 (`document.url`, `editorConfig.callbackUrl`) exakt bestimmt.
**Fork-Original-Naming** (`OnlyOfficeClientConfig`), Struktur ist Rekonstruktion.
Änderung: NEUE Datei, AGPL-SPDX-Header. Interface `OnlyOfficeClientConfig` mit optionalen Feldern:
`document?: { fileType?: string; key?: string; title?: string; url?: string; permissions?: Record<string, boolean>; }`,
`documentType?: string`, `editorConfig?: { mode?: 'view' | 'edit'; callbackUrl?: string; lang?: string; user?: { id?: string; name?: string }; customization?: Record<string, unknown>; }`,
`type?: string`, `height?: string`, `width?: string`, `token?: string`, plus Index-freie Struktur (keine `any`).
**Nicht** `IConfig` aus `@onlyoffice/document-editor-react` in `libs` importieren — das zieht React-Typen in den API-Build.
Default-Export am Dateiende.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit && npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` → 0 Fehler.
i18n: keine
Doku: keine
Abhängt von: —

### T3 — sanitizeOnlyOfficeConfig (2.0.200) nachbauen  [ ]
Komponente: libs · Dateien: `libs/src/filesharing/utils/sanitizeOnlyOfficeConfig.ts` (NEU), `apps/api/src/filesharing/sanitizeOnlyOfficeConfig.spec.ts` (NEU)
Soll: OLD:41673-41706 (`const sanitizeOnlyOfficeConfig = (clientConfig, { canWrite, username }) => …`), 1:1.
Ablageort in `libs/src/filesharing/utils/` ist Fork-Entscheidung (AGENTS.md: Utility-Funktionen gehören nach `libs/`);
aus dem Bundle ist der Original-Pfad nicht ableitbar.
Änderung: NEUE Datei, AGPL-SPDX-Header. Signatur
`(clientConfig: OnlyOfficeClientConfig | undefined, { canWrite, username }: { canWrite: boolean; username: string }): OnlyOfficeClientConfig`.
Verhalten exakt wie OLD:41674-41705: `base = clientConfig && typeof clientConfig === 'object' ? clientConfig : {}`;
`requestedEditMode = base.editorConfig?.mode === 'edit'`; `effectiveEdit = canWrite && requestedEditMode`;
Rückgabe mit `document: { ...base.document, key: base.document?.key ?? '', title: … ?? '', url: … ?? '', permissions: { chat, edit, comment, review, fillForms, modifyFilter, modifyContentControl, protect } — ALLE acht auf effectiveEdit }`,
`documentType: base.documentType`, `editorConfig: { ...base.editorConfig, callbackUrl: base.editorConfig?.callbackUrl ?? '', mode: effectiveEdit ? 'edit' : 'view', user: { id: username, name: username } }`,
`type`, `height`, `width` durchgereicht. **Alle anderen vom Client gelieferten Top-Level-Felder fallen weg** (kein Spread von `base`) — das ist der Kern des Schutzes. Default-Export am Dateiende, keine Kommentare.
Spec (jest, liegt unter `apps/api/src/filesharing/`, weil weder `libs/` noch vitest libs-Specs einsammeln — es gibt bis heute 0 Specs unter `libs/`): mindestens 5 Fälle —
(1) `canWrite=false` + Client schickt `mode:'edit'` und `permissions.edit:true` → alle 8 permissions `false`, `mode:'view'`;
(2) `canWrite=true` + `mode:'edit'` → alle 8 `true`, `mode:'edit'`;
(3) Client schickt `editorConfig.user:{id:'admin',name:'admin'}` → wird durch `{id: username, name: username}` ersetzt;
(4) Client schickt Zusatzfeld (z. B. `events`, `editorConfig.recent`) auf Top-Level → fehlt in der Ausgabe;
(5) `clientConfig` `undefined`/String → wirft nicht, liefert leere Defaults.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=sanitizeOnlyOfficeConfig'` → Suite grün, 5+ Tests.
i18n: keine
Doku: keine
Abhängt von: T2

### T4 — Response-DTO für die only-office-Route  [ ]
Komponente: libs · Dateien: `libs/src/filesharing/types/onlyOfficeTokenResponseDto.ts` (NEU)
Soll: NEW:56717-56724 deklariert `OnlyOfficeTokenResponseDto` mit **nur** `token` (das ist die Swagger-Deklaration).
Der tatsächliche Service-Rückgabewert ist `{ config: sanitized, token }` — OLD:38566-38567 / NEW:52743-52744.
Änderung: NEUE Datei, AGPL-SPDX-Header. Interface `OnlyOfficeTokenResponseDto { config: OnlyOfficeClientConfig; token: string; }`.
Default-Export am Dateiende. Kein `class`/kein `@ApiProperty` (der Fork nutzt in `libs/src/filesharing/types/` durchgängig Interfaces, s. `publicShareResponseDto.ts`).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler.
i18n: keine
Doku: keine
Abhängt von: T2

### T5 — assertDocumentUrlMatchesFile + getOnlyOfficeToken im Service  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/filesharing.service.ts` (ändern, aktuell Zeilen 223-225), `apps/api/src/filesharing/assertDocumentUrlMatchesFile.spec.ts` (NEU)
Soll: OLD:38553-38568 (`async getOnlyOfficeToken(clientConfig, options)`) und OLD:38570-38596
(`static assertDocumentUrlMatchesFile(clientConfig, filePath, fileName)`).
Änderung:
(a) `getOnlyOfficeToken` umbauen auf
`async getOnlyOfficeToken(clientConfig: OnlyOfficeClientConfig, options: { canWrite: boolean; username: string; filePath: string; fileName: string }): Promise<OnlyOfficeTokenResponseDto>`:
zuerst `FilesharingService.assertDocumentUrlMatchesFile(clientConfig, options.filePath, options.fileName)`,
dann `const sanitized = sanitizeOnlyOfficeConfig(clientConfig, { canWrite: options.canWrite, username: options.username })`,
dann `const token = await this.onlyofficeService.generateOnlyOfficeToken(sanitized)`, `return { config: sanitized, token }`.
**Achtung Signatur-Drift:** `OnlyofficeService.generateOnlyOfficeToken` (onlyoffice.service.ts:67) deklariert `payload: string`,
signiert aber ein Objekt — Parametertyp auf `OnlyOfficeClientConfig` ziehen (`this.jwtService.sign` akzeptiert Objekte;
mit `string` würde `jsonwebtoken` den Payload als bereits-JSON behandeln und `expiresIn`-freie String-Payloads durchreichen).
(b) NEUE `private static assertDocumentUrlMatchesFile(clientConfig, filePath, fileName): void` exakt nach OLD:38570-38596:
`expectedHashedFilename = FilesystemService.generateHashedFilename(filePath, fileName)`;
`document.url` und `editorConfig.callbackUrl` in `new URL(...)` parsen (try/catch → beide `null`);
`allowedCallbackPathnames = new Set([`/${EDU_API_ROOT}/${FileSharingApiEndpoints.BASE}/callback`])`
— **Abweichung von 2.0.200, bewusst:** die zweite erlaubte Pathname `/${EDU_API_ROOT}/${PUBLIC_FILESHARING}/callback` entfällt,
weil der Fork keinen public-filesharing-Controller hat (grep `PUBLIC_FILESHARING` im Repo = 0 Treffer). Im Code als Konstante,
kein Magic String; im Spec als Regressionsanker festhalten.
Wirft bei Mismatch `new CustomHttpException(FileSharingErrorMessage.PublicFileIsRestricted, HttpStatus.FORBIDDEN, 'document.url does not match requested file')`
(Nachricht wörtlich wie OLD:38594).
Spec: (1) korrekte URLs (`https://h/edu-api/downloads/<hash>.docx` + `https://h/edu-api/filesharing/callback?…`) → wirft nicht;
(2) fremde `document.url` (anderer Hash) → 403; (3) `callbackUrl` mit anderem Origin als `document.url` → 403;
(4) `callbackUrl`-Pathname `/edu-api/filesharing/upload` → 403; (5) `document.url` fehlt → 403.
`FilesystemService.generateHashedFilename` echt aufrufen (statische Methode, keine DI nötig).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern="assertDocumentUrlMatchesFile|filesharing"'` → grün; `bash scripts/crabbox/iter.sh lint` sauber.
i18n: keine (`filesharing.publicFileSharing.errors.PublicFileIsRestricted` existiert bereits in de/en/fr)
Doku: keine (kommt in T11)
Abhängt von: T3, T4

### T6 — Controller: filePath/fileName als Query, Guards unangetastet  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/filesharing.controller.ts` (ändern, aktuell Zeilen 184-187), `apps/api/src/filesharing/filesharing.controller.spec.ts` (ergänzen)
Soll: OLD:37370-37377 (Handler) + OLD:37546-37558 (Dekoratoren: `@Post(ONLY_OFFICE_TOKEN)`, `@Body()`, `@Query('filePath')`, `@Query('fileName')`, `@GetCurrentUsername()`).
Änderung: `getOnlyofficeToken(@Body() clientConfig: OnlyOfficeClientConfig, @Query('filePath') filePath: string, @Query('fileName') fileName: string, @GetCurrentUsername() username: string)`
→ `return this.filesharingService.getOnlyOfficeToken(clientConfig, { canWrite: true, username, filePath, fileName })`.
`canWrite: true` ist 2.0.200- **und** 2.1.0-treu (OLD:37371, NEW:51308) — nicht "verbessern".
**Guards:** Klassen-Dekoratoren `@RequireAppAccess(APPS.FILE_SHARING)` und `@ApiBearerAuth()` bleiben; die Route bekommt
**kein** `@Public()`. Spec-Listen `PUBLIC_ROUTES`/`NON_PUBLIC_ROUTES` in filesharing.controller.spec.ts bleiben unverändert
(`getOnlyofficeToken` steht bereits in NON_PUBLIC_ROUTES, Zeile 26).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=filesharing.controller'` → grün, inkl. der bestehenden "auth bypass contract"-Tests.
i18n: keine
Doku: keine
Abhängt von: T5

### T7 — Frontend-Store: neuen Response-Contract konsumieren  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/FileSharing/FilePreview/OnlyOffice/useFileEditorStore.ts` (ändern: Typ Zeile 37, Implementierung im `getOnlyOfficeJwtToken`-Block)
Soll: **Fork-Original-Design** — das Frontend ist aus keinem Bundle rekonstruierbar. Der Server-Contract ist durch T5/T6 festgelegt.
Änderung: Store-Typ `getOnlyOfficeJwtToken: (config: IConfig) => Promise<string>` →
`getOnlyOfficeConfigAndToken: (config: IConfig, filePath: string, fileName: string) => Promise<OnlyOfficeTokenResponseDto | null>`.
Implementierung: `eduApi.post<OnlyOfficeTokenResponseDto>(…ONLY_OFFICE_TOKEN…, config, { params: { filePath, fileName }, headers: { 'Content-Type': RequestResponseContentType.APPLICATION_JSON } })`
— **kein** `JSON.stringify(config)` mehr (die Route nimmt jetzt ein Objekt entgegen, `@Body()` parst JSON) und
**kein** manuelles `URLSearchParams` (AGENTS.md: axios `params`). Fehlerpfad weiter über `handleApiError(error, set)`, Rückgabe `null`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` → 0 Fehler UND `bash scripts/crabbox/iter.sh test:frontend` → grün.
i18n: keine
Doku: keine
Abhängt von: T4, T6

### T8 — useOnlyOffice: sanitisierte Server-Config verwenden  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/FileSharing/hooks/useOnlyOffice.ts` (ändern, Zeilen 72-91)
Soll: **Fork-Original-Design**. Fachlicher Zwang: der Dokumentenserver vergleicht die gesendete Config mit dem JWT-Payload;
wird weiter die lokale Config gerendert, während der Server eine sanitisierte signiert hat, lehnt OnlyOffice mit
"The document security token is not correctly formed" ab.
Änderung: im `useEffect` statt `onlyOfficeConfig.token = await getOnlyOfficeJwtToken(onlyOfficeConfig)` →
`const response = await getOnlyOfficeConfigAndToken(onlyOfficeConfig, filePath, fileName); if (!response) return;`
`setEditorConfig({ ...(response.config as IConfig), token: response.token })`.
Die lokal gebaute Config bleibt als Request-Body erhalten (sie liefert `fileType`, `customization`, `lang`, `documentType`,
die der Server durchreicht). `getCallbackBaseUrl`-Aufruf in dieser Task **nicht** anfassen (kommt in T17).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` → 0 Fehler; `bash scripts/crabbox/iter.sh lint` sauber.
i18n: keine
Doku: keine
Abhängt von: T7

### T9 — OnlyofficeService.handleCallback: Token-, Echo-, Status- und SSRF-Prüfung  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/onlyoffice.service.ts` (ändern, aktuell Zeilen 78-101), `apps/api/src/filesharing/onlyoffice.service.spec.ts` (NEU)
Soll: OLD:40243-40300 — `async handleCallback(req, res, path, filename, username, uploadFile)` als **Instanzmethode**
plus `static isAllowedOnlyOfficeDownloadUrl(downloadUrl, configuredOnlyOfficeUrl)` (OLD:40287-40300).
Änderung: die vorhandene `static async handleCallback` (Zeilen 78-101) zur Instanzmethode machen und die vier fehlenden
Prüfungen in exakt dieser Reihenfolge (OLD:40244-40284) ergänzen:
1. AppConfig lesen; `jwtSecret = extendedOptions[ExtendedOptionKeys.ONLY_OFFICE_JWT_SECRET]`,
   `allowedOnlyOfficeUrl = extendedOptions[ExtendedOptionKeys.ONLY_OFFICE_URL]`; ohne Secret → `500 { error: 1 }`.
2. `if (!callbackData.token) return res.status(HttpStatus.UNAUTHORIZED).json({ error: 1 })`;
   `this.jwtService.verify(callbackData.token, { secret: jwtSecret })` in try/catch → bei Fehler `401 { error: 1 }`.
3. `const signed = verified.payload ?? verified;` Echo-Abgleich
   `if (signed.status !== callbackData.status || signed.url !== callbackData.url || signed.key !== callbackData.key) → 401 { error: 1 }`.
4. Status-Filter über `ONLY_OFFICE_CALLBACK_STATUS` (T1): alles außer `READY_FOR_SAVING`, `CLOSED_WITHOUT_CHANGES`,
   `FORCE_SAVING` → `200 { error: 0 }` ohne Persistierung.
5. `if (!OnlyofficeService.isAllowedOnlyOfficeDownloadUrl(signed.url, allowedOnlyOfficeUrl)) → 403 { error: 1 }`
   (Origin-Vergleich per `new URL(...)`, `configuredOnlyOfficeUrl` leer/unparsebar → `false`).
6. Erst danach `retrieveAndSaveFile(uniqueFileName, signed.url)` — **`signed.url`, nicht `callbackData.url`** (OLD:40279),
   dann `uploadFile(...)`, `deleteFile(PUBLIC_DOWNLOADS_PATH, uniqueFileName)`, `200 { error: 0 }`.
Der `securityContext`/`publicShareId`-Parameter aus OLD:40243/40273-40277 entfällt bewusst (kein public-filesharing-Controller im Fork);
in T28 als offener Rekonstruktionsrest dokumentieren. Statischer Logger `Logger.warn(..., OnlyofficeService.name)` bei jeder Ablehnung, keine Token-Werte loggen.
Spec: AppConfigService + JwtService mocken; 7 Fälle — fehlendes Secret→500, fehlender `callbackData.token`→401,
`verify` wirft→401, Echo-Mismatch bei status/url/key→401, `status:1`→200 ohne uploadFile-Aufruf,
fremder Download-Origin→403 und `retrieveAndSaveFile` **nicht** aufgerufen, Happy Path status 2→200 + `uploadFile` genau einmal.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=onlyoffice.service'` → grün, 7+ Tests.
i18n: keine
Doku: keine
Abhängt von: T1

### T10 — Aufrufer auf die Instanzmethode + Status-Konstante umstellen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/filesharing.service.ts` (ändern, Zeilen 227-247), `apps/api/src/filesharing/filesharing.controller.ts` (ändern, Zeilen 244-263)
Soll: OLD:38626-38650 (Service-Wrapper) + OLD:37397-37404 (Controller-Frühausstieg mit `ONLY_OFFICE_CALLBACK_STATUS.EDITING`).
Änderung: In `FilesharingService.handleCallback` `OnlyofficeService.handleCallback(...)` → `this.onlyofficeService.handleCallback(...)`
(der Service ist bereits injiziert, filesharing.service.ts:59). Im Controller den Magic-Number-Vergleich
`if (status === 1)` durch `ONLY_OFFICE_CALLBACK_STATUS.EDITING` ersetzen (AGENTS.md: keine Magic Strings/Numbers).
Sonst nichts ändern — `@Query('path')/'filename'/'share'` und `@GetCurrentUsername()` bleiben in Stage 1 exakt wie
in 2.0.200 (OLD:37637-37655); die Route bleibt **nicht** `@Public`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=filesharing'` → grün; `bash scripts/crabbox/iter.sh lint` sauber.
i18n: keine
Doku: keine
Abhängt von: T9

### T11 — Stage-1-Spec + Deploy-Hinweis dokumentieren  [ ]
Komponente: docs · Dateien: `docs/features/p6-onlyoffice-hardening.md` (NEU)
Soll: Reine Doku-Task, keine Rekonstruktion.
Änderung: NEUE Datei nach dem Muster der übrigen `docs/features/*.md` (Problem/Motivation · Ziel & Nicht-Ziele ·
Betroffene Komponenten & Dateien · Datenmodell · Sicherheit · Offene Fragen), mit den Bundle-Ankern
OLD:41673 / OLD:38570 / OLD:40243 und der Feststellung, dass Stage 1 **keine** DB-Migration und **keinen**
`schemaVersion`-Bump enthält. Zusätzlich festhalten: 403-Radius von `assertDocumentUrlMatchesFile`,
die bewusst weggelassene `PUBLIC_FILESHARING`-Callback-Pathname und der weggelassene `securityContext`.
Markdown-SPDX-Header (`<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->`, `<!-- Copyright (C) 2026 Kevin Stenzel -->`) wie in `tasks/backlog.md`.
Verify: `bash scripts/crabbox/iter.sh cmd 'test -f docs/features/p6-onlyoffice-hardening.md && grep -q "OLD:41673" docs/features/p6-onlyoffice-hardening.md && echo OK'` → `OK`.
i18n: keine (Feature-Specs sind einsprachig deutsch, s. übrige `docs/features/`)
Doku: diese Task IST die Doku
Abhängt von: T10

### Stage 2 — 2.1.0-Niveau (eduCallbackToken + Session-Document-Key)

### T12 — ONLY_OFFICE_CALLBACK_AUTH als const-Objekt  [ ]
Komponente: libs · Dateien: `libs/src/filesharing/constants/onlyOfficeCallbackAuth.ts` (NEU)
Soll: NEW:51766-51769 — `{ QUERY_PARAM: 'eduCallbackToken', TOKEN_TTL: '7d' }`.
Änderung: NEUE Datei, AGPL-SPDX-Header, `const ONLY_OFFICE_CALLBACK_AUTH = { QUERY_PARAM: 'eduCallbackToken', TOKEN_TTL: '7d' } as const;`,
Default-Export am Dateiende. Werte wörtlich aus NEW:51767-51768 — nicht „härten" (die 7 Tage sind der 2.1.0-Wert).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler.
i18n: keine
Doku: keine
Abhängt von: T11

### T13 — FileSharingErrorMessage.InvalidCallbackToken + i18n  [ ]
Komponente: libs, apps/frontend · Dateien: `libs/src/filesharing/types/fileSharingErrorMessage.ts` (ändern), `apps/frontend/src/locales/de/translation.json`, `apps/frontend/src/locales/en/translation.json`, `apps/frontend/src/locales/fr/translation.json`
Soll: NEW:7102 — `FileSharingErrorMessage["InvalidCallbackToken"] = "filesharing.errors.InvalidCallbackToken"`.
Änderung: Enum-Eintrag `InvalidCallbackToken = 'filesharing.errors.InvalidCallbackToken',` ergänzen (die Datei ist ein
bestehendes `enum` — Bestandsschutz laut House-Rules, **nicht** auf const-Objekt umbauen). Bestehenden Netzint-Header der Datei belassen.
Dann in allen drei `translation.json` unter `filesharing.errors` den Key `InvalidCallbackToken` ergänzen
(de: „Der Rückruf-Token des Dokumentenservers ist ungültig oder abgelaufen." · en: „The document server callback token is invalid or expired." · fr: „Le jeton de rappel du serveur de documents est invalide ou expiré.").
Verify: `bash scripts/crabbox/iter.sh i18n` → `check-translations` **und** `check-error-message-translations` grün (letzteres erzwingt, dass jeder Enum-Wert übersetzt ist).
i18n: `filesharing.errors.InvalidCallbackToken` in de + en + fr
Doku: keine
Abhängt von: T12

### T14 — Payload-Typ des eduCallbackToken  [ ]
Komponente: libs · Dateien: `libs/src/filesharing/types/onlyOfficeCallbackAuthPayload.ts` (NEU)
Soll: Feldmenge exakt aus NEW:52727-52732 (`{ username, path, filename, share }`) und NEW:54523 (`decoded.edulutionCallback?.username` ist das Pflichtfeld). Der TS-Typname ist aus dem Bundle nicht ableitbar → **Fork-Original-Naming**.
Änderung: NEUE Datei, AGPL-SPDX-Header. `interface OnlyOfficeCallbackAuthPayload { username: string; path: string; filename: string; share?: string; }`, Default-Export am Dateiende.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler.
i18n: keine
Doku: keine
Abhängt von: T12

### T15 — generateCallbackAuthToken / verifyCallbackAuthToken  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/onlyoffice.service.ts` (ändern), `apps/api/src/filesharing/onlyoffice.service.spec.ts` (ergänzen)
Soll: NEW:54514-54527 — beide Methoden wörtlich.
Änderung: Zwei neue Instanzmethoden auf `OnlyofficeService`:
`async generateCallbackAuthToken(payload: OnlyOfficeCallbackAuthPayload): Promise<string>` →
`this.jwtService.sign({ edulutionCallback: payload }, { secret: jwtSecret, expiresIn: ONLY_OFFICE_CALLBACK_AUTH.TOKEN_TTL })`;
`async verifyCallbackAuthToken(token: string): Promise<OnlyOfficeCallbackAuthPayload>` →
`this.jwtService.verify(token, { secret: jwtSecret })`, danach
`if (!decoded.edulutionCallback?.username) throw new CustomHttpException(FileSharingErrorMessage.InvalidCallbackToken, HttpStatus.UNAUTHORIZED)`,
Rückgabe `decoded.edulutionCallback`.
Das Secret über eine kleine private Hilfsmethode `resolveJwtSecretOrThrow()` beziehen, die die vorhandene Logik aus
`generateOnlyOfficeToken` (onlyoffice.service.ts:67-75, `AppNotProperlyConfigured`/500) wiederverwendet — **nicht** den
2.1.0-Refactor `resolveActiveJwtSecret`/EURO_OFFICE (NEW:54491-54513) mitziehen, der gehört in ein eigenes Paket.
Generische Typen statt Casts (`this.jwtService.verify<{ edulutionCallback?: OnlyOfficeCallbackAuthPayload }>(...)`).
Spec: (1) Round-Trip sign→verify liefert denselben Payload; (2) Token ohne `edulutionCallback.username` → `InvalidCallbackToken`/401;
(3) mit falschem Secret signierter Token → `verify` wirft; (4) fehlendes AppConfig-Secret → `AppNotProperlyConfigured`/500.
Echten `JwtService` mit fixem Testsecret verwenden (nicht mocken), damit der Round-Trip echt ist.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=onlyoffice.service'` → grün, 11+ Tests.
i18n: keine (Key kommt aus T13)
Doku: keine
Abhängt von: T13, T14

### T16 — Callback-URL serverseitig mit eduCallbackToken versehen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/filesharing.service.ts` (ändern: `getOnlyOfficeToken` aus T5), `apps/api/src/filesharing/withCallbackAuthToken.spec.ts` (NEU)
Soll: NEW:52723-52745 (Token-Erzeugung + Anhängen) und NEW:52746-52756 (`static withCallbackAuthToken`).
Änderung:
(a) NEUE `private static withCallbackAuthToken(callbackUrl: string, callbackAuthToken: string): string` exakt nach NEW:52746-52755:
`new URL(callbackUrl)` in try/catch, bei Parse-Fehler
`throw new CustomHttpException(FileSharingErrorMessage.MissingCallbackURL, HttpStatus.INTERNAL_SERVER_ERROR)`;
`parsed.searchParams.set(ONLY_OFFICE_CALLBACK_AUTH.QUERY_PARAM, callbackAuthToken)`; `return parsed.toString()`.
(b) In `getOnlyOfficeToken` nach dem `sanitizeOnlyOfficeConfig`-Aufruf:
`const callbackAuthToken = await this.onlyofficeService.generateCallbackAuthToken({ username: options.username, path: options.filePath, filename: options.fileName, share: options.share });`
`sanitized.editorConfig = { ...sanitized.editorConfig, callbackUrl: FilesharingService.withCallbackAuthToken(sanitized.editorConfig?.callbackUrl ?? '', callbackAuthToken) };`
Die `if (!options.publicShareId)`-Bedingung aus NEW:52723 entfällt (kein public-Pfad im Fork) — im Spec-Kommentarfeld der Doku vermerken, nicht im Code.
**Wichtig:** das Anhängen passiert NACH `assertDocumentUrlMatchesFile` (das prüft die Client-URL) und NACH `sanitize`,
aber VOR `generateOnlyOfficeToken` — sonst signiert der Server eine andere callbackUrl als er ausliefert.
Spec: (1) angehängter Query-Parameter heißt `eduCallbackToken` und die übrigen Query-Parameter (`path`, `filename`, `share`) bleiben erhalten;
(2) unparsebare callbackUrl → `MissingCallbackURL`/500; (3) bereits vorhandener `eduCallbackToken` wird überschrieben (`set`, nicht `append`).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern="withCallbackAuthToken|filesharing"'` → grün.
i18n: keine
Doku: keine
Abhängt von: T15

### T17 — Rohen Keycloak-Token aus der Callback-URL entfernen  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/FileSharing/FilePreview/OnlyOffice/utilities/getCallbackBaseUrl.ts` (ändern, Zeile 25-32), `apps/frontend/src/pages/FileSharing/hooks/useOnlyOffice.ts` (ändern, Zeilen 51/56/65-70), `apps/frontend/src/pages/FileSharing/FilePreview/OnlyOffice/utilities/getCallbackBaseUrl.spec.ts` (NEU)
Soll: **Fork-Original-Design** (Frontend nicht rekonstruierbar). Fachlich erzwungen durch NEW:51582-51595: die Route
authentifiziert sich ab jetzt ausschließlich über den serverseitig angehängten `eduCallbackToken`.
Änderung: `CallbackBaseUrlProps` verliert das Feld `token`; der Template-String verliert `&token=${token}`.
In `useOnlyOffice.ts` entfallen `const token = useMemo(() => eduApiToken, …)` (Zeile 51) und das `token`-Argument im
`getCallbackBaseUrl`-Aufruf; `eduApiToken` aus dem `useUserStore()`-Destructuring nehmen, falls sonst ungenutzt.
`user` bleibt (wird für `username` gebraucht). Query-Werte weiter über den bestehenden Template-String bauen —
kein Umbau auf `URLSearchParams` (Surgical).
Spec (vitest, neben der Utility, Muster: `…/Collabora/utilities/buildCollaboraSrc.spec.ts`): die erzeugte URL enthält
`path`, `filename`, `share` und **kein** `token=` — als Regressionsanker gegen ein Wiedereinführen formuliert
(`expect(url).not.toContain('token=')`).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx test frontend --run apps/frontend/src/pages/FileSharing/FilePreview/OnlyOffice/utilities/getCallbackBaseUrl.spec.ts'` → grün UND
`bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` → 0 Fehler.
i18n: keine
Doku: keine
Abhängt von: T16

### T18 — Callback-Route auf @Public + eduCallbackToken umstellen  [ ] ⚠ DARF NUR MIT T15+T16+T17 LANDEN
Komponente: apps/api · Dateien: `apps/api/src/filesharing/filesharing.controller.ts` (ändern, Zeilen 244-263), `apps/api/src/filesharing/filesharing.service.ts` (ändern, `handleCallback`), `apps/api/src/filesharing/filesharing.controller.spec.ts` (ändern, Zeilen 15-35)
Soll: NEW:51581-51598 (Dekoratoren: `@Public()`, `@Post('callback')`, `@ApiQuery({ name: ONLY_OFFICE_CALLBACK_AUTH.QUERY_PARAM })`,
`@Req()`, `@Res()`, `@Query(ONLY_OFFICE_CALLBACK_AUTH.QUERY_PARAM)`) und NEW:52816-52822 (`async handleCallback(req, res, callbackAuthToken)`).
Änderung:
(a) Controller: `path`/`filename`/`share`/`@GetCurrentUsername()` entfernen, stattdessen
`@Query(ONLY_OFFICE_CALLBACK_AUTH.QUERY_PARAM) callbackAuthToken: string`; `@Public()` **über** `@Post('callback')` setzen.
(b) Service: `async handleCallback(req, res, callbackAuthToken)` → `verifyCallbackAuthToken` in try/catch,
bei Fehler `return res.status(HttpStatus.UNAUTHORIZED).json({ error: 1 })` (NEW:52817-52821), sonst mit
`auth.path`, `auth.filename`, `auth.username`, `auth.share ?? ''` weiter in den bestehenden Upload-Pfad aus T10.
(c) Spec: `'handleCallback'` von `NON_PUBLIC_ROUTES` nach `PUBLIC_ROUTES` verschieben; den Testtitel „exposes exactly
the two public-share download routes via @Public" auf drei Routen anpassen. **Zusätzlich** einen neuen Test:
`handleCallback` ist genau dann `@Public`, wenn der Controller/Service `verifyCallbackAuthToken` aufruft — als
ausführbarer Anker den Service-Mock so setzen, dass `verifyCallbackAuthToken` wirft, und `res.status` mit `401` erwarten.
**Begründung/Warnung im Commit-Body festhalten:** `@Public()` umgeht im Fork AuthGuard UND AccessGuard
(access.guard.ts:46-55). Ohne T15/T16/T17 ist die Route unauthentifiziert.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=filesharing.controller'` → grün;
`bash scripts/crabbox/iter.sh cmd 'npm run check-spec-coverage'` → alle Controller haben Specs.
i18n: keine
Doku: keine
Abhängt von: T15, T16, T17

### T19 — stringToStableHash  [ ]
Komponente: libs · Dateien: `libs/src/common/utils/stringToStableHash.ts` (NEU), `apps/api/src/filesharing/stringToStableHash.spec.ts` (NEU)
Soll: NEW:52290-52306 — `MODULUS = 2147483647`, `FACTOR_A = 31`, `FACTOR_B = 131`,
`hashWith(input, factor)` als Schleife über `charCodeAt`, `stringToStableHash = (input) => `${hashWith(input, FACTOR_A).toString(36)}${hashWith(input, FACTOR_B).toString(36)}``.
Der Original-Pfad ist aus dem Bundle nicht ableitbar (Modul 798); `libs/src/common/utils/` ist die Fork-Wahl analog `libs/src/common/utils/delay.ts`.
Änderung: NEUE Datei, AGPL-SPDX-Header, Konstanten als benannte `const` (keine Magic Numbers im Ausdruck), Default-Export am Dateiende.
Spec: (1) deterministisch (zweimal derselbe Input → identischer Output); (2) unterschiedliche Inputs → unterschiedliche Hashes
(mindestens 3 Beispiele); (3) leerer String liefert `'00'`; (4) Ergebnis ist nur `[0-9a-z]`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=stringToStableHash'` → grün.
i18n: keine
Doku: keine
Abhängt von: T18

### T20 — resolveOnlyOfficeDocumentKey  [ ]
Komponente: libs · Dateien: `libs/src/filesharing/utils/resolveOnlyOfficeDocumentKey.ts` (NEU), `apps/api/src/filesharing/resolveOnlyOfficeDocumentKey.spec.ts` (NEU)
Soll: NEW:54778-54784 —
`(filePath, etag) => { if (!etag) throw new Error('resolveOnlyOfficeDocumentKey requires a non-empty etag to build a content-versioned key'); return `${stringToStableHash(filePath)}_${stringToStableHash(etag)}`; }`.
Fehlermeldung wörtlich übernehmen (NEW:54780).
Änderung: NEUE Datei, AGPL-SPDX-Header, Default-Export am Dateiende.
Spec: (1) gleicher filePath + gleicher etag → gleicher Key; (2) gleicher filePath + geänderter etag → anderer Key
(das ist die Content-Versionierung, die OnlyOffice-Caching bricht); (3) leerer etag → wirft mit exakt jener Meldung.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=resolveOnlyOfficeDocumentKey'` → grün.
i18n: keine
Doku: keine
Abhängt von: T19

### T21 — ONLY_OFFICE_SESSION_KEY-Konstanten + Cache-Entry-Typ  [ ]
Komponente: libs · Dateien: `libs/src/filesharing/constants/onlyOfficeSessionKey.ts` (NEU), `libs/src/filesharing/types/onlyOfficeSessionKeyEntry.ts` (NEU)
Soll: NEW:54811-54817 — `{ CACHE_PREFIX: 'onlyoffice:session:', TTL_MS: 12 * 60 * 60 * 1000, AUTHENTICATED_SURFACE: 'auth', PUBLIC_SURFACE_PREFIX: 'public:', IDENTITY_SEPARATOR: '::' }`.
Entry-Felder aus NEW:54704-54708 (`{ key, persistUsername, persistShare }`) — Typname Fork-Original.
Änderung: Zwei NEUE Dateien mit AGPL-SPDX-Header. Konstantendatei als `as const` + Default-Export;
`interface OnlyOfficeSessionKeyEntry { key: string; persistUsername: string; persistShare: string; }`.
`TTL_MS` als Ausdruck `12 * 60 * 60 * 1000` wie im Original.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler.
i18n: keine
Doku: keine
Abhängt von: T20

### T22 — KeyedMutex  [ ]
Komponente: apps/api · Dateien: `apps/api/src/common/keyedMutex.ts` (NEU), `apps/api/src/common/keyedMutex.spec.ts` (NEU)
Soll: NEW:54845-54868 — Klasse `KeyedMutex` mit `locks = new Map<string, Promise<void>>()` und
`async runExclusive<T>(key, criticalSection): Promise<T>`: while-Schleife über `this.locks.has(key)` mit `await this.locks.get(key)`
(inkl. `// eslint-disable-next-line no-await-in-loop` wie NEW:54849 — das ist eine ESLint-Direktive, kein erklärender Kommentar),
danach eigenes Lock-Promise setzen, `try { return await criticalSection(); } finally { release(); this.locks.delete(key); }`.
Ablageort `apps/api/src/common/` ist Fork-Wahl (Klasse, kein Shared-Util im Sinne von AGENTS.md; aus dem Bundle nicht ableitbar).
Änderung: NEUE Datei, AGPL-SPDX-Header, Default-Export der Klasse am Dateiende.
Spec: (1) zwei parallele `runExclusive` mit demselben Key laufen strikt nacheinander (Reihenfolge über ein gemeinsames
Ergebnis-Array beweisen); (2) verschiedene Keys laufen nebenläufig; (3) wirft die Critical Section, wird das Lock trotzdem
freigegeben (danach läuft ein Folgeaufruf durch); (4) `locks` ist nach Abschluss leer.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=keyedMutex'` → grün, 4+ Tests.
i18n: keine
Doku: keine
Abhängt von: T21

### T23 — normalizeFilePath  [ ]
Komponente: libs · Dateien: `libs/src/common/utils/normalizeFilePath.ts` (NEU), `apps/api/src/filesharing/normalizeFilePath.spec.ts` (NEU)
Soll: NEW:10025 — `const normalizeFilePath = (filePath) => (filePath.startsWith('/') ? filePath : `/${filePath}`);`.
Original-Pfad (Modul 211) nicht ableitbar; `libs/src/common/utils/` ist die Fork-Wahl. Vor dem Anlegen prüfen,
ob eine Entsprechung existiert — der einzige heutige Treffer ist die inline-Variante in
`libs/src/common/utils/getExternalUrlForDeepLink.ts:24`; diese Datei **nicht** anfassen (Surgical).
Änderung: NEUE Datei, AGPL-SPDX-Header, Default-Export am Dateiende.
Spec: (1) `'a/b.docx'` → `'/a/b.docx'`; (2) `'/a/b.docx'` bleibt; (3) `''` → `'/'`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=normalizeFilePath'` → grün.
i18n: keine
Doku: keine
Abhängt von: T22

### T24 — OnlyOfficeSessionKeyService  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/onlyoffice-session-key.service.ts` (NEU), `apps/api/src/filesharing/onlyoffice-session-key.service.spec.ts` (NEU), `apps/api/src/filesharing/filesharing.module.ts` (ändern)
Soll: NEW:54677-54749 — `@Injectable()`, `constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache)`, `mutex = new KeyedMutex()`, sowie
`static buildIdentity(share, rawPath, publicShareId)` (NEW:54683-54689),
`static cacheKey(identity)` (NEW:54690-54692),
`async resolveSessionKey(identity, seedPath, etag, persistContext)` (NEW:54692-54715),
`async getPersistContext(identity)` (NEW:54716-54728),
`async endSession(identity, expectedKey)` (NEW:54729-54742).
Änderung: NEUE Datei, AGPL-SPDX-Header, Klassenname `OnlyOfficeSessionKeyService`, Default-Export am Dateiende
(Dateiname `onlyoffice-session-key.service.ts` erfüllt die `checkFilenames`-Regel über den erlaubten `service`-Suffix).
Verhalten 1:1: `buildIdentity` baut `[surface, share ?? '', normalizeFilePath(rawPath)].join(ONLY_OFFICE_SESSION_KEY.IDENTITY_SEPARATOR)`
mit `surface = publicShareId ? `${PUBLIC_SURFACE_PREFIX}${publicShareId}` : AUTHENTICATED_SURFACE`.
`resolveSessionKey` berechnet zuerst `resolveOnlyOfficeDocumentKey(seedPath, etag)` und läuft dann komplett in
`this.mutex.runExclusive(identity, …)`: existierender Eintrag mit `key` → TTL auffrischen (`set` mit demselben Entry) und
den **bestehenden** Key zurückgeben (sonst reißt eine laufende Editier-Session ab); sonst neuen Entry
`{ key: documentKey, persistUsername: persistContext.username, persistShare: persistContext.share }` mit `TTL_MS` schreiben.
Cache-Fehler werden gefangen und geloggt (`Logger.error(..., OnlyOfficeSessionKeyService.name)` — statischer Logger, AGENTS.md),
Rückgabe fällt auf `documentKey` zurück (NEW:54710-54713). `endSession` löscht nur, wenn `activeEntry?.key === expectedKey`.
Modul: `OnlyOfficeSessionKeyService` in `filesharing.module.ts` unter `providers` eintragen. **Kein** `CacheModule`-Import nötig —
`app.module.ts:93` registriert ihn `isGlobal: true`.
Spec: `CACHE_MANAGER` mit `apps/api/src/common/cache-manager.mock` (bestehendes Muster, s. surveys.controller.spec.ts) bereitstellen.
Fälle: (1) `buildIdentity` ohne publicShareId → `auth::<share>::/pfad`; (2) mit publicShareId → `public:<id>::…`;
(3) `resolveSessionKey` auf leerem Cache → schreibt Entry mit TTL_MS und liefert den etag-Key;
(4) zweiter Aufruf mit **anderem** etag, aber vorhandenem Entry → liefert den ALTEN Key (Session-Stabilität);
(5) `getPersistContext` ohne Entry → `undefined`; (6) `endSession` mit passendem Key → `del` aufgerufen;
(7) `endSession` mit fremdem Key → `del` **nicht** aufgerufen; (8) `cacheManager.get` wirft → kein Throw nach außen, Key wird trotzdem geliefert.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=onlyoffice-session-key'` → grün, 8+ Tests.
i18n: keine
Doku: keine
Abhängt von: T23

### T25 — sanitizeOnlyOfficeConfig auf 2.1.0 heben (documentKey, protect:false)  [ ]
Komponente: libs · Dateien: `libs/src/filesharing/utils/sanitizeOnlyOfficeConfig.ts` (ändern), `apps/api/src/filesharing/sanitizeOnlyOfficeConfig.spec.ts` (ergänzen)
Soll: NEW:56204-56222 — Options werden `{ canWrite, editorUser, documentKey }`; `document.key = documentKey ?? base.document?.key ?? ''` (NEW:56211);
`permissions.protect: false` statt `effectiveEdit` (NEW:56220, Änderung gegenüber OLD:41693).
Änderung: Options-Typ um `documentKey?: string` erweitern, `document.key` entsprechend, `protect` auf `false`.
**`editorUser` bewusst NICHT übernehmen** — das gehört zum 2.1.0-Gast/Public-Share-Paket (NEW:51311,
`buildOnlyOfficeEditorUserFromJwtUser`); der Fork behält die 2.0.200-Form `user: { id: username, name: username }`.
Diese Abweichung in T28 dokumentieren.
Spec ergänzen: (1) mit `documentKey` gewinnt der Server-Key gegen den Client-`document.key`;
(2) ohne `documentKey` bleibt der Client-Key (Rückwärtsfall); (3) `protect` ist auch bei `canWrite=true, mode:'edit'` `false`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=sanitizeOnlyOfficeConfig'` → grün, 8+ Tests.
i18n: keine
Doku: keine
Abhängt von: T24

### T26 — getOnlyOfficeToken: etag-basierter Session-Key + share-Contract  [ ]
Komponente: apps/api, apps/frontend · Dateien: `apps/api/src/filesharing/filesharing.service.ts` (ändern), `apps/api/src/filesharing/filesharing.controller.ts` (ändern), `apps/frontend/src/pages/FileSharing/FilePreview/OnlyOffice/useFileEditorStore.ts` (ändern), `apps/frontend/src/pages/FileSharing/hooks/useOnlyOffice.ts` (ändern)
Soll: NEW:52703-52722 (fileStat/etag-Beschaffung + `resolveSessionKey`) und NEW:51484-51500 (Controller bekommt `@Query('share')`).
Änderung:
(a) `OnlyOfficeSessionKeyService` in `FilesharingService` injizieren (Konstruktor, filesharing.service.ts:56-65).
(b) In `getOnlyOfficeToken` nach `assertDocumentUrlMatchesFile`:
`const fileStat = await this.collaboraService.getFileStat(options.username, options.filePath, options.share ?? '')`
— **Abweichung von NEW:52705** (dort `this.webDavService.getFileStat`): im Fork liegt `getFileStat` auf
`CollaboraService` (collabora.service.ts:81-103) und `collaboraService` ist in `FilesharingService` bereits injiziert (Zeile 64).
Kein Verschieben der Methode (Surgical); die Log-Meldung „WOPI getFileStat failed" bleibt bestehen und ist in T28 zu vermerken.
`if (!fileStat) throw new CustomHttpException(FileSharingErrorMessage.FileNotFound, HttpStatus.NOT_FOUND)`;
`if (!fileStat.etag) throw new CustomHttpException(FileSharingErrorMessage.WebDavError, HttpStatus.INTERNAL_SERVER_ERROR, 'file stat has no etag; cannot build a content-versioned OnlyOffice document key')` (Detail wörtlich NEW:52711).
(c) `const sessionIdentity = OnlyOfficeSessionKeyService.buildIdentity(options.share, options.filePath, undefined)`;
`const documentKey = await this.sessionKeyService.resolveSessionKey(sessionIdentity, options.filePath, fileStat.etag, { username: options.username, share: options.share ?? '' })`;
`documentKey` an `sanitizeOnlyOfficeConfig` durchreichen.
(d) Contract-Sync: Controller-Route bekommt `@Query('share') share: string` (NEW:51497) und reicht es in `options.share`;
Store-Methode aus T7 bekommt einen `share`-Parameter (axios `params: { filePath, fileName, share }`); `useOnlyOffice.ts`
übergibt das bereits vorhandene `webdavShare` aus `useParams()` (Zeile 47).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=filesharing'` → grün UND
`bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` → 0 Fehler UND
`bash scripts/crabbox/iter.sh test:frontend` → grün.
i18n: keine (`filesharing.errors.FileNotFound` und `.WebDavError` existieren in de/en/fr)
Doku: keine
Abhängt von: T25

### T27 — Callback: Persist-Context + endSession  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/filesharing.service.ts` (ändern, `handleCallback` aus T18), `apps/api/src/filesharing/onlyoffice.service.ts` (ändern, `handleCallback` aus T9), `apps/api/src/filesharing/onlyoffice.service.spec.ts` (ergänzen)
Soll: NEW:52823-52832 (`dispatchOnlyOfficeCallback`: Identity bauen, `getPersistContext`, Warn-Log, Fallback auf die
Callback-Identität) und NEW:54556-54580 (`endSession` bei `CLOSED_WITHOUT_CHANGES` und nach erfolgreichem `READY_FOR_SAVING`).
Änderung:
(a) `FilesharingService.handleCallback`: nach `verifyCallbackAuthToken`
`const sessionIdentity = OnlyOfficeSessionKeyService.buildIdentity(auth.share ?? '', auth.path, undefined);`
`const persistContext = await this.sessionKeyService.getPersistContext(sessionIdentity);`
Fehlt er: `Logger.warn(\`No pinned persist context for OnlyOffice session ${sessionIdentity}; falling back to the callback identity "${auth.username}". The session pin was likely evicted (TTL/restart).\`, FilesharingService.name)`
(Wortlaut NEW:52827-52828). `saveUsername = persistContext?.username ?? auth.username`, `saveShare = persistContext?.share ?? auth.share ?? ''`
werden weitergereicht; `sessionIdentity` als zusätzliches Argument an `OnlyofficeService.handleCallback`.
(b) `OnlyofficeService.handleCallback` bekommt einen optionalen `sessionIdentity`-Parameter und ergänzt gegenüber T9:
bei `CLOSED_WITHOUT_CHANGES` **vor** dem `200`-Return `await this.sessionKeyService.endSession(sessionIdentity, signed.key)`
(NEW:54561-54566) und nach erfolgreichem Upload bei `READY_FOR_SAVING` ebenfalls `endSession` (NEW:54577-54579).
`FORCE_SAVING` beendet die Session **nicht** (NEW:54577 prüft nur `isReadyForSaving`). `OnlyOfficeSessionKeyService` dazu in
`OnlyofficeService` injizieren (NEW:54446-54452).
Spec ergänzen: (1) status 4 → `endSession(identity, key)` genau einmal, kein `uploadFile`;
(2) status 2 Happy Path → `uploadFile` und danach `endSession`; (3) status 6 (FORCE_SAVING) → `uploadFile`, aber **kein** `endSession`;
(4) fehlender Persist-Context → `Logger.warn` und Upload läuft mit der Callback-Identität weiter.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern="onlyoffice.service|filesharing"'` → grün.
i18n: keine
Doku: keine
Abhängt von: T26

### T28 — Stage-2-Doku + Endnutzer-Doku (DE/EN/FR)  [ ]
Komponente: docs · Dateien: `docs/features/p6-onlyoffice-hardening.md` (ergänzen), `docs/document-editor.de.md`, `docs/document-editor.en.md`, `docs/document-editor.fr.md` (je ergänzen)
Soll: Reine Doku-Task.
Änderung:
(a) Spec um den Stage-2-Abschnitt ergänzen: `eduCallbackToken` (Anker NEW:51766-51769, 54514-54527, 51581-51598),
Session-Key (NEW:52709-52717, 54677-54749, 56204-56222), sowie die bewussten Abweichungen —
kein `editorUser`, kein `publicShareId`/`securityContext`, `getFileStat` auf `CollaboraService` statt `WebdavService`,
kein EURO_OFFICE/`resolveActiveJwtSecret`-Refactor. Explizit die Warnung festhalten, dass `@Public()` auf der
Callback-Route nur zusammen mit der Token-Verifikation gültig ist, und dass `extractToken`s Query-Unterstützung
absichtlich bestehen bleibt (SSE/WysiwygEditor/NativeFrame).
(b) In den drei `docs/document-editor.*.md` unter „Hinweise" je einen Satz ergänzen: gleichzeitiges Bearbeiten
desselben Dokuments teilt sich jetzt eine Sitzung (serverseitig aus Dateipfad + etag abgeleiteter Dokumentschlüssel);
nach dem Speichern wird die Sitzung beendet und beim nächsten Öffnen ein neuer Schlüssel vergeben.
Alle drei Sprachen im selben Commit, gleicher Abschnittsplatz.
Verify: `bash scripts/crabbox/iter.sh cmd 'grep -l "eduCallbackToken" docs/features/p6-onlyoffice-hardening.md && for f in de en fr; do grep -q "etag\|ETag\|Dokumentschlüssel\|document key\|clé de document" docs/document-editor.$f.md || { echo "FEHLT: $f"; exit 1; }; done; echo OK'` → `OK`.
i18n: keine i18n-Keys; die Endnutzer-Doku existiert dreisprachig und muss synchron bleiben.
Doku: diese Task IST die Doku
Abhängt von: T27
