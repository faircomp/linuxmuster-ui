## p6-onlyoffice-hardening — OnlyOffice/Collabora härten (Stage 1: Regression unter 2.0.200 schließen · Stage 2: 2.1.0-Niveau)

Spec: `docs/features/p6-onlyoffice-hardening.md` (wird in T11/T28 geschrieben) · Rekonstruktionsquelle:
`.reference/2.0.200/api/main.js` (OLD) und `.reference/2.1.0/api/main.js` (NEW), beide un-minifiziert.
Frontend-Anteile sind **Fork-Original-Design** — die Frontend-Bundles sind nicht rekonstruierbar, nur die API-Bundles.

**Scope-Klarstellung:** Collabora/WOPI (`collabora.service.ts`, `wopi.controller.ts`) ist **nicht im Scope** dieses Pakets.
Einzige Berührung: T26 liest `CollaboraService.getFileStat` mit, ohne die Methode zu verändern.

---

### Stand im Fork — am aktuellen Baum verifiziert (nach `1b301c7dc` + dem gestagten Callback-Commit). **Diese Tabelle gilt, nicht die Task-Texte.**

| Was | Wo (aktuelle Zeilen) | Form |
|---|---|---|
| `ONLY_OFFICE_CALLBACK_STATUS` | `libs/src/filesharing/constants/onlyOfficeCallbackStatus.ts` | const-Objekt + abgeleiteter Typ + Default-Export |
| `ONLY_OFFICE_CALLBACK_PATH` | `libs/src/filesharing/constants/onlyOfficeCallbackPath.ts` | `'callback'`; benutzt von Controller (:256), Service (:246) **und** `getCallbackBaseUrl.ts:23/33` |
| `sanitizeOnlyOfficeConfig` | `libs/src/filesharing/utils/sanitizeOnlyOfficeConfig.ts:13-53` | nimmt `IConfig`, Optionen `{ canWrite, username }`, alle acht `permissions` auf `effectiveEdit`, kein Top-Level-Spread |
| `assertDocumentUrlMatchesFile` | `filesharing.service.ts:231-262` | `static` (nicht `private`), genau **eine** erlaubte Callback-Pathname |
| `getOnlyOfficeToken` | `filesharing.service.ts:264-277` | `(clientConfig: IConfig, options: OnlyOfficeTokenOptions) => { config, token }` |
| Options-/Response-Typ | `libs/src/filesharing/types/onlyOfficeTokenOptions.ts`, `…/onlyOfficeTokenResponseDto.ts` | Interfaces mit SPDX; **kein** Request-Body-DTO, es gibt keins und es soll keins geben |
| Token-Route | `filesharing.controller.ts:192-205` | `@Post(ONLY_OFFICE_TOKEN)`, `@Body() clientConfig: IConfig` + `@Query('filePath')` + `@Query('fileName')` + `@GetCurrentUsername()`, `canWrite: true`, **kein** `@UsePipes`, **kein** `@Public` |
| Store | `useFileEditorStore.ts:39-43, 90-107` | `getOnlyOfficeConfigAndToken(config, filePath, fileName)`, axios `params: { filePath, fileName }` |
| Hook | `useOnlyOffice.ts:89-93` | rendert `signed.config` + `signed.token`, castfrei |
| `generateOnlyOfficeToken` | `onlyoffice.service.ts:71-78` | `(payload: IConfig): Promise<string>` — Aufruf `filesharing.service.ts:274` ist **castfrei** |
| `isAllowedOnlyOfficeDownloadUrl` | `onlyoffice.service.ts:80-89` | `static`, Origin-Vergleich, `catch → false` (OLD:40287-40299) |
| `OnlyofficeService.handleCallback` | `onlyoffice.service.ts:91-150` | **Instanz**methode mit Secret→500, fehlender `token`→401, `verify`-Fehler→401, Echo-Abgleich status/url/key→401, Status-Filter, Origin-Guard→403, `retrieveAndSaveFile(signed.url)` |
| Callback-Typen | `onlyOfficeCallBackData.ts:45` (`token?: string`), `onlyOfficeCallbackTokenPayload.ts` | `OnlyOfficeCallbackTokenPayload` + `OnlyOfficeSignedCallbackClaims` |
| Callback-Route | `filesharing.controller.ts:256-275` | `@Post(ONLY_OFFICE_CALLBACK_PATH)`, `status === ONLY_OFFICE_CALLBACK_STATUS.EDITING`-Frühausstieg, `@Query('path'\|'filename'\|'share')` + `@GetCurrentUsername()`, **kein** `@Public` |
| Spec-Baselines | `onlyOfficeConfigHardening.spec.ts` = **14** `it()` · `onlyOfficeCallbackVerification.spec.ts` = 9 `it()` + 7 `it.each`-Zeilen = **16** Fälle | Jede „N+ Tests"-Zusage einer Task muss **über** der jeweiligen Baseline liegen, sonst ist sie falsch-grün |

**Der Fork nutzt `IConfig` aus `@onlyoffice/document-editor-react` auch in `libs/` und in `apps/api`.**
`npx tsc -p apps/api/tsconfig.app.json --noEmit` ist damit heute grün — es gibt **kein** eigenes `OnlyOfficeClientConfig`
und es soll keins geben. Jede Task hier arbeitet mit `IConfig`.

**Stage 1 ist damit bis auf die Doku (T11) gebaut.** T1–T10 stehen unten als ERLEDIGT und dürfen nicht erneut
angefasst werden. Offen sind T11 und Stage 2 (T12–T28).

**Zwei Reste aus Stage 1, die Stage 2 mit erledigen muss:**
- `OnlyofficeService.handleCallback` hat **keinen** Frühausstieg für `CLOSED_WITHOUT_CHANGES`. Ein Status-4-Callback
  trägt keine `url`, fällt in `isAllowedOnlyOfficeDownloadUrl('')` und wird mit **403** beantwortet. Das ist 2.0.200-treu
  (OLD hat den Zweig ebenfalls nicht), 2.1.0 behebt es (NEW:54561-54566). → **T27** baut den Zweig ein.
- `FilesharingService.handleCallback` liest `webdavShare.pathname` **ohne** `?.` (`filesharing.service.ts:280-285`),
  während NEW:52831-52832 `webdavShare?.pathname` nutzt. `getWebdavShareFromCache` kann `undefined` liefern
  (`webdav-shares.service.ts:102-107`) → auf der `@Public`-Route aus T18 wird ein Cache-Miss zum 500. → **T18**.

---

### Verify-Idiome — auf der Box nachgewiesen, nicht abwandeln

Alles läuft remote: `bash scripts/crabbox/iter.sh <lint|test:api|test:frontend|i18n|build|all>` oder `iter.sh cmd '<befehl>'`.

1. **API-Jest gefiltert:** `npx nx run api:test -- --testPathPattern=<EIN Pfad-Token>`. Jest ist 29.7.0 → **singular**
   (`--testPathPatterns` wäre Jest 30). Ein nicht-matchendes Pattern endet mit „Pattern: … - 0 matches" und Exit ≠ 0.
   **Nie** eine Alternation mit `|` — nx reicht das Argument ungequotet an die Shell weiter.
   **Nie** `--listTests` als Gate — das beendet auch bei 0 Treffern mit Exit 0.
2. **Frontend-vitest gefiltert:** Pfad **relativ zu `apps/frontend`**: `npx nx test frontend --run src/…`
   (`apps/frontend/vite.config.mts` hat `root: __dirname`). Mit Repo-Root-Pfad findet vitest nichts.
3. **tsc-Gates** (beide heute 0 Fehler = Baseline): `npx tsc -p apps/api/tsconfig.app.json --noEmit` (excludet
   `src/**/*.spec.ts`, prüft also Produktivcode/Aufrufer) · `npx tsc -p apps/frontend/tsconfig.app.json --noEmit`.
   Für Specs ist Jest das Gate.
4. `iter.sh i18n` = `check-translations && check-error-message-translations`; letzteres folgt den Imports von
   `libs/src/error/errorMessage.ts` und erfasst `FileSharingErrorMessage` wirklich.
5. **Nicht als Gate verwenden:** `npm run check-spec-coverage` (prüft nur die Existenz von `*.controller.spec.ts`,
   immer grün) · `npm run check-filenames` **ohne vorheriges `git add`** (das Skript liest nur gestagte Dateien und
   endet sonst mit Exit 0, ohne irgendetwas zu prüfen).

**Reihenfolge ist bindend.** Stage 2 (T12–T28) baut auf dem gebauten Stage 1 auf;
innerhalb Stage 2 gilt die Kopplung **T15+T16+T17+T18 = ein Commit** (siehe T18).

### Stage 1 — 2.0.200-Niveau wiederherstellen (keine neuen Deps)

### T1 — ERLEDIGT (nicht anfassen)  [x]
`libs/src/filesharing/constants/onlyOfficeCallbackStatus.ts` existiert: SPDX-Header, const-Objekt mit den sechs Werten,
abgeleiteter Typ `OnlyOfficeCallbackStatus`, Default-Export am Dateiende — 1:1 nach OLD:37788-37796 / NEW:51731-51739.
Konsument: `onlyoffice.service.ts:126-129` und `filesharing.controller.ts:267`.

### T2 — ENTFÄLLT (kein eigener Client-Config-Typ)  [x]
Der Fork nutzt `IConfig` aus `@onlyoffice/document-editor-react` in `libs/` **und** `apps/api`
(`sanitizeOnlyOfficeConfig.ts:6`, `onlyOfficeTokenResponseDto.ts:6`, `filesharing.service.ts`, `filesharing.controller.ts:57`,
`onlyoffice.service.ts:34`). Die alte Begründung („zieht React-Typen in den API-Build") ist empirisch widerlegt:
`npx tsc -p apps/api/tsconfig.app.json --noEmit` → 0 Fehler.
**Konsequenz für alle Folgetasks: überall `IConfig`, nie `OnlyOfficeClientConfig`.**

### T3 — ERLEDIGT (nicht anfassen)  [x]
`libs/src/filesharing/utils/sanitizeOnlyOfficeConfig.ts:13-53`, 1:1 nach OLD:41673-41706: alle acht `permissions` auf
`effectiveEdit`, `user` serverseitig auf `{ id: username, name: username }`, **kein** Spread von `base` auf Top-Level
(das ist der Kern des Schutzes). Signatur `(clientConfig: IConfig | undefined, { canWrite, username }): IConfig`.
Spec: `apps/api/src/filesharing/onlyOfficeConfigHardening.spec.ts`, `describe('sanitizeOnlyOfficeConfig')`, **6** Fälle
(Baseline für T25). Nächste Änderung an dieser Datei erst in **T25**.

<!-- Ursprünglicher Task-Text, nur noch als Herkunftsnachweis:
Komponente: libs · Dateien: `libs/src/filesharing/utils/sanitizeOnlyOfficeConfig.ts` (NEU)
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
-->

### T4 — ERLEDIGT (nicht anfassen)  [x]
Zwei Interfaces, beide mit SPDX-Header und Default-Export am Dateiende:
`libs/src/filesharing/types/onlyOfficeTokenResponseDto.ts` (`{ config: IConfig; token: string }`) und
`libs/src/filesharing/types/onlyOfficeTokenOptions.ts` (`{ canWrite, username, filePath, fileName }`).
Bewusste Abweichung vom Soll: NEW:56717-56724 deklariert `OnlyOfficeTokenResponseDto` mit **nur** `token`
(das ist die Swagger-Deklaration); der tatsächliche Rückgabewert ist `{ config, token }` (OLD:38566-38567 / NEW:52744) —
der Fork typisiert den echten Wert. In T11 dokumentieren.
**Ein Request-Body-DTO gibt es nicht und soll es nicht geben** — `filePath`/`fileName` kommen per `@Query` (siehe T6).

### T5 — ERLEDIGT (nicht anfassen)  [x]
`FilesharingService.assertDocumentUrlMatchesFile` (`filesharing.service.ts:231-262`, nach OLD:38570-38596, Wurf-Detail
wörtlich `'document.url does not match requested file'` wie OLD:38594) und `getOnlyOfficeToken`
(`filesharing.service.ts:264-277`, nach OLD:38553-38568) sind gebaut. Reihenfolge im Service: assert → sanitize →
`generateOnlyOfficeToken(config)` → `return { config, token }`.
Spec: `onlyOfficeConfigHardening.spec.ts`, `describe('assertDocumentUrlMatchesFile')` (6 Fälle) +
`describe('getOnlyOfficeToken')` (2 Fälle).
Bewusste, bereits umgesetzte Abweichung von OLD:38585-38588 (in T11 zu dokumentieren): nur **eine** erlaubte
Callback-Pathname `/${EDU_API_ROOT}/${FileSharingApiEndpoints.BASE}/${ONLY_OFFICE_CALLBACK_PATH}`; die zweite
(`PUBLIC_FILESHARING`) entfällt, weil der Fork keinen public-filesharing-Controller hat (`grep PUBLIC_FILESHARING` = 0 Treffer).
**Die früher hier geplante Signatur-Drift existiert nicht mehr:** `generateOnlyOfficeToken(payload: IConfig)`
(`onlyoffice.service.ts:71`) und der Aufruf `generateOnlyOfficeToken(config)` (`filesharing.service.ts:274`) sind castfrei.
Ein Umbau auf einen generischen Payload-Typ würde den getypten Mock `jest.fn<Promise<string>, [IConfig]>`
(`onlyOfficeConfigHardening.spec.ts:158`) brechen — **nicht** anfassen.

<!-- Ursprünglicher Task-Text, nur noch als Herkunftsnachweis:
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
-->

### T6 — ERLEDIGT (nicht anfassen)  [x]
`filesharing.controller.ts:192-205`: `@Post(FileSharingApiEndpoints.ONLY_OFFICE_TOKEN)`, `@Body() clientConfig: IConfig`,
`@Query('filePath')`, `@Query('fileName')`, `@GetCurrentUsername()` → `getOnlyOfficeToken(clientConfig, { canWrite: true,
username, filePath, fileName })` — exakt OLD:37370-37377 / OLD:37546-37558.
`canWrite: true` ist 2.0.200- **und** 2.1.0-treu (OLD:37371, NEW:51308) — nicht „verbessern".
**Guards:** Klassen-Dekoratoren `@ApiBearerAuth()` + `@RequireAppAccess(APPS.FILE_SHARING)` (`:69-71`) gelten; die Route hat
**kein** `@Public()`; `getOnlyofficeToken` steht in `NON_PUBLIC_ROUTES` (`filesharing.controller.spec.ts:25`).
**Für T26(d) merken:** auf dieser Route liegt **kein** `@UsePipes(new ValidationPipe(...))` — das steht nur auf der
Collabora-Route (`:208`). Es gibt also kein stilles `whitelist`-Stripping und keine daraus folgende Falle.

### T7 — ERLEDIGT (nicht anfassen)  [x]
`useFileEditorStore.ts:39-43` (Store-Typ) und `:90-107` (Implementierung):
`getOnlyOfficeConfigAndToken: (config: IConfig, filePath: string, fileName: string) => Promise<OnlyOfficeTokenResponseDto | null>`,
`eduApi.post<OnlyOfficeTokenResponseDto>(…ONLY_OFFICE_TOKEN…, config, { params: { filePath, fileName }, headers: {...} })` —
kein `JSON.stringify`, kein manuelles `URLSearchParams`. Fehlerpfad `handleApiError(error, set)`, Rückgabe `null`.
**Der Methodenname ist `getOnlyOfficeConfigAndToken`** — nicht umbenennen; T26(d) erweitert genau diese Methode um `share`.

### T8 — ERLEDIGT (nicht anfassen)  [x]
`useOnlyOffice.ts:89-93`: `const signed = await getOnlyOfficeConfigAndToken(onlyOfficeConfig, filePath, fileName);`
`if (!signed) return;` `setEditorConfig({ ...signed.config, token: signed.token })` — **castfrei**, weil
`OnlyOfficeTokenResponseDto.config` bereits `IConfig` ist. Die lokal gebaute Config bleibt Request-Body (sie liefert
`fileType`, `customization`, `lang`, `documentType`, die der Server durchreicht).
Der `getCallbackBaseUrl`-Aufruf (`:60-65`) bleibt bis **T17** unangetastet.

### T9 — ERLEDIGT (nicht anfassen)  [x]
`OnlyofficeService.handleCallback` ist **Instanz**methode (`onlyoffice.service.ts:91-150`, OLD:40243-40286) und prüft in
dieser Reihenfolge: AppConfig-Secret fehlt → 500 `{error:1}` · `!callbackData.token` → 401 · `jwtService.verify` wirft → 401 ·
`signed = verified.payload ?? verified` + Echo-Abgleich `status`/`url`/`key` → 401 · Status-Filter über
`ONLY_OFFICE_CALLBACK_STATUS` (alles außer READY_FOR_SAVING/CLOSED_WITHOUT_CHANGES/FORCE_SAVING → 200 `{error:0}`) ·
`OnlyofficeService.isAllowedOnlyOfficeDownloadUrl(signed.url, allowedOnlyOfficeUrl)` (`:80-89`, `static`, OLD:40287-40299) → 403 ·
dann `retrieveAndSaveFile(uniqueFileName, signed.url)` — **`signed.url`, nicht `callbackData.url`** (OLD:40279).
Typen: `onlyOfficeCallBackData.ts` (`token?: string`; `status` ist der abgeleitete `OnlyOfficeCallbackStatusType` aus
`libs/src/filesharing/types/onlyOfficeCallbackStatusType.ts`, **nicht** mehr die Magic-Number-Union `1|2|3|4|6|7`),
`libs/src/filesharing/types/onlyOfficeCallbackTokenPayload.ts` (`OnlyOfficeCallbackTokenPayload`; `OnlyOfficeSignedCallbackClaims`
ist dateiintern, **nicht** exportiert).
Der Ablehn-Log nennt nur die **Origins**, nie die Download-URL: `OnlyofficeService.describeOrigin` — eine echte
Document-Server-Download-URL trägt `?md5=…&expires=…` und autorisiert damit den Download ohne weitere Auth; die
vollständige URL zu loggen schriebe eine Zugriffs-Capability auf ein fremdes Nutzerdokument in die API-Logs.
**Spec: `apps/api/src/filesharing/onlyOfficeCallbackVerification.spec.ts`** — 12 `it()` + 9 `it.each`-Zeilen = **21** Fälle;
Service-Aufbau dort: `new OnlyofficeService({ getAppConfigByName } as never, { verify } as never)` (`:40`, **zwei** Argumente).
Eine Datei `onlyoffice.service.spec.ts` gibt es **nicht** und wird es nicht geben — T15/T27 hängen an der Datei oben.
Bewusst weggelassen (Rekonstruktionsrest für T11/T28): der `securityContext`/`publicShareId`-Parameter aus
OLD:40243 / NEW:54528 — kein public-filesharing-Controller im Fork. **T27** führt ihn als `{ sessionIdentity }` wieder ein.
**Offener Rest (siehe Kopfabschnitt):** der `CLOSED_WITHOUT_CHANGES`-Frühausstieg (NEW:54561-54566) fehlt, Status 4 läuft
heute in die 403 der URL-Prüfung. Wird in **T27** behoben, zusammen mit dem `endSession`-Aufruf, der ohnehin dorthin gehört.
Der Ist-Zustand ist bewusst mit einem Test festgenagelt (`answers a close-without-changes callback without saving, as 2.0.200
does`), damit die Änderung in T27 **bewusst** passiert und nicht als stille Abweichung vom 2.0.200-Soll durchrutscht.
**Drei Mutationen sind nachgewiesen**, jede färbt genau einen Test rot: Origin-Guard entfernt · Echo-Abgleich entfernt ·
`signed.status !== callbackData.status` aus dem Echo entfernt. Eine vierte sichert die **Kopplung zum Sanitizer**: wird
`sanitizeOnlyOfficeConfig` je auf einen Top-Level-`...base`-Spread gelockert, ist ein Editor-Config-Token als Callback-Token
replaybar (dasselbe Secret signiert beides) — der Test `does not accept an editor config token as a callback token` schlägt
dann am **Ergebnis** an (`retrieveAndSaveFile` wird aufgerufen), nicht bloß am Statuscode.

<!-- Ursprünglicher Task-Text, nur noch als Herkunftsnachweis:
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
-->

### T10 — ERLEDIGT (nicht anfassen)  [x]
`FilesharingService.handleCallback` ruft `this.onlyofficeService.handleCallback(...)` (`filesharing.service.ts:282`,
OLD:38626-38650); der Service ist über den Konstruktor injiziert (`:67`).
Controller: `@Post(ONLY_OFFICE_CALLBACK_PATH)` (`filesharing.controller.ts:256`, Import `:58`) und
`status === ONLY_OFFICE_CALLBACK_STATUS.EDITING` (`:267`) statt der Magic Number — Handler wie OLD:37397-37408.
`@Query('path')/'filename'/'share')` + `@GetCurrentUsername()` sind unverändert wie im Dekorator-Block OLD:37637-37654;
die Route ist **nicht** `@Public` — das ändert erst **T18**.

### T11 — Stage-1-Spec + Deploy-Hinweis dokumentieren  [ ]  ← einzige offene Stage-1-Task
Komponente: docs · Dateien: `docs/features/p6-onlyoffice-hardening.md` (NEU — existiert heute nicht, `ls docs/features/` geprüft)
Soll: Reine Doku-Task, keine Rekonstruktion.
Änderung: NEUE Datei nach dem Muster der übrigen `docs/features/*.md` (Problem/Motivation · Ziel & Nicht-Ziele ·
Betroffene Komponenten & Dateien · Datenmodell · Sicherheit · Offene Fragen), mit den Bundle-Ankern
OLD:41673 / OLD:38570 / OLD:40243 / NEW:54561 und der Feststellung, dass Stage 1 **keine** DB-Migration und **keinen**
`schemaVersion`-Bump enthält. Zusätzlich festhalten:
- 403-Radius von `assertDocumentUrlMatchesFile`: `document.url` muss `/${EDU_API_ROOT}/downloads/<hash>` sein, gleiche
  Origin wie `callbackUrl`, dessen Pathname genau `/${EDU_API_ROOT}/filesharing/callback`;
- die bewusst weggelassene `PUBLIC_FILESHARING`-Callback-Pathname (OLD:38587) und der weggelassene
  `securityContext`/`publicShareId` (OLD:40243 / NEW:54528);
- **dass ein `CLOSED_WITHOUT_CHANGES`-Callback (Status 4) heute mit 403 beantwortet wird**, weil der Zweig aus
  NEW:54561-54566 fehlt — 2.0.200-treu, aber ein sichtbarer Nutzerfehler; behoben in T27;
- die Fork-Form der Token-Route: `@Body() IConfig` + `@Query('filePath'/'fileName')`, **kein** Request-DTO,
  **kein** `@UsePipes` — deckungsgleich mit OLD:37546-37558 und NEW:51484-51500;
- Collabora/WOPI ist **nicht** im Scope dieses Pakets (einzige Berührung: T26 liest `CollaboraService.getFileStat`);
- **akzeptiertes Restrisiko, das Stage 2 einführt** (hier vorwegnehmen, damit es nicht untergeht): der `eduCallbackToken`
  bekommt in T12 eine TTL von 7 Tagen (2.1.0-Wert, NEW:51768) und die Callback-Route wird in T18 `@Public` — eine
  geleakte `callbackUrl` ist damit 7 Tage lang ein unauthentifiziertes Schreib-Primitiv auf genau eine Datei.
Markdown-SPDX-Header (`<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->`, `<!-- Copyright (C) 2026 Kevin Stenzel -->`) wie in `tasks/backlog.md`.
Verify: `bash scripts/crabbox/iter.sh cmd 'test -f docs/features/p6-onlyoffice-hardening.md && grep -q "OLD:41673" docs/features/p6-onlyoffice-hardening.md && grep -q "OLD:40243" docs/features/p6-onlyoffice-hardening.md && grep -q "NEW:54561" docs/features/p6-onlyoffice-hardening.md && grep -q "SPDX-License-Identifier: AGPL-3.0-or-later" docs/features/p6-onlyoffice-hardening.md && echo OK'` → `OK`.
i18n: keine (Feature-Specs sind einsprachig deutsch, s. übrige `docs/features/`)
Doku: diese Task IST die Doku
Abhängt von: — (Stage 1 ist gebaut; T11 ist der Doku-Nachtrag und blockiert Stage 2)

### Stage 2 — 2.1.0-Niveau (eduCallbackToken + Session-Document-Key)

### T12 — ONLY_OFFICE_CALLBACK_AUTH als const-Objekt  [ ]
Komponente: libs · Dateien: `libs/src/filesharing/constants/onlyOfficeCallbackAuth.ts` (NEU)
Soll: NEW:51766-51769 — `{ QUERY_PARAM: 'eduCallbackToken', TOKEN_TTL: '7d' }`.
Änderung: NEUE Datei, AGPL-SPDX-Header, `const ONLY_OFFICE_CALLBACK_AUTH = { QUERY_PARAM: 'eduCallbackToken', TOKEN_TTL: '7d' } as const;`,
Default-Export am Dateiende (NEW:51770). Werte wörtlich aus NEW:51767-51768 — nicht „härten" (die 7 Tage sind der
2.1.0-Wert; das daraus folgende Restrisiko steht in T11 und T28).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler UND
`bash scripts/crabbox/iter.sh cmd 'grep -q "eduCallbackToken" libs/src/filesharing/constants/onlyOfficeCallbackAuth.ts && grep -q "SPDX-License-Identifier: AGPL-3.0-or-later" libs/src/filesharing/constants/onlyOfficeCallbackAuth.ts && echo OK'` → `OK`
(der nackte tsc allein ist **kein** Gate — er ist heute grün und bliebe es auch ohne die neue Datei).
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
Soll: Feldmenge exakt aus NEW:52724-52729 (`{ username, path, filename, share }`) und NEW:54523 (`decoded.edulutionCallback?.username` ist das Pflichtfeld). Der TS-Typname ist aus dem Bundle nicht ableitbar → **Fork-Original-Naming**.
Änderung: NEUE Datei, AGPL-SPDX-Header. `interface OnlyOfficeCallbackAuthPayload { username: string; path: string; filename: string; share?: string; }`, Default-Export am Dateiende.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler.
i18n: keine
Doku: keine
Abhängt von: T12

### T15 — generateCallbackAuthToken / verifyCallbackAuthToken  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/onlyoffice.service.ts` (ändern), `apps/api/src/filesharing/onlyOfficeCallbackVerification.spec.ts` (ergänzen)
**Achtung:** `apps/api/src/filesharing/onlyoffice.service.spec.ts` **existiert nicht** — die Callback-Specs von T9 liegen in
`onlyOfficeCallbackVerification.spec.ts`. Dort anhängen, in einem eigenen `describe` mit eigenem `beforeEach`.
Soll: NEW:54514-54517 (`generateCallbackAuthToken`) und NEW:54518-54527 (`verifyCallbackAuthToken`), beide wörtlich.
Änderung: Zwei neue Instanzmethoden auf `OnlyofficeService`:
`async generateCallbackAuthToken(payload: OnlyOfficeCallbackAuthPayload): Promise<string>` →
`this.jwtService.sign({ edulutionCallback: payload }, { secret: jwtSecret, expiresIn: ONLY_OFFICE_CALLBACK_AUTH.TOKEN_TTL })`;
`async verifyCallbackAuthToken(token: string): Promise<OnlyOfficeCallbackAuthPayload>` →
`this.jwtService.verify(token, { secret: jwtSecret })`, danach
`if (!decoded.edulutionCallback?.username) throw new CustomHttpException(FileSharingErrorMessage.InvalidCallbackToken, HttpStatus.UNAUTHORIZED)`,
Rückgabe `decoded.edulutionCallback`.
Das Secret über eine kleine private Hilfsmethode `resolveJwtSecretOrThrow()` beziehen, die die vorhandene Logik aus
`generateOnlyOfficeToken` (onlyoffice.service.ts:71-78, `AppNotProperlyConfigured`/500) **herauszieht und wiederverwendet**
(auch `generateOnlyOfficeToken` ruft sie danach auf, damit die Logik genau einmal existiert) — **nicht** den 2.1.0-Refactor
`resolveActiveEditorKeys`/`resolveActiveJwtSecret`/`resolveActiveJwtSecretOrThrow`/EURO_OFFICE (NEW:54490-54509) mitziehen,
der gehört in ein eigenes Paket.
Generische Typen statt Casts (`this.jwtService.verify<{ edulutionCallback?: OnlyOfficeCallbackAuthPayload }>(...)`).
Spec: (1) Round-Trip sign→verify liefert denselben Payload; (2) Token ohne `edulutionCallback.username` → `InvalidCallbackToken`/401;
(3) mit falschem Secret signierter Token → `verify` wirft; (4) fehlendes AppConfig-Secret → `AppNotProperlyConfigured`/500.
Echten `JwtService` mit fixem Testsecret verwenden (nicht mocken), damit der Round-Trip echt ist.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=onlyOfficeCallbackVerification'` → grün,
**25+** Tests (Baseline sind heute **21** in dieser Datei, dazu die vier neuen Fälle — eine niedrigere Zahl wäre falsch-grün) UND
`bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler.
i18n: keine (Key kommt aus T13)
Doku: keine
Abhängt von: T13, T14

### T16 — Callback-URL serverseitig mit eduCallbackToken versehen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/filesharing.service.ts` (ändern: `getOnlyOfficeToken` aus T5), `apps/api/src/filesharing/withCallbackAuthToken.spec.ts` (NEU)
Soll: NEW:52723-52734 (Token-Erzeugung + Anhängen, innerhalb `getOnlyOfficeToken` NEW:52703-52745) und
NEW:52746-52756 (`static withCallbackAuthToken`).
**`options.share` gibt es erst mit T26** — bis dahin `share: undefined` übergeben (das Feld ist in T14 optional).
Änderung:
(a) NEUE `private static withCallbackAuthToken(callbackUrl: string, callbackAuthToken: string): string` exakt nach NEW:52746-52756:
`new URL(callbackUrl)` in try/catch, bei Parse-Fehler
`throw new CustomHttpException(FileSharingErrorMessage.MissingCallbackURL, HttpStatus.INTERNAL_SERVER_ERROR)`;
`parsed.searchParams.set(ONLY_OFFICE_CALLBACK_AUTH.QUERY_PARAM, callbackAuthToken)`; `return parsed.toString()`.
(b) In `getOnlyOfficeToken` nach dem `sanitizeOnlyOfficeConfig`-Aufruf (`filesharing.service.ts:270-273`) und **vor**
`generateOnlyOfficeToken` (`:274`). **Die lokale Variable heißt im Fork `config`, nicht `sanitized`:**
`const callbackAuthToken = await this.onlyofficeService.generateCallbackAuthToken({ username: options.username, path: options.filePath, filename: options.fileName, share: options.share });`
`config.editorConfig = { ...config.editorConfig, callbackUrl: FilesharingService.withCallbackAuthToken(config.editorConfig?.callbackUrl ?? '', callbackAuthToken) };`
Die `if (!options.publicShareId)`-Bedingung aus NEW:52723 entfällt (kein public-Pfad im Fork) — im Spec-Kommentarfeld der Doku vermerken, nicht im Code.
**Wichtig:** das Anhängen passiert NACH `assertDocumentUrlMatchesFile` (das prüft die Client-URL) und NACH `sanitize`,
aber VOR `generateOnlyOfficeToken` — sonst signiert der Server eine andere callbackUrl als er ausliefert.
Spec: (1) angehängter Query-Parameter heißt `eduCallbackToken` und die übrigen Query-Parameter (`path`, `filename`, `share`) bleiben erhalten;
(2) unparsebare callbackUrl → `MissingCallbackURL`/500; (3) bereits vorhandener `eduCallbackToken` wird überschrieben (`set`, nicht `append`).
Spec-Aufbau: `FilesharingService['withCallbackAuthToken']` direkt testen; für den `getOnlyOfficeToken`-Pfad den Service nach
dem Muster von `filesharing.collaboraToken.spec.ts:12-22` bauen — **acht** Positionsargumente in der Reihenfolge
shareModel, `onlyofficeService`, fileSystemService, dynamicQueueService, webDavService, userService, webdavSharesService,
collaboraService (`filesharing.service.ts:64-74`), alle bis auf den `onlyofficeService`-Mock `null as never`.
Verify (zwei getrennte Läufe — **nie** eine `|`-Alternation im Pattern):
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=withCallbackAuthToken'` → grün UND
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=onlyOfficeConfigHardening'` → weiter grün (14 Tests) UND
`bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler.
i18n: keine
Doku: keine
Abhängt von: T15

### T17 — Rohen Keycloak-Token aus der Callback-URL entfernen  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/FileSharing/FilePreview/OnlyOffice/utilities/getCallbackBaseUrl.ts` (ändern, Props `:25-30`, Template `:32-33`), `apps/frontend/src/pages/FileSharing/hooks/useOnlyOffice.ts` (ändern, `:48` Destructuring, `:53` token-useMemo, `:60-65` Aufruf), `apps/frontend/src/pages/FileSharing/FilePreview/OnlyOffice/utilities/getCallbackBaseUrl.spec.ts` (NEU)
**Bereits erledigt, nicht erneut planen:** `getCallbackBaseUrl.ts` importiert und benutzt `ONLY_OFFICE_CALLBACK_PATH`
schon (`:23` / `:33`) — dieselbe Konstante, an die Controller und `assertDocumentUrlMatchesFile` gebunden sind.
Soll: **Fork-Original-Design** (Frontend nicht rekonstruierbar). Fachlich erzwungen durch NEW:51580-51597: die Route
authentifiziert sich ab jetzt ausschließlich über den serverseitig angehängten `eduCallbackToken`.
Änderung: `CallbackBaseUrlProps` verliert das Feld `token`; der Template-String verliert `&token=${token}`.
In `useOnlyOffice.ts` entfallen `const token = useMemo(() => eduApiToken, [filePath, fileName]);` (`:53`) und das
`token`-Argument im `getCallbackBaseUrl`-Aufruf (`:63`); `eduApiToken` aus dem `useUserStore()`-Destructuring (`:48`)
entfernen, sonst schlägt eslint/`noUnusedLocals` zu. `user` bleibt (`:85` braucht `user?.username`), `useMemo` bleibt
importiert (`:56`/`:67` nutzen es weiter). Query-Werte weiter über den bestehenden Template-String bauen —
kein Umbau auf `URLSearchParams` (Surgical).
Spec (vitest, neben der Utility, Muster: `…/Collabora/utilities/buildCollaboraSrc.spec.ts`): die erzeugte URL enthält
`path`, `filename`, `share` und **kein** `token=` — als Regressionsanker gegen ein Wiedereinführen formuliert
(`expect(url).not.toContain('token=')`).
Verify (Pfad **relativ zu `apps/frontend`**, sonst findet vitest die Datei nicht):
`bash scripts/crabbox/iter.sh cmd 'npx nx test frontend --run src/pages/FileSharing/FilePreview/OnlyOffice/utilities/getCallbackBaseUrl.spec.ts'` → grün UND
`bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` → 0 Fehler UND
`bash scripts/crabbox/iter.sh lint` sauber.
i18n: keine
Doku: keine
Abhängt von: T16

### T18 — Callback-Route auf @Public + eduCallbackToken umstellen  [ ] ⚠ DARF NUR MIT T15+T16+T17 LANDEN
Komponente: apps/api · Dateien: `apps/api/src/filesharing/filesharing.controller.ts` (ändern, `:256-275`), `apps/api/src/filesharing/filesharing.service.ts` (ändern, `handleCallback` `:279-299`), `apps/api/src/filesharing/filesharing.controller.spec.ts` (ändern, `:15`/`:16`/`:32`/`:58`), `apps/api/src/filesharing/filesharing.callbackAuth.spec.ts` (NEU)
Soll: NEW:51580-51597 (Dekoratoren: `@Public()`, `@Post('callback')`, `@ApiQuery({ name: ONLY_OFFICE_CALLBACK_AUTH.QUERY_PARAM })`,
`@Req()`, `@Res()`, `@Query(ONLY_OFFICE_CALLBACK_AUTH.QUERY_PARAM)`) und NEW:52813-52822 (`async handleCallback(req, res, callbackAuthToken)`).
Änderung:
(a) Controller: `@Query('path')`, `@Query('filename')`, `@Query('share')` und `@GetCurrentUsername()` entfernen, stattdessen
`@Query(ONLY_OFFICE_CALLBACK_AUTH.QUERY_PARAM) callbackAuthToken: string`; `@Public()` **über** das bereits vorhandene
`@Post(ONLY_OFFICE_CALLBACK_PATH)` (`:256`) setzen. Der `status === ONLY_OFFICE_CALLBACK_STATUS.EDITING`-Frühausstieg (`:267`) bleibt.
(b) Service: `async handleCallback(req, res, callbackAuthToken)` → `verifyCallbackAuthToken` in try/catch,
bei Fehler `return res.status(HttpStatus.UNAUTHORIZED).json({ error: 1 })` (NEW:52815-52820), sonst mit
`auth.path`, `auth.filename`, `auth.username`, `auth.share ?? ''` weiter in den bestehenden Upload-Pfad aus T10.
**Pflicht-Nebenänderung:** `getPathWithoutWebdav(path, webdavShare.pathname)` (`filesharing.service.ts:285`) auf
`webdavShare?.pathname` umstellen — wie NEW:52832. `getWebdavShareFromCache` liefert `this.webdavShareCache[share]` und
damit potenziell `undefined` (`webdav-shares.service.ts:102-107`); auf der jetzt öffentlichen Route würde ein Cache-Miss
zum 500 statt zu einem sauberen Ergebnis. `getPathWithoutWebdav` deklariert `sharePath?: string` — typecheckt also.
(c) Controller-Spec (nur der Reflection-Teil, der dort funktioniert): `'handleCallback'` von `NON_PUBLIC_ROUTES` (`:32`) nach
`PUBLIC_ROUTES` (`:15`) verschieben; den Testtitel „exposes exactly the two public-share download routes via @Public" (`:58`)
auf drei Routen anpassen.
(d) **Der 401-Anker gehört NICHT in die Controller-Spec.** `filesharing.controller.spec.ts:13` ist `const serviceMock = {}`;
die Suite ruft nie einen Handler auf, und `verifyCallbackAuthToken` lebt auf `OnlyofficeService` und wird innerhalb von
`FilesharingService.handleCallback` aufgerufen. `filesharing.service.spec.ts` taugt ebenfalls nicht — sie registriert
`FilesharingService` per `useValue` und mockt damit die Klasse, die sie testen soll.
→ NEUE Datei `filesharing.callbackAuth.spec.ts` nach dem Muster von `filesharing.collaboraToken.spec.ts:12-22` mit
**acht** Positionsargumenten (shareModel, `onlyofficeService`, fileSystemService, dynamicQueueService, webDavService,
userService, `webdavSharesService`, collaboraService — `filesharing.service.ts:64-74`). Fälle:
(1) `verifyCallbackAuthToken` wirft → `res.status(HttpStatus.UNAUTHORIZED)` + `res.json({error: 1})`, und
`onlyofficeService.handleCallback` **nicht** aufgerufen; (2) gültiger Payload → `onlyofficeService.handleCallback` mit
`auth.username`/`auth.filename` aufgerufen; (3) `getWebdavShareFromCache` liefert `undefined` → **kein** Throw (Anker für die
`?.`-Änderung aus (b)).
**Begründung/Warnung im Commit-Body festhalten:** `@Public()` umgeht im Fork AuthGuard **und** AccessGuard
(`apps/api/src/auth/access.guard.ts:48-55` gibt bei `isPublic` sofort `true` zurück). Ohne T15/T16/T17 ist die Route
unauthentifiziert schreibend — deshalb die Kopplung.
Verify (zwei getrennte Läufe — **nie** eine `|`-Alternation im Pattern):
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=filesharing.callbackAuth'` → grün UND
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=filesharing.controller'` → grün UND
`bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler.
(**Nicht** `npm run check-spec-coverage` verwenden — das prüft nur, ob zu jedem `*.controller.ts` ein
`*.controller.spec.ts` existiert, ist bereits erfüllt und bleibt grün, egal was man ändert.)
i18n: keine
Doku: keine
Abhängt von: T15, T16, T17

### T19 — stringToStableHash  [ ]
Komponente: libs · Dateien: `libs/src/common/utils/stringToStableHash.ts` (NEU), `apps/api/src/filesharing/stringToStableHash.spec.ts` (NEU)
Soll: NEW:52295-52306 (52290-52294 ist noch Lizenzkommentar) — `MODULUS = 2147483647`, `FACTOR_A = 31`, `FACTOR_B = 131`,
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
Entry-Felder aus NEW:54702-54706 (`{ key, persistUsername, persistShare }`), Default-Export der Konstanten NEW:54818 — Typnamen Fork-Original.
**Zweiter, im Bundle impliziter Typ:** `getPersistContext` liefert NEW:54722 `{ username: entry.persistUsername, share: entry.persistShare }` —
Entry-Form und Rückgabe-Form sind **verschieden**. Beide Typen anlegen (`OnlyOfficeSessionKeyEntry` und
`OnlyOfficeSessionPersistContext`, je eigene Datei mit genau einem Default-Export, sonst schlägt `checkFilenames` fehl).
Änderung: Zwei NEUE Dateien mit AGPL-SPDX-Header. Konstantendatei als `as const` + Default-Export;
`interface OnlyOfficeSessionKeyEntry { key: string; persistUsername: string; persistShare: string; }`.
`TTL_MS` als Ausdruck `12 * 60 * 60 * 1000` wie im Original.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler UND
`bash scripts/crabbox/iter.sh cmd 'grep -q "onlyoffice:session:" libs/src/filesharing/constants/onlyOfficeSessionKey.ts && grep -q "persistUsername" libs/src/filesharing/types/onlyOfficeSessionKeyEntry.ts && ! grep -L "SPDX-License-Identifier: AGPL-3.0-or-later" libs/src/filesharing/constants/onlyOfficeSessionKey.ts libs/src/filesharing/types/onlyOfficeSessionKeyEntry.ts libs/src/filesharing/types/onlyOfficeSessionPersistContext.ts | grep -q .; echo "[rc=$?]"'` → `[rc=0]`
(**nie** `… || echo OK` schreiben — diese Kette druckt `OK` genau dann, wenn ein Glied **fehlschlägt**, ist also invertiert falsch-grün.)
(der nackte tsc allein ist **kein** Gate — er ist heute grün und bliebe es ohne die drei Dateien).
Dateinamen-Prüfung nur mit vorherigem **`git add`**: `git add libs/src/filesharing/constants/onlyOfficeSessionKey.ts libs/src/filesharing/types/onlyOfficeSessionKeyEntry.ts libs/src/filesharing/types/onlyOfficeSessionPersistContext.ts && npm run check-filenames`
— ohne `git add` liest das Skript nichts und endet mit Exit 0.
i18n: keine
Doku: keine
Abhängt von: T20

### T22 — KeyedMutex  [ ]
Komponente: apps/api · Dateien: `apps/api/src/common/keyedMutex.ts` (NEU), `apps/api/src/common/keyedMutex.spec.ts` (NEU)
Soll: NEW:54845-54866 — Klasse `KeyedMutex` mit `locks = new Map<string, Promise<void>>()`, `let release;` vor dem
Lock-Promise (NEW:54852-54855) und
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
`static buildIdentity(share, rawPath, publicShareId)` (NEW:54683-54688),
`static cacheKey(identity)` (NEW:54689-54691),
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
`apps/api/src/app/app.module.ts:94-95` registriert ihn `isGlobal: true`.
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
Komponente: libs · Dateien: `libs/src/filesharing/utils/sanitizeOnlyOfficeConfig.ts` (ändern, `document.key` `:25`, `protect` `:36`), `apps/api/src/filesharing/onlyOfficeConfigHardening.spec.ts` (ergänzen — **`sanitizeOnlyOfficeConfig.spec.ts` existiert nicht**)
Soll: NEW:56204-56231 — Options werden `{ canWrite, editorUser, documentKey }`; `document.key = documentKey ?? base.document?.key ?? ''` (NEW:56211);
`permissions.protect: false` statt `effectiveEdit` (NEW:56220, Änderung gegenüber OLD:41693).
Änderung: Options-Typ um `documentKey?: string` erweitern, `document.key` entsprechend, `protect` auf `false`.
**`editorUser` bewusst NICHT übernehmen** — das gehört zum 2.1.0-Gast/Public-Share-Paket (NEW:51310 / NEW:56230,
`buildOnlyOfficeEditorUserFromJwtUser`); der Fork behält die 2.0.200-Form `user: { id: username, name: username }`.
Diese Abweichung in T28 dokumentieren.
Spec ergänzen: (1) mit `documentKey` gewinnt der Server-Key gegen den Client-`document.key`;
(2) ohne `documentKey` bleibt der Client-Key (Rückwärtsfall); (3) `protect` ist auch bei `canWrite=true, mode:'edit'` `false`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=onlyOfficeConfigHardening'` → grün,
**17+** Tests. **Baseline sind heute 14** `it()` in dieser Datei (6 assert + 6 sanitize + 2 getOnlyOfficeToken) —
jede Zahl ≤ 14 wäre falsch-grün, ohne dass ein einziger neuer Test entsteht.
i18n: keine
Doku: keine
Abhängt von: T24

### T26 — getOnlyOfficeToken: etag-basierter Session-Key + share-Contract  [ ]
Komponente: apps/api, apps/frontend · Dateien: `apps/api/src/filesharing/filesharing.service.ts` (ändern), `apps/api/src/filesharing/filesharing.controller.ts` (ändern, `:192-205`), `apps/frontend/src/pages/FileSharing/FilePreview/OnlyOffice/useFileEditorStore.ts` (ändern), `apps/frontend/src/pages/FileSharing/hooks/useOnlyOffice.ts` (ändern), **`apps/api/src/filesharing/filesharing.collaboraToken.spec.ts` (ändern, `:13-22`)**, **`apps/api/src/filesharing/onlyOfficeConfigHardening.spec.ts` (ändern, `:162-171`)**
Soll: NEW:52703-52722 (fileStat/etag-Beschaffung + `resolveSessionKey`) und NEW:51484-51500 (Controller bekommt `@Query('share')`).
**Bruchstelle, die zwingend im selben Commit mitgeht:** der neue Konstruktor-Parameter macht aus 8 Positionsargumenten 9.
**Beide** oben genannten Specs bauen den Service heute mit exakt 8 (`new FilesharingService(null as never, …)`) und laufen
sonst in TS2554. Das API-tsc-Gate sieht das **nicht** (`apps/api/tsconfig.app.json` excludet `*.spec.ts`) — nur Jest fängt es.
Änderung:
(a) `OnlyOfficeSessionKeyService` in `FilesharingService` injizieren (Konstruktor `filesharing.service.ts:64-74`;
`collaboraService` steht dort auf `:73`).
(b) In `getOnlyOfficeToken` nach `assertDocumentUrlMatchesFile`:
`const fileStat = await this.collaboraService.getFileStat(options.username, options.filePath, options.share ?? '')`
— **Abweichung von NEW:52705** (dort `this.webDavService.getFileStat`): im Fork liegt `getFileStat` auf
`CollaboraService` (collabora.service.ts:81-103) und `collaboraService` ist in `FilesharingService` bereits injiziert (Zeile 64).
Kein Verschieben der Methode (Surgical); die Log-Meldung „WOPI getFileStat failed" bleibt bestehen und ist in T28 zu vermerken.
`if (!fileStat) throw new CustomHttpException(FileSharingErrorMessage.FileNotFound, HttpStatus.NOT_FOUND)`;
`if (!fileStat.etag) throw new CustomHttpException(FileSharingErrorMessage.WebDavError, HttpStatus.INTERNAL_SERVER_ERROR, 'file stat has no etag; cannot build a content-versioned OnlyOffice document key')` (Detail wörtlich NEW:52710).
(c) `const sessionIdentity = OnlyOfficeSessionKeyService.buildIdentity(options.share, options.filePath, undefined)`;
`const documentKey = await this.sessionKeyService.resolveSessionKey(sessionIdentity, options.filePath, fileStat.etag, { username: options.username, share: options.share ?? '' })`;
`documentKey` an `sanitizeOnlyOfficeConfig` durchreichen.
(d) Contract-Sync: Controller-Route (`filesharing.controller.ts:192-205`) bekommt `@Query('share') share: string`
(NEW:51495, ApiQuery NEW:51489) und reicht es in `options.share`; `OnlyOfficeTokenOptions`
(`libs/src/filesharing/types/onlyOfficeTokenOptions.ts`) bekommt `share?: string`; die Store-Methode
**`getOnlyOfficeConfigAndToken`** (`useFileEditorStore.ts:39-43`/`:90-107`) bekommt einen `share`-Parameter
(axios `params: { filePath, fileName, share }`); `useOnlyOffice.ts:89` übergibt das bereits vorhandene `webdavShare`
aus `useParams()` (`:46`).
Verify (drei getrennte Jest-Läufe — **nie** eine `|`-Alternation; `--testPathPattern=filesharing` fängt
`onlyOfficeConfigHardening.spec.ts` **nicht**, dessen Name kein „filesharing" enthält):
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=filesharing'` → grün UND
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=onlyOfficeConfigHardening'` → grün (17+ Tests) UND
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=onlyoffice-session-key'` → grün UND
`bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` → 0 Fehler UND
`bash scripts/crabbox/iter.sh test:frontend` → grün.
i18n: keine (`filesharing.errors.FileNotFound` und `.WebDavError` existieren in de/en/fr)
Doku: keine
Abhängt von: T25

### T27 — Callback: Persist-Context + endSession  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/filesharing.service.ts` (ändern, `handleCallback` aus T18), `apps/api/src/filesharing/onlyoffice.service.ts` (ändern, `handleCallback` `:91-150`), `apps/api/src/filesharing/onlyOfficeCallbackVerification.spec.ts` (ergänzen **und** Konstruktor-Aufruf `:40` anpassen — **`onlyoffice.service.spec.ts` existiert nicht**)
Soll: NEW:52823-52837 (`dispatchOnlyOfficeCallback`: Identity bauen, `getPersistContext`, Warn-Log, Fallback auf die
Callback-Identität) und NEW:54561-54566 + NEW:54577-54579 (`endSession` bei `CLOSED_WITHOUT_CHANGES` und nach
erfolgreichem `READY_FOR_SAVING`).
**Dritte Bruchstelle, zwingend im selben Commit:** die Injektion von `OnlyOfficeSessionKeyService` macht aus dem
zweiargumentigen `new OnlyofficeService({ getAppConfigByName } as never, { verify } as never)`
(`onlyOfficeCallbackVerification.spec.ts:40`) einen dreiargumentigen — sonst TS2554 in allen 16 Fällen.
Änderung:
(a) `FilesharingService.handleCallback`: nach `verifyCallbackAuthToken`
`const sessionIdentity = OnlyOfficeSessionKeyService.buildIdentity(auth.share ?? '', auth.path, undefined);`
`const persistContext = await this.sessionKeyService.getPersistContext(sessionIdentity);`
Fehlt er: `Logger.warn(\`No pinned persist context for OnlyOffice session ${sessionIdentity}; falling back to the callback identity "${auth.username}". The session pin was likely evicted (TTL/restart).\`, FilesharingService.name)`
(Wortlaut NEW:52827-52828). `saveUsername = persistContext?.username ?? auth.username`, `saveShare = persistContext?.share ?? auth.share ?? ''`
werden weitergereicht; `sessionIdentity` als zusätzliches Argument an `OnlyofficeService.handleCallback`.
(b) `OnlyofficeService.handleCallback` bekommt einen **siebten, optionalen** Parameter nach dem `uploadFile`-Callback —
wie NEW:54528 (`securityContext`), im Fork auf das reduziert, was es hier gibt. Endsignatur, damit sie nicht geraten wird:
`async handleCallback(req: Request, res: Response, path: string, filename: string, username: string, uploadFile: (username: string, path: string, file: CustomFile, name: string) => Promise<WebdavStatusResponse>, securityContext?: { sessionIdentity?: string }): Promise<Response>`
— optional, damit die bestehenden Aufrufe und der `callHandler` der Spec weiter kompilieren.
Ergänzungen gegenüber T9, in dieser Reihenfolge:
- **Neu einzuführender Zweig (behebt den offenen Rest aus T9):** nach dem Status-Filter, **vor** der Download-URL-Prüfung
  `if (isClosedWithoutChanges) { if (sessionIdentity) await this.sessionKeyService.endSession(sessionIdentity, signed.key); return res.status(HttpStatus.OK).json({ error: 0 }); }` (NEW:54561-54566).
  Ohne diesen Zweig bleibt es beim heutigen Verhalten: Status 4 trägt keine `url`, fällt in
  `isAllowedOnlyOfficeDownloadUrl('')` und wird mit **403** beantwortet — und der `endSession`-Aufruf wäre unerreichbar.
  Die Status-Klassifikation dabei auf die 2.1.0-Namen ziehen (NEW:54550-54553): `isForceSaving`, `isReadyForSaving`,
  `isClosedWithoutChanges`, `shouldPersist = isReadyForSaving || isForceSaving`.
- nach erfolgreichem Upload bei `READY_FOR_SAVING` ebenfalls `endSession` (NEW:54577-54579).
  `FORCE_SAVING` beendet die Session **nicht** (NEW:54577 prüft nur `isReadyForSaving`).
`OnlyOfficeSessionKeyService` dazu in `OnlyofficeService` injizieren (dritter Konstruktor-Parameter, NEW:54444-54452).
Spec ergänzen: (1) status 4 → `endSession(identity, key)` genau einmal, kein `uploadFile`;
(2) status 2 Happy Path → `uploadFile` und danach `endSession`; (3) status 6 (FORCE_SAVING) → `uploadFile`, aber **kein** `endSession`;
(4) fehlender Persist-Context → `Logger.warn` und Upload läuft mit der Callback-Identität weiter.
Zusätzlicher Regressionsanker (die Verhaltensänderung aus (b)): `status: 4` mit gültiger Signatur und **ohne** `url`
→ **200** `{error:0}`, `retrieveAndSaveFile` **nicht** aufgerufen, **kein** 403. Das ist der Test, der heute rot wäre.
Verify (getrennte Läufe — **nie** eine `|`-Alternation im Pattern):
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=onlyOfficeCallbackVerification'` → grün, **29+** Tests
(Baseline **21** in dieser Datei, +4 aus T15, +4 hier) UND
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test -- --testPathPattern=filesharing'` → grün UND
`bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` → 0 Fehler.
i18n: keine
Doku: keine
Abhängt von: T26

### T28 — Stage-2-Doku + Endnutzer-Doku (DE/EN/FR)  [ ]
Komponente: docs · Dateien: `docs/features/p6-onlyoffice-hardening.md` (ergänzen), `docs/document-editor.de.md`, `docs/document-editor.en.md`, `docs/document-editor.fr.md` (je ergänzen)
Soll: Reine Doku-Task.
Änderung:
(a) Spec um den Stage-2-Abschnitt ergänzen: `eduCallbackToken` (Anker NEW:51766-51770, 54514-54527, 51580-51597),
Session-Key (NEW:52705-52717, 54677-54749, 56204-56231), den in T27 nachgezogenen `CLOSED_WITHOUT_CHANGES`-Zweig
(NEW:54561-54566) und den in T18 nachgezogenen `webdavShare?.pathname` (NEW:52832), sowie die bewussten Abweichungen —
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
