## p4-mail-rework — Phase 3 + 4 NEU gegen **2.1.0** (ersetzt die bisherigen T10–T25)

> **RETARGET 2026-07-27.** Soll-Quelle ist ab sofort `edulution-ui/.reference/2.1.0/api/main.js` (94.907 Z.,
> md5 `0b3e75fa24db34bb46df8d7d6f34a5c9`), **nicht mehr** 2.0.200. Alle Zeilenanker unten sind gegen **2.1.0**
> verifiziert. T1–T9 dieser Section bleiben unverändert gültig (Phase 1 + 2 + Deps sind fertig).
>
> **Was 2.1.0 gegenüber 2.0.200 im Mail-Modul ändert (verifiziert, nicht neu zu recherchieren):**
> - **Routen 36 → 56.** 21 davon sind neu: 20 Sieve-/Auto-Reply-/Forward-/Filter-Routen (Decorator-Block
>   **28369–28628**) + `GET mails/recipients/favorites` (**28768**). `getMailcowDomains` ist **ersetzt** durch
>   `getMailDomains` → `GET /mails/domains` (**28388**).
> - **`MailsService` 30449–31310** (2.0.200: 25203–25928) — +9 Methoden: `fetchMailcowList`,
>   `getManageableSharedMailboxes`, `assertCanManageSharedMailbox`, `decryptStoredMailboxPassword`,
>   `listActiveMailcowAliasDomains`, `getUserAddresses`, `getDeliverableLocalDirectory`,
>   `static classifyRecipients`, `static filterDeliverableAddresses`.
> - **`MailImapService` 33007–33785** (2.0.200: 27545–28314) — Datums-/Sortier-Umbau: **neu**
>   `resolveMailDate` (33110), `toTimestamp` (33133), `toSortSearchAtom` (33142), `sortByArrivalDescending`
>   (33152), `getDateOrderedUids` (33188); **entfallen** `bodyStructureHasAttachment`, `sortByDateDescending`.
> - **`RecipientsService` 38100–38361** (2.0.200: 29322–29441) — **neu** `collectParentChildLinks` (38204),
>   `resolveChildFromAdminParentsGroup` (38254), `getFavoriteRecipientsForUser` (38290),
>   `isMailEligibleGroup` (38298), `groupToRecipient` (38303), `extractClassFromParentGroupName` (38321);
>   `collectUsers`/`collectMaillistGroups` sind jetzt **static mit Argumenten**.
> - **Komplett neu: der Sieve-Stack** — `MailSieveService` (35136–35617), `SieveConfigService` (36151–36194),
>   `SieveClientFactory` (36229–36258), **eigener** `ManageSieveClient` (36294–36506, kein npm-Paket!),
>   `manageSieveProtocol` (36545–36657), `ManageSieveError` (36684–36691), Script-Builder/-Parser
>   (36718–38006), **6 Mongoose-Schemas** (35819–36114), 2 neue appconfig-Keys.
>
> **Bereits festgestellte Fakten — NICHT neu ausdiskutieren:**
> 1. **`MailRequestSizeGuard` hat eine harte 20-MiB-Schwelle, keine Env-Variable.**
>    `TOTAL_WIRE_MAX_BYTES = 20_971_520` (**29046**), Guard **42470–42480**. Keine Env-Lesung, kein
>    ConfigService. Wer eine Env-Variable erfindet, weicht vom Original ab.
> 2. **KORREKTUR zur bisherigen Annahme:** `MAIL_MAILBOX_TABLE` (**2411**) und `MAIL_PROVIDER_CONFIG_TABLE`
>    (**2413**) **existieren in 2.1.0 sehr wohl** — und zwar erstmals *benutzt*: als
>    `ExtendedOptionField.table`-Formularfelder in `MAILBOX_MANAGEMENT_EXTENDED_OPTIONS` (**4054–4062**) und
>    `MAIL_EXTERNAL_PROVIDERS_EXTENDED_OPTIONS` (**3632–3640**). In 2.0.200 waren es tote Keys (nur
>    2115/2117, kein Consumer) — daher die alte Notiz „gibt's nicht". Sie ist für 2.1.0 **falsch**. Die Keys
>    sind zu portieren; **nicht** zu portieren ist die zugehörige **FE-Tabellen-Renderer-Komponente**, die im
>    API-Bundle nicht enthalten ist (Fork-Eigendesign, siehe T41).
> 3. **`GET /mails/mailcow-mailboxes/domains` (2.0.200, AdminGuard) → `GET /mails/domains` (2.1.0).**
>    Die 2.1.0-Route hat **keinen** `AdminGuard` (Decorator-Block 28387–28394: nur `Get`, `ApiOperation`,
>    `ApiResponse`). **Der Fork behält den `AdminGuard` bewusst** → bewusste Divergenz, ADR-pflichtig (T40).
> 4. **In dieser Session bereits gefixt (nicht erneut anfassen):** sync-job-IDOR (`getSyncJobs`/`deleteSyncJobs`
>    sind emailAddress-scoped, `SyncJobAccessDenied`, `mails.service.ts:496/549`), `provider-config` GET/POST/
>    DELETE mit `AdminGuard`, öffentliche Route `provider-config/public`, serverseitige Provider-Auflösung.
>
> **Guardrails für ALLE Tasks dieser Section:** neue Dateien AGPL-SPDX-Header (Copyright (C) 2026 Kevin
> Stenzel) · const-Objekte statt enums (bestehendes `MailsErrorMessages`-enum wird als enum erweitert) ·
> Default-Export am Dateiende, Dateiname == Export · keine Kommentare · statische `Logger.x(msg, Service.name)` ·
> keine Magic-Strings · Guards/`@Public` **immer** mit der Route portieren · i18n DE+EN+FR ·
> Verifikation **remote**: `bash scripts/crabbox/iter.sh <lint|test:api|test:frontend|i18n|build|all>` bzw.
> `iter.sh cmd '<befehl>'`; FE-Tasks **zusätzlich** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'`.
>
> **Runner-/Slot-Fakten (auf der Box gemessen, 2026-07-27 — nicht raten, nicht „vereinfachen"):**
> - **R1 — `npx tsc -p libs/tsconfig.json --noEmit` endet HEUTE mit exit 2.** Genau ein Alt-Fehler:
>   `libs/src/license/constants/licenseServerUrl.ts(20,40): error TS4111`. „exit 0" ist damit **unerfüllbar**.
>   Wo unten **`LIBS_TSC`** steht, ist exakt das gemeint:
>   `iter.sh cmd 'npx tsc -p libs/tsconfig.json --noEmit 2>&1 | grep "error TS" | grep -v "licenseServerUrl.ts(20,40)" > /tmp/libs-tsc-new.txt; test ! -s /tmp/libs-tsc-new.txt'`
>   → exit 0 nur, wenn **kein neuer** libs-Fehler dazugekommen ist. Den Baseline-Fehler nicht nebenbei mitfixen
>   (Surgical-Regel) — dann müsste dieses Makro angepasst werden.
> - **R2 — das FE läuft auf Vitest** (`apps/frontend/project.json`, `@nx/vite`). `--testPathPattern` ist ein
>   **Jest**-Flag und bricht mit `CACError: Unknown option --testPathPattern` (rc=1). Richtig ist
>   `npx nx test frontend --run src/<pfad relativ zu apps/frontend>`. API-seitig bleibt Jest:
>   `npx nx test api --testPathPattern=<EIN Pfad-Token>` — **nie** eine `|`-Alternation (nx reicht das
>   ungequotet an die Shell) und **nie** `--listTests` als Gate (exit 0 auch bei 0 Treffern).
> - **R3 — Migrations-Slot: `p4-mail` hält appConfig-Slot **014**** (`PORT-2.1.0-MASTER.md:225` D1, `:140`).
>   Die Slots **010–013** gehören `p6-migrations-2-1-catchup` (T8 `010`, T9 `011`, T11 `012-unify-mail-server-config`,
>   T12 `013`) — dort **nicht** hineingreifen und `012` **nicht** nachbauen.
>
> **`[?] human-gate` bleibt:** Phase 3 wird nicht unbeaufsichtigt gebaut. Kevin gibt sie gesondert frei.

---

### T10 — libs: MAIL_ENDPOINT_PATHS auf 2.1.0 (+7 Keys) + MANAGESIEVE-Port  [ ]
Komponente: libs · Dateien: `libs/src/mail/constants/mailEndpointPaths.ts`, `libs/src/mail/constants/mailDefaultPorts.ts`
Soll: NEW:28902–28928 (`MAIL_ENDPOINT_PATHS`, 24 Werte — gegenüber Fork **neu**: `AUTO_REPLY:'auto-reply'`, `SHARED:'shared'`, `FORWARD:'forward'`, `FILTERS:'filters'`, `ACTIVE:'active'`, `ADDRESSES:'addresses'`, `FAVORITES:'favorites'`) · NEW:4018–4024 (`MAIL_DEFAULT_PORTS` + `MANAGESIEVE: 4190`)
Änderung: Die 7 Keys **am Ende** des bestehenden `MAIL_ENDPOINT_PATHS`-Objekts anhängen (Reihenfolge 2.1.0-treu), `MANAGESIEVE: 4190` an `MAIL_DEFAULT_PORTS` anhängen. Rein additiv, keine bestehende Zeile ändern.
Verify: `LIBS_TSC` (R1) exit 0; `iter.sh cmd 'test $(grep -c ": ." libs/src/mail/constants/mailEndpointPaths.ts) -eq 25'` — **heute selbst gemessen: 18** (das Muster `": ."` matcht **auch** die SPDX-Zeile `SPDX-License-Identifier: AGPL-3.0-or-later`; die apostroph-genaue Variante `": \x27"` zählt 17, überlebt aber den einfach gequoteten `iter.sh cmd '…'`-Wrapper nicht), nach den +7 Keys exakt **25**; `iter.sh cmd 'grep -q 4190 libs/src/mail/constants/mailDefaultPorts.ts'` exit 0
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T11 — libs: Mail-Limits & -Defaults (Konstanten)  [ ]
Komponente: libs · Dateien: `libs/src/mail/constants/mailDefaults.ts`, `mailFieldLimits.ts`, `mailAttachmentMaxFileSize.ts`, `mailAttachmentMaxFileCount.ts`, `mailAddressMaxLength.ts`, `recipientSearch.ts` (alle neu)
Soll: NEW:28956–28963 (`MAIL_DEFAULTS`: **`FOLDER: MAIL_FOLDER_NAMES.INBOX`** (28957), PAGE 1, PAGE_SIZE 50, MAX_PAGE_SIZE 200, MAX_SEARCH_QUERY_LENGTH 256) · NEW:29046 (`TOTAL_WIRE_MAX_BYTES = 20_971_520` als Modul-Konstante) + NEW:29047–29055 (`MAIL_FIELD_LIMITS` mit **exakt diesen Feldnamen**: `SUBJECT_MAX_LENGTH: 998`, `TEXT_BODY_MAX_LENGTH: 1_000_000`, `HTML_BODY_MAX_LENGTH: TOTAL_WIRE_MAX_BYTES`, `IN_REPLY_TO_MAX_LENGTH: 998`, `ADDRESS_NAME_MAX_LENGTH: 255`, `ADDRESS_MAX_LENGTH: 320`, `TOTAL_WIRE_MAX_BYTES`) · NEW:28990 (`MAIL_ATTACHMENT_MAX_FILE_SIZE = 20*1024*1024`) · NEW:29018 (`MAIL_ATTACHMENT_MAX_FILE_COUNT = 10`) · NEW:41670 (`MAIL_ADDRESS_MAX_LENGTH = 320`) · NEW:38472–38476 (`RECIPIENT_SEARCH`: MIN_QUERY_LENGTH 1, MAX_RESULTS 50)
Änderung: 6 `as const`-Konstantenmodule feldgenau anlegen; **Feldnamen wörtlich wie oben, keine Kurzformen**. **`TOTAL_WIRE_MAX_BYTES` ist ein Literal ohne Env-Override** (siehe Header-Fakt 1) und wird sowohl eigenständig als auch als Feld in `MAIL_FIELD_LIMITS` exportiert. **`MAIL_DEFAULTS.FOLDER` importiert `MAIL_FOLDER_NAMES.INBOX` aus T56** — der Fork hat heute **kein** IMAP-Flag-/Ordnernamen-Modul (`grep -rn "MAIL_FOLDER_NAMES\|MAIL_SPECIAL_USE" libs/ apps/` → leer); **kein zweites `'INBOX'`-Literal anlegen**.
Verify: `LIBS_TSC` (R1) exit 0; `iter.sh cmd 'grep -q "20_971_520" libs/src/mail/constants/mailFieldLimits.ts && grep -q "MAIL_FOLDER_NAMES" libs/src/mail/constants/mailDefaults.ts'` exit 0; `iter.sh cmd 'for k in SUBJECT_MAX_LENGTH TEXT_BODY_MAX_LENGTH HTML_BODY_MAX_LENGTH IN_REPLY_TO_MAX_LENGTH ADDRESS_NAME_MAX_LENGTH ADDRESS_MAX_LENGTH; do grep -q "$k" libs/src/mail/constants/mailFieldLimits.ts || exit 1; done'` exit 0
i18n: keine
Doku: keine (intern)
Abhängt von: T56

### T12 — libs: IMAP-Lese-DTOs (Mailbox / Liste / Detail / Anhang / Status)  [ ]
Komponente: libs · Dateien: `libs/src/mail/types/mailboxResponse.dto.ts`, `mailSummaryResponse.dto.ts`, `paginatedMailsResponse.dto.ts`, `mailDetailResponse.dto.ts`, `mailAttachmentResponse.dto.ts`, `mailStatusResponse.dto.ts`, `mailResponse.dto.ts`, `mailAddressBase.dto.ts` (alle neu)
Soll: NEW:39427 `MailboxResponseDto` · NEW:39562 `MailSummaryResponseDto` · NEW:39494 `PaginatedMailsResponseDto` · NEW:39693 `MailDetailResponseDto` · NEW:39794 `MailAttachmentResponseDto` · NEW:39638 `MailStatusResponseDto` · NEW:39366 `MailResponseDto` · NEW:38670 `MailAddressBaseDto`
Änderung: Response-DTO-Klassen feldgenau übernehmen (nur `@ApiProperty`, **keine** class-validator-Decorators — es sind Ausgabe-DTOs). Eine Klasse pro Datei (`max-classes-per-file`), Default-Export am Ende. SPDX.
Verify: `LIBS_TSC` (R1) exit 0; `iter.sh cmd 'test $(ls libs/src/mail/types | grep -cE "mailboxResponse|mailDetailResponse|paginatedMailsResponse") -eq 3'` exit 0
i18n: keine
Doku: keine (intern)
Abhängt von: T11

### T13 — libs: IMAP-Schreib-DTOs (Body-DTOs mit class-validator)  [ ]
Komponente: libs · Dateien: `libs/src/mail/types/deleteMailsBody.dto.ts`, `mailMoveBody.dto.ts`, `mailStatusUpdate.dto.ts`, `mailFlagsUpdateBody.dto.ts`, `mailFolderCreateBody.dto.ts`, `mailFolderRenameBody.dto.ts`, `sendMailBody.dto.ts`, `saveDraftBody.dto.ts`, `sendMailResultResponse.dto.ts`, `saveDraftResponse.dto.ts`, `senderAddress.dto.ts`, `forwardSource.dto.ts` (alle neu)
Soll: NEW:39847 `DeleteMailsBodyDto` · NEW:39897 `MailMoveBodyDto` · NEW:39999 `MailStatusUpdateDto` · NEW:39949 `MailFlagsUpdateBodyDto` · NEW:40059 `MailFolderCreateBodyDto` · NEW:40098 `MailFolderRenameBodyDto` · NEW:40143 `SendMailBodyDto` · NEW:39156 `SaveDraftBodyDto` · NEW:39317 `SendMailResultResponseDto` · NEW:39266 `SaveDraftResponseDto` · NEW:38710 `SenderAddressDto` · NEW:38755 `ForwardSourceDto`
Änderung: Body-DTOs **inklusive aller class-validator-Decorators** übernehmen (Längen aus `MAIL_FIELD_LIMITS`/`MAIL_ADDRESS_MAX_LENGTH`, T11 — keine Zahlenliterale in den DTOs). Nested-Arrays mit `@ValidateNested({each:true})` + `@Type()`. SPDX.
Verify: `LIBS_TSC` (R1) exit 0; `iter.sh cmd 'for f in deleteMailsBody mailMoveBody sendMailBody saveDraftBody; do grep -q "class-validator" libs/src/mail/types/$f.dto.ts || exit 1; done'` exit 0
i18n: keine
Doku: keine (intern)
Abhängt von: T11

### T14 — libs: Recipient-Typen + RecipientResponseDto  [ ]
Komponente: libs · Dateien: `libs/src/mail/constants/recipientType.ts`, `libs/src/groups/constants/groupSubtype.ts`, `libs/src/mail/types/recipientResponse.dto.ts` (neu)
Soll: NEW:30108–30114 (`RECIPIENT_TYPE = {USER:'user',GROUP:'group',ALIAS:'alias',SHARED:'shared'}`) · NEW:30175–30182 (`GROUP_SUBTYPE = {PARENTS:'parents',PARENTS_CLASS:'parentsClass',MAILLIST:'maillist',CLASS:'class',PROJECT:'project'}`) · NEW:42329–42345 (`RecipientResponseDto`: `type`/`label`/`email`)
Änderung: Zwei const-Objekte + derived Types; `RecipientResponseDto` mit `@ApiProperty`. **Prüfen, ob `groupSubtype` im Fork schon existiert** (`grep -rn "GROUP_SUBTYPE" libs/`) — falls ja, nur fehlende Werte additiv ergänzen, keine neue Datei.
Verify: `LIBS_TSC` (R1) exit 0; `iter.sh cmd 'for k in USER GROUP ALIAS SHARED; do grep -q "$k:" libs/src/mail/constants/recipientType.ts || exit 1; done'` exit 0; `iter.sh cmd 'for k in PARENTS PARENTS_CLASS MAILLIST CLASS PROJECT; do grep -rq "$k:" libs/src/groups/constants/groupSubtype.ts || exit 1; done'` exit 0
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T15 — BE: stripHostScheme + ImapConfigService + ImapClientFactory  [ ]
Komponente: apps/api · Dateien: `libs/src/common/utils/stripHostScheme.ts` (neu), `apps/api/src/mails/imap-config.service.ts` (neu), `apps/api/src/mails/imap-client.factory.ts` (neu), `apps/api/src/mails/mails.module.ts`
Soll: NEW:33994 (`stripHostScheme` = `replace(/^https?:\/\//,'')`) · NEW:33923–33967 (`ImapConfigService`: liest `MAIL_IMAP_HOST`/`MAIL_IMAP_PORT`/`MAIL_TLS_REJECT_UNAUTHORIZED`, `secure = port === MAIL_DEFAULT_PORTS.IMAP_SSL`, `@OnEvent(APPCONFIG_UPDATED-mail)` auf `refreshConfig`, `onModuleInit`) · NEW:34032–34099 (`ImapClientFactory`: `create`/`createWithoutCompression` mit `ImapFlow`, `connectionTimeout` aus Env `EDUI_MAIL_IMAP_TIMEOUT` mit Fallback `MAIL_IDLE_CONFIG.DEFAULT_CONNECTION_TIMEOUT`, `static cleanup(client)` mit 3000 ms Logout-Race)
Änderung: Beide Provider anlegen und in `mails.module.ts` registrieren. **Env-Key als Konstante**, nicht als Magic-String. Der bestehende `MailIdleService` bleibt unangetastet (Refactor auf die Factory ist NICHT Teil dieses Tasks).
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=imap-client'` grün (gemockter `ConfigService`: Default-Timeout ohne Env, geparster Wert mit Env, NaN → Default; `create` übergibt host/port/secure/tls.rejectUnauthorized)
i18n: keine
Doku: keine (intern)
Abhängt von: T10, T11

### T16 — BE: MailImapService Teil 1 — Gerüst + Helfer + Lesen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mail-imap.service.ts` (neu), `apps/api/src/mails/mails.module.ts`
Soll: NEW:33007–33234 — `constructor(imapConfigService, imapClientFactory)`, `withImapClient` (33014), `withMailboxImapClient` (33017), `runWithImapClient` (33020), `validateConfig` (33042), `flagsToStatus` (33048), `statusToFlagUpdates` (33057), `collectAttachmentsFromStructure` (33074), `streamToBuffer` (33100), `resolveMailDate` (33110, **neu in 2.1.0**), `toAddressDto` (33113), `toAddressDtoArray` (33118), `flattenAddressValues` (33125), `toTimestamp` (33133, **neu**), `listMailboxes` (33202)
Änderung: Service anlegen, in `mails.module.ts` als Provider registrieren. **`bodyStructureHasAttachment` NICHT portieren** (in 2.1.0 entfallen). Fehler über `CustomHttpException` + `MailsErrorMessages` (T39 liefert die neuen Keys; die in diesem Task benötigten Keys mit anlegen).
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mail-imap'` grün (gemockte imapflow-Connection: `listMailboxes` liefert Pfad/SpecialUse-Baum; `flagsToStatus`/`statusToFlagUpdates` round-trip; `resolveMailDate` bevorzugt envelope-Datum, fällt auf internalDate zurück)
i18n: keine
Doku: keine (intern)
Abhängt von: T12, T15

### T17 — BE: MailImapService Teil 2 — Liste, Sortierung, Suche  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mail-imap.service.ts`
Soll: NEW:33139 `serverSupportsSort` · 33142 `toSortSearchAtom` (**neu in 2.1.0**) · 33152 `sortByArrivalDescending` (**neu**, ersetzt `sortByDateDescending`) · 33188 `getDateOrderedUids` (**neu**) · 33235 `getMailsByFolder(emailAddress,password,folder,page,limit,unreadOnly)` · 33421 `searchMails(…,query,folder,page,limit,unreadOnly)`
Änderung: Sortier-/Paginier-Pfad **1:1 aus 2.1.0** (SORT-Capability-Erkennung, Fallback über `getDateOrderedUids`). Clamping (`page>=1`, `limit<=MAX_PAGE_SIZE`, `query.slice(0,MAX_SEARCH_QUERY_LENGTH)`) liegt in 2.1.0 **im Controller** (NEW:27790–27800) — hier nicht duplizieren.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mail-imap'` grün (Mock mit/ohne SORT-Capability liefert dieselbe Reihenfolge; `unreadOnly` setzt `unseen`-Kriterium; Paginierung schneidet korrekt)
i18n: keine
Doku: keine (intern)
Abhängt von: T16

### T18 — BE: MailImapService Teil 3 — Mutationen, Ordner, Detail, Anhang, Draft/Sent  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mail-imap.service.ts`
Soll: NEW:33280 `getMailDetail` · 33324 `deleteMails` · 33345 `moveMails` · 33365 `updateStatus` · 33391 `createFolder` · 33401 `deleteFolder` · 33411 `renameFolder` · 33481 `resolveSpecialFolder` · 33496 `resolveDraftsFolder` · 33499 `resolveSentFolder` · `saveDraft`/`appendToSent`/`downloadAttachment`/`createMailboxImapClient` (33500–33779) · `validateFolderName`/`quoteImapFolder` (im selben Block)
Änderung: Restliche Methoden ergänzen. MIME-Parsing über `mailparser` (T9-Dep). **`validateFolderName` + `quoteImapFolder` gehören in denselben Commit wie `createFolder`/`renameFolder`** — Ordnernamen dürfen nie ungeprüft in ein IMAP-Kommando.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mail-imap'` grün (`updateStatus` setzt/entfernt Flags; `moveMails` ruft `messageMove` mit Ziel; `createFolder` weist `"`/`\r\n`/`..` im Namen mit `InvalidFolderName` zurück; `downloadAttachment` liefert Buffer + contentType)
i18n: keine
Doku: keine (intern)
Abhängt von: T17

### T19 — BE: MailImapService Teil 4 — ACL, Delegates, Ordnerliste (Admin-Pfad)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mail-imap.service.ts`
Soll: NEW:33500–33779 — `parseAclResponse`, `execWithTimeout`, `drainImapResult`, `getUnseenMails`, `listMailboxFolders`, `getMailboxDelegates`, `validateDelegate`, `setMailboxDelegates`
Änderung: Die in Phase 2 (T7) bewusst zurückgestellten Delegates-/Folders-Methoden nachziehen. `validateDelegate` **im selben Commit** wie `setMailboxDelegates`. Damit werden auch die in T7 deferrten Controller-Routen (`mailcow-mailboxes/folders/:mailbox`, `…/delegates`) bedienbar — deren Verdrahtung passiert in T38.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mail-imap'` grün (`parseAclResponse` parst eine echte GETACL-Antwort; `validateDelegate` weist Nicht-Mailadressen mit `InvalidDelegateFormat` zurück; `execWithTimeout` bricht nach Timeout ab)
i18n: keine
Doku: keine (intern)
Abhängt von: T18

### T20 — BE: MailSmtpService  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mail-smtp.service.ts` (neu), `apps/api/src/mails/mails.module.ts`
Soll: NEW:34149–34289 — `constructor(appConfigService)`, `onModuleInit` (34157), `updateSmtpConfig` (34160, liest `MAIL_SMTP_HOST` via `stripHostScheme`, `MAIL_SMTP_PORT` mit Fallback `MAIL_DEFAULT_PORTS.SMTP_SUBMISSION`, `MAIL_TLS_REJECT_UNAUTHORIZED`), `createTransporter` (34175), `toAddressFields` (34194), `buildMailOptions` (34197), `buildMimeMessage` (34242), `sendMail` (34248)
Änderung: Service über `nodemailer` (T9) anlegen, in `mails.module.ts` registrieren. `@OnEvent(APPCONFIG_UPDATED-mail)` wie beim ImapConfigService.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mail-smtp'` grün (gemockter Transport: Envelope enthält from/to/cc/bcc/subject/attachments; Port 465 → `secure:true`; fehlender Host → `SmtpConnectionFailed`)
i18n: keine
Doku: keine (intern)
Abhängt von: T13, T15

### T21 — BE: MailRequestSizeGuard + Payload-Exception + estimateMailWireSize + ExceptionFilter  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/guards/mail-request-size.guard.ts` (neu), `apps/api/src/mails/errors/MailTotalSizeExceededException.ts` (neu), `libs/src/mail/utils/estimateMailWireSize.ts` (neu), `apps/api/src/mails/filters/mail-attachment-payload-too-large.filter.ts` (neu)
Soll: NEW:42470–42480 (`MailRequestSizeGuard`: `Number(request.headers['content-length'] ?? 0)`, `Number.isFinite && > MAIL_FIELD_LIMITS.TOTAL_WIRE_MAX_BYTES` → `MailTotalSizeExceededException`) · NEW:42434–42439 (`MailTotalSizeExceededException extends PayloadTooLargeException`, Message `'Mail exceeds the maximum allowed total size'`) · NEW:29088 (`estimateMailWireSize`) · NEW:42396–42425 (`MailAttachmentPayloadTooLargeFilter`, `@Catch(PayloadTooLargeException, MulterError)`, `resolveErrorTypeAndLimit` → `mail_total`/`mail_field`/`file_upload`)
Änderung: Alle vier Bausteine 1:1. **Die Schwelle ist das Literal aus T11 — kein Env-Key, kein ConfigService** (Header-Fakt 1). Verdrahtung an `outbox`/`drafts` erfolgt in T37.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mail-request-size'` grün (`content-length` 20_971_521 → `PayloadTooLargeException`; 20_971_520 → pass; fehlender Header → pass; `NaN` → pass)
i18n: keine
Doku: keine (intern)
Abhängt von: T11

### T22 — libs: Sieve-/Auto-Reply-/Forward-/Filter-Konstanten  [ ]
Komponente: libs · Dateien: `libs/src/mail/constants/mailAutoReplyDefaults.ts`, `mailAutoReplySenderScopes.ts`, `mailForwardDefaults.ts`, `mailFilterDefaults.ts`, `mailFilterActions.ts`, `mailFilterFields.ts`, `mailFilterTests.ts`, `mailFilterMatch.ts`, `mailFilterFieldTests.ts`, `sieveScript.ts` (alle neu)
Soll: NEW:35645–35654 `MAIL_AUTO_REPLY_DEFAULTS` (REPLY_INTERVAL_DAYS_DEFAULT 1 / _MIN 1 / _MAX 365, NAME_MAX_LENGTH 100, SUBJECT_MAX_LENGTH 255, MESSAGE_MAX_LENGTH 4000, MAX_PRESETS_PER_USER 20, IMPORTED_PRESET_NAME_KEY `'mail.autoReply.importedName'`) · NEW:35682–35686 `MAIL_AUTO_REPLY_SENDER_SCOPES` (all/internal/external) · NEW:35714–35716 `MAIL_FORWARD_DEFAULTS` (`MAX_FORWARD_TARGETS: 4`) · NEW:35744–35750 `MAIL_FILTER_DEFAULTS` (MAX_RULES_PER_USER 50, MAX_CONDITIONS_PER_RULE 10, MAX_ACTIONS_PER_RULE 10, MAX_VALUE_LENGTH 1024, MAX_NAME_LENGTH 128) · NEW:35778–35785 `MAIL_FILTER_ACTIONS` (fileinto/redirect/redirectCopy/discard/addflag/setflag) · NEW:37718–37724 `MAIL_FILTER_FIELDS` (from/to/cc/subject/size) · NEW:38030–38036 `MAIL_FILTER_TESTS` (contains/is/matches/over/under) · NEW:37752–37755 `MAIL_FILTER_MATCH` (all/any) · NEW:42194–42202 `MAIL_FILTER_FIELD_TESTS` + `isFilterTestValidForField` (Text-Felder → contains/is/matches, `size` → over/under) · NEW:37018–37028 `SIEVE_SCRIPT` (ACTIVE_SCRIPT_NAME `'edulution'`, AUTO_REPLY/FORWARD/FILTERS_BLOCK_BEGIN|END, ZONE_UTC `'+0000'`)
Änderung: 10 `as const`-Module feldgenau. `SIEVE_SCRIPT.ACTIVE_SCRIPT_NAME` bleibt **`'edulution'`** (Wert ist Wire-Format gegenüber Dovecot, kein Branding — im Rebrand nicht ändern, sonst verwaisen bestehende Skripte). `isFilterTestValidForField` als benannter Export neben dem Default.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mailFilterFieldTests'` grün (size+contains → false, size+over → true, subject+matches → true, unbekanntes Feld → false) — **die Spec gehört nach `apps/api/src/mails/mailFilterFieldTests.spec.ts`, nicht nach `libs/`**: `libs/**/*.spec.ts` wird von keinem Runner erfasst (api-Jest hat `rootDir=apps/api`, Vitest `include=apps/frontend/src`; `PORT-2.1.0-MASTER.md:67` F1), der Verify liefe sonst gegen 0 Treffer; Fork-Präzedenz ist `apps/api/src/mails/mailcowMailboxValidation.spec.ts`. Zusätzlich `LIBS_TSC` (R1) exit 0
i18n: keine (der Key-String `mail.autoReply.importedName` wird in T39 übersetzt)
Doku: keine (intern)
Abhängt von: —

### T23 — libs: Sieve-DTOs (Auto-Reply / Forward / Filter)  [ ]
Komponente: libs · Dateien: `libs/src/mail/types/autoReplyPresetBody.dto.ts`, `autoReplyPresetResponse.dto.ts`, `setActiveAutoReplyBody.dto.ts`, `forwardConfigBody.dto.ts`, `forwardConfigResponse.dto.ts`, `filterConditionBody.dto.ts`, `filterActionBody.dto.ts`, `filterRuleBody.dto.ts`, `filterConfigBody.dto.ts`, `filterConfigResponse.dto.ts`, `libs/src/mail/validators/enabledFilterRuleIsRenderable.validator.ts` (alle neu)
Soll: NEW:41537–41641 `AutoReplyPresetBodyDto` (name IsString+IsNotEmpty+MaxLength(NAME_MAX_LENGTH); subject IsOptional+MaxLength(SUBJECT_MAX_LENGTH); message IsString+IsNotEmpty+MaxLength(MESSAGE_MAX_LENGTH); replyIntervalDays IsInt+Min/Max; startDate/endDate IsOptional+IsISO8601; addresses IsArray+IsEmail(each)+MaxLength(MAIL_ADDRESS_MAX_LENGTH,each); discardIncoming IsBoolean; activeWeekdays IsArray+IsInt(each)+Min(0)+Max(6); dailyStartTime/dailyEndTime IsOptional+Matches(`/^([01]\d|2[0-3]):[0-5]\d$/`); senderScope IsIn(senderScopes)) · NEW:41701 `AutoReplyPresetResponseDto` · NEW:41807–41819 `SetActiveAutoReplyBodyDto` (`presetId` IsOptional+IsString, nullable) · NEW:41853–41946 `ForwardConfigBodyDto` (targets IsArray+ArrayMaxSize(MAX_FORWARD_TARGETS)+IsEmail(each); keepCopy/enabled IsBoolean; Datums-/Zeit-/Weekday-Felder wie oben) · NEW:41948 `ForwardConfigResponseDto` · NEW:42041–42060 `EnabledFilterRuleIsRenderableConstraint` · NEW:42062–42160 `FilterConditionBodyDto`/`FilterActionBodyDto`/`FilterRuleBodyDto`/`FilterConfigBodyDto` · NEW:42232 `FilterConfigResponseDto`
Änderung: DTOs feldgenau inkl. **aller** Validatoren; Grenzwerte ausschließlich aus den T22-Konstanten. `EnabledFilterRuleIsRenderableConstraint` (`@ValidatorConstraint({name:'enabledFilterRuleIsRenderable'})`) prüft für `enabled === true`: ≥1 Condition, ≥1 Action, jede Condition `isFilterTestValidForField(field,test)` **und** nicht-leerer `value`, jede Action mit Wert-Pflicht (fileinto/redirect/redirectCopy/addflag/setflag) nicht leer. `TIME_OF_DAY_REGEX` einmal in einer geteilten Konstante, nicht dupliziert.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=filterRuleValidation'` grün (Payloads durch eine echte `ValidationPipe`: gültige Regel akzeptiert; `enabled:true` ohne Conditions abgelehnt; `size`+`contains` abgelehnt; leerer `fileinto`-Wert abgelehnt; `enabled:false` mit leeren Arrays **akzeptiert**; 5 Forward-Targets abgelehnt)
i18n: keine
Doku: keine (intern)
Abhängt von: T22

### T24 — BE: ManageSieve-Protokollschicht + ManageSieveError  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/manageSieveProtocol.ts` (neu), `apps/api/src/mails/errors/ManageSieveError.ts` (neu)
Soll: NEW:36545–36657 — `quoteString` (36552), `encodePlainAuth` (36554, `base64(NUL+user+NUL+pass)`), `buildLiteralCommand` (36556, `{len+}` + CRLF + Body), `parseResponse` (36561, Statuszeile OK/NO/BYE, Literal-Suffix `{n+}`, Response-Code in Klammern), `parseCapabilities` (36619), `parseScriptList` (36650) · NEW:36684–36691 `ManageSieveError extends Error` mit `kind` (`'auth' | 'connection' | …`)
Änderung: Reine Funktionsmodule ohne Nest-Abhängigkeit, damit sie isoliert testbar sind. Regexe 1:1 (`LITERAL_SUFFIX_REGEX`, `STATUS_REGEX`, `QUOTED_TOKEN_REGEX`), `unescapeQuoted`. **`quoteString` escapt Backslash + Quote — jedes Skript-/Namensargument geht durch diese Funktion**, nie roh in ein Kommando.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=manageSieveProtocol'` grün (Buffer mit `OK`, mit Literal-Antwort, mit unvollständigem Literal → `null`; `parseCapabilities` liest IMPLEMENTATION/SASL/SIEVE/STARTTLS/VERSION; `parseScriptList` erkennt `ACTIVE`; `quoteString('a"b\\c')` → `"a\"b\\\\c"`; `encodePlainAuth` liefert erwartetes Base64)
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T25 — BE: ManageSieveClient (eigener TCP/TLS-Client, kein npm-Paket)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/manageSieveClient.ts` (neu)
Soll: NEW:36294–36506 — `constructor(options)` (36306), `connectionTimeout` (36309, Default 10000), `commandTimeout` (36312, Default 30000), `getCapabilities`/`supportsExtension` (36315/36318), `connect` (36321), `authenticate` (36332, `AUTHENTICATE "PLAIN" "<b64>"`), `listScripts` (36341), `getScript` (36346), `checkScript` (36354), `putScript` (36358), `setActive` (36362), `deleteScript` (36366), `logout` (36373), `destroy` (36384), `assertOk` (36397), `openSocket` (36402, `net`), `startTls` (36420, `tls`), `attach` (36454), `onData` (36460), `tryDeliver` (36464), `failWaiter` (36478), `readResponse` (36486), `sendRaw` (36497)
Änderung: **Kein npm-Paket verwenden** — 2.1.0 implementiert ManageSieve (RFC 5804) selbst über `net`/`tls`; genau das nachbauen. Alle Skript-/Namensargumente über `quoteString` bzw. `buildLiteralCommand` (T24). CRLF-Konstante, Timeouts als Konstanten. Fehler als `ManageSieveError` mit `kind`.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=manageSieveClient'` grün (Fake-Socket: Greeting → Capabilities gesetzt; `NO`-Antwort → `ManageSieveError`; `putScript` sendet Literal mit korrekter Byte-Länge bei Umlauten; `getScript` liefert Literal-Inhalt; Timeout ohne Antwort → Reject)
i18n: keine
Doku: keine (intern)
Abhängt von: T24

### T26 — BE: SieveConfigService + SieveClientFactory  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/sieve-config.service.ts` (neu), `apps/api/src/mails/sieve-client.factory.ts` (neu), `apps/api/src/mails/mails.module.ts`
Soll: NEW:36151–36194 (`SieveConfigService`: `host = stripHostScheme(MAIL_MANAGESIEVE_HOST) || stripHostScheme(MAIL_IMAP_HOST)`, `port = MAIL_MANAGESIEVE_PORT || MAIL_DEFAULT_PORTS.MANAGESIEVE`, `rejectUnauthorized = !!MAIL_TLS_REJECT_UNAUTHORIZED`; `onModuleInit` + `@OnEvent(APPCONFIG_UPDATED-mail)`; `getConfig()`) · NEW:36229–36258 (`SieveClientFactory`: Timeout aus Env `EDUI_MAIL_SIEVE_TIMEOUT`, Default 10000, `create()` → `new ManageSieveClient({host,port,rejectUnauthorized,connectionTimeoutMs})`)
Änderung: Beide Provider anlegen + in `mails.module.ts` registrieren. **Der IMAP-Host-Fallback ist Teil des Kontrakts** (leerer ManageSieve-Host darf nicht zu leerem Host führen). Env-Key als Konstante.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=sieve-config'` grün (nur IMAP-Host gesetzt → Sieve nutzt IMAP-Host + Port 4190; ManageSieve-Host gesetzt → gewinnt; `https://host` → Schema gestrippt; Env-Timeout wird geparst, NaN → 10000)
i18n: keine
Doku: keine (intern)
Abhängt von: T25, T41

### T27 — BE: sieveScriptComposer (**inkl. `escapeSieveQuoted`**) + Auto-Reply-Builder/-Parser  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/sieve/sieveScriptComposer.ts` (neu), `apps/api/src/mails/sieve/buildAutoReplyScript.ts` (neu), `apps/api/src/mails/sieve/parseAutoReplyScript.ts` (neu)
Soll: NEW:37060–37223 — **`escapeSieveQuoted` (37060–37065: `\\`→`\\\\`, `"`→`\"`, `[\r\n]+`→Leerzeichen, `trim()`)**, `normalizeLineEndings` (37066), `toSieveTime` (37074), `sanitizeWeekdays` (37085), `buildGuardComponents` (37087), `composeGuard` (37120), `buildGuard` (37130), `usesDateExtension` (37132), `extractRequires` (37139), `stripDelimitedBlock` (37157), `extractDelimitedBlock` (37162), `isExtensionUsed` (37173), `composeManagedScript` (37188) · NEW:36718–36994 `buildAutoReplyScript` (`toSieveMultilineString` 36723 mit Dot-Stuffing, `stripVacationStatements` 36764, `stripVacationConstructs` 36891, `stripSogoSubjectCapture` 36922, `buildVacationAction` 36923, `sanitizeOrgDomains` 36940, `buildSenderScopeComponent` 36944, `buildScopedGuard` 36957, `buildManagedBlock` 36965, `requiredExtensionsFor` 36973, `buildAutoReplyScript` 36983) · NEW:37253–37353 `parseAutoReplyScript`
Änderung: **`escapeSieveQuoted` MUSS in diesem Commit entstehen — vor jedem Script-Builder.** Kein Builder darf einen Nutzerwert unescaped in einen Sieve-String schreiben; das gilt für Subject, Adressen und Domains. `composeManagedScript` hält die Blockreihenfolge (`MANAGED_BLOCK_ORDER`) und mergt `require`-Extensions nur, wenn sie im Skript tatsächlich vorkommen (`isExtensionUsed`) — sonst lehnt Dovecot das Skript ab. Fremde (nicht von uns verwaltete) Skriptteile bleiben erhalten.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=sieveScriptComposer'` grün — **Injection-Tests im selben Commit**: Subject `a"; discard; #` erzeugt **keinen** zusätzlichen Sieve-Befehl (Quote escaped), Message mit `\r\n.` wird dot-gestufft, Adresse mit `\n` wird zu Leerzeichen; Round-Trip `buildAutoReplyScript` → `parseAutoReplyScript` erhält subject/message/interval/Datumsfenster; ein bestehender fremder Block überlebt Build+Strip
i18n: keine
Doku: keine (intern)
Abhängt von: T22

### T28 — BE: Forward-Builder/-Parser (**inkl. Target-Sanitizing**)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/sieve/buildForwardScript.ts` (neu), `apps/api/src/mails/sieve/parseForwardScript.ts` (neu)
Soll: NEW:37380–37425 — `stripForwardBlock` (37380), **`sanitizeTargets` (37381–37393)**, `buildRedirectActions` (37394, `redirect [:copy ]"<target>";`), `buildManagedBlock` (37395), `requiredExtensionsFor` (37401), `buildForwardScript` (37411) · NEW:37450–37567 `parseForwardScript` (`unescapeSieveQuoted` 37450, `skipQuotedString` 37451, `skipTextBlock` 37458, `readRedirectStatement` 37472, `parseForwardScript` 37491)
Änderung: Builder + Parser in **einem** Commit; `sanitizeTargets` (Escaping/Filterung der Zieladressen) liegt im selben Task wie `buildRedirectActions` — nie nachgelagert. `:copy` nur bei `keepCopy`, `copy` dann als require-Extension. Zeitfenster über `buildGuard` (T27).
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=buildForwardScript'` grün (Ziel `x@y.tld"; discard; #` erzeugt keinen Zusatzbefehl; `keepCopy` → `:copy` + `require ["copy"]`; leere Targets → leerer Block; Round-Trip mit `parseForwardScript`)
i18n: keine
Doku: keine (intern)
Abhängt von: T27

### T29 — BE: Filter-Builder/-Parser (**inkl. `sanitizeRuleName` + `escapeSieveQuoted` an jeder Stelle**)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/sieve/buildFiltersScript.ts` (neu), `apps/api/src/mails/sieve/parseFiltersScript.ts` (neu)
Soll: NEW:37596–37694 — `HEADER_NAME_BY_FIELD` (37597), `ADDRESS_FIELDS` (37603), `sanitizeSizeValue` (37604, `/^(\d+)\s*([KMG])?$/i`, sonst `'0'`), `buildConditionTest` (37611, **`escapeSieveQuoted(condition.value)`**), `buildMatch` (37623, `allof`/`anyof`), `buildAction` (37631, **`escapeSieveQuoted(action.value)`** für fileinto/redirect/redirect :copy/addflag/setflag, `discard;` als Default), `isRenderableRule` (37649), **`sanitizeRuleName` (37650: `replace(/[\r\n[\]]/g,' ').trim()`)**, `buildRuleBlock` (37651, `# rule:[<name>]`), `buildManagedBlock` (37661), `requiredExtensionsFor` (37665, fileinto/copy/imap4flags), `buildFiltersScript` (37680) · NEW:37798–38006 `parseFiltersScript` (`unescapeSieveQuoted` 37798, `skipQuoted` 37799, `maskQuotedStrings` 37806, `extractRawRules` 37829, `parseConditions` 37890, `parseFiltersScript` 37972)
Änderung: **`sanitizeRuleName` und `escapeSieveQuoted` sind Bestandteil DIESES Tasks, nicht eines Folge-Tasks** — ein Regelname darf keine `]`/`\r`/`\n` enthalten (sonst bricht er den `# rule:[…]`-Kommentar auf und der Rest der Zeile wird Sieve-Code), ein Condition-/Action-Wert nie unescaped in einen Quoted-String. `size` läuft über `sanitizeSizeValue` statt über Quoting (numerisch). Parser im selben Commit, damit der Import bestehender Skripte gegen den Builder getestet wird.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=buildFiltersScript'` grün — **Injection-Suite im selben Commit**: Regelname `boss]\nif true { discard; }\n# rule:[x` erzeugt genau **einen** `if`-Block; `fileinto`-Wert `A"; discard; #` bleibt ein Ordnername; `size`-Wert `5M; discard;` → `0`; `anyof`/`allof` korrekt; `requiredExtensionsFor` liefert nur tatsächlich benutzte Extensions; Round-Trip build→parse erhält Regeln inkl. `stop`
i18n: keine
Doku: keine (intern)
Abhängt von: T27

### T30 — BE: Sieve-Mongoose-Schemas (6) + SharedMailbox-Normalisierung  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/auto-reply-preset.schema.ts`, `mail-forward-config.schema.ts`, `mail-filter-config.schema.ts`, `shared-mailbox.schema.ts` (alle neu), `apps/api/src/mails/mails.module.ts`
Soll: NEW:35819–35901 `AutoReplyPreset` (ownerEmail required+index+`set: normalizeOwnerEmail`; name required; subject default `''`; message required; replyIntervalDays required Number; startDate/endDate Date default null; addresses [String] default []; discardIncoming default false; activeWeekdays [Number] default []; dailyStartTime/dailyEndTime String default null; senderScope String enum default `all`; isActive default false; `@Schema({timestamps:true})`; **Partial-Unique-Index `{ownerEmail:1,isActive:1}` mit `partialFilterExpression:{isActive:true}`** — NEW:35901) · NEW:35933–35985 `MailForwardConfig` (ownerEmail required+unique+index+set; targets [String]; keepCopy/enabled default false; Datums-/Weekday-/Zeitfelder) · NEW:36016–36114 `FilterCondition`/`FilterAction`/`FilterRule`/`MailFilterConfig` (Sub-Schemas mit `@Schema({_id:false})`; `FilterRule.match` default `'all'`; `invalid` default false; `MailFilterConfig.ownerEmail` required+unique+index+set) · NEW:32887 `normalizeMailAddress = value.trim().toLowerCase()` + NEW:32891–32924 `SharedMailbox` (mailbox unique+set, password, encryptKey, delegates [String] mit Array-Normalisierung, sharedFolders)
Änderung: Schemas anlegen und in `MailsModule.imports` via `MongooseModule.forFeature` registrieren (NEW:27621–27627). `normalizeMailAddress` ist der **einzige** Normalisierungspunkt für Mailadressen — von den drei Sieve-Schemas importiert. **Keine appConfig-Migration nötig** (neue Collections, keine Feldänderung an bestehenden Dokumenten) — das explizit im Commit-Text festhalten, damit es nicht mit T42 vermischt wird.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=auto-reply-preset.schema'` grün (Setter lowercased+trimmt `  Jane@School.TLD  `; Defaults greifen; Index-Definition enthält `partialFilterExpression`); `iter.sh test:api` gesamt grün
i18n: keine
Doku: keine (intern)
Abhängt von: T22

### T31 — BE: MailSieveService Teil 1 — Auto-Reply (eigenes Postfach)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mail-sieve.service.ts` (neu), `apps/api/src/mails/mails.module.ts`
Soll: NEW:35136–35251 + 35501–35617 — `constructor(sieveConfigService, sieveClientFactory, mailsService, autoReplyPresetModel, forwardConfigModel, filterConfigModel)` (35143), `getOrganizationDomains` (35151), `getPresets` (35163), `createPreset` (35169), `updatePreset` (35175), `deletePreset` (35181), `activatePreset` (35187), `deactivate` (35193), `buildOwnTarget` (35199), `getPresetsForTarget` (35202), `createPresetForOwner` (35210), `updatePresetForTarget` (35218), `deletePresetForTarget` (35228), `activatePresetForTarget` (35237), `deactivateForTarget` (35246), `listPresets` (35501), `findOwnedPreset` (35508), `runWithSieveClient` (35521), `readActiveScript` (35545), `writeManagedScript` (35553), `applyActiveScript` (35566), `clearActiveScript` (35574), `tryImportFromSieve` (35580) · Mapper `toPersistedFields`/`toPresetDto`/`toRenderConfig` (35041–35084)
Änderung: Service anlegen + registrieren. **`runWithSieveClient` ist der einzige Verbindungspfad**: ohne Host/Port → `ManageSieveNotConfigured` (503); Auth-Fehler → `ManageSieveAuthFailed`, sonst `ManageSieveConnectionFailed`, beide 502; `finally { await client.logout() }`. `writeManagedScript` ruft **immer** `checkScript` vor `putScript` und deaktiviert+löscht bei leerem Inhalt. `MAX_PRESETS_PER_USER` erzwingen (`MaxAutoReplyPresetsExceeded`), unbekannte Preset-Id → `AutoReplyPresetNotFound`.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mail-sieve.service'` grün (gemockter `SieveClientFactory`: fehlende Config → 503; 21. Preset → `MaxAutoReplyPresetsExceeded`; `activatePreset` deaktiviert das vorherige (Partial-Index!) und schreibt genau ein Skript; ungültiges Skript (`checkScript` false) → 422 `InvalidAutoReplyScript`; `logout` läuft auch im Fehlerfall der Operation)
i18n: keine
Doku: keine (intern)
Abhängt von: T27, T30, T26

### T32 — BE: MailSieveService Teil 2 — Auto-Reply für geteilte Postfächer  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mail-sieve.service.ts`
Soll: NEW:35166 `getSharedPresets`, 35172 `createSharedPreset`, 35178 `updateSharedPreset`, 35184 `deleteSharedPreset`, 35190 `activateSharedPreset`, 35196 `deactivateShared` · Autorisierung liegt **nicht** hier, sondern in `MailsService.assertCanManageSharedMailbox` (NEW:30449–31310, T35) — der Controller ruft sie **vor** jedem Shared-Aufruf (NEW:27905–27935)
Änderung: Shared-Varianten ergänzen; sie arbeiten auf `{authcid: <mailbox>, authPassword: <shared password>}` statt auf dem eigenen Target. **Kein Shared-Endpunkt darf ohne vorherige `assertCanManageSharedMailbox`-Prüfung erreichbar sein** — das ist in 2.1.0 die einzige Zugriffskontrolle dieser Routen (`SharedMailboxAutoReplyAccessDenied`).
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mail-sieve.service'` grün (Shared-Preset wird unter `ownerEmail = normalisierte Mailbox` gespeichert, nicht unter dem Nutzer; Aktivierung schreibt in die Shared-Sieve-Session)
i18n: keine
Doku: keine (intern)
Abhängt von: T31

### T33 — BE: MailSieveService Teil 3 — Weiterleitung  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mail-sieve.service.ts`
Soll: NEW:35252–35350 — `getForwardConfig` (35252, importiert bei leerer DB aus dem Server-Skript), `setForwardConfig` (35260), `clearForwardConfig` (35302), `readForwardConfig` (35308), `applyForwardScript` (35314), `clearForwardScript` (35320), `tryImportForwardFromSieve` (35326)
Änderung: `setForwardConfig` **exakt** in dieser Reihenfolge: (1) `targets.length > MAX_FORWARD_TARGETS` → 422 `MaxForwardTargetsExceeded`; (2) Selbst-Weiterleitung gegen `owned = {ownerEmail, ...ownAddresses}` → 422 `SelfForwardNotAllowed` (**Mailschleifen-Schutz, nicht weglassen**); (3) `effectiveEnabled = enabled && targets.length > 0`; (4) Skript schreiben **oder** löschen; (5) `findOneAndUpdate` mit `upsert`. Die `ownAddresses` kommen vom Controller aus `MailsService.getUserAddresses`.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mail-sieve.service'` grün (5 Targets → 422; eigene Alias-Adresse als Ziel → 422; `enabled:true` mit leerer Zielliste → persistiert `enabled:false` und löscht den Block; Deaktivieren löscht den Forward-Block, lässt Auto-Reply-Block stehen)
i18n: keine
Doku: keine (intern)
Abhängt von: T28, T31

### T34 — BE: MailSieveService Teil 4 — Filterregeln + Ordner-Reconcile  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mail-sieve.service.ts`
Soll: NEW:35351–35500 — `getFilters` (35351), `setFilters` (35360), `clearFilters` (35386), `reconcileFilterFoldersForChange` (35392), `reconcileFilterFolders` (35436), `readFilterConfig` (35471), `persistFilterRules` (35477), `applyFilterRules` (35480), `tryImportFiltersFromSieve` (35486) · `REDIRECT_ACTION_TYPES` (35131), `ruleFileintoTargets` (35132), `toFilterRuleDto`/`toFilterConfigDto` (35115–35130)
Änderung: `setFilters`-Reihenfolge: (1) `rules.length > MAX_RULES_PER_USER` → 422 `MaxFilterRulesExceeded`; (2) je **aktiver** Regel: `redirect`/`redirectCopy` auf eine eigene Adresse → 422 `SelfFilterRedirectNotAllowed`; `fileinto` auf einen unbekannten Ordner → 422 `UnknownFilterFolder` (**nur** wenn die Ordnerliste nicht leer ist — der Controller liefert bei IMAP-Ausfall `[]`, dann keine Validierung, NEW:27949–27958); (3) Skript schreiben, (4) persistieren. `reconcileFilterFoldersForChange(old,new)` wird von den Ordner-Routen aufgerufen (T37) und markiert/verschiebt betroffene `fileinto`-Ziele.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mail-sieve.service'` grün (51 Regeln → 422; Redirect auf eigene Adresse → 422; `fileinto` auf unbekannten Ordner bei nicht-leerer Ordnerliste → 422, bei leerer Liste → OK; `reconcileFilterFoldersForChange(a,null)` markiert die Regel als `invalid`; `(a,b)` schreibt das Ziel um)
i18n: keine
Doku: keine (intern)
Abhängt von: T29, T31

### T35 — BE: MailsService-Delta 2.1.0 (Adressen, Shared-Autorisierung, Empfänger-Klassifikation)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mails.service.ts`
Soll: NEW:30449–31310 — **neu gegenüber 2.0.200:** `fetchMailcowList`, `getManageableSharedMailboxes`, `assertCanManageSharedMailbox`, `decryptStoredMailboxPassword`, `listActiveMailcowAliasDomains`, `getUserAddresses`, `getDeliverableLocalDirectory`, `static classifyRecipients`, `static filterDeliverableAddresses` (Methodenreihenfolge siehe Klassenkörper 30449 ff.)
Änderung: Die 9 Methoden ergänzen; bestehende Fork-Methoden (Sync-Jobs mit IDOR-Fix, Provider-Config mit AdminGuard, Mailcow-Admin) **nicht** anfassen. `assertCanManageSharedMailbox(userEmail, mailbox)` gibt die **normalisierte** Mailbox zurück und wirft sonst `SharedMailboxAutoReplyAccessDenied` — sie ist der Autorisierungs-Chokepoint für alle 6 Shared-Auto-Reply-Routen (T38). `getUserAddresses` liefert Primäradresse + aktive Mailcow-Aliase; `getMailcowDomains` bleibt die Quelle für `GET /mails/domains`.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mails.service'` grün (`assertCanManageSharedMailbox`: Delegat → normalisierte Adresse; Fremder → 403; unbekannte Mailbox → 403; `getUserAddresses` enthält Primäradresse + Alias, keine Duplikate, alles lowercase)
i18n: keine
Doku: keine (intern)
Abhängt von: T10

### T36 — BE: RecipientsService 2.1.0 (Suche, Cache, Favoriten)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/recipients.service.ts` (neu), `apps/api/src/mails/mails.module.ts`
Soll: NEW:38100–38361 — `constructor(cacheManager, sharedMailboxModel, mailsService)` (38105), `searchRecipients` (38110), `invalidateRecipientsCache` (38134), `scheduledRefresh` (38140), `refreshRecipientsCache` (38145), `getRecipients` (38165), `aggregate` (38174), `collectParentChildLinks` (38204, **neu**), `resolveChildFromAdminParentsGroup` (38254, **neu**), `collectUsers` (38268, jetzt **static(users)**), `collectMaillistGroups` (38285, jetzt **static(groups)**), `getFavoriteRecipientsForUser` (38290, **neu**), `isMailEligibleGroup` (38298, **neu**: `attributes.mail[0]` gesetzt **und** `sophomorixMailList[0] === 'TRUE'`), `groupToRecipient` (38303, **neu**), `extractClassFromParentGroupName` (38321, **neu**), `collectAliases` (38327), `collectSharedMailboxes` (38340)
Änderung: Service anlegen + registrieren. `searchRecipients` respektiert `RECIPIENT_SEARCH.MIN_QUERY_LENGTH`/`MAX_RESULTS` (T11) und matcht zusätzlich über `childOf` (`matchedChild`). **Eltern-Kind-Teil (`collectParentChildLinks`, `resolveChildFromAdminParentsGroup`, `extractClassFromParentGroupName`) hängt an `parseParentGroupName` aus `p3-parent-child-pairing`** — existiert die Funktion im Fork nicht (`grep -rn "parseParentGroupName" libs/ apps/`), dann diesen Teil **explizit auslassen** und im Commit-Text als offene Kopplung vermerken; die restlichen Methoden sind davon unabhängig. Mailcow-Ausfälle degradieren (Logger.warn + leere Liste), sie werfen nicht.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=recipients.service'` grün (Query kürzer als MIN → `[]`; >50 Treffer werden gekappt; `isMailEligibleGroup` ohne `sophomorixMailList` → false; `getFavoriteRecipientsForUser` liest den User-Groups-Cache und filtert; Mailcow-Alias-Fehler → Ergebnis ohne Aliase statt Exception)
i18n: keine
Doku: keine (intern)
Abhängt von: T14, T35

### T37 — BE: IMAP-Client-Routen auf MailsController (Routen 1–14)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mails.controller.ts`, `apps/api/src/mails/mails.module.ts`
Soll: Decorator-Block NEW:28039–28277 + Handler NEW:27775–27852 — `GET ''` (28039), `GET mailboxes` (28049), `GET messages` (28059, Query `folder/page/limit/query/unreadOnly`, Clamping im Handler 27790–27800), `GET messages/:uid` (28094), `DELETE messages` (28108 + `UsePipes(MAILS_VALIDATION_PIPE)` 28112), `PATCH messages/destination` (28121), `PATCH messages/status` (28136), `POST mailboxes` (28151), `DELETE mailboxes/:path` (28164), `PATCH mailboxes` (28176), `GET messages/:uid/attachments/:partId` (28189), `POST outbox` (28210 + **`UseGuards(MailRequestSizeGuard)` 28222**), `POST drafts` (28237 + **Guard 28242**), `PUT drafts/:uid` (28257 + **Guard 28263**) · `MAIL_UPLOAD_LIMITS` (27749–27753) + `assertMailWithinTotalLimit` (27754–27759)
Änderung: 14 Routen ergänzen, Delegation an `MailImapService`/`MailSmtpService`/`MailsService`. **`MailRequestSizeGuard` an outbox + beide drafts-Routen — nicht vergessen, das ist die einzige Vorab-Bremse vor dem Multer-Buffering.** `assertMailWithinTotalLimit` zusätzlich im Handler. `deleteFolder`/`renameFolder` rufen **im selben Handler** `mailSieveService.reconcileFilterFoldersForChange` (NEW:27821–27830) — sonst zeigen Filterregeln auf tote Ordner. Klassen-Decorators (`@RequireAppAccess(APPS.MAIL)`, `@ApiBearerAuth`) bleiben; kein Handler ist `@Public`.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mails.controller'` grün (Clamping: `limit=9999` → 200, `page=0` → 1; `query` gesetzt → `searchMails` statt `getMailsByFolder`; `deleteFolder` ruft Reconcile mit `(path, null)`); `iter.sh cmd 'test $(grep -c "UseGuards(MailRequestSizeGuard)" apps/api/src/mails/mails.controller.ts) -eq 3'` exit 0 (**alle drei** Routen — die Import-Zeile matcht dieses Muster nicht, zwei von drei Guards fallen also durch); `iter.sh cmd 'npx nx build api'` „Successfully ran"
i18n: keine
Doku: keine (intern)
Abhängt von: T19, T20, T21, T34

### T38 — BE: Sieve-Routen auf MailsController (20 Routen) + Favoriten  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mails.controller.ts`
Soll: Decorator-Block NEW:**28369–28628** + Handler NEW:27874–27975 — `GET auto-reply` (28369) · `GET auto-reply/addresses` (28379) · `POST auto-reply` (28396, Pipe) · `PUT auto-reply/active` (28412, Pipe) · `PUT auto-reply/:id` (28429, Pipe) · `DELETE auto-reply/:id` (28448) · `GET auto-reply/mailboxes` (28464) · `GET auto-reply/shared/:mailbox` (28473) · `GET auto-reply/shared/:mailbox/addresses` (28484) · `POST auto-reply/shared/:mailbox` (28495, Pipe) · `PUT auto-reply/shared/:mailbox/active` (28513, Pipe) · `PUT auto-reply/shared/:mailbox/:id` (28531, Pipe) · `DELETE auto-reply/shared/:mailbox/:id` (28551) · `GET forward` (28568) · `PUT forward` (28578, **`UsePipes(strictTransformValidationPipe)` 28586**) · `DELETE forward` (28595) · `GET filters` (28605) · `PUT filters` (28615, **strictTransformValidationPipe** 28619) · `DELETE filters` (28628) · zusätzlich `GET recipients/favorites` (28768) · Hilfsmethode `getFolderPaths` (27949–27958, **kein** Route-Decorator)
Änderung: 20 Sieve-Routen + Favoriten-Route ergänzen; `MailSieveService` + `RecipientsService` in den Controller-Konstruktor (NEW:27760–27774). **Die 6 `shared/:mailbox`-Routen rufen ausnahmslos zuerst `mailsService.assertCanManageSharedMailbox(emailAddress, mailbox)` und arbeiten nur mit dem Rückgabewert weiter** (NEW:27905–27935) — der Param `:mailbox` darf nie ungeprüft an den Sieve-Service. `strictTransformValidationPipe` (NEW:18878–18884: `whitelist` + **`forbidNonWhitelisted`** + `disableErrorMessages` + `transform`) neu in `libs/src/common/pipes/` anlegen; er ist strenger als `MAILS_VALIDATION_PIPE` und gehört genau an forward/filters. `getFolderPaths` fängt IMAP-Fehler ab und liefert `[]` (degradiert, kein 500).
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mails.controller'` grün (jede Shared-Route ruft `assertCanManageSharedMailbox` genau einmal vor dem Sieve-Aufruf; `PUT forward` mit Fremdfeld im Body → 400 durch `forbidNonWhitelisted`; `GET filters` mit IMAP-Ausfall liefert Regeln ohne Ordner-Validierung); `iter.sh cmd 'npx nx build api'` Successfully ran
i18n: keine
Doku: keine (intern)
Abhängt von: T23, T37, T36, T32, T33

### T39 — BE: `GET /mails/domains` (Fork behält AdminGuard) + Mailcow-Admin-Restrouten  [?] entscheidung (D8)
Komponente: apps/api + apps/frontend · Dateien: `apps/api/src/mails/mails.controller.ts`, `apps/api/src/mails/mails.controller.spec.ts`, `apps/frontend/src/pages/Settings/AppConfig/mails/MailcowAdminPanel.tsx`, `apps/frontend/src/pages/Mail/useMailsStore.ts`
**`[?]` — nicht ohne D8 bauen.** `PORT-2.1.0-MASTER.md:234` (D8) hält offen, ob der Fork den `AdminGuard` behält (Empfehlung: ja, einziger Consumer ist das Admin-Panel) oder 2.1.0-treu aufweitet. Bis Kevin entscheidet, bleibt der Task liegen — `:121` warnt genau davor, dass ein autonomer Agent hier einen Guard zieht.
**Fork-Ist (verifiziert):** der Handler heißt `getMailcowDomains` (`mails.controller.ts:145`), der Pfad wird aus `MAIL_ENDPOINT_PATHS.MAILCOW_MAILBOXES`/`.DOMAINS` komponiert (`:143`) und delegiert an **`MailcowAdminService.getMailcowDomains()`** — nicht an `MailsService`. Rename auf `getMailDomains`, Delegation an `MailcowAdminService` **bleibt**.
Soll: NEW:28387–28394 (`GET mails/domains` → `mailsService.getMailcowDomains()`, **ohne `UseGuards`**) — ersetzt in 2.1.0 die 2.0.200-Route `GET mails/mailcow-mailboxes/domains` (dort mit AdminGuard) · NEW:28777–28839 (`GET mailcow-mailboxes/folders/:mailbox`, `GET mailcow-mailboxes/delegates`, `GET/POST mailcow-mailboxes/delegates/:mailbox`, `DELETE mailcow-mailboxes/:mailbox` — je mit `AdminGuard`)
Änderung: Fork-Route auf `GET /mails/domains` umstellen (Pfad aus `MAIL_ENDPOINT_PATHS.DOMAINS`) und **`@UseGuards(AdminGuard)` bewusst beibehalten** — Divergenz zu 2.1.0, weil die Domainliste im Fork ausschließlich das Admin-Panel speist und eine Auskunft über alle Maildomänen an jeden angemeldeten Schüler unnötig ist. FE-Consumer (Store-Action + Panel) auf den neuen Pfad nachziehen (**Contract-Sync**, Surgical-Regel gilt hier nicht). Die in T7 deferrten Delegates-/Folders-Routen mit `AdminGuard` ergänzen (Service-Seite kommt aus T19/T35) und `deleteMailcowMailboxes` um die 2.1.0-`cleanupSharedMailboxData`-Kopplung erweitern.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mails.controller'` grün (`getMailDomains` trägt `AdminGuard`; kein Handler mehr unter `mailcow-mailboxes/domains`); `iter.sh cmd 'grep -q getMailDomains apps/api/src/mails/mails.controller.spec.ts && ! grep -qE "^  getMailcowDomains\\(" apps/api/src/mails/mails.controller.ts'` exit 0 — **Anker auf die Handler-Deklaration am Zeilenanfang**, nicht auf den Namen: die Delegationszeile `return this.mailcowAdminService.getMailcowDomains();` (`:146`) **bleibt** laut T38 bestehen, ein ungeankertes `! grep -q "getMailcowDomains("` könnte also nie grün werden. **Schlägt heute fehl** (`mails.controller.ts:145` heißt noch `getMailcowDomains(`, `mails.controller.spec.ts:43` listet noch den alten Namen), greift also genau dann, wenn Route **und** Contract-Spec umbenannt sind; `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/useMailsStore.spec.ts'` grün (Store ruft `mails/domains`)
i18n: keine
Doku: siehe T40
Abhängt von: T35, T37

### T40 — Doku: ADR zu `GET /mails/domains` (Guard behalten oder aufweiten)  [?] entscheidung (D8)
**`[?]` — die ADR wird erst nach D8 geschrieben und hält fest, was entschieden wurde.** Fällt D8 auf „2.1.0-treu aufweiten", dreht sich Entscheidung und Konsequenz-Abschnitt um; der Titel `0002-mails-domains-admin-guard.md` passt für beide Ausgänge.
Komponente: docs · Dateien: `docs/adr/0002-mails-domains-admin-guard.md` (neu)
Soll: NEW:28387–28394 (2.1.0 ohne Guard) vs. 2.0.200:23664 ff. (`getMailcowDomains` mit `AdminGuard`) · Präzedenz-ADR `docs/adr/0001-active-mail-client-selector.md`
Änderung: ADR mit Status/Kontext/Entscheidung/Konsequenzen: (a) 2.1.0 hat den Guard beim Umbau `mailcow-mailboxes/domains` → `domains` **entfernt**; (b) der Fork behält ihn, weil die Route im Fork nur das Admin-Panel bedient und die Domainliste eine Organisationsinformation ist; (c) Konsequenz: sollte später ein Endnutzer-Feature (z. B. Absenderklassifikation im Compose-Dialog) die Domains brauchen, wird eine **zweite, bewusst öffentliche** Route mit reduzierter Antwort geschaffen — der Guard wird nicht nachträglich entfernt; (d) Aufwand beim Upstream-Abgleich: diese Route bei jedem Retarget prüfen.
Verify: `ls docs/adr/0002-mails-domains-admin-guard.md`; enthält Abschnitte Kontext/Entscheidung/Konsequenzen; Review-Gegencheck gegen T39-Diff
i18n: keine
Doku: ist die Doku
Abhängt von: T39

### T41 — libs+BE: appconfig-Mail-Key-Set 2.1.0 (URL→HOST-Split, ManageSieve, Tabellen-Keys)  [ ]
Komponente: libs + apps/api · Dateien: `libs/src/appconfig/constants/extendedOptionKeys.ts`, `libs/src/appconfig/constants/extendedOptions/mailGeneralExtendedOptions.ts`, `libs/src/appconfig/constants/extendedOptions/mailServerExtendedOptions.ts` (neu), `mailboxManagementExtendedOptions.ts` (neu), `mailExternalProvidersExtendedOptions.ts` (neu), `libs/src/appconfig/constants/defaultAppConfig.ts`, `apps/api/src/appconfig/initializeCollection.ts`
Soll: NEW:2371–2375 (`MAIL_IMAP_HOST`, `MAIL_IMAP_PORT`, `MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_TLS_REJECT_UNAUTHORIZED`) · NEW:2411–2415 (`MAIL_MAILBOX_TABLE`, `MAIL_SIGNATURE`, `MAIL_PROVIDER_CONFIG_TABLE`, `MAIL_MANAGESIEVE_HOST`, `MAIL_MANAGESIEVE_PORT`) · NEW:3925–3991 `MAIL_SERVER_EXTENDED_OPTIONS` (IMAP-Host `input` half · SMTP-Host `input` half · IMAP-Port `number` third default 993 · SMTP-Port `number` third default 587 · TLS-Reject `switch` third default false · **ManageSieve-Host `input` half (3967)** · **ManageSieve-Port `number` third default `MAIL_DEFAULT_PORTS.MANAGESIEVE` (3975/3979)** · Signatur `wysiwyg` full) · NEW:4054–4062 `MAILBOX_MANAGEMENT_EXTENDED_OPTIONS` (`MAIL_MAILBOX_TABLE`, `type: table`, `width: full`) · NEW:3632–3640 `MAIL_EXTERNAL_PROVIDERS_EXTENDED_OPTIONS` (`MAIL_PROVIDER_CONFIG_TABLE`, `type: table`)
Änderung: Key-Set angleichen: `MAIL_IMAP_URL`/`MAIL_IMAP_SECURE`/`MAIL_IMAP_TLS_REJECT_UNAUTHORIZED` **entfallen**, `MAIL_IMAP_HOST/PORT` + `MAIL_SMTP_HOST/PORT` + `MAIL_TLS_REJECT_UNAUTHORIZED` + `MAIL_SIGNATURE` + `MAIL_MANAGESIEVE_HOST/PORT` + die beiden Tabellen-Keys kommen dazu. **Header-Fakt 2: `MAIL_MAILBOX_TABLE`/`MAIL_PROVIDER_CONFIG_TABLE` existieren in 2.1.0 und werden portiert** — der zugehörige `ExtendedOptionField.table`-Renderer im FE ist nicht rekonstruierbar (nur das API-Bundle liegt un-minifiziert vor) und bleibt **Fork-Eigendesign**; existiert im Fork kein `table`-Feldtyp, werden die beiden Keys in diesem Task **ohne** Formulareintrag angelegt und der Eintrag folgt mit dem FE-Renderer. `MAIL_SOGO_THEME`/`MAIL_SOGO_THEME_UPDATE_CHECKER`/`ACTIVE_MAIL_CLIENT` bleiben unverändert (Fork-Divergenz).
Verify: `LIBS_TSC` (R1) exit 0; `iter.sh cmd 'test $(grep -cE "MAIL_IMAP_HOST|MAIL_SMTP_HOST|MAIL_MANAGESIEVE_HOST|MAIL_MANAGESIEVE_PORT|MAIL_TLS_REJECT_UNAUTHORIZED|MAIL_SIGNATURE" libs/src/appconfig/constants/extendedOptionKeys.ts) -eq 6'` exit 0; `iter.sh cmd '! grep -rq MAIL_IMAP_SECURE libs/ apps/'` exit 0 (**schlägt heute fehl**, solange der Key noch existiert); `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0; `iter.sh cmd 'npx nx build api'` „Successfully ran"
i18n: `appExtendedOptions.mailImapHostTitle|Description`, `mailSmtpHost*`, `mailImapPort*`, `mailSmtpPort*`, `mailTlsRejectUnauthorized*`, `mailManageSieveHostTitle|Description`, `mailManageSievePortTitle|Description`, `mailSignature*`, `mailboxManagementDescription`, `mailExternalProvidersDescription` — DE+EN+FR
Doku: Ops-Runbook-Zeile (Mail-appconfig-Keys inkl. ManageSieve 4190) DE+EN+FR
Abhängt von: T10

### T42 — BE: forward-only appConfig-Migration `014-split-mail-host` + schemaVersion++  [ ]
Komponente: apps/api + libs · Dateien: `apps/api/src/appconfig/migrations/migration014.ts` (neu, SPDX), `apps/api/src/appconfig/migrations/migration014.spec.ts` (neu, SPDX), `apps/api/src/appconfig/migrations/appConfigMigrationsList.ts`, `apps/api/src/appconfig/appconfig.schema.ts`, `libs/src/migration/constants/terminalSchemaVersions.ts`
Soll: **Kein Port der Upstream-Migration — die baut ein anderes Paket.** `012-unify-mail-server-config` (NEW:6362–6428) gehört `p6-migrations-2-1-catchup` **T11** und erledigt dort bereits: `MAIL_IMAP_URL`/`MAIL_SMTP_URL` → **`MAIL_HOST`** (6365/6366), `MAIL_IMAP_TLS_REJECT_UNAUTHORIZED`/`MAIL_SMTP_TLS_REJECT_UNAUTHORIZED` → `MAIL_TLS_REJECT_UNAUTHORIZED`, `MAIL_IMAP_SECURE`/`MAIL_SMTP_SECURE` gelöscht (6370), `MAIL_IMAP_PORT`/`MAIL_SMTP_PORT` aus den URLs. **Diesen Umbau hier NICHT wiederholen.** Upstream hört danach auf: `MAIL_HOST` wird in 2.1.0 von **niemandem** gelesen — verifiziert, die einzigen vier Treffer im Bundle (6365/6366/6403/6421) liegen alle in `migration012` selbst. Gelesen werden `MAIL_IMAP_HOST` (33942), `MAIL_SMTP_HOST` (34165), `MAIL_MANAGESIEVE_HOST` (36169). Genau diese Lücke schließt der Fork hier — es ist eine **Fork-eigene Anschluss-Migration**, kein Port.
Änderung: **Slot 014** — `PORT-2.1.0-MASTER.md:225` (D1) und `:140` reservieren appConfig-014 für `p4-mail`; 010–013 gehören p6 (T8 `010` push, T9 `011` isPinned, T11 `012` mail-server-config, T12 `013` shareActions, danach Schema-Default 14 / `appconfigs: 14`). Also `migration014.ts`, `name: '014-split-mail-host-into-imap-smtp-sieve'`, `previousSchemaVersion = 14`, `newSchemaVersion = 15`. Forward-only auf dem MAIL-appConfig-Doc: `MAIL_HOST` → `MAIL_IMAP_HOST` **und** `MAIL_SMTP_HOST` (Zielkey nur setzen, wenn er fehlt), `MAIL_HOST` danach löschen; `MAIL_IMAP_PORT` fehlend → `MAIL_DEFAULT_PORTS.IMAP_SSL`, `MAIL_SMTP_PORT` fehlend → `MAIL_DEFAULT_PORTS.SMTP_SUBMISSION`; `MAIL_MANAGESIEVE_HOST` **leer lassen** (der IMAP-Fallback in `SieveConfigService` greift, T26), `MAIL_MANAGESIEVE_PORT = MAIL_DEFAULT_PORTS.MANAGESIEVE`. **Contract-Sync (Surgical-Regel gilt hier nicht):** `appconfig.schema.ts` `@Prop({ default: 14 })` → `15` (**heute steht dort `10`** — p6 hebt schrittweise auf 14), `terminalSchemaVersions.ts` `appconfigs: 15` (**die Datei legt p6 an, sie existiert heute noch nicht**), `migration014` an `appConfigMigrationsList.ts` anhängen. Keine Magic-Strings: `ExtendedOptionKeys` + `MAIL_DEFAULT_PORTS` aus libs. Rollback = Dump **+ `master.key`**.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=migration014'` grün (Fixture `{MAIL_HOST:'mail.school.tld'}` → `MAIL_IMAP_HOST` **und** `MAIL_SMTP_HOST` = `mail.school.tld`, `MAIL_HOST` weg, `MAIL_MANAGESIEVE_PORT=4190`, `MAIL_MANAGESIEVE_HOST` ungesetzt, `schemaVersion` 14→15; bereits gesetztes `MAIL_IMAP_HOST` wird **nicht** überschrieben; kein MAIL-Doc → nur Bump; zweiter Lauf → No-Op); `iter.sh cmd 'grep -q "default: 15" apps/api/src/appconfig/appconfig.schema.ts && grep -q "appconfigs: 15" libs/src/migration/constants/terminalSchemaVersions.ts && grep -q migration014 apps/api/src/appconfig/migrations/appConfigMigrationsList.ts'` exit 0 — deckt genau die drei Stellen ab, die eine isolierte Migrations-Spec **nicht** sehen kann
i18n: keine
Doku: Migrations-Hinweis in `p1-migration-upgrade-test` ergänzen
Abhängt von: T41 · **`p6-migrations-2-1-catchup` T8/T9/T11/T12 (Slots 010–013) müssen vorher stehen** — sonst stimmen `previousSchemaVersion`, Schema-Default und `terminalSchemaVersions.ts` nicht und die Migration ist ein stiller No-Op

### T43 — i18n: Mail-Fehler + Sieve-UI-Keys DE+EN+FR  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/locales/{de,en,fr}/translation.json`, `libs/src/mail/constants/mails-error-messages.ts`
Soll: NEW:31344–31412 (`MAILS_ERROR_MESSAGES`) — im Fork **fehlende** Keys: `ImapConnectionFailed`, `MailboxNotFound`, `MailNotFound`, `MailDeleteFailed`, `MailMoveFailed`, `FlagUpdateFailed`, `FolderCreateFailed`, `FolderDeleteFailed`, `FolderRenameFailed`, `SearchFailed`, `AttachmentDownloadFailed`, `SmtpConnectionFailed`, `SendMailFailed`, `SendMailTimeout`, `DraftSaveFailed`, `SendAsNotAllowed`, `SendAsSharedMailboxNoCredentials`, `GetMailboxesFailed`, `GetMailboxDelegatesFailed`, `SetMailboxDelegatesFailed`, `SharedMailboxPasswordDecryptFailed`, `InvalidDelegateFormat`, `InvalidFolderName`, `MailcowApiGetAliasesFailed`, `MailcowApiGetAliasDomainsFailed`, **`ManageSieveNotConfigured` (31396)**, **`ManageSieveConnectionFailed` (31397)**, **`ManageSieveAuthFailed` (31398)**, **`SharedMailboxAutoReplyAccessDenied` (31399)**, **`InvalidAutoReplyScript` (31400)**, **`AutoReplyPresetNotFound` (31401)**, **`MaxAutoReplyPresetsExceeded` (31402)**, **`InvalidForwardScript` (31403)**, **`SelfForwardNotAllowed` (31404)**, **`MaxForwardTargetsExceeded` (31405)**, **`InvalidFilterScript` (31406)**, **`MaxFilterRulesExceeded` (31407)**, **`SelfFilterRedirectNotAllowed` (31408)**, **`UnknownFilterFolder` (31409)** · NEW:35653 (`IMPORTED_PRESET_NAME_KEY = 'mail.autoReply.importedName'`)
Änderung: Enum-Werte im bestehenden `MailsErrorMessages`-enum ergänzen (Bestandsausnahme: die Datei ist ein enum und bleibt eins) und **alle** Keys unter `mails.errors.*` in DE, EN **und** FR übersetzen. Zusätzlich `mail.autoReply.importedName` (Anzeigename für aus dem Server-Skript importierte Presets). Verständliche Endnutzer-Texte, keine Roh-Enum-Namen.
Verify: `iter.sh i18n` (`npm run check-translations`) exit 0; `iter.sh cmd 'node -e "const d=require(\"./apps/frontend/src/locales/de/translation.json\");process.exit(Object.keys(d.mails.errors).length>=39?0:1)"'` exit 0
i18n: ist der Task
Doku: keine (intern)
Abhängt von: T31, T33, T34

### T44 — FE: Baseline-Screenshot 2.1-Mail aufnehmen  [ ]
Komponente: .reference · Dateien: `.reference/2.1.0/baselines/19-mail.png`, `20-mail-autoreply.png`, `21-mail-filters.png` (neu)
Soll: Laufende 2.1-Referenzinstanz (crabbox). **Aus dem Bundle nicht rekonstruierbar** — nur die API ist un-minifiziert; das FE ist reine Fork-Eigenleistung und braucht wenigstens einen visuellen Anker.
Änderung: Playwright-Login auf der Referenzinstanz, drei Screenshots (Webmail-Grundlayout, Abwesenheits-/Auto-Reply-Dialog, Filterregel-Editor) ablegen. Kein Code.
Verify: `ls .reference/2.1.0/baselines/` zeigt die 3 Dateien; die Shots zeigen den **nativen** Client, nicht SOGo
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T45 — FE: useMailsStore — IMAP-Client-Actions  [ ]
Komponente: apps/frontend + libs · Dateien: `libs/src/mail/types/mailsStore.ts`, `libs/src/mail/constants/mailsStoreInitialState.ts`, `apps/frontend/src/pages/Mail/useMailsStore.ts` (+ `*.spec.ts`)
Soll: Kontrakt aus T37 (Routen 1–14). **FE-Quelle existiert nicht** → Fork-Eigendesign nach dem Chat-/Mailcow-Store-Muster (p2-chat, T8).
Änderung: Store-Actions über `eduApi` gegen `MAIL_ENDPOINT_PATHS`: `listMailboxes`, `getMailsByFolder(folder,page,limit,query,unreadOnly)` (Query via axios `params`, nicht `URLSearchParams`), `getMailDetail`, `deleteMails`, `moveMails`, `updateStatus`, `createFolder`, `deleteFolder`, `renameFolder`, `sendMail`, `saveDraft`, `replaceDraft`, `downloadAttachment` (`ResponseType.BLOB`). `handleApiError`, Mutationen geben `Promise<boolean>` zurück (Muster T8). Kein `fetch`, keine API-Calls in Komponenten.
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/useMailsStore.spec.ts'` grün (jede Action: Pfad + Verb + Body/Params + State + Fehlerpfad); `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0
i18n: keine
Doku: keine (intern)
Abhängt von: T13, T37

### T46 — FE: useMailsStore — Sieve-Actions (Abwesenheit / Weiterleitung / Filter)  [ ]
Komponente: apps/frontend + libs · Dateien: `libs/src/mail/types/mailsStore.ts`, `apps/frontend/src/pages/Mail/useMailsStore.ts` (+ `*.spec.ts`)
Soll: Kontrakt aus T38 (20 Sieve-Routen + Favoriten). **Fork-Eigendesign.**
Änderung: Actions ergänzen: `fetchAutoReplyPresets`, `fetchAutoReplyAddresses`, `fetchMailDomains`, `createAutoReplyPreset`, `setActiveAutoReply(presetId|null)`, `updateAutoReplyPreset`, `deleteAutoReplyPreset`, `fetchManageableSharedMailboxes`, die 6 `shared/:mailbox`-Pendants, `fetchForwardConfig`/`setForwardConfig`/`deleteForwardConfig`, `fetchFilters`/`setFilters`/`deleteFilters`, `fetchFavoriteRecipients`, `searchRecipients`. Pfade ausschließlich aus `MAIL_ENDPOINT_PATHS` komponiert.
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/useMailsStore.spec.ts'` grün (Pfad/Verb je Action; `setActiveAutoReply(null)` sendet `{presetId:null}`; Shared-Pfade enthalten die URL-kodierte Mailbox); `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0
i18n: keine
Doku: keine (intern)
Abhängt von: T45, T38

### T47 — FE: MailPage native Shell (ersetzt den Phase-1-Platzhalter)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Mail/MailPage.tsx`
Soll: Baseline `.reference/2.1.0/baselines/19-mail.png` (T44). Selektor-Gating aus T2 bleibt. **Fork-Eigendesign.**
Änderung: Platzhalter durch echte Shell ersetzen (Ordnerbaum-Slot | Listen-Slot | Detail-Slot + Compose-Trigger + Einstellungen-Einstiege für Abwesenheit/Weiterleitung/Filter). Rendering weiterhin **nur** bei `getActiveMailClient(appConfigs) === NATIVE`; Rollback-Anker (Ein-Zeilen-Revert auf `<NativeFrame appName={APPS.MAIL}/>`) bleibt gültig. `cn()`, SH-Wrapper.
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/MailPage.spec.tsx'` grün (native → Shell, sogo → null); `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0; crabbox mit geseedetem `ACTIVE_MAIL_CLIENT=native` → `/mail` rendert die Shell, mit Default `sogo` → weiterhin SOGo-Iframe
i18n: `mail.emptyState.*` DE+EN+FR
Doku: keine (intern)
Abhängt von: T44, T45

### T48 — FE: Ordnerbaum / Mailbox-Sidebar  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Mail/components/MailFolderTree.tsx` (neu, + `*.spec.tsx`)
Soll: Kontrakt `listMailboxes`/`createFolder`/`deleteFolder`/`renameFolder` (T37). **Fork-Eigendesign.**
Änderung: Baum aus `listMailboxes` (SpecialUse-Ordner zuerst, dann Custom-Folder), Auswahl setzt den aktiven Ordner, Kontextmenü anlegen/umbenennen/löschen über die Store-Actions. **Hinweistext beim Umbenennen/Löschen, dass betroffene Filterregeln automatisch angepasst werden** (Backend-Reconcile aus T34/T37). Icons nur `@fortawesome/free-solid-svg-icons`.
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/components/MailFolderTree.spec.tsx'` grün; `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0
i18n: `mail.folders.*`, `mail.folderActions.*` DE+EN+FR
Doku: keine (intern)
Abhängt von: T47

### T49 — FE: Mailliste (paginiert, Unread-Filter, Suche, Bulk-Aktionen)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Mail/components/MailList.tsx` (neu, + `*.spec.tsx`)
Soll: Kontrakt `getMailsByFolder(folder,page,limit,query,unreadOnly)`/`moveMails`/`updateStatus`/`deleteMails` (T37); Server-Clamping `MAX_PAGE_SIZE=200`, `MAX_SEARCH_QUERY_LENGTH=256` (T11). **Fork-Eigendesign.**
Änderung: Paginierte Liste mit Zeilenauswahl, Bulk „verschieben/löschen/gelesen/markiert", Suchfeld (debounced, clientseitig auf 256 Zeichen begrenzt), Unread-Toggle. Seitengröße nie > 200 anfordern.
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/components/MailList.spec.tsx'` grün (Seitenwechsel ruft `page+1`; „als gelesen" ruft `PATCH mails/messages/status`; Verschieben ruft `PATCH mails/messages/destination`); `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0
i18n: `mail.list.*`, `mail.actions.*` DE+EN+FR
Doku: keine (intern)
Abhängt von: T48

### T50 — FE: Detailansicht + Anhang-Download  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Mail/components/MailDetail.tsx` (neu, + `*.spec.tsx`)
Soll: Kontrakt `getMailDetail(uid,folder)`/`downloadAttachment(uid,partId,folder)` (T37). **Fork-Eigendesign.**
Änderung: Header (From/To/Cc/Datum), Body **sanitisiert** gerendert (HTML nie ungefiltert einhängen — bestehende Sanitizer-Kette des Forks wiederverwenden, `grep -rn "sanitize" apps/frontend/src`), Anhangsliste mit Download (`ResponseType.BLOB`), Reply-/Forward-Trigger (öffnet T51).
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/components/MailDetail.spec.tsx'` grün (Body mit `<script>` wird nicht ausgeführt/entfernt; Anhang-Klick ruft die Attachment-Route); `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0
i18n: `mail.detail.*`, `mail.attachments.*` DE+EN+FR
Doku: keine (intern)
Abhängt von: T49

### T51 — FE: Compose-Dialog + Entwürfe + Empfänger-Autocomplete  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Mail/components/MailCompose.tsx` (neu, + `*.spec.tsx`)
Soll: Kontrakt `sendMail`/`saveDraft`/`replaceDraft`/`searchRecipients(q)`/`recipients/favorites` (T37/T38); Limits `MAIL_ATTACHMENT_MAX_FILE_SIZE` 20 MiB, `MAIL_ATTACHMENT_MAX_FILE_COUNT` 10, `TOTAL_WIRE_MAX_BYTES` 20 MiB (T11). **Fork-Eigendesign.**
Änderung: To/Cc/Bcc mit Autocomplete (ab `RECIPIENT_SEARCH.MIN_QUERY_LENGTH`, Favoriten als Vorschlag beim Öffnen), Betreff, Body-Editor, Anhänge, Signatur aus `MAIL_SIGNATURE`. **Clientseitige Vorprüfung gegen dieselben Konstanten wie der Guard**, damit der Nutzer vor dem 413 gewarnt wird — die Server-Prüfung bleibt maßgeblich (T21). Reply/Forward-Prefill aus T50.
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/components/MailCompose.spec.tsx'` grün (Senden ruft `POST mails/outbox` als multipart; 11. Anhang blockiert; Gesamtgröße > 20 MiB blockiert mit Hinweis; Autocomplete ruft `mails/recipients/search?q=`); `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0
i18n: `mail.compose.*` DE+EN+FR
Doku: kurze Webmail-Nutzerdoku (docs/, DE+EN+FR)
Abhängt von: T50, T46

### T52 — FE: Abwesenheitsnotiz (Auto-Reply-Presets, eigenes + geteiltes Postfach)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Mail/components/MailAutoReply.tsx` (neu, + `*.spec.tsx`), `apps/frontend/src/pages/Mail/components/autoReplyValidation.ts` (neu)
Soll: Kontrakt T38 (13 Auto-Reply-Routen); Grenzen aus `MAIL_AUTO_REPLY_DEFAULTS` (T22); Baseline `.reference/2.1.0/baselines/20-mail-autoreply.png` (T44). **Fork-Eigendesign.**
Änderung: Preset-Liste + Editor (Name, Betreff, Nachricht, Intervall 1–365 Tage, Start-/Enddatum, Adressen-Mehrfachauswahl aus `auto-reply/addresses`, „eingehende verwerfen", Wochentage, Tageszeitfenster, Absender-Reichweite alle/intern/extern), Aktivieren/Deaktivieren über `PUT auto-reply/active`. Postfach-Umschalter für geteilte Postfächer aus `auto-reply/mailboxes` (nur anzeigen, wenn nicht leer). Pure Validierungsfunktion, die **exakt** die Grenzen aus T22 verwendet (kein zweiter Satz Zahlen).
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/components/autoReplyValidation.spec.ts'` grün (Name > 100 / Nachricht > 4000 / Intervall 0 / Uhrzeit `24:00` abgelehnt; gültiger Fall akzeptiert); `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0
i18n: `mail.autoReply.*` (inkl. `mail.autoReply.importedName` aus T43) DE+EN+FR
Doku: Nutzerdoku-Abschnitt „Abwesenheitsnotiz" DE+EN+FR
Abhängt von: T46, T47

### T53 — FE: Weiterleitung + Filterregel-Editor  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Mail/components/MailForwardSettings.tsx`, `MailFilterRules.tsx`, `mailFilterValidation.ts` (alle neu, + `*.spec.tsx`)
Soll: Kontrakt T38 (`forward` GET/PUT/DELETE, `filters` GET/PUT/DELETE); Grenzen `MAX_FORWARD_TARGETS=4`, `MAX_RULES_PER_USER=50`, `MAX_CONDITIONS_PER_RULE=10`, `MAX_ACTIONS_PER_RULE=10`, `MAX_VALUE_LENGTH=1024`, `MAX_NAME_LENGTH=128` (T22); Feld/Test-Matrix `isFilterTestValidForField` (T22); Baseline `21-mail-filters.png` (T44). **Fork-Eigendesign.**
Änderung: (a) Weiterleitung: bis zu 4 Ziele, „Kopie behalten", Zeitfenster; **eigene Adressen im Ziel-Feld clientseitig sperren** (der Server wirft sonst `SelfForwardNotAllowed`). (b) Filter: Regelliste mit Reihenfolge, je Regel Name/aktiv/all-any/Bedingungen (Feld × Test × Wert, Test-Auswahl über `isFilterTestValidForField` gefiltert)/Aktionen (fileinto mit Ordner-Dropdown aus `listMailboxes`, redirect, redirect :copy, discard, addflag, setflag)/„danach stoppen". Vom Server als `invalid` markierte Regeln sichtbar kennzeichnen (entstehen durch Ordner-Reconcile, T34).
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/components/mailFilterValidation.spec.ts'` grün (`size`+`contains` nicht wählbar; leerer `fileinto`-Wert blockt Speichern; 51. Regel blockt; 5. Weiterleitungsziel blockt; eigene Adresse als Ziel blockt); `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0
i18n: `mail.forward.*`, `mail.filters.*` (Feld-/Test-/Aktionslabels) DE+EN+FR
Doku: Nutzerdoku-Abschnitte „Weiterleitung" und „Filterregeln" DE+EN+FR
Abhängt von: T52, T48

### T54 — libs+FE: Selektor-Dropdown sichtbar + Default → `native` (Phase 4)  [ ]
Komponente: libs + apps/frontend · Dateien: `libs/src/appconfig/constants/extendedOptions/mailGeneralExtendedOptions.ts`, `libs/src/appconfig/constants/defaultAppConfig.ts`
Soll: Muster `MAIL_SOGO_THEME`-Dropdown (`mailGeneralExtendedOptions.ts`), Labels aus T3. **Fork-Divergenz — in 2.1.0 gibt es keinen Selektor, SOGo ist dort gelöscht.**
Änderung: `ACTIVE_MAIL_CLIENT` als `ExtendedOptionField.dropdown` einhängen (Optionen `native`/`sogo`, Warnhinweis `appExtendedOptions.activeMailClientWarning`, **ohne** `requiredContainers`). Fresh-Install-`defaultAppConfig` auf `native`. **`getActiveMailClient`-Fallback bleibt `?? SOGO`** — Bestandsinstanzen ohne gesetzten Key bleiben bewusst auf SOGo.
Verify: `LIBS_TSC` (R1) exit 0; `iter.sh cmd 'grep -q "ACTIVE_MAIL_CLIENT" libs/src/appconfig/constants/extendedOptions/mailGeneralExtendedOptions.ts && grep -q "ACTIVE_MAIL_CLIENT.SOGO;" libs/src/mail/utils/getActiveMailClient.ts'` exit 0 — **`grep` ist zeilenbasiert und der Fork bricht die Zeile vor dem Operator um** (`:14` endet auf `??`, `:15` ist `ACTIVE_MAIL_CLIENT.SOGO;`); ein Muster über beide Zeilen (`"?? ACTIVE_MAIL_CLIENT.SOGO"`) könnte nie matchen (Dropdown eingehängt **und** der Bestands-Fallback steht noch auf SOGo); crabbox-Fresh-Install → Mail-Settings zeigt das Dropdown, Default `native`; Bestandsinstanz ohne Key → weiterhin `sogo`
i18n: Labels aus T3 (DE+EN+FR), ggf. Warnhinweis-Feinschliff
Doku: Ops-Runbook: Default-Flip + Kill-Switch DE+EN+FR
Abhängt von: T47, T52, T53

### T55 — FE: SOGo als „Erweitert"-Tab + Deep-Links + Token-Rotations-Watcher (Phase 4)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Mail/MailPage.tsx`, `apps/frontend/src/pages/Mail/components/MailSogoTab.tsx` (neu, + `*.spec.tsx`)
Soll: Auth-Handoff `NativeFrame.tsx` (`eduApiToken` in der Proxy-URL), `useFrameDeepLinkSync`/`FRAME_URL_SYNC_*`. **Fork-Divergenz, kein 2.1.0-Pendant.**
Änderung: Im nativen Modus SOGo als lazy gemounteten „Erweitert"-Tab einbetten (danach `display:none`-gemountet, kein Re-Auth). Empfohlen: Subroute `/mail` (nativ) / `/mail/erweitert` (SOGo) für Back-Button und teilbare Links. **Token-Rotations-Watcher:** Iframe-Reload bei JWT-Rotation. Der Tab ist nach T52/T53 kein Feature-Ersatz mehr, sondern reiner Escape-Hatch — im Hinweistext entsprechend formulieren.
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Mail/components/MailSogoTab.spec.tsx'` grün; `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0; crabbox mit `ACTIVE_MAIL_CLIENT=native` → Tab lädt SOGo mit gültigem Token, Hin/Her ohne Re-Login, nach simulierter Rotation lädt der Iframe neu
i18n: `mail.tabs.*`, `mail.openInSogo.*` (aus T3, DE+EN+FR)
Doku: Nutzerdoku „SOGo als Erweitert-Tab" DE+EN+FR
Abhängt von: T54

### T56 — libs: `mailImapFlags`-Modul (IMAP-Flags, Special-Use, Ordnernamen, Pfade)  [ ]
Komponente: libs · Dateien: `libs/src/mail/constants/mailImapFlags.ts` (neu)
Soll: NEW:24276–24322 — `MAIL_IMAP_FLAGS` (24276: `SEEN '\\Seen'`, `FLAGGED`, `DELETED`, `ANSWERED`, `DRAFT`) · `MAIL_MAILBOX_FLAGS` (24283: `NOSELECT '\\Noselect'`) · `MAIL_SPECIAL_USE` (24287: INBOX/TRASH/JUNK/DRAFTS/SENT/ARCHIVE, Werte `'\\Inbox'` …) · `MAIL_FOLDER_NAMES` (24296: `INBOX: 'INBOX'`, `SENT: 'Sent'`, `DRAFTS: 'Drafts'`, `TRASH: 'Trash'`, `JUNK: 'Junk'`, `SPAM: 'Spam'`, `ARCHIVE: 'Archive'`) · `SYSTEM_FOLDER_NAMES` (24306, Array aus `MAIL_FOLDER_NAMES`, 7 Einträge) · `MAIL_PATHS` (24316: `SHARED_PREFIX 'Shared/'`, `SHARED_ROOT 'Shared'`, `DELIMITER '/'`) · **Default-Export ist `MAIL_IMAP_FLAGS` (24322)**, der Rest benannt.
Änderung: Ein `as const`-Modul, Default-Export am Dateiende, übrige Objekte als benannte Exporte (so macht es das Bundle). Der Fork hat davon **nichts** — verifiziert: `grep -rn "MAIL_FOLDER_NAMES\|MAIL_SPECIAL_USE\|MAIL_IMAP_FLAGS" libs/ apps/` → leer; `PORT-2.1.0-MASTER.md:72` (F6) führt das als offenen Befund. Konsumenten in dieser Section: T11 (`MAIL_DEFAULTS.FOLDER`, NEW:28957), T16 (`flagsToStatus`/`statusToFlagUpdates`), T18 (`resolveDraftsFolder`/`resolveSentFolder`).
Verify: `LIBS_TSC` (R1) exit 0; `iter.sh cmd 'for k in MAIL_IMAP_FLAGS MAIL_MAILBOX_FLAGS MAIL_SPECIAL_USE MAIL_FOLDER_NAMES SYSTEM_FOLDER_NAMES MAIL_PATHS; do grep -q "$k" libs/src/mail/constants/mailImapFlags.ts || exit 1; done'` exit 0; `iter.sh cmd 'grep -q "SPDX-License-Identifier: AGPL-3.0-or-later" libs/src/mail/constants/mailImapFlags.ts && grep -q "export default MAIL_IMAP_FLAGS" libs/src/mail/constants/mailImapFlags.ts'` exit 0
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T57 — BE: MailsService-Restdelta gegenüber dem **Fork** (Senden, Shared, Mailcow-Aliase)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/mails/mails.service.ts`, `apps/api/src/mails/mails.module.ts`
Soll: **Fork-Ist verifiziert: `mails.service.ts` hat 576 Zeilen und endet fachlich bei `deleteSyncJobs` (Z. 549).** Diese 2.1.0-Methoden fehlen ihm komplett und werden von T37/T38/T39 aufgerufen — Anker einzeln nachgelesen: `listMailboxFolders` (30860) · `getSharedMailboxes` (30871) · `getSharedMailbox` (30875) · `setMailboxDelegates` (30897) · `getMailcowMailbox` (30956) · `updateSenderAcl` (30965) · `getSharedMailboxPassword` (31009) · `listActiveMailcowAliases` (31018) · `getMailcowAliasGotos` (31058) · `sendMail` (31141) · `fetchForwardAttachments` (31174) · `mergeForwardAttachments` (31192) · `saveDraft` (31197) · `resolveSenderCredentials` (31204–31245) · `deleteSharedMailbox` (31246) · `cleanupSharedMailboxData` (31268) · `removeSenderAclEntries` (31276).
Änderung: Die 17 Methoden ergänzen. Sie hängen an `MailImapService` (T16–T19), `MailSmtpService` (T20), dem `SharedMailbox`-Model (T30) und dem bestehenden `MailcowAdminService` — **jede Mailcow-API-Nutzung läuft über den Fork-Service, keine zweite Axios-Instanz im `MailsService`**.
**Sicherheitskern — `resolveSenderCredentials` (31204–31245), Reihenfolge 1:1:** (1) kein `fromAddress` **oder** normalisiert == eigene Adresse → eigene Credentials; (2) `sharedMailboxModel.findOne({mailbox: normalizedFrom}, 'delegates password encryptKey')` — Treffer und Nutzer **nicht** in `delegates` → `SendAsNotAllowed` (403); Treffer ohne `password`/`encryptKey` → `SendAsSharedMailboxNoCredentials` (424); sonst entschlüsseltes Shared-Passwort; (3) **kein Shared-Dokument → `getMailcowAliasGotos(normalizedFrom)`; enthält es die eigene Adresse, wird mit den EIGENEN Credentials und `fromHeader = Alias` gesendet** — dieser Alias-Pfad ist Pflicht, sonst laufen alle Alias-Absender in ein 403; (4) sonst `SendAsNotAllowed` (403). Die Prüfung sitzt **hier inline**, nicht in `assertCanManageSharedMailbox`. Entschlüsselte Shared-Passwörter **nie** loggen, nie in ein DTO zurückgeben.
Verify: `iter.sh cmd 'npx nx test api --testPathPattern=mails.service'` grün (`resolveSenderCredentials`: eigene Adresse → eigene Credentials; Shared mit Delegat → entschlüsseltes Shared-Passwort; Shared ohne Delegat → 403 `SendAsNotAllowed`; Shared ohne Passwort → 424 `SendAsSharedMailboxNoCredentials`; **kein Shared-Doc, aber eigener Mailcow-Alias → eigene Credentials + `fromHeader` = Alias**; fremde Adresse ohne Alias → 403; `cleanupSharedMailboxData` löscht die SharedMailbox-Dokumente **und** ruft `removeSenderAclEntries`); `iter.sh cmd 'npx nx build api'` „Successfully ran"
i18n: die in diesem Task erstmals geworfenen `mails.errors.*`-Keys DE+EN+FR (mit T43 abgleichen, nicht doppeln)
Doku: keine (intern)
Abhängt von: T19, T20, T30, T35

### T58 — libs+FE: Tabellen-Keys `MAIL_MAILBOX_TABLE` / `MAIL_PROVIDER_CONFIG_TABLE`  [?] entscheidung
Komponente: libs + apps/frontend · Dateien: `libs/src/appconfig/constants/extendedOptionKeys.ts`, `libs/src/appconfig/constants/extendedOptions/mailboxManagementExtendedOptions.ts` (neu), `mailExternalProvidersExtendedOptions.ts` (neu), `libs/src/appconfig/constants/appConfigSectionsKeys.ts`, `apps/frontend/src/pages/Settings/AppConfig/appConfigOptions.ts`, `apps/frontend/src/pages/Settings/AppConfig/components/table/tableConfigMap.tsx`
Soll: NEW:2411 `MAIL_MAILBOX_TABLE`, NEW:2413 `MAIL_PROVIDER_CONFIG_TABLE` · NEW:4054–4062 `MAILBOX_MANAGEMENT_EXTENDED_OPTIONS` (`name: MAIL_MAILBOX_TABLE`, `description: 'appExtendedOptions.mailboxManagementDescription'`, `type: table`, `width: 'full'`) · NEW:3632–3640 `MAIL_EXTERNAL_PROVIDERS_EXTENDED_OPTIONS` (`name: MAIL_PROVIDER_CONFIG_TABLE`, `description: 'appExtendedOptions.mailExternalProvidersDescription'`, `type: table`, `width: 'full'`)
Änderung: **`[?]` — vor der Umsetzung von Kevin freigeben lassen.** Fork-Bestand (verifiziert): `ExtendedOptionField.table` existiert (`extendedOptionField.ts:23`), `ExtendedOptionsForm.tsx:99` rendert ihn über `AppConfigTable`, `getAppConfigTableConfig` schlägt in `TABLE_CONFIG_MAP` nach und dort gibt es bereits einen `[APPS.MAIL]`-Eintrag (`tableConfigMap.tsx:120`). Gleichzeitig existiert für die Postfachverwaltung schon ein eigener, getesteter Panel-Pfad: `MailcowAdminPanel.tsx` (+ `getMailcowMailboxColumns.tsx`, `CreateMailboxDialog`, `EditMailboxDialog`, `ManageMailboxAclDialog`), gemountet in `AppConfigPage.tsx:303`. Optionen:
**(a) empfohlen** — Keys anlegen, `AppConfigSectionsKeys` um `mailboxManagement` + `mailExternalProviders` erweitern, in `appConfigOptions.ts` mappen, in `tableConfigMap.tsx` je Key einen Eintrag ergänzen, der die bestehenden Columns/Dialoge wiederverwendet, und `MailcowAdminPanel` aus `AppConfigPage.tsx` ausbauen → 2.1.0-konform, **ein** Renderpfad.
**(b)** — Keys anlegen, aber ohne Formulareintrag: erzeugt genau die tote-Key-Situation, die Header-Fakt 2 für 2.0.200 als Fehler benennt. Nur als Zwischenschritt akzeptabel.
**Kein Weg darf zwei parallele Postfachtabellen erzeugen.**
Verify: `LIBS_TSC` (R1) exit 0; `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` exit 0; bei Variante (a): `iter.sh cmd 'grep -q MAIL_MAILBOX_TABLE apps/frontend/src/pages/Settings/AppConfig/components/table/tableConfigMap.tsx && test $(grep -c MailcowAdminPanel apps/frontend/src/pages/Settings/AppConfig/AppConfigPage.tsx) -eq 0'` exit 0 (**schlägt heute fehl** — `AppConfigPage.tsx:303` mountet das Panel noch); `iter.sh test:frontend` grün
i18n: `appExtendedOptions.mailboxManagementDescription`, `appExtendedOptions.mailExternalProvidersDescription` DE+EN+FR
Doku: keine (intern)
Abhängt von: T41
