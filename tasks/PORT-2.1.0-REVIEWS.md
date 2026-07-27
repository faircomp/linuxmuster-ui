# Adversariale Ledger-Reviews (2.1.0-Port)

## 1. Anchors (spot-checked against `.reference/2.1.0/api/main.js`)

Verified correct: `DavAuthMode` 3085-3088 · `CalendarAccessLevel` 44737-44743 · `deriveCalendarId` 46340 · `decodeLegacyCalendarId` 46369 · path segments 43409-43411 · `RIGHTS_BY_ACCESS_LEVEL`/`accessLevelToRights`/`rightsToAccessLevel` 44775-44820 · migration000 46225-46238 · migration001 46271-46311 · `CalDavClientFactory` consts 45817-45822, `getSoBaseUrl`/`assertConfiguredOrigin` 45939-45960 · `examModeConstants` 15756-15786 (all 9 values exact) · `ExamModeJob` TTL/collection 19232-19242 · `enqueue(…, options)` 17073 · `APPS.CONTACTS` 195 · `CONTACTS_CARDDAV_*` 2381-2383 · `contactsCardDavExtendedOptions` 3121-3153 · `InAppPermissionGuard` 79570-79603 · `getInAppPermissions` 2327-2336 (AI_CHAT = DENY) · AI dep ranges 79274 (`ai ^7.0.19`, `@ai-sdk/* ^4.0.11`/`^3.0.7`, `streamdown ^2.5.0`) · surveys migration002 62619ff · **13 contacts routes** confirmed (47481-47680) — the honest "13 not 14" note is right.

Also verified accurate: `users.service.ts:214 getPassword` · `getUsersEmailAddress.decorator.ts` · `tsdav`/`undici` already present · `sse.service.ts:147` · `splitArrayIntoChunks` · `survey.dto.ts:28` / `survey-answers.service.ts:98` · installer `docker-compose.yml.template:47-48` bind mount + `apps/api/Dockerfile:30/34` `cp -r` — the PDF-fallback riskNote is genuinely verified, not assumed.

### BLOCKING — anchor content wrong

**B1 · `CalendarShareRole` (p7-calendar T2/T3).** Ledger: 4 members, cited "ab NEW:44775". Actual definition main.js:44850-44856 has **5** members and the values are **SOGo wire strings, not the keys**:
```
NONE:'None', DATE_AND_TIME_VIEWER:'DAndTViewer', VIEWER:'Viewer', RESPONDER:'Responder', MODIFIER:'Modifier'
```
T2 says "Werte == Keys" (true only for `CalendarAccessLevel`) and omits `RESPONDER`; T3 omits that `rightsToAccessLevel` maps `RESPONDER → READ` (44815). An agent following T2/T3 literally emits `VIEWER:'VIEWER'` and every SOGo `saveUserRights` body is silently wrong. T3's round-trip verify **passes** on the broken 4-member/key-valued version — the test does not catch it.

**B2 · `CalendarMetadata.schemaVersion` default (p7-calendar T8).** Ledger says "default 1". Bundle 46157-46159: `@Prop({ type: Number, default: 2 })`. With default 1 every newly created metadata doc is re-selected by migration001 (`schemaVersion < 2`) on every boot.

## 2. Invention presented as fact

**B3 · `@ApiAuth()` — BLOCKING, and the security framing is wrong.** `grep -rn "ApiAuth" apps/api/src libs/src` → **0 hits**; the decorator does not exist in the fork. The fork's calendar controller (`calendar.controller.ts:41-44`) uses `@ApiBearerAuth()` + `@RequireAppAccess(APPS.CALENDAR)`. Consequences:
- p7-calendar T14: "Der bestehende Guard-Block (`@ApiAuth()`, `@RequireAppAccess`) bleibt unverändert" — factually false about the fork.
- p7-contacts T16: `@ApiAuth()` "nicht verhandelbar" → unresolved import, API build fails.
- p7-ai T12: "Das Soll setzt nur `@ApiBearerAuth()`; im Fork zusätzlich `@ApiAuth()` setzen, **sonst fehlt die Authentifizierung** und der Guard läuft ins 401-Fallback" — wrong. Bundle 14097: `ApiAuth = applyDecorators(ApiBearerAuth(), ApiUnauthorizedResponse(...), ApiForbiddenResponse(...))` — pure Swagger documentation, zero runtime auth. Presenting it as an auth-bypass fix will make a reviewer sign off on a non-fix.
Fix: add a task creating `apiAuth.decorator.ts` from main.js:14097, or drop the requirement everywhere.

**NIT · `isSogoTrue` (T2).** Ledger prose: "SOGo liefert Booleans als `'1'`/`'YES'`/`true`". Actual (44884): `(value) => value === true || value === 1` — no strings. Mitigated because the task orders a grep + 1:1 copy, but the prose is invented.

## 3. Fork reality

**B4 · `shares`-Ausbau (T9) hat eine unvollständige Dateiliste → Repo kompiliert zwischen T9 und T16 nicht.** `grep -rln shares` findet Konsumenten, die T9 nicht nennt:
- `libs/src/calendar/types/calendarCreateBody.ts` — `shares: CalendarShare[]` **required**
- `apps/frontend/src/pages/Calendar/buildCalendarCreateBody.ts` — schreibt `share.subjectId`
- `apps/frontend/src/pages/Calendar/CalendarManagementDialog.tsx`, `ShareEditor.tsx` (117 Zeilen bestehende Share-UI — **wird nirgends zum Löschen eingeplant**)
- Specs: `calendar-metadata.schema.spec.ts`, `calendar.service.spec.ts`, `dto/calendar-dtos.spec.ts`, `calendar.controller.spec.ts`, `useCalendarStore.test.ts`, `CalendarManagementDialog.test.tsx`
Die FE-Hälfte ist in `[?]` T16 geparkt — das verletzt exakt die Contract-Sync-Regel, die die riskNotes selbst aufstellen ("im selben Commit").

**B5 · `strictValidationPipe` existiert nicht und wird über Ledger-Grenzen hinweg vorausgesetzt.** T9-Verify ("Body mit `shares` → 400") und T14 (`@UsePipes(strictValidationPipe)`) brauchen ihn; erzeugt wird er in **p7-contacts T6**, das die Topo-Reihenfolge *nach* calendar setzt, und weder T9 noch T14 haben eine Abhängigkeit darauf. Der Fork hat heute `@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))` (calendar.controller.ts:44) — **ohne** `forbidNonWhitelisted`, d. h. `shares` wird still gestrippt, kein 400. T9-Verify schlägt wie geschrieben fehl.

**NIT · T4 Fehler-Keys.** `libs/src/calendar/constants/calendar-error-messages.ts` ist ein **enum** (Altbestand-Ausnahme, ok) und enthält `CalendarNotFound` bereits. T4 listet ihn als neu → doppelter Member. `MissingCalDavCredentials` existiert nicht, der Fork nutzt `CalDavConnectionFailed`.

**NIT · exam-jobs T4.** `defaultAttempts` gibt es im Fork nicht; der Wert stimmt aber (`lmn-api-request.queue.ts:184 attempts: 3`, `185 backoff.delay = this.retryDelayMs`) — Zeilenzitat fehlt nur.

**NIT · exam-jobs Bruch-Beschreibung überzeichnet.** `useLessonStore.ts:151/171` `await`et das PUT und liest den Body **nicht** (`eduApi.put<LmnApiSession>`, Rückgabe verworfen) — 202 statt 200 hängt die UI nicht auf, es fehlt nur die Fertig-Semantik. Der Umbau bleibt nötig, die Dringlichkeitsbegründung ist falsch.

## 4. Verify-Kommandos

**B6 · `npm run generate:swagger` existiert im Fork nicht, `swagger-spec.json` auch nicht.** `grep -n swagger package.json` → nur die Dependency; `ls swagger-spec.json` → not found. Vier Tasks führen "swagger regenerieren, `swagger-spec.json` im selben Commit" als Doku-DoD (calendar T14, contacts T16, ai T12, exam T7). Nicht ausführbar. Entweder Skript+Spec aus der 2.1.0-`package.json` (79274 enthält `generate:swagger`, `validate:swagger`, `check-swagger-completeness`) als eigene Task portieren oder die Zeile streichen.

Sonst brauchbar: `check-translations`, `check-error-message-translations`, `check-spec-coverage`, `check-external-references` existieren alle (package.json:31/40/41/43). `controllerContractReflection` existiert als Muster. Die `curl … → 401`-Checks sind echte, beobachtbare Assertions.

**NIT · `npx tsx -e "import X from './libs/...'"`.** Funktioniert nur, solange die importierte Datei keine `@libs/*`-Alias-Imports zieht. Root-`tsconfig.json` hat `paths` (shadcn-Datei), das trägt vermutlich — aber p7-contacts T3 importiert `contactsCardDavExtendedOptions.ts`, das seinerseits `@libs/appconfig/constants/extendedOptionKeys` **und** den neuen `davAuthMode` lädt. Ungetestete Annahme in ~10 Verify-Zeilen.

## 5. House rules

SPDX auf neuen Dateien: durchgängig gefordert ✓. i18n DE+EN+FR: ✓, **aber** calendar T15 verifiziert nur `iter.sh i18n`; für die 9 neuen `calendar.errors.*` fehlt `npm run check-error-message-translations` (contacts T18 hat es, calendar T15 nicht) — NIT. `schemaVersion`-Bump: calendar-Migrationen bumpen korrekt (1→2), exam-mode-Collection ist neu (bundle-treu ohne `schemaVersion`) ✓. Guards mit Route: formal überall eingefordert — inhaltlich durch B3 entwertet. Zusatz-NIT: die 2.1.0-`AiController` (89420-89426) hat **kein** `@RequireAppAccess` — nur `@RequireInAppPermission` (admin-bypassed). Das Ledger erwähnt diese Lücke nicht und entscheidet nicht, ob der Fork sie schließt.

## 6. Ordering

- B5 ist der harte Ordering-Fehler (calendar hängt unbenannt an contacts T6).
- p7-ai T7 (`strictTransformValidationPipe`) ↔ exam-jobs T7: das Ledger löst die Doppelung ad hoc ("falls dieses Paket zuerst läuft, hier anlegen und in p7-ai T7 als erledigt markieren") — akzeptabel, aber p7-ai T7 ist "gesperrt bis T1", d. h. die Pipe entsteht *de facto* immer in exam-jobs. Sauberer: Pipe in ein neutrales Vorab-Task. NIT.
- p7-contacts T3 → `p7-calendar T1` querverwiesen ✓ korrekt.
- calendar T7 `Abhängt von: T5, T8` ✓ (T8 muss vor der Migration, weil `shares` aus dem Schema muss).

## 7. Fehlt

- **Task für `apiAuth.decorator.ts`** (siehe B3).
- **Task für Swagger-Skript/Spec** (siehe B6).
- **Task, der `ShareEditor.tsx` + `buildCalendarCreateBody.ts` + `CalendarFormValues.shares` entfernt** — die bestehende Fork-Share-UI wird ersatzlos wertlos, aber nie angefasst.
- **Task, der die 6 bestehenden Specs mit `shares` anpasst** (T8/T9 sagen "grün", nennen die Dateien nicht).
- **`OAUTH` im Dropdown ohne Implementierung**: `DAV_AUTH_METHOD` im Bundle (45823-45826) kennt nur `Basic`/`Digest`. Das Feld ist `disabled: true`, also folgenlos — sollte aber im Doku-Task stehen. NIT.
- **Review-Lücke**: der gelieferte `ledgerMarkdown` bricht mitten in p7-lmn-exam-jobs T10 ab. **exam-jobs T11/T12, alle 10 Tasks p7-lmn-pdf-fallback und alle 9 Tasks p7-surveys-limiter-collection konnten nicht geprüft werden** — nur deren riskNotes (die stichprobenartig stimmen: Dockerfile/Installer ✓, migration002 62619 ✓, survey-Konsumenten ✓). Taskzahl 82 = 16+20+15+12+10+9 ✓ konsistent.

LEDGER-NEEDS-WORK — 6 blocking

---

Verified every bundle anchor cited (both OLD and NEW) and every fork-file claim against the actual tree.

## BLOCKING

**B1 — Missing task: `OnlyOfficeCallbackData` has no `token` field.**
`libs/src/filesharing/types/onlyOfficeCallBackData.ts` — `grep token` → 0 hits. Fields are `key`, `status`, `url`, `actions`, `changesurl`, `filetype`, `forcesavetype`, `formsdataurl`, `history`. T9 step 2 requires `callbackData.token`; T9 step 3 needs a type for the verified payload (`signed.status/url/key`). Neither exists and no task creates them. T9 will not compile, and its Verify (`--testPathPattern=onlyoffice.service`) is the only gate. Add a task (Stage 1, before T9) adding `token?: string` to that interface plus an `OnlyOfficeSignedCallbackPayload` type.

**B2 — T9 leaves `apps/api` non-compiling; T9+T10 must be one commit.**
T9 converts `static handleCallback` (onlyoffice.service.ts:77) to an instance method. Its only caller is `filesharing.service.ts:230` (`OnlyofficeService.handleCallback(...)`), fixed only in T10. T9's verify never compiles `filesharing.service.ts`. T18 carries a ⚠ coupling marker; T9/T10 needs the same, or T9 must add `npx tsc -p apps/api/tsconfig.app.json --noEmit` to its Verify.

**B3 — T5/T6/T7/T8 need the same "must land together" marker as T15–T18.**
T5 flips the response `string → { config, token }`; T6 makes `filePath`/`fileName` required query params. The FE only follows in T7/T8. Any intermediate commit: `assertDocumentUrlMatchesFile` hashes `filePath=undefined` → pathname mismatch → **403 on every Office document**. Risk note 4 names this exactly but the tasks carry no marker, and `/feature-build` commits per task. Mark T5–T8 as one commit unit.

**B4 — T27(b) is unimplementable against the structure T9 prescribes.**
NEW:54556-54570 places `isClosedWithoutChanges → endSession → 200 {error:0}` **before** `isAllowedOnlyOfficeDownloadUrl`. T9 prescribes the 2.0.200 order (OLD:40266-40275: status filter → download-url check → retrieve), in which status 4 has **no** `200`-return — it falls into `isAllowedOnlyOfficeDownloadUrl(signed.url)` where status-4 callbacks carry no `url` → `new URL(undefined)` throws → `false` → **403**. T27 says "bei CLOSED_WITHOUT_CHANGES **vor** dem 200-Return endSession"; that return does not exist, and T27's spec case (1) ("status 4 → endSession genau einmal, kein uploadFile") cannot pass. T27 must state: hoist the `isClosedWithoutChanges` branch ahead of the download-url check (NEW:54561-54566).

**B5 — T18's prescribed controller test cannot be written.**
`apps/api/src/filesharing/filesharing.controller.spec.ts:13` is `const serviceMock = {}`; the suite only runs `controllerContractReflection` and never invokes a handler. `verifyCallbackAuthToken` lives on `OnlyofficeService` and is called inside `FilesharingService.handleCallback` — not reachable from a controller spec whose service is `{}`. "Service-Mock so setzen, dass `verifyCallbackAuthToken` wirft, und `res.status` mit 401 erwarten" is impossible there. Move that 401 anchor into `filesharing.service.spec.ts` (exists).

**B6 — T24 omits the `getPersistContext` return mapping and the `persistContext` type.**
NEW:54718-54724: the cache entry stores `persistUsername`/`persistShare` but `getPersistContext` returns `{ username: entry.persistUsername, share: entry.persistShare }`. T21 defines only `OnlyOfficeSessionKeyEntry` (`{key, persistUsername, persistShare}`); no `{username, share}` type is defined anywhere, and T24 never states the rename. T27 consumes `persistContext?.username`. An agent implementing T21/T24 literally returns `{persistUsername, persistShare}` → `persistContext?.username` is always `undefined` → the persist pin silently never applies (permanent fallback + warn), and none of T24's 8 spec cases pin the shape. Add the return type and the mapping, and a spec case asserting `{username, share}`.

## NITS

- **N1 — fork-file line anchors drift** (symbol names save it, but fix): T6 "controller 184-187" → actually 189-192; T7 "Zeile 37" → 38; T8 "72-91" → useEffect 75-94 (token line 89); T17 "51/56/65-70" → `token` useMemo at **53**, `getCallbackBaseUrl` call at **60-65**; T26 "webdavShare Zeile 47" → **46**; T10/T18 "244-263" → 243-263.
- **N2 — bundle anchors: no fabrications.** All verified within ±2 lines. Small offsets: T9 `isAllowedOnlyOfficeDownloadUrl` is 40288 (not 40287); T18 service handler starts 52813 (not 52816); T19 constants start 52295 (not 52290); T22 class ends 54865 (not 54868); T24 `resolveSessionKey` 54693 (not 54692). `sanitizeOnlyOfficeConfig` OLD:41673-41706, `assertDocumentUrlMatchesFile` OLD:38570-38596 with throw detail wörtlich at 38594, `OnlyOfficeTokenResponseDto` NEW:56717 (`token` only, `@ApiProperty`), `ONLY_OFFICE_CALLBACK_AUTH` NEW:51766-51769, `protect: false` NEW:56220, `stringToStableHash` NEW:52295-52305, `KeyedMutex` NEW:54845, `normalizeFilePath` NEW:10025, `InvalidCallbackToken` NEW:7102, `@Query('share')` NEW:51497 — all exactly as claimed.
- **N3 — T24's filename rationale is wrong (harmless).** `scripts/checkFilenames.ts:42` strips `-_.` and lowercases, so `onlyoffice-session-key.service.ts` matches `OnlyOfficeSessionKeyService` *directly*; no `service`-suffix rule involved. Same for `keyedMutex.ts` ↔ `KeyedMutex`.
- **N4 — T1 cites the wrong pattern file.** `libs/src/filesharing/constants/activeDocumentEditor.ts` does the *opposite*: `export { ACTIVE_DOCUMENT_EDITOR }` named + `export default ActiveDocumentEditor` (the type). T1's own instruction (default-export the const) is fine — drop the citation.
- **N5 — T8's `response.config as IConfig` may hit TS2352.** T2 types `document.permissions?: Record<string, boolean>`, OnlyOffice's `IPermissions` has non-boolean members. Pre-authorize `as unknown as IConfig` or narrow the type, otherwise the agent hits the tsc gate with no prescribed exit (and AGENTS.md discourages casts).
- **N6 — verify command form.** Jest is 29.7.0, so singular `--testPathPattern` is right. But `package.json` uses `nx run api:test --detectOpenHandles` *without* `--`; `npx nx run api:test -- --testPathPattern=…` (@nx/jest 22.3.0) is unverified. Smoke-test the exact form once on the box before 15 tasks depend on it.
- **N7 — T17's `npx nx test frontend --run <path>`** is unverified arg-forwarding (target is `nx run frontend:test`, vitest). `npx vitest run <path>` is the safe form.
- **N8 — goal/scope mismatch.** Title says "OnlyOffice-/**Collabora**-Härtung"; no task touches `collabora.service.ts` or `wopi.controller.ts`. Rename or state "Collabora nicht im Scope".
- **N9 — T9 step 6 silently drops two existing lines.** The fork already has `uniqueFileName = \`${randomUUID()}-${filename}\`` (onlyoffice.service.ts:86) and `if (!file) return 404` (:94-96), matching OLD:40277/40280-40282. T9's rewrite list omits both; spell them out so an agent rewriting the method doesn't lose the 404.
- **N10 — T9 vs. existing throw style.** `generateOnlyOfficeToken` (onlyoffice.service.ts:69-73) throws `AppNotProperlyConfigured`/500 on a missing secret; T9 wants a plain `res.status(500).json({error:1})`. Both correct (OLD:40247-40249), but note it's deliberate so the reviewer doesn't flag it.
- **N11 — T26 should state why `options.share` may be `undefined` and still match T27.** `buildIdentity` does `share ?? ''` (NEW:54687), so T26's raw `options.share` and T27's `auth.share ?? ''` collide on `''`. Correct, but it's the whole persist-pin — make it explicit.
- **N12 — missing: `findDocumentsEditorType.ts` is never touched.** Risk note 8 claims "Ende von `Math.random()`-Keys", but lines 32/40/50/53 keep minting random keys that ship in the request body. Add a task, or state explicitly that the client key survives and is overridden server-side by T25's `documentKey`.
- **N13 — missing: `swagger-spec.json`** (committed at repo root) is not updated for the changed `POST /filesharing/only-office` request/response nor the new `@Public` callback query param. Confirm whether it's generated or hand-maintained.
- **N14 — T12 keeps `TOKEN_TTL: '7d'` (2.1.0-treu, correct)**, but a leaked `callbackUrl` is then a 7-day unauthenticated write primitive on the `@Public` route. Not a code change — record it explicitly in T11/T28 as an accepted risk.
- **Verified-good claims** (no action): `PUBLIC_FILESHARING` = 0 hits in the repo ✓; `access.guard.ts` returns `true` on `isPublic` ✓; `extractToken` query support ✓; `CacheModule … isGlobal: true` at app.module.ts:93 ✓; `JwtModule.register({global:true})` at :85 ✓; 0 specs under `libs/` ✓; `apps/api/src/common/cache-manager.mock.ts` exists ✓; `CollaboraService.getFileStat(username, filePath, share)` at collabora.service.ts:81 returning `DirectoryFileDTO` with `etag: string` ✓; `FileSharingErrorMessage.{FileNotFound,WebDavError,MissingCallbackURL,PublicFileIsRestricted}` all exist and are translated in de+en+fr ✓; `check-error-message-translations`/`check-spec-coverage` scripts exist ✓; `iter.sh cmd` subcommand exists ✓; `docs/document-editor.{de,en,fr}.md` exist ✓; markdown SPDX header convention matches `docs/features/*.md` ✓; `url={publicDownloadLink}` (FileRenderer.tsx:175) → `/edu-api/downloads/<hash><ext>`, same origin as `getCallbackBaseUrl` → the 403-radius in risk note 5 holds ✓; no migration/schemaVersion needed ✓; no new deps needed ✓.

LEDGER-NEEDS-WORK — 6 blocking

---

## Adversarial review — p6-migrations-2-1-catchup

**What holds up (checked, not assumed):** all 13 `*MigrationsList` anchors (4995/7701/8277/10323/26338/46194/55922/61602/62406/64737/69663/71090/74705), the 14 `runMigrations` lines, the engine at 4941‑4952, all 9 fork `@Prop({default:n})` values (appconfig:59=10, globalsettings:46=8, survey:73=1, survey-answers:41=3, surveys-template:43=1, bulletin:55=1, bulletin-category:62=1, notification:86=1, webdav-shares:77=2), the 5 template constants' `accessibleByRoles` lines, the `version`-is-not-the-contract evidence (6097/6148 both `version:8`; 62439/62531 both `version:1`), the T27 `$lt:2` type-bracketing claim, and the AES-GCM / master.key / users-000 / publicShares-001 / tldraw / calendar / surveys bodies. Anchor accuracy is unusually good.

### BLOCKING

**B1 — T19 breaks `getPassword` at runtime (silently).** Fork `users.service.ts:215/234` reads `existingUser.encryptKey` raw into `getDecryptedPassword` (CryptoJS). 2.1.0 does **not**: it unwraps first (`NEW:10477-10481`) and throws `UserErrorMessages.EncryptKeyUnwrapFailed`, wraps on write (`NEW:10356`), and unwraps in the cache path (`NEW:10341`). The ledger explicitly says "**ohne** den bestehenden CryptoJS-Pfad anzufassen" — that path is exactly the consumer. After migration000 every key is `wrapped:…`; CryptoJS decrypts with the wrong key and returns `''` rather than throwing → mail/webdav/LMN password retrieval silently returns empty. Also `users.service.ts:86` upserts `encryptKey: userDto.encryptKey` unwrapped, so new users diverge from migrated ones. T19 must include: unwrap in `getPassword`, wrap in the upsert, new `UserErrorMessages` key, and a spec covering both.

**B2 — T16/T17 miss the notification route contract.** `libs/src/notification/constants/sourceTypeToApp.ts` is `Record<NotificationSourceType, string>` — adding `SURVEY_PARTICIPATION` to `NOTIFICATION_SOURCE_TYPE` makes it non-exhaustive → tsc error in libs and frontend. T16 lists neither `sourceTypeToApp.ts` nor `deepLinkSourceTypes.ts`, and its Verify contains **no tsc run at all**. Substantively worse: 2.1.0 maps it to `surveys/participation` (`NEW:24050`) and adds it to the deep-link list (`NEW:24122`). Without that, T17's migration rewrites every existing survey notification to a sourceType that resolves to `/surveys` — the opposite of what `'000-survey-notification-should-link-to-participation-page'` promises. Port the map + deep-link entry (needs `SurveysPageView.PARTICIPATION`) in T16.

**B3 — T15's rename scope is wrong and its Verify is self-contradictory.** `grep -rn ciLightBlue apps libs` returns 20 hits, not the 5 files listed: `ThemeSettings.tsx:77` (`key`/`labelKey`/`descriptionKey`), the i18n keys `ciLightBlue`/`ciLightBlueDescription` in **de+en+fr** translation.json, and five Tailwind *class* usages (`text-ciLightBlue` ×3, `bg-ciLightBlue`, `border-ciLightBlue` in WebdavInfoDialogBody, ShareLinkScopeSelector, SaveButton, CircleLoader, Card). So: `i18n: keine` is wrong (3 files); the required end state `grep == leer` is unreachable with the listed files; and renaming the `tailwind.config.ts:22` key breaks those five class strings **invisibly** — neither `tsc --noEmit` nor vitest catches a dead Tailwind utility, yet those are the only FE checks named.

**B4 — T21's bugfix rationale is wrong and would persist corruption.** Bump is at `NEW:74798` (ledger says 74799), catch at 74800 (says 74801) — the bug is real. But the single write is `updateOne({roomId}, hasChanges ? {$set:{roomData, schemaVersion}} : {$set:{schemaVersion}})`, and `roomData` is mutated **in place** while iterating assets. Moving that write into `finally` after a throw persists half-namespaced `roomData` whose asset files were only partly moved — directly contradicting the stated justification "bleibt inhaltlich exakt im Vorzustand". The correct fix: on error write `{$set:{schemaVersion}}` **only** (never `roomData`). Spec must assert `roomData` is not written on the failure path.

**B5 — T24/T25 reorder creates a permanent boot oscillation.** Upstream `publicShares/000` (`NEW:55954-56008`) filters on `{acl:{$exists:false}} | {invitedAttendees:{$exists:true}} | {isPublic:{$exists:false}}` — those clauses still match docs sitting at `schemaVersion:2` — and then `$set: {schemaVersion: 1}`, a downgrade. Once the ACL package lands 000 ahead of 001, every boot runs 000 (→1), then 001 (→2), forever, and `assert-schema-versions` flaps. The ledger calls the reorder simply "unabhängig und nicht-destruktiv". It must record the binding constraint: when 000 lands it uses `$max` (or is renumbered), never `$set: {schemaVersion: 1}`.

**B6 — the Verify idiom is unproven and can be vacuously green.** ~25 tasks verify via `npx nx run api:test -- --testPathPattern=X`. `apps/api/project.json` declares no `test` target (inferred plugin), and nothing in the repo demonstrates that `--` args reach Jest. If they don't, Jest runs the *whole* suite and passes — the verify goes green even if the new spec was never written. T5 must establish the idiom once (assert the filter actually narrows, e.g. by test count, or use `npx jest -c apps/api/jest.config.ts <pattern>`), before 25 tasks depend on it.

**B7 — T11 cannot satisfy "keine Magic Strings" with T10 as scoped.** Fork `extendedOptionKeys.ts:23-26` has only `MAIL_IMAP_URL/PORT/SECURE/TLS_REJECT_UNAUTHORIZED`. `KEY_RENAMES`/`KEYS_TO_REMOVE` (`NEW:6364-6370`) also reference `MAIL_SMTP_URL`, `MAIL_SMTP_TLS_REJECT_UNAUTHORIZED`, `MAIL_SMTP_SECURE` — none exist in the fork and T10 adds only `MAIL_HOST`, `MAIL_TLS_REJECT_UNAUTHORIZED`, `MAIL_SMTP_PORT`. T10 must also add the three legacy SMTP keys (or T11 must be allowed literals, explicitly).

**B8 — T14's Verify is not runnable as written.** `getOrganizationType` reads env at **module load**, destructured: `const { EDUI_ORGANIZATION_TYPE = ORGANIZATION_TYPE.SCHOOL } = process.env` (`NEW:8160`) — not per call. A spec that does `process.env.EDUI_ORGANIZATION_TYPE='business'` then calls the imported function gets `'school'`. Both T13 and T14 need `jest.resetModules()` + dynamic re-import (or a deliberate, documented deviation to per-call read).

**B9 — T42 is truncated.** The ledger ends mid-token: `Verify: … bash scripts/crabbox/iter`. The final task — the only full-stack proof and the single source-of-truth consolidation — is not executable as delivered.

### NITs

- **T24 identifier wrong:** fork field is `this.shareModel` (`filesharing.service.ts:58`), not `publicShareModel`; `FilesharingService` does not yet implement `OnModuleInit`.
- **T26's check-filenames hedge is moot:** `scripts/checkFilenames.ts` has `IGNORED_PREFIXES = ['migration']` — `migration001.ts` is skipped unconditionally. Worse, `npm run check-filenames` reads `git diff --cached`; run standalone on the box with nothing staged it prints "No files staged" and exits 0 → vacuous verify.
- **T4/T5 scope undefined:** fork also carries `schemaVersion` on `chat/*` (3 schemas), `parent-child-pairing`, `userNotification`, `ldap-keycloak-sync` — none with a migration list. State that the guard covers only models that have a list, or T5 is ambiguous/red.
- **Anchor drift (harmless):** T21 74799/74801 → 74798/74800; T3 ":66-73" → populate is :74-78, `continue` :83/:87; T34 ":37-64" → :32-63; T23 `resolveCalendarFromList` 43969 → static at 43962; surveys/001 `version:1` at 62531 not 62530. Internal inconsistency: T2 cites `webdav-shares.schema.ts:78`, T4 cites `:77` for the same `@Prop` (`:77` is correct).
- **T42 alias import:** no existing `scripts/*.ts` imports `@libs/*` (`checkErrorMessages.ts:73` rewrites the alias by hand). Root `tsconfig.json` does carry `paths` so tsx v4 should resolve it — verify once rather than assume.
- **T8/T9/T12 declare "Komponente: libs" but list no libs file** beyond `terminalSchemaVersions.ts`; `usesPushNotifications`/`isPinned`/`shareActions` never reach the AppConfig DTO, against the stated contract-sync guardrail.
- **T7b adds no `MASTER_ENCRYPT_KEY` line to `apps/api/.env.default`**, although T13 sets that precedent for `EDUI_ORGANIZATION_TYPE`.

### Missing
Route/deep-link mapping for `SURVEY_PARTICIPATION` (B2); the encryptKey consumer refactor + `EncryptKeyUnwrapFailed` error key (B1); the i18n key rename for the theme setting (B3); the `$max` constraint on the deferred publicShares/000 (B5). No task covers what happens to `apps/api/src/notifications/userNotification.schema.ts` (also carries `schemaVersion`, never migrated) — probably correct, but say so.

LEDGER-NEEDS-WORK — 9 blocking

---

## Findings

### BLOCKING

**B1 — T5: the spec can never run.** `libs/src/common/utils/compareSecretsConstantTime.spec.ts` is picked up by *no* runner. `apps/api/jest.config.ts` sets no `roots` (rootDir = `apps/api`), and `apps/frontend/vite.config.mts:59` has `include: ['src/**/*.{test,spec}...']` relative to `apps/frontend`. There are zero `*.spec.ts` under `libs/` today (`find libs -name '*.spec.ts'` → empty). So `npx nx run api:test --testPathPattern=compareSecretsConstantTime` matches nothing → jest exits "No tests found" (`passWithNoTests` is not set). The whole T5 verification, which is the only proof that the constant-time comparison works, is void. Fix: put the spec in `apps/api/src/common/...`, or add a libs runner. Same trap applies to any future libs spec.

**B2 — `apps/api/src/auth/auth.service.spec.ts` does not exist, but 7 tasks verify against it.** T13, T15, T16, T17, T18, T24, T27 all say `npx nx run api:test --testPathPattern=auth.service` "grün" with detailed spec expectations, yet none lists the spec file under `Dateien` (only `auth.service.ts`). The only auth spec in the fork is `auth.controller.spec.ts` + `authThrottle.spec.ts`. As written, the command finds no tests and fails. Every task that carries security-critical assertions (cost-parity call counts, the `$or` replay filter, "falsches Passwort ⇒ **kein** TotpMissing") needs `auth.service.spec.ts (NEU)` in its file list, and T13 must be the one that creates it.

**B3 — T23/T26 put `QrLoginSessionService` in the wrong module, contradicting the bundle, and it is not listed under DEVIATIONS.** 2.1.0 provides *and* exports it from the `@Global` `SseModule` (main.js:74093–74102: `providers: [SseService, QrLoginSessionService], exports: [SseService, QrLoginSessionService]`), and `AuthModule` exports **only** `SessionDenylistService` (main.js:67274–67278). The ledger instead puts it in `AuthModule.providers/exports` (T23) and then forces `SseModule` to `import AuthModule` (T26) — a module edge upstream does not have, on top of T9's new `TLDrawSyncModule → AuthModule` edge. Since the fork's `SseModule` is already `@Global` (`apps/api/src/sse/sse.module.ts:26`), the bundle's placement gives `AuthService` (T24) the provider for free with **no** new import in either direction. Follow the bundle or declare this as a deviation with a reason.

**B4 — T27 is missing its dependency on T24.** T27 makes `AuthService.loginViaApp` call `this.qrLoginSessionService.consume(sessionId)`, but the constructor injection of `QrLoginSessionService` into `AuthService` is only introduced by T24. `Abhängt von: T6, T7, T23` — T24 is absent. Executed in the stated order, T27 does not compile.

---

### NITs

**Anchors** — spot-checked, all real, several off by a few lines:
- ✅ exact: 11188–11202 `AUTH_PATHS`, 11389–11400 `AUTH_ERROR_MESSAGES` (`TotpAlreadyUsed`/`LogoutFailed` are indeed the only two new ones), 67340–67341, 67360–67392, 67466–67521 (incl. `if (experimentalAuth)` at 67507), 67536/67553 `$unset`, 67075–67092 `resolvePrincipals`, 67098–67150, 67859–67934, 67960, 68041–68043, 68064–68074, 68104–68119, 68188–68210, 68370–68377, 68406–68413, 68440, 68513–68589, 74176–74184, 74216–74229, 79612–79699, 11446/11493–11496.
- ❌ off: T6 claims the UUID regex at **57656** — it is at **57677** (`const UuidRegexPattern`, module 879; 57650 is `ONLY_OFFICE_GUEST.ID_PATTERN`). T4 claims `MILLISECONDS_PER_SECOND` at **45553** — it is **45555**. T18 claims migration `000-add-db-version-number` at **5017–5033** — `migration000` starts at **5038**. T3's constants are at 67812–67821, not 67785 (that's the module boundary).
- T6 names the constant `UUID_REGEX_PATTERN`; the bundle calls it `UuidRegexPattern`. Pick one; filename must match the default export.

**Fork-reality error in riskNotes.** "Passwörter, die legitim auf `:123456` enden, wurden bisher für Nicht-MFA-User falsch gesplittet und schlugen fehl" is false: `auth.service.ts:142–144` returns `this.signin(body, passwordString)` *before* any split for non-MFA users. Today only MFA users are affected. The T15 verify built on this premise tests the right thing anyway, but the note misleads a reviewer.

**T10 deviates from the bundle's write guard.** Bundle: `if (user) { request.user = user; request.token = token; }` (main.js:79684–79687). T10 says "erst dann `request.user = user; request.token = token;`" unconditionally, which would set `request.token` for an unverified/denylisted token on a `@Public` route. Harmless today (`getBearerSessionFromRequest` returns `request.user`, i.e. `undefined`), but it weakens the very invariant T12 calls the security boundary. Port the `if (user)` guard.

**T7's rationale is subtly wrong.** With `transform` disabled (which is what the bundle's pipes use), NestJS `whitelist: true` does *not* strip extra keys from the value handed to the handler — it only enables `forbidNonWhitelisted`. The choice (`whitelist` on `POST /auth`, `strict` elsewhere) is still right; the stated reason isn't.

**Store-interface files missing from FE `Dateien` lists.** T29 must also touch `libs/src/user/types/store/totpSlice.ts`, T31 `qrCodeSlice.ts`, T32 `userSlice.ts` (`logout: (refreshToken?: string) => Promise<void>`). tsc will catch all three, and T29's grep covers `libs/src`, so recoverable — but not "no further research".

**T31 leaves a duplicated TTL magic number.** `LoginPage.tsx:242` hardcodes `3 * 60 * 1000` for the QR timeout. Once the server owns the TTL via `QR_LOGIN_SESSION_TTL_MS` (T3), that literal is a silent contract duplicate and an AGENTS.md magic-number violation. T31 should import the shared constant.

**Cookie `secure` flag is an untested deploy dependency.** T25 ports `secure: process.env.NODE_ENV !== 'development'`. If the crabbox/production stack ever serves plain HTTP, the cookie is dropped and the SSE channel 403s with no diagnostic. Worth an explicit line in T34's Betriebsdoku.

**`POST /auth/logout` is `@Public()` with no throttle** (bundle included, main.js:68104–68112). An unauthenticated caller can hammer Keycloak's revocation endpoint. The ledger throttles `qr-session` as a bundle-bug fix but not this. Consider `@Throttle(..., { byIp: true })` — same rationale.

**T3's Verify contains editorial leftovers** ("`node -e "console.log(1)"` als Platzhalter entfällt — stattdessen: …"). Clean it up; the two real assertions (tsc + the negative grep for `edu-api/sse/auth`) are good.

**T34 numbering caveat is right** — `docs/adr/` really has two `0001-*` and one `0002-*`.

**Verified-as-correct (no action):** i18n gate really bites — `AuthErrorMessages` is an enum reachable from `libs/src/error/errorMessage.ts:22,51`, and `scripts/checkErrorMessages.ts` enforces de/en/fr; `check-circular-deps`, `check-spec-coverage`, `check-external-references` all exist in `.husky/pre-commit`; all `iter.sh` targets used (`lint|test:api|test:frontend|i18n|build|cmd|deploy`) exist; `cookie` is a dep (package.json:116); `cache-manager.mock.ts` exists; `CommonErrorMessages.INVALID_REQUEST_DATA` is at line 31 and `RATE_LIMIT_EXCEEDED` matches main.js:67182; `JwtUser` carries `sid` and `exp`; `User` has no `schemaVersion` (so "no migration" holds); all FE line anchors (LoginPage 73/109/200/222/256–263/271–279/327/386, createTotpSlice 58–77, createUserSlice 47–51, useLogout 49) are accurate; `silentLogin` posts to Keycloak's own login form with the plain password, so T18's replay protection does **not** break it.

LEDGER-NEEDS-WORK — 4 blocking

---

Verified anchors and fork state directly. Findings:

## 1. Anchors (spot-checked)
All checked anchors hold: APPS NEW:188-231 (41 entries, `CONTACTS`+`SATELLITES` present) · ThemeColors NEW:5905-5931 (`ciDarkBlue`) · DEFAULT_THEME NEW:5975-5990 (`#0081C6`) · migration list NEW:8267-8287 (000-008) · migration007 NEW:8764-8787 (8→9) · migration008 NEW:8817-8853 (verbatim as described, incl. `OLD_CI_LIGHT_BLUE_DEFAULT='#67b2e0'`, 9→10) · TldrawSyncRoom NEW:74318-74338 · onModuleInit/assertRoomAccess NEW:74411-74429 · migrationsList NEW:74705 · migration000 NEW:74742-74806 · namespaceLegacyTldrawAssetUrl NEW:74836-74855 · TLDRAW_SYNC_ENDPOINTS NEW:74882-74889 · Controller NEW:75238-75344 (3× `UseGuards(WhiteboardAssetAccessGuard)`) · Guard NEW:75404-75435 · isValidTldrawRoomId NEW:75466-75472 · pattern NEW:75499 · multer NEW:65960-66000. Bundle facts re-measured: React-19 sentinel present / React-18 absent, zero helmet markers, `@tldraw/sync`,`3.15.6`, `text-ciDarkBlue`=12 / `bg-`=6 / `border-`=6 / `ciLightBlue`=0. T14's three counts are exact (7 `.defaultProps`, 1 `useRef<Keycloak>()`, 5 bare `JSX.Element`).
- **NIT** T12: `getMailDomains` is NEW:27880-27882, ledger says 27881-27883 (off by one).

## 2. Invention
- **NIT** T8 claims `sanitizePath` doesn't exist in the fork and `sanitizeFileName` is "das Pendant". Verified: `libs/src/filesystem/utils/sanitizeFileName.ts` is byte-identical to bundle module 288. Claim is right — but the task should say *identical*, so T10's disk-name derivation is provably the same as the uploader's.
- **NIT** T1's rewritten header text ("2.0.200 bleibt per `REF_VERSION=2.0.200 …` holbar") is false: `REF_TAG` defaults to `latest`=2.1.0 and the version pin aborts; per `.reference/2.0.156/PROVENANCE.txt` the 2.0.200 image is no longer pullable at all.

## 3. Fork reality — BLOCKING
- **BLOCKING (T7)** `assertRoomAccess` does **not** exist in the fork. `apps/api/src/tldraw-sync/tldraw-sync.service.ts` has only `getPermittedUsers` (:151) and an inline check inside `getHistory` (:165-167). T7 states "existiert im Fork bereits" and no task ports NEW:74414-74429. The guard will not compile. Needs a T6.5 that adds `assertRoomAccess(roomId, username)` (single-prefix equality, multi-prefix membership, else 403 `CustomHttpException(AUTH_ERROR_MESSAGES.Forbidden, …, TLDrawSyncService.name)`) and, ideally, refactors `getHistory` onto it.
- **BLOCKING (T4 ↔ T5)** The migration can never run in this fork. Chain ends at `migration006` → `newSchemaVersion = 8`; `migration008` selects `{schemaVersion: 9}`. T5 is human-gated on a migration007 that lives in *another* package, but T4 is `[ ]` and ungated — it deletes `ciLightBlue` from the type, the Mongoose `ThemeColors` prop and `applyThemeColors`. With `strict` schemas + `getThemeWithDefaults` spreading `defaultValues.theme.dark`, every existing install silently loses a customized brand colour with no forward path. Either gate T4 with T5, or let this package own a 007 placeholder, or state explicitly that fork-008 uses `previousSchemaVersion = 8`. Ledger picks none.
- **BLOCKING (T12)** Ships as `[ ]`, so an autonomous agent will drop `@UseGuards(AdminGuard)`. The only fork consumer is `MailcowAdminPanel.tsx` (admin panel); 2.1.0's rationale (sender classification in the normal client) has no counterpart in the fork FE. CLAUDE.md: guards never "simplified", product decisions never silently made. Must default to `[?]`.
- **NIT (T9)** Fork uses `` `${APPS_FILES_PATH}/${APPS.WHITEBOARD}` `` in upload/delete while `WHITEBOARD_FILES_PATH` uses `join()` → `data/apps/whiteboard` vs `./data/apps/whiteboard`. Harmless after T8's `resolve()`, but say so.
- **NIT (T8)** File list names `filesystem.controller.ts:158`, which is a `createDiskStorage` call, not `createAttachmentUploadOptions`. There are exactly 6 `createAttachmentUploadOptions(` call sites + 2 `createDiskStorage(` sites (:158 and the internal one at multer.utilities:76). Enumerate both fabrics.

## 4. Verify commands
- **BLOCKING (T19)** see §5/ordering below — its named acceptance criterion cannot detect the defect it is supposed to catch.
- **NIT (T8)** `grep -c 'createAttachmentUploadOptions(' apps/api/src --include='*.ts' -r` → "6 Aufrufstellen + 1 Definition" is wrong twice: `grep -c -r` emits per-file counts, not a total, and the definition line (`export const … = (`) does not match the pattern.
- **NIT (T6)** `npm run check-filenames` is `git diff --name-only --cached | xargs …` — on the synced box nothing is staged, so it passes vacuously. Use `npx tsx scripts/checkFilenames.ts <paths>` explicitly.
- **NIT (T2/T17)** `i18nNamespaces.length === 165` / `=== 157` are exact-equality assertions on a heuristic (ObjectExpression with >15 props containing `settings`+`common`) over a minified bundle; one rolldown chunking change turns this red for no real reason. Prefer superset assertions on the 8 named new namespaces.
- Everything else is runnable: `iter.sh` accepts `lint|test:api|test:frontend|i18n|build|all|cmd|deploy|shots`; `check-spec-coverage`, `check-translations` exist; `controllerContractReflection.getRouteGuards` exists (`apps/api/src/common/controllerContractReflection.ts`); `acorn@8.15.0` and `fs-extra@11` are installed locally, and `.reference/` is local-only + gitignored, so T2's local run is coherent.

## 5. House rules
SPDX, tri-lingual i18n, schemaVersion bump, guard-porting are all called out correctly. T4's file/line list matches the fork's `ciLightBlue` grep **exactly** (21 hits, incl. all three locales).
- **NIT (T5/T10)** "Eintrag in `docs/migrations/` nach dem dort etablierten Muster" — `docs/migrations/` holds only `2.0-migrations-inventory.md` and `upgrade-1.6-to-2.0.md`; there is no per-migration pattern. Name the file.

## 6. Ordering
Chains T6→T7→T8→T9→T10→T11 and T14→T15→T16→T17, T18→T19→T20→T21 are sound. T5's cross-package dependency is honestly declared (but see §3).
- **BLOCKING (T19)** The enumerated port of `.eslintrc.json` lists ignores/extends/env→globals/parserOptions/rules/overrides and **omits `settings`** (`import/parsers` + `import/resolver.typescript` with the four tsconfig projects) and the explicit `plugins` array. Without the TS resolver, `import/no-unresolved` fires on every `@libs/*` import. T19's stated "eigentliches Abnahmekriterium" is a `jq -S '.rules'` diff, which by construction cannot see `settings` drift.
- **NIT (T9→T11)** Between T9's commit and T11's, whiteboard asset upload/delete is broken in the fork. Either state that T9-T11 land as one push, or note the window.

## 7. Missing
- A task porting `assertRoomAccess` (see §3) — the single hardest omission.
- No task adds `libs/src/tldraw-sync/constants/tldrawRoomIdSegmentPattern.ts`'s sibling: T6 places `isValidTldrawRoomId` in `libs/src/tldraw-sync/utils/` but imports the prefixes from `@libs/whiteboard/constants/*` — fine, just confirm no circular-dep trip (`npm run check-circular-deps` runs in pre-commit and is not in any Verify block).
- No `PageTitle` spec after the Helmet removal (T15 changes rendering behaviour with zero test).
- T21 lists `.github/workflows/*` generically; the only lint invocation is `build-and-test.yml:208` (`npm run lint`, no `--ext`) — nothing to change, worth saying so to prevent drive-by edits.
- No task re-runs `npm run check-npm-audit` after two dependency-tree rewrites (T15/T16/T20) despite the standing CVE-baseline debt.

LEDGER-NEEDS-WORK — 4 blocking

---

## Anchor audit
Spot-checked ~180 quoted `NEW:` anchors against `.reference/2.1.0/api/main.js` (md5 `0b3e75fa24db34bb46df8d7d6f34a5c9`, 94907 lines — both match the header). **All resolved to the claimed symbols**, including: `MAIL_ENDPOINT_PATHS` 28902–28927 (24 keys ✓), `MANAGESIEVE: 4190` 4021, `TOTAL_WIRE_MAX_BYTES = 20_971_520` 29046 (literal, no env ✓), all 20 DTO classes (T12/T13), the whole `ManageSieveClient` method table 36306–36497, `quoteString` 36552, `escapeSieveQuoted` 37060, `sanitizeTargets` 37381 (calls `escapeSieveQuoted` ✓), `sanitizeRuleName` 37650 (`/[\r\n[\]]/g` ✓), `buildConditionTest`/`buildAction` escape ✓, all 43 controller decorator anchors, `strictTransformValidationPipe` 18878 with `forbidNonWhitelisted` ✓, appconfig 2371–2375 / 2411–2415 / 3925–3991 / 4054–4062 / 3632–3640 ✓, `migration012` KEY_RENAMES → `MAIL_HOST` with **zero consumers** ✓ (only 4 occurrences, all inside the migration). The three flagged "Fakten-Korrekturen" in the header are all verifiable and correct, including `GET domains` having only `Get`/`ApiOperation`/`ApiResponse` (28387–28394, no guard).

## BLOCKING

**B1 — T41 breaks the build; the deleted keys still have four live fork consumers.** T41 removes `MAIL_IMAP_URL`/`MAIL_IMAP_SECURE`/`MAIL_IMAP_TLS_REJECT_UNAUTHORIZED` but no task touches: `apps/api/src/mails/mails.service.ts:115-118`, `apps/api/src/mails/mail-idle.service.ts:122-129`, `libs/src/appconfig/constants/extendedOptions/imapMailFeed.ts:26/34/42/50`. T15 even states "Der bestehende `MailIdleService` bleibt unangetastet" — direct contradiction. Additionally no task wires the new option groups into the settings UI: `apps/frontend/src/pages/Settings/AppConfig/appConfigOptions.ts:42,85` maps `AppConfigSectionsKeys.imapMailFeed → MAIL_IMAP_EXTENDED_OPTIONS`, and `appConfigSectionsKeys.ts:26` has no `mailServer`/`mailboxManagement`/`mailExternalProviders` key. The new fields would never render.

**B2 — T15/T20 are ordered before the keys they read exist.** `ImapConfigService` reads `MAIL_IMAP_HOST/PORT`, `MAIL_TLS_REJECT_UNAUTHORIZED`; `MailSmtpService` reads `MAIL_SMTP_HOST/PORT`. Those `ExtendedOptionKeys` entries only appear in T41. T26 correctly declares `Abhängt von: T41`; T15 (`T10, T11`) and T20 (`T13, T15`) do not → `tsc` fails.

**B3 — Missing task: the `mailImapFlags` module.** 2.1.0:24276–24305 defines `MAIL_IMAP_FLAGS`, `MAIL_SPECIAL_USE`, `MAIL_FOLDER_NAMES`, `SYSTEM_FOLDER_NAMES`, `MAIL_PATHS`. The fork has none of it (`grep -rn "MAIL_FOLDER_NAMES\|MAIL_SPECIAL_USE" libs/ apps/` → empty). T11 (`MAIL_DEFAULTS.FOLDER = MAIL_FOLDER_NAMES.INBOX`, 28957), T16 (`flagsToStatus`/`statusToFlagUpdates`), T18 (`resolveDraftsFolder`/`resolveSentFolder` at 33497/33500 use `MAIL_SPECIAL_USE.DRAFTS`/`MAIL_FOLDER_NAMES.DRAFTS`) all depend on it. T11's escape hatch covers only `'INBOX'`.

**B4 — T35 scopes the MailsService delta against 2.0.200, not against the fork.** The fork's `mails.service.ts` ends at `deleteSyncJobs` (line 549). Missing and unassigned to any task: `sendMail`, `saveDraft`, `resolveSenderCredentials`, `fetchForwardAttachments`, `mergeForwardAttachments`, `getSharedMailboxes`, `getSharedMailbox`, `getSharedMailboxPassword`, `setMailboxDelegates`, `updateSenderAcl`, `listMailboxFolders`, `listActiveMailcowAliases`, `getMailcowAliasGotos`, `deleteSharedMailbox`, `cleanupSharedMailboxData`, `removeSenderAclEntries`, `getMailcowMailbox`. T37 (`POST outbox`, `POST/PUT drafts`) and T39 (delegates, `cleanupSharedMailboxData`) call methods nobody builds. Related: T35/T39 say `mailsService.getMailcowDomains()`, but in the fork `getMailcowDomains`/`getMailcowMailboxes`/`updateMailboxAcl` live on `MailcowAdminService` (`apps/api/src/mails/mailcow-admin.service.ts:40/57/123`) — 2.1.0 has no `MailcowAdminService` in `MailsModule` (27632–27642). T39's verify would fail as written.

**B5 — Every FE verify command is unrunnable.** `npx nx test frontend --testPathPattern=X` — the frontend runs **Vitest** (`apps/frontend/vite.config.mts:59`, and `scripts/crabbox/iter.sh:17` = `npx nx test frontend --run`). `--testPathPattern` is a Jest-only flag. Affects T45, T46, T47, T48, T49, T50, T51, T52, T53, T55. Correct form is a positional filter, e.g. `iter.sh cmd 'npx nx test frontend --run useMailsStore'`.

**B6 — Dependency links miss the SharedMailbox schema and MailsService.** `RecipientsService` ctor is `(cacheManager, sharedMailboxModel, mailsService)` (38105) and `MailSieveService` ctor takes `mailsService` (35143). T35 (`getManageableSharedMailboxes`/`assertCanManageSharedMailbox`/`decryptStoredMailboxPassword`) needs the T30 model but declares only `T10`; T36 declares `T14, T35` (no T30); T31 declares `T27, T30, T26` (no T35). Built in the stated order, three tasks won't compile.

**B7 — ADR number collision.** `docs/adr/0002-mobile-access-hidden.md` already exists. T40 creates `docs/adr/0002-mails-domains-admin-guard.md` → duplicate/overwrite. Use 0003.

## NITs

- **N1** `reconcileFilterFoldersForChange` is `(emailAddress, password, oldPath, newPath)` (35392); T34 prose and its verify use `(a, null)` / `(old, new)`. T37 must pass credentials — say so.
- **N2** T11 abbreviates field names ("SUBJECT 998"); the bundle uses `SUBJECT_MAX_LENGTH`, `TEXT_BODY_MAX_LENGTH`, `IN_REPLY_TO_MAX_LENGTH`, `ADDRESS_NAME_MAX_LENGTH`, `ADDRESS_MAX_LENGTH` (29047–29054). Name them exactly.
- **N3** T22 verifies a libs-file test via `npx nx test api`. `libs/project.json` has **only** a lint target, and api's Jest rootDir is `apps/api` — a spec under `libs/` is never collected. Fork precedent: `apps/api/src/mails/mailcowMailboxValidation.spec.ts` tests a libs util. State the spec location.
- **N4** T43's `Object.keys(d.mails.errors).length >= 39` is weak: the fork enum already has 26 keys and the full target is ~65 — a half-done port passes. Note also that `iter.sh i18n` additionally runs `check-error-message-translations`.
- **N5** Off-by-one: the partial-unique index is at **35900**, not 35901 (35901 is blank). `parseAutoReplyScript` is at 37291 (module 37253–37350), not "–37353".
- **N6** T44 assumes a running 2.1.0 reference instance. `.reference/2.1.0/` holds only `api/`, `ui/`, `PROVENANCE.txt` — no baselines dir, and the documented crabbox deploy recipe is for 2.0.200. If 2.1.0 can't be brought up, T44 blocks T47/T52/T53; give it a fallback (build FE from the API contract, screenshots optional).
- **N7** T54 edits `defaultAppConfig.ts` for `ACTIVE_MAIL_CLIENT`, but that file has **no** `APPS.MAIL` entry at all (`grep -n MAIL` → empty). The task is a no-op unless it also creates the entry.
- **N8** T13's `grep -L "class-validator" …{a,b,c}.dto.ts` errors (not "liefert nichts") if a file is missing — make it a positive assertion.

## Not found missing / correctly handled
Sieve injection ordering (escape helpers in the same task as their builders) is right and matches the bundle. `assertCanManageSharedMailbox` as the sole chokepoint (T35→T38) is correct — 2.1.0 has no guard on those routes. Migration numbering **010** is right (fork stops at `migration009`). `parseParentGroupName` genuinely does not exist in the fork — T36's opt-out clause is correct and needed.

LEDGER-NEEDS-WORK — 7 blocking

---

## Verification method
Ran `npm audit --omit=dev --json` + `npm run check-npm-audit` in the fork, diffed both reference `package.json`s, and spot-checked ~25 quoted `main.js` line anchors plus every installer anchor.

**Anchors that check out (no findings):** 1702‑1706 `VERSION`, 2363ff `ExtendedOptionKeys`, 2733‑2741 `pickSafeExtendedOptions`, 2770‑2787 `NON_ADMIN_…` (17 keys ✓), 2841‑2873 `SECRET_…`+`SECRETS_WITHOUT_FIELD_DEFINITION`, 8126, 8160, 14276, 16136‑16157, 17196‑17213, 17475, 17621‑17624, 36227‑36228, 64782, 73813‑73817, 76290‑76292, 76328‑76335 (incl. `@Public()`), 76435, 76462‑76467, 76580ff, 76664‑76672, 79274, 79326, all AI anchors (89741/89751/89787/89793/89806/89866/89901/89975/90064/91215). Every version claim in T4–T8 matches `.reference/2.1.0/api/package.json`. The gate‑is‑red claim reproduces **exactly** (4 un‑allowlisted: brace‑expansion, js‑yaml, postcss, sharp; 33 high/crit; `linkify-it` really is a stale allowlist entry). All installer anchors (252‑268, 415, 699‑707, 709, 775‑800, ConfigurePage 28‑39, store :106‑107, LmnInstallPage :138‑139, de+en only, template :4/:18/:52/:115) and HEAD `ff09a9b` on `feat/2.0-backlog` ✓.

## BLOCKING

**B1 · T2 — the js-yaml verify is falsifiable; a second vulnerable node is unowned.**
`npm audit` shows *two* nodes: `node_modules/xmlbuilder2/node_modules/js-yaml 3.14.1` **and** top-level `node_modules/js-yaml 4.1.1`, the latter hit by GHSA-52cp-r559-cp3m (HIGH, range `>=4.0.0 <4.3.0`, `effects: ["@nestjs/swagger"]`). `xmlbuilder2@4.0.3` clears only the first, so T2's "`js-yaml` verschwunden" cannot pass, and no other task (T5 never mentions js-yaml) raises the top-level copy to ≥4.3.0. T2 must additionally install/override `js-yaml@^4.3.0`, or move after T5 and own both nodes.

**B2 · T26 — `JAVA_OPTS_APPEND: ${KC_JAVA_OPTS_APPEND:-}` can never be set.**
Compose interpolates `${…}` from the shell env or the project-dir `.env` — **not** from `env_file:`. T25 writes `KC_JAVA_OPTS_APPEND` into `edulution.env`, which is an `env_file`, so it resolves to empty. Worse, `edu-keycloak` already loads `edulution.env`, so declaring `JAVA_OPTS_APPEND` under `environment:` *overrides* it with `""`. T28's verify (b) (`grep -ci "No subject alternative names"` → 0) will fail. Fix: write `JAVA_OPTS_APPEND=…` into `edulution.env` and do **not** declare it in `environment:`, or emit a project-level `.env`.

**B3 · Missing — nobody sets the fork's version; `/health/version` will report `1.6.266`.**
`package.json.version` = `1.6.266`; `configuration.ts:25` = `process.env.APP_VERSION || rootPackage.version`. T20 ships the endpoint, T22 renders it in the installer, T30 pins image tags — but no task decides the version string / release-tag scheme for a 2.1.0-aligned build. The Installer-Contract this package exists to build would ship a visibly wrong number.

**B4 · T30 — there is no derivable target tag.**
`container-build.yml:49-67` tags by branch slug and adds `:latest` only for `refs/heads/master` or `refs/tags/v*`. The default branch is `main`, so `:latest` has never been produced; the only real tag is `:main`. "Aus dem Workflow ableiten … nicht raten" therefore has no answer — this is a release-policy decision (fix the stale `master` condition or pin `:main`), not an implementation detail. The verify (`grep -c ':2\.0\.0' → 0`) is satisfied by any wrong value.

**B5 · T26 + T30 — `docker compose -f <template> config -q` cannot succeed.**
The template declares `env_file: - edulution.env` for `edu-api`/`edu-keycloak`/`edu-db`; that file is generated only at deploy time and does not exist next to the template, so Compose aborts with "env file not found" independent of YAML validity. T30's `yaml.safe_load` fallback is scoped to "falls kein Docker", T26 has no fallback at all. Make the YAML parse the primary verify.

**B6 · T19 — counts are wrong and the verify is unsatisfiable.**
Measured: 2.1.0 = **52** keys, lines **2363‑2416** (ledger: 56 / 2363‑2419); 2.0.200 = **42** (ledger: 44); fork = **36** (ledger: 37). The 10 new keys listed are correct. But `grep -c "^| " ≥ 56` against an honest 52-row table (+header = 53) fails, which pushes the agent to pad the document with invented rows.

## NITS

- **T18** ignores `libs/src/appconfig/constants/publicExtendedOptionKeys.ts` (`PUBLIC_EXTENDED_OPTION_KEYS`, consumed at `appconfig.service.ts:303` for the public path) — AGENTS.md requires searching first; the new `nonAdminExtendedOptionKeys.ts` needs an explicit relationship statement. T18 also omits the SPDX-header instruction for its 3 new libs files (T14/T16/T20/T21/T29 all state it).
- **T20 verify** names `IS_PUBLIC_KEY`; the fork's decorator uses `PUBLIC_ROUTE_KEY` from `@libs/auth/constants/appAccessKeys`. Invented symbol.
- **T21 verify** is a no-op: `swagger-spec.json` does not exist in the fork and `|| echo` swallows the failure.
- **T14**: "Fork liest 34 Namen" — actual 27 unique / 56 occurrences. `EDUI_ENABLE_USER_KEY_ENDPOINT` is listed as new in 2.1.0 but already exists in the 2.0.200 bundle.
- **T5** expected effect: `@nestjs/{core,platform-express,serve-static,swagger}` are *derived* findings (via `path-to-regexp 8.3.0`, `js-yaml`, `multer`). Bumping the Nest packages alone clears none of them; only the transitive resolution does. The hedge covers path-to-regexp only.
- **T1**: `postcss` is in `devDependencies` only; the prod path is `tailwindcss` (correctly in `dependencies`). Vulnerable range is `<=8.5.17`, so `^8.5.18` is right — but say plainly whether it's a dedupe or an `overrides` entry, don't leave "bzw.".
- **T12**: official DejaVu releases ship TTF only. Name the conversion path (fontTools) and provenance; the WOFF probe is otherwise good.
- **T24 Dateien** omits `apps/webinstaller/src/pages/LmnInstallPage.tsx` although the change says "beide Stellen". `lmnLdapSchema: 'ldap' as const` (store:106) narrows the literal type — flipping the default touches the type.
- **T16 negative probe** uses `git checkout --` on the remote box after `sed -i`; if `.git` isn't part of the incremental tree sync the restore silently fails and leaves `.env.default` mutated. Use a temp copy.
- **T15 verify** `grep -q "^#*$k"` breaks against the repo's `# KEY=` (space after `#`) comment style.
- **Ordering:** T28 rewrites `scripts/crabbox/deploy.sh` but does not depend on T22, which also edits it — T28 landing first drops T22's version logging.
- **Missing:** no task creates `docs/features/p7-deps-config-infra.md`, into which T13/T18/T20/T22 write. `DOCKER_SOCKET_PATH` is inventoried (T14) but assigned no owner.

LEDGER-NEEDS-WORK — 6 blocking
