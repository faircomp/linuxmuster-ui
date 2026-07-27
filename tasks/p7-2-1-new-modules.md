<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# p7 — Neue 2.1.0-Module & große Features  ·  Sub-Ledger-Paket

Ergänzt `tasks/backlog.md` (dort als `## p7-*`-Abschnitte einhängen). Soll-Quelle ist ab sofort
**`.reference/2.1.0/api/main.js` (94907 Zeilen, rev `5c58d5818c…`, gezogen 2026-07-27)** — nicht mehr
2.0.200. Alle Zeilen-Anker unten sind gegen diese Datei verifiziert.

**Branch-/PR-Modell:** unverändert — alles auf den mitwachsenden `feat/2.0-backlog` (je Repo), ein
Commit pro Task, frischer `feature-review` pro Commit, Draft-PR am Ende jedes Sub-Ledgers
(prompt-pflichtig).

**Verify (REMOTE, nichts lokal):** `bash scripts/crabbox/iter.sh <lint|test:api|test:frontend|i18n|build|all>`
bzw. `iter.sh cmd '<command>'`. Frontend-Tasks brauchen **zusätzlich**
`iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` (eslint+vitest verdecken fehlende
Required-Props). API-Isolat: `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'`.

**DoD je Task:** Tests grün · `npm run lint` sauber · i18n **DE+EN+FR** (`npm run check-translations`) ·
SPDX `AGPL-3.0-or-later` + `Copyright (C) 2026 Kevin Stenzel` bei **neuen** Dateien (bestehende behalten
ihren Header) · Auth-Guards nie ohne ihre Route · Migrationen forward-only + `schemaVersion`-Bump ·
Doku im selben Commit.

**Task-Status:** `[ ]` offen · `[x]` fertig · `[~]` übersprungen (Grund) · `[?]` braucht Entscheidung.

## Rekonstruierbarkeit — die harte Wahrheit vorweg

| Ebene | Quelle | Rekonstruierbar? |
|---|---|---|
| API (NestJS) | `.reference/2.1.0/api/main.js` — un-minifiziert, Original-Namen, Zeilen-Anker | **Ja, 1:1.** Alle Anker unten. |
| libs (shared consts/types) | dito (webpack-Module sind 1:1 die libs-Dateien) | **Ja, 1:1.** |
| Frontend (React) | `.reference/2.1.0/ui/assets/index-CHsBOwUD.js` — **minifiziert/gebündelt** | **Nein.** Keine Original-Namen, keine Komponenten-Grenzen. |
| Visuelle Referenz | **kein** `baselines/`-Verzeichnis vorhanden | Nur **live**: 2.1.0-Images (`edulution-{api,ui}:latest`) auf einer crabbox hochziehen und beobachten — das Verfahren, das p5-calendar schon benutzt hat. |

Konsequenz: **jede FE-Task in diesem Paket ist Fork-Original-Design**, keine Rekonstruktion. Sie ist
so formuliert, dass sie den (rekonstruierten) API-Contract bedient; Layout/UX entscheidet der Fork.

## Go/No-Go-Übersicht

| Sub-Ledger | Tasks | Entscheidung | Empfehlung |
|---|---|---|---|
| `p7-contacts` | 20 | technisch — braucht nur eine CardDAV/SOGo-Instanz | **GO**, aber nach `p7-calendar-sogo-sharing` (teilt `DavAuthMode` + SOGo-Betriebsvoraussetzung) |
| `p7-ai` | 15 | **Produkt + DSGVO — nicht technisch** | **HALT bis Kevin entscheidet.** T1 ist der Gate. Guard-Vorarbeit (T2) ist auch ohne AI wertvoll. |
| `p7-lmn-exam-jobs` | 12 | technisch, aber Live-LMN nötig | **GO** — löst ein echtes Timeout-Problem im Klassenraum |
| `p7-lmn-pdf-fallback` | 10 | technisch + **Font-Lizenz-Frage** | **GO nach Lizenz-Klärung** (T2 ist der Gate) |
| `p7-calendar-sogo-sharing` | 16 | technisch, aber **3 Contract-Brüche** + SOGo-Pflicht | **GO mit Vorsicht** — muss vor `p7-contacts` |
| `p7-surveys-limiter-collection` | 9 | technisch, destruktive Migration | **GO** — kleinstes Paket, guter Aufwärmer |

**Reihenfolge (Topo):** `p7-surveys-limiter-collection` → `p7-lmn-exam-jobs` → `p7-lmn-pdf-fallback`
→ `p7-calendar-sogo-sharing` → `p7-contacts` → (`p7-ai` nur nach Freigabe).

---

## p7-calendar-sogo-sharing [P7] ⭐ — Kalender-Freigabe über SOGo-ACLs (ersetzt das Fork-Share-Modell)

_Ziel:_ Das im Fork gebaute, **eigene** Share-Modell (`CalendarShareEntry` in Mongo) durch die
2.1.0-Lösung ersetzen: Freigaben liegen als **SOGo-ACLs** auf dem Server, nicht mehr in unserer DB.
+ 7 neue Routen. · _Abhängt-von:_ `p5-calendar` (erledigt) · _Status:_ offen · _Tasks:_ 16
Soll: main.js:43107-43131 (Controller-Methoden) · 43202-43285 (7 Route-Dekoratoren) · 43404-43411
(Path-Segments) · 43835-43932 (Service-Sharing-Methoden) · 45817-45998 (CalDavClientFactory) ·
46036-46110 (SogoSharingClient) · 46138-46165 (CalendarMetadata **ohne** shares) · 46225-46240
(migration000) · 46272-46315 (migration001) · 46340 (deriveCalendarId) · 46369-46377
(decodeLegacyCalendarId) · 44737-44743 (CalendarAccessLevel) · 44770-44830 (Rights-Mapping)

**Go/No-Go:** **GO, mit offener Betriebsfrage.** Technisch vollständig rekonstruierbar. Aber:
Sharing funktioniert **ausschließlich gegen SOGo** — `getSoBaseUrl()` (main.js:45940-45948) leitet die
`/dav`-Basis-URL auf den SOGo-Web-Baum `/so` um und wirft sonst 503. Der p5-Voll-Stack-Verify lief
gegen **Radicale**; damit ist Sharing **nicht** testbar. Vor dem Start: entscheiden, ob mailcow/SOGo
zur unterstützten Referenz-Plattform für Kalender wird (dann passt es zu `p4-mail-rework`) oder ob
Sharing ein „nur mit SOGo"-Feature bleibt. Das ist eine Produktentscheidung, keine technische.

**Fork-Bestand:** `apps/api/src/calendar/` mit 7 Routen (list/create calendars, set tags, CRUD events),
`CalendarMetadata{calendarId,ownerUsername,shares[],tags[]}`, embedded `CalendarShareEntry`
(`subjectId/subjectType/label/permission`), `CalendarSharePermission`/`CalendarShareSubjectType` in
`libs/src/calendar/constants/`, Kalender-ID = `base64url(url)` (calendar.service.ts:53-54), DAV-Client
**inline** in `calendar.service.ts` (buildClient/backend/dispatcher, Zeilen 84-180).
`CreateCalendarBodyDto.shares` ist **required**. Es gibt **keine** Route, die `shares` je liest oder
schreibt — das Feld ist toter Ballast (Rekonstruktion von 2.0.200, das es genauso hatte).

**Was bricht:** (1) `shares` fällt aus Schema + DTOs (required→weg!) + FE-Store; (2) Kalender-ID wechselt
auf `sha256hex(url)` und ist **nicht mehr dekodierbar** → jeder ID-Konsument muss auflösen statt
dekodieren; (3) zwei Migrationen auf derselben Collection, forward-only, mit `deleteOne`-Merge.
Details in `riskNotes`.

**FE rekonstruierbar?** **Nein.** Share-Dialog, Zugriffsstufen-Auswahl und Ziel-Suche sind
Fork-Original (T14/T15). Der API-Contract ist exakt, das Aussehen nicht.

### T1 — libs/calendar: DavAuthMode vereinheitlichen (Rename + OAUTH)  [ ]
Komponente: libs · Dateien: `libs/src/calendar/constants/calDavAuthMode.ts` → **umbenennen zu** `libs/src/common/constants/davAuthMode.ts`; Consumer: `apps/api/src/calendar/calendar.service.ts`, `libs/src/appconfig/constants/extendedOptions/calendarCaldavExtendedOptions.ts`, `apps/api/src/calendar/calendar.service.spec.ts`
Soll: NEW:3085-3089 (`const DavAuthMode = { BASIC:'BASIC', DIGEST:'DIGEST', OAUTH:'OAUTH' }`, webpack-Modul 78 — in 2.1.0 **shared** zwischen calendar und contacts, deshalb nicht mehr unter `calendar/`).
Änderung: Datei verschieben, Default-Export `DavAuthMode` (Dateiname == Export, AGENTS.md), dritten Wert `OAUTH` ergänzen, alle Importe nachziehen. Werte `BASIC`/`DIGEST` bleiben byte-gleich → **datenneutral** für bereits persistierte appConfigs. Kein neuer SPDX-Header (Datei existiert, Header bleibt).
Verify: `iter.sh lint` sauber; `iter.sh cmd "grep -rn 'calDavAuthMode' apps libs | wc -l"` liefert `0`; `iter.sh cmd 'npx tsx -e "import D from \"./libs/src/common/constants/davAuthMode\"; if(Object.keys(D).length!==3) process.exit(1)"'` exit 0.
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T2 — libs/calendar: CalendarAccessLevel + CalendarShareRole + isSogoTrue  [ ]
Komponente: libs · Dateien: `libs/src/calendar/constants/calendarAccessLevel.ts`, `libs/src/calendar/constants/calendarShareRole.ts`, `libs/src/calendar/utils/isSogoTrue.ts`
Soll: NEW:44737-44743 (`CalendarAccessLevel = { NONE, FREE_BUSY, READ, WRITE }`, Werte == Keys) · webpack-Modul 695 (`CalendarShareRole`, referenziert ab NEW:44775 mit den Membern `NONE`, `DATE_AND_TIME_VIEWER`, `VIEWER`, `MODIFIER`) · Modul 696 (`isSogoTrue`, benutzt in NEW:43859/43890/43913 — SOGo liefert Booleans als `'1'`/`'YES'`/`true`; **die exakte Implementierung von Modul 696 steht nicht im gelesenen Ausschnitt** → vor dem Bauen `grep -n "const isSogoTrue" .reference/2.1.0/api/main.js` und 1:1 übernehmen).
Änderung: Drei Dateien, const-Objekte (**keine enums**), Default-Export am Dateiende, abgeleitete Typen `TCalendarAccessLevel`/`TCalendarShareRole` via `(typeof X)[keyof typeof X]`. SPDX-Header.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import A from \"./libs/src/calendar/constants/calendarAccessLevel\"; if(A.FREE_BUSY!==\"FREE_BUSY\"||Object.keys(A).length!==4) process.exit(1)"'` exit 0.
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T3 — libs/calendar: Rights-Mapping (accessLevelToRights / rightsToAccessLevel)  [ ]
Komponente: libs · Dateien: `libs/src/calendar/utils/calendarShareRights.ts`
Soll: NEW:44770-44830. `RIGHTS_BY_ACCESS_LEVEL` mappt jede Stufe auf `{Public, Confidential, Private, canCreateObjects, canEraseObjects}` — NONE→alle `NONE`/false; FREE_BUSY→alle `DATE_AND_TIME_VIEWER`/false; **READ→`Public: VIEWER`, aber `Confidential`/`Private: DATE_AND_TIME_VIEWER`** (bewusst asymmetrisch: privat markierte Termine bleiben verdeckt); WRITE→alle `MODIFIER`/true/true. `accessLevelToRights` (NEW:44805) fällt bei unbekannter Stufe auf NONE zurück; `rightsToAccessLevel` (NEW:44807ff) leitet zurück ab (bei `canCreateObjects` → WRITE).
Änderung: Named exports `accessLevelToRights`/`rightsToAccessLevel` (Ausnahme von der Default-Export-Regel, wie im Soll — zwei Funktionen, ein Modul). SPDX.
Verify: `iter.sh test:api` mit neuer Spec `libs/src/calendar/utils/calendarShareRights.spec.ts`: Round-Trip für alle 4 Stufen (`rightsToAccessLevel(accessLevelToRights(l)) === l`) grün, plus expliziter Assert `accessLevelToRights(READ).Private === CalendarShareRole.DATE_AND_TIME_VIEWER`.
i18n: keine
Doku: keine (intern)
Abhängt von: T2

### T4 — libs/calendar: Endpoint-Segmente + Fehler-Messages erweitern  [ ]
Komponente: libs · Dateien: `libs/src/calendar/constants/calendar-endpoint.ts`, `libs/src/calendar/constants/calendar-error-messages.ts`
Soll: NEW:43409-43411 (`CALENDAR_SHARES_PATH_SEGMENT='shares'`, `CALENDAR_SHARE_TARGETS_PATH_SEGMENT='share-targets'`, `CALENDAR_SUBSCRIPTION_PATH_SEGMENT='subscription'`) · Fehler-Keys aus den Service-Aufrufen: `ListSharesFailed` (NEW:43871), `SetShareFailed` (NEW:43875/43895), `DeleteShareFailed` (NEW:43898/43904), `SearchShareTargetsFailed` (NEW:43921), `UnsubscribeCalendarFailed` (NEW:43929), `UpdateCalendarFailed` (NEW:43804), `DeleteCalendarFailed` (NEW:43824/43827), `MissingCalDavCredentials` (NEW:45877), `CalendarNotFound` (NEW:45955/45959).
Änderung: Nur bestehende Objekte **additiv** erweitern (Fork-Konvention: `calendar.errors.<Key>`). Keine neue Datei ⇒ kein neuer Header.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import {CALENDAR_SHARE_TARGETS_PATH_SEGMENT as S} from \"./libs/src/calendar/constants/calendar-endpoint\"; if(S!==\"share-targets\") process.exit(1)"'` exit 0.
i18n: die 9 neuen `calendar.errors.*`-Keys kommen in T15.
Doku: keine (intern)
Abhängt von: —

### T5 — api/calendar: deriveCalendarId + decodeLegacyCalendarId  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/utils/deriveCalendarId.ts`, `apps/api/src/calendar/utils/decodeLegacyCalendarId.ts`
Soll: NEW:46340 (`sha256(url,'utf-8').digest('hex')`) · NEW:46369-46377 (`Buffer.from(id,'base64url').toString('utf-8')`, danach `/^https?:\/\//i`-Test; bei Fehler `undefined`).
Änderung: Zwei kleine Utils, Default-Export am Ende, `node:crypto`. **Noch nicht** verdrahten — T6 zieht die Service-Umstellung nach. SPDX.
Verify: `iter.sh test:api` mit Spec: `deriveCalendarId('https://a/b')` ist 64 Hex-Zeichen und stabil; `decodeLegacyCalendarId(Buffer.from('https://a/b').toString('base64url')) === 'https://a/b'`; `decodeLegacyCalendarId('nonsense')` ist `undefined`.
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T6 — api/calendar: Kalender-ID auf Hash umstellen (BREAKING)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/calendar.service.ts`
Soll: NEW:43553/43560ff — 2.1.0 nutzt durchgängig `deriveCalendarId(calendar.url)`; ein `decodeCalendarId` existiert **nicht** mehr. Auflösung ID→URL läuft über `findCalendar(client, calendarId)` bzw. `resolveUrlForId` (NEW:43850-43854).
Änderung: `encodeCalendarId`/`decodeCalendarId` (Zeilen 53-54) durch `deriveCalendarId` aus T5 ersetzen. Jede Stelle, die heute `decodeCalendarId(id)` aufruft, auf „Kalenderliste holen und per `deriveCalendarId(c.url) === id` matchen" umbauen (`findCalendar`, Zeile 467). **Keine** Verhaltensänderung außer dem ID-Format.
Verify: `iter.sh test:api` (bestehende calendar.service-Specs angepasst, alle grün) + `iter.sh cmd "grep -rn 'decodeCalendarId' apps/api/src | wc -l"` liefert `0`.
i18n: keine
Doku: `docs/features/p7-calendar-sogo-sharing.md`: Abschnitt „ID-Format-Wechsel + warum irreversibel"
Abhängt von: T5

### T7 — api/calendar: Migrationen 000 (shares droppen) + 001 (re-key)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/migrations/migration000DropLegacyShares.ts`, `apps/api/src/calendar/migrations/migration001RekeyMetadataToUrlHashIds.ts`, `apps/api/src/calendar/migrations/calendarMetadataMigrationsList.ts`, `apps/api/src/calendar/calendar.module.ts`
Soll: NEW:46225-46240 (`name:'000-drop-legacy-shares'`, `version:1`, `updateMany({$or:[{shares:{$exists:true}},{schemaVersion:{$exists:false}},{schemaVersion:{$lt:1}}]}, {$unset:{shares:''},$set:{schemaVersion:1}})`) · NEW:46272-46315 (`name:'001-rekey-metadata-to-url-hash-ids'`, `version:2`: Alt-ID dekodieren → neue Hash-ID; existiert die Ziel-ID schon, Tags **mergen** (`Array.from(new Set(...))`), `ownerUsername` des Bestands bevorzugen, Alt-Dokument `deleteOne`; sonst nur `calendarId` umschreiben. Am Ende Log `re-keyed X and merged Y`).
Änderung: Beide Migrationen 1:1, Muster wie `apps/api/src/surveys/migrations/*` (Objekt mit `name`/`version`/`execute`). Liste in dieser Reihenfolge registrieren und im Modul einhängen. **Forward-only.** SPDX.
Verify: `iter.sh test:api` mit Spec gegen `mongodb-memory-server`-Muster des Repos (falls nicht vorhanden: Model-Mock): (a) Dokument mit `shares` + ohne `schemaVersion` → nach 000 kein `shares`, `schemaVersion===1`; (b) zwei Alt-Dokumente, deren URLs auf dieselbe Hash-ID zeigen → nach 001 **ein** Dokument, Tags vereinigt, `schemaVersion===2`.
i18n: keine
Doku: `docs/features/p7-calendar-sogo-sharing.md`: „Rollback = Dump **+ `./data/master.key`**, forward-only"
Abhängt von: T5, T8

### T8 — api/calendar: CalendarMetadata ohne shares, CalendarShareEntry löschen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/calendar-metadata.schema.ts`, **löschen** `apps/api/src/calendar/calendar-share-entry.schema.ts`, `apps/api/src/calendar/calendar.service.ts`
Soll: NEW:46138-46165 — `CalendarMetadata` hat exakt `calendarId` (required, unique, index), `ownerUsername`, `tags`, `schemaVersion` (default 1). **Kein** `shares`.
Änderung: `shares`-Prop + Import entfernen, `schemaVersion` ergänzen, `calendar-share-entry.schema.ts` löschen. In `calendar.service.ts` die drei Lese-/Schreibstellen (`shares: doc?.shares ?? []` Zeile 306, `shareEntries` Zeile 387/392, `return {...base, shares…}` Zeile 427) entfernen. `MappedCalendar = Omit<Calendar,'shares'|'tags'>` (Zeile 41) auf `Omit<Calendar,'tags'>` ziehen.
Verify: `iter.sh test:api` grün; `iter.sh cmd "grep -rn 'CalendarShareEntry' apps libs | wc -l"` liefert `0`; `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` clean.
i18n: keine
Doku: keine (in T15 gesammelt)
Abhängt von: —

### T9 — libs+api: shares aus Calendar-Typ und DTOs entfernen (BREAKING)  [ ]
Komponente: libs, apps/api · Dateien: `libs/src/calendar/types/calendar.ts`, **löschen** `libs/src/calendar/types/calendarShare.ts` (bzw. auf die neue Share-Form umbauen — s. T10), `libs/src/calendar/types/index.ts`, `apps/api/src/calendar/dto/calendar-response.dto.ts`, `apps/api/src/calendar/dto/create-calendar-body.dto.ts`
Soll: NEW:46510-46547 (`CalendarResponseDto`: id, displayName, color?, description?, ctag?, readOnly, isSubscribed, url, tags — **kein** `shares`) · NEW:47032-47056 (`CreateCalendarBodyDto`: displayName, description?, color?, tags — **kein** `shares`).
Änderung: `shares` aus Typ und beiden DTOs entfernen. **Achtung:** im Fork ist `CreateCalendarBodyDto.shares` `@IsArray()` **required** — ersatzlos streichen. Die alten `CalendarSharePermission`/`CalendarShareSubjectType`-Konstanten werden von T10 ersetzt; erst dort löschen.
Verify: `iter.sh test:api` (DTO-Spec: Body **ohne** `shares` wird akzeptiert, Body **mit** `shares` wird von `strictValidationPipe` mit 400 abgelehnt); `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` clean.
i18n: keine
Doku: keine
Abhängt von: T8

### T10 — api/calendar: Share-DTOs (Body/Response/Target)  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/calendar/dto/calendar-share-body.dto.ts` (**überschreiben**), `apps/api/src/calendar/dto/calendar-share-response.dto.ts`, `apps/api/src/calendar/dto/calendar-share-target-response.dto.ts`, `libs/src/calendar/types/calendarShare.ts`
Soll: NEW:47191/47211 (`CalendarShareBodyDto`: `uid` + `accessLevel`) · NEW:47247/47268 (`CalendarShareResponseDto`: uid, displayName, email?, isGroup, accessLevel) · `CalendarShareTargetResponseDto` = `{uid, displayName, email?, isGroup}` (Feldsatz aus `searchShareTargets` NEW:43911-43916). Die alten Fork-Felder `subjectId/subjectType/label/permission` gibt es in 2.1.0 **nicht** mehr.
Änderung: Alte `CalendarShareBodyDto` durch die 2.1.0-Form ersetzen (`@IsString()@IsNotEmpty() uid`, `@IsIn(Object.values(CalendarAccessLevel)) accessLevel`), zwei Response-DTOs neu (`@ApiProperty`). Shared Type `CalendarShare = {uid, displayName, email?, isGroup, accessLevel}`. `calendarSharePermission.ts`/`calendarShareSubjectType.ts` löschen. SPDX bei neuen Dateien.
Verify: `iter.sh test:api` (Spec: gültiger Body `{uid:'a@b',accessLevel:'WRITE'}` ok; `accessLevel:'ADMIN'` → 400; leerer `uid` → 400); `iter.sh cmd "grep -rn 'CalendarSharePermission' apps libs | wc -l"` liefert `0`.
i18n: keine
Doku: keine
Abhängt von: T2, T9

### T11 — api/calendar: CalDavClientFactory aus dem Service extrahieren  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/calDavClientFactory.ts` (neu), `apps/api/src/calendar/calendar.service.ts`, `apps/api/src/calendar/calendar.module.ts`
Soll: NEW:45817-45998 (webpack-Modul 709). Konstanten NEW:45817-45825: `CLIENT_CACHE_TTL_MS=60_000`, `CLIENT_CACHE_MAX_ENTRIES=256`, `DEFAULT_ACCOUNT_TYPE='caldav'`, `DAV_PATH_SUFFIX_PATTERN=/\/dav\/?$/i`, `SO_PATH_SUFFIX='/so'`, `TRAILING_SLASH_PATTERN=/\/$/`. Methoden: `onModuleInit`, `updateBackendConfig` (mit `@OnEvent(\`${EventEmitterEvents.APPCONFIG_UPDATED}-${APPS.CALENDAR}\`)`, NEW:45986-45991), `assertBackendConfigured`, `assertAuthenticated`, `static describeError`, `buildDispatcher` (Dispatcher-Cache pro `rejectUnauthorized`), `invalidateClientCache`, `clientCacheKey` (sha256 über das Passwort — **nie das Klartext-Passwort als Key**), `buildClient` (mit Cache), `getDavBaseUrl`, `getSoBaseUrl`, `assertConfiguredOrigin`, `sogoFetch`, `cacheClient`.
Änderung: Neue `@Injectable()`-Klasse; die entsprechenden Teile aus `calendar.service.ts` (Zeilen 84-180) herausziehen, Service injiziert die Factory. Statische Logger mit `CalDavClientFactory.name`. **`assertConfiguredOrigin` ist die einzige SSRF-Schranke von `sogoFetch` — nicht weglassen.** Zwei Warn-Logs aus dem Soll übernehmen (TLS-Validierung aus; Basis-URL endet nicht auf `/dav`). SPDX.
Verify: `iter.sh test:api` mit Spec: `getSoBaseUrl()` macht aus `https://h/SOGo/dav` → `https://h/SOGo/so`; ohne `/dav`-Suffix wirft es `CalendarBackendNotConfigured` (503); `sogoFetch` gegen fremde Origin wirft `CalendarNotFound` (404); zweiter `buildClient`-Aufruf mit gleichen Credentials trifft den Cache (nur **ein** `login()`).
i18n: keine
Doku: keine (in T15)
Abhängt von: T1, T4

### T12 — api/calendar: SogoSharingClient  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/sogoSharingClient.ts`, `apps/api/src/calendar/calendar.module.ts`
Soll: NEW:46036-46110. `SOGO_SPECIAL_ACL_UIDS=['anonymous','<default>']`, `SOGO_USER_CLASS={NORMAL_USER:'normal-user',NORMAL_GROUP:'normal-group',PUBLIC_USER:'public-user'}`. Methoden: `calendarWebBase` (dav→so-Ersetzung, Trailing-Slash weg), `request` (wirft bei `!response.ok` mit HTTP-Status + Body), `listAcl` (`GET …/acls`, `public-user` **herausfiltern**), `getUserRights` (`GET …/userRights?uid=`), `addUser` (`…/addUserInAcls?uid=`), `setUserRights` (`POST …/saveUserRights`, Body `[{uid,rights}]`, Content-Type JSON), `deleteUser` (`…/removeUserFromAcls?uid=`), `subscribeUsers` (`…/subscribeUsers?uids=a,b`, jede uid einzeln `encodeURIComponent`), `unsubscribe`, `searchUsers` (`{soBase}/{encodeURIComponent(email)}/usersSearch?search=`).
Änderung: `@Injectable()`, Konstruktor nimmt `CalDavClientFactory`. Named exports für die beiden Konstanten, Default-Export der Klasse am Ende. SPDX.
Verify: `iter.sh test:api` mit Spec + gemocktem `sogoFetch`: `listAcl` filtert `public-user`; `setUserRights` sendet exakt `[{uid,rights}]`; `subscribeUsers([])` macht **keinen** Request; `request` wirft bei HTTP 403 mit Statuscode im Text.
i18n: keine
Doku: keine
Abhängt von: T11

### T13 — api/calendar: Service-Methoden fürs Sharing  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/calendar.service.ts`
Soll: NEW:43835-43932. `static toCalendarShare` (43835-43838: `isGroup` = `userClass===NORMAL_GROUP`; `email` = `c_email` **oder** die uid, wenn sie ein `@` enthält) · `static assertNotSpecialSogoUid` (43839-43844, 400 bei `anonymous`/`<default>`) · `static rethrowAsSogoFailure` (43845-43849, `CustomHttpException` durchreichen, sonst 502) · `resolveUrlForId` (43850-43854) · `resolveAccessLevel` (43855-43862: inaktive SOGo-User → `NONE`) · `listCalendarShares` (43863-43873) · `setCalendarShare` (43874-43896: `NONE` ⇒ `deleteUser`; sonst ggf. `addUser`, `setUserRights`, und **nur wenn nicht schon subscribed** `subscribeUsers`) · `deleteCalendarShare` (43897-43906) · `searchShareTargets` (43907-43922: den eigenen User herausfiltern) · `unsubscribeCalendar` (43923-43932).
Änderung: Neun Methoden 1:1 ergänzen, `SogoSharingClient` injizieren. Statische Logger mit `CalendarService.name`.
Verify: `iter.sh test:api` mit Spec + gemocktem `SogoSharingClient`: `setCalendarShare(...,'NONE')` ruft **nur** `deleteUser`; bei neuem uid Reihenfolge `listAcl → addUser → setUserRights → subscribeUsers`; bei bereits subscribed **kein** `subscribeUsers`; `setCalendarShare(...,'<default>',...)` wirft 400; `searchShareTargets` enthält den eigenen `emailAddress` nicht.
i18n: keine
Doku: keine
Abhängt von: T3, T10, T12

### T14 — api/calendar: 7 Routen + Controller-Verdrahtung  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/calendar.controller.ts`
Soll: NEW:43107-43131 (Methoden) + NEW:43202-43285 (Dekoratoren). Die sieben: `PATCH calendars/:id` (`updateCalendar`, `@UsePipes(strictValidationPipe)`) · `DELETE calendars/:id` (204) · `GET calendars/share-targets` (Query `search`) · `GET calendars/:id/shares` · `PUT calendars/:id/shares` (204) · `DELETE calendars/:id/shares?uid=` (204) · `DELETE calendars/:id/subscription` (204). Alle mit `@GetCurrentUsername()` + `@GetUsersEmailAddress()`, Passwort via `usersService.getPassword(username)` (NEW:43108/43114/…). `deleteCalendarShare` prüft **vor** dem Service auf leeren `uid` (NEW:43122-43125).
Änderung: Sieben Routen ergänzen. **Reihenfolge beachten:** `GET calendars/share-targets` muss **vor** `GET calendars/:id/...` stehen, sonst frisst der Param-Matcher `share-targets` als `:id`. Der bestehende Controller-Guard-Block (`@ApiAuth()`, `@RequireAppAccess(APPS.CALENDAR)`) bleibt unverändert — **kein** `@Public()`.
Verify: `iter.sh test:api` (erweiterte `calendar.controller.spec.ts`: alle 7 Handler haben Auth-Metadaten, Pfade exakt) + am laufenden Stack `iter.sh cmd "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/edu-api/calendar/calendars/x/shares"` liefert `401` (unauthentifiziert).
i18n: keine
Doku: swagger regenerieren (`npm run generate:swagger`), `swagger-spec.json` im selben Commit
Abhängt von: T13

### T15 — i18n + Doku (DE/EN/FR)  [ ]
Komponente: apps/frontend, docs · Dateien: `apps/frontend/src/locales/{de,en,fr}/translation.json`, `docs/features/p7-calendar-sogo-sharing.md`
Soll: Die 9 Fehler-Keys aus T4 plus UI-Keys für T16.
Änderung: Keys `calendar.errors.{ListSharesFailed,SetShareFailed,DeleteShareFailed,SearchShareTargetsFailed,UnsubscribeCalendarFailed,UpdateCalendarFailed,DeleteCalendarFailed,MissingCalDavCredentials,CalendarNotFound}` und `calendar.share.{title,accessLevel.NONE,accessLevel.FREE_BUSY,accessLevel.READ,accessLevel.WRITE,searchPlaceholder,unsubscribe,noTargets}` in **allen drei** Locales. Spec-Dokument schreiben (Design, SOGo-Voraussetzung, Migrationspfad, was Fork-Original ist).
Verify: `iter.sh i18n` (= `npm run check-translations`) grün — Key-Parität DE/EN/FR.
i18n: siehe oben
Doku: `docs/features/p7-calendar-sogo-sharing.md`
Abhängt von: T4

### T16 — Frontend: Share-Dialog (FORK-ORIGINAL, keine Rekonstruktion)  [?]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Calendar/**` (Store + Dialog)
Soll: **Aus dem Bundle NICHT ableitbar** — `.reference/2.1.0/ui/assets/index-CHsBOwUD.js` ist minifiziert, es gibt keine Baseline-Screenshots. Verbindlich ist **nur** der API-Contract aus T10/T14. Optional als Live-Referenz: 2.1.0-Image auf einer crabbox hochziehen und beobachten (Verfahren aus p5-calendar).
Änderung: `useCalendarStore` um `eduApi`-Calls für die 7 Routen erweitern (**nie** `fetch`, Calls gehören in den Zustand-Store, nicht in Komponenten). Dialog mit Ziel-Suche (debounced auf `share-targets`), Zugriffsstufen-Auswahl (`SelectSH`-Wrapper), Liste bestehender Freigaben, „Abo beenden" für fremde Kalender. `cn()` für classNames, nur `@fortawesome/free-solid-svg-icons`. Alle Strings über T15-Keys.
Verify: `iter.sh test:frontend` (vitest: Store-Actions rufen die richtigen Pfade) **und** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean (deckt fehlende Required-Props auf, die eslint+vitest verstecken).
i18n: Keys aus T15
Doku: in `docs/features/p7-calendar-sogo-sharing.md` als „Fork-Original" kennzeichnen
Abhängt von: T14, T15

---

## p7-contacts [P7] — ContactsModule (CardDAV über SOGo) + .mobileconfig

_Ziel:_ Neues Modul `contacts`: Adressbücher + Kontakte über CardDAV, vCard-Import/-Export, Suche
über alle Bücher, Apple-Konfigurationsprofil. · _Abhängt-von:_ `p7-calendar-sogo-sharing` (teilt
`DavAuthMode` + die SOGo-Betriebsentscheidung) · _Status:_ offen · _Tasks:_ 20
Soll: main.js:47324-47367 (Module) · 47367-47689 (Controller, 13 Routen) · 47689-47724 (Endpoint-Consts)
· 47724-47752 (Import-Limit) · 47752-47783 (Search-Consts) · 47783-47825 (NonEmptyStringPipe) ·
47825-48551 (Service) · 48551-48596 (Fehler) · 48596-48658 (Caches) · 48658-48948 (VCardMapper) ·
48948-49035 (splitVCards/sanitize) · 49035-49127 (mobileconfig) · 49127-49160 (escapeXml) ·
49160-49853 (DTOs) · 2381-2383 + 3121-3154 (appConfig-Keys/-Optionen) · 195 (`APPS.CONTACTS`)

**Go/No-Go:** **GO nach `p7-calendar-sogo-sharing`.** Vorbedingungen aus der Aufgabenstellung sind
**beide erfüllt** — nachgeprüft, nicht angenommen:
* `UsersService.getPassword(username)` existiert: `apps/api/src/users/users.service.ts:214` (mit Spec ab `users.service.spec.ts:238`).
* `@GetUsersEmailAddress()` existiert: `apps/api/src/common/decorators/getUsersEmailAddress.decorator.ts` — wirft `UnauthorizedException`, wenn das JWT keine `email` trägt.
* `tsdav ^2.1.0` und `undici ^6.21.0` sind bereits in `package.json` (aus p5-calendar) → **keine neue Dependency nötig**.
Offene Entscheidung: dasselbe SOGo-Constraint wie beim Kalender. Ohne CardDAV-Backend liefert das
Modul durchgehend 503 — das ist sauber (kein halber Zustand), aber ohne SOGo eben nutzlos.

**Fork-Bestand:** nichts. Kein `contacts`-Modul, kein `APPS.CONTACTS`, keine CardDAV-Consts. Was da
ist und wiederverwendet wird: `tsdav`/`undici`, `AppConfigService.getAppConfigByName` (appconfig.service.ts:287),
`EventEmitterEvents`, `CustomHttpException`, `@RequireAppAccess`, `HTTP_HEADERS` (http-methods.ts:61/71),
`cache-manager`. **Fehlt** im Fork: `CACHE_CONTROL_VALUES`, ein `strictValidationPipe`, eine
`NonEmptyStringPipe` (T7).

**Was bricht:** nichts Bestehendes — reines Additiv-Modul. **Aber:** neue Passwort-Weitergabe an einen
admin-konfigurierbaren Host (s. `riskNotes`) und ein Rename (`DavAuthMode`, T1 des Sharing-Ledgers),
das den Kalender mitzieht.

**FE rekonstruierbar?** **Nein.** Eine komplette Kontakte-Seite (Liste, Detail, Import-Dropzone,
Suche, Profil-Download) ist Fork-Original — das größte FE-Stück in diesem Paket.

**Ehrlicher Zähl-Hinweis:** die Vorgabe nennt „14 Routen". Im Bundle sind es **13** (Dekoratoren
NEW:47481-47680): listAddressBooks, searchContacts, getConfigurationProfile, createAddressBook,
updateAddressBook, deleteAddressBook, exportAddressBook, importContacts, listContacts, createContact,
updateContact, deleteContact, exportContact. Keine unterschlagen — bitte beim Abnehmen gegenprüfen.

### T1 — libs/contacts: Konstanten + Fehler-Messages  [ ]
Komponente: libs · Dateien: `libs/src/contacts/constants/contacts-endpoint.ts`, `contactsImportMaxFileSize.ts`, `contactsSearch.ts`, `contactsDirectoryCache.ts`, `contactsSearchCache.ts`, `contacts-error-messages.ts`
Soll: NEW:47712-47721 (`CONTACTS_ENDPOINT='contacts'` default + `ADDRESSBOOKS='addressbooks'`, `CONTACTS='contacts'`, `IMPORT='import'`, `EXPORT='export'`, `CONFIGURATION_PROFILE='configuration-profile'`, `SEARCH='search'`) · NEW:47747 (`10*1024*1024`) · NEW:47776-47779 (`{MIN_QUERY_LENGTH:2, MAX_RESULTS:50}`) · NEW:48616-48619 (`{KEY_PREFIX:'contacts-directory-', TTL_MS:15*60*1000}`) · NEW:48647-48650 (`{PERSONAL_ADDRESS_BOOK_KEY_PREFIX:'contacts-search-personal:', TTL_MS:60*1000}`) · NEW:48574-48592 (17 Keys `contacts.errors.*`).
Änderung: Sechs Dateien, const-Objekte (keine enums), Default-Export am Ende, Dateiname == Export. Fehler-Objekt exakt mit den 17 Keys aus dem Soll. SPDX in allen.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import S from \"./libs/src/contacts/constants/contactsSearch\"; import M from \"./libs/src/contacts/constants/contactsImportMaxFileSize\"; if(S.MAX_RESULTS!==50||S.MIN_QUERY_LENGTH!==2||M!==10485760) process.exit(1)"'` exit 0.
i18n: die 17 Fehler-Keys kommen in T18
Doku: keine (intern)
Abhängt von: —

### T2 — libs/appconfig: APPS.CONTACTS + CONTACTS_CARDDAV_*-Keys + Section  [ ]
Komponente: libs · Dateien: `libs/src/appconfig/constants/apps.ts`, `extendedOptionKeys.ts`, `appConfigSectionsKeys.ts`
Soll: NEW:195 (`CONTACTS: 'contacts'`) · NEW:2381-2383 (`CONTACTS_CARDDAV_BASE_URL`, `CONTACTS_CARDDAV_AUTH_MODE`, `CONTACTS_CARDDAV_REJECT_UNAUTHORIZED`, Wert == Key).
Änderung: Nur bestehende const-Objekte **additiv** erweitern (Präzedenz: wie CALENDAR in p5-calendar T3). `AppConfigSectionsKeys.contacts='contacts'`. Kein neues File.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import A from \"./libs/src/appconfig/constants/apps\"; if(A.CONTACTS!==\"contacts\") process.exit(1)"'` exit 0.
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T3 — libs/appconfig: contactsCardDavExtendedOptions  [ ]
Komponente: libs · Dateien: `libs/src/appconfig/constants/extendedOptions/contactsCardDavExtendedOptions.ts`
Soll: NEW:3121-3154. Drei Felder: Base-URL (`type: input`, `value:''`, `width:'full'`); Auth-Mode (`type: dropdown`, `value: DavAuthMode.BASIC`, `width:'third'`, **`disabled: true`** mit `disabledWarningText`, Optionen BASIC/DIGEST/**OAUTH**); Reject-Unauthorized (`type: switch`, `value: true`, `width:'third'`). i18n-Keys exakt: `appExtendedOptions.contactsCardDav{BaseUrl,AuthMode,RejectUnauthorized}{Title,Description}`, `appExtendedOptions.contactsCardDavAuthModeDisabled`, `appExtendedOptions.contactsCardDavAuthMode.{basic,digest,oauth}`.
Änderung: Neue Datei nach dem Muster von `calendarCaldavExtendedOptions.ts`. SPDX.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import O from \"./libs/src/appconfig/constants/extendedOptions/contactsCardDavExtendedOptions\"; if(O.length!==3||O[1].disabled!==true||O[1].options.length!==3) process.exit(1)"'` exit 0.
i18n: die 10 `appExtendedOptions.contactsCardDav*`-Keys kommen in T18
Doku: keine
Abhängt von: T2, `p7-calendar-sogo-sharing` T1 (DavAuthMode mit OAUTH)

### T4 — libs/contacts: Shared Types  [ ]
Komponente: libs · Dateien: `libs/src/contacts/types/{addressBook,contact,contactField,contactAddress,contactSearchResult,importResult}.ts` + `index.ts`
Soll: Feldsätze aus den DTOs: NEW:49197-49225 (AddressBook: id, displayName, description?, ctag?, readOnly, isDefault, url) · NEW:49282-49362 (Contact: uid, addressBookId, url, etag?, fullName, namePrefix?, firstName?, middleName?, lastName?, nameSuffix?, organization?, organizationUnits?, title?, emails, phones, addresses, urls, categories?, birthday?, note?) · NEW:49386-49400 (ContactField: value + type?) · NEW:49475-49500 (ContactAddress: type? + Adressfelder) · NEW:49836-49848 (SearchResult: fullName, email, addressBookId, addressBookDisplayName) · NEW:49793-49797 (ImportResult: imported, failed).
Änderung: Interfaces, die BE-DTO und FE-Store teilen. SPDX. **Vor dem Bauen** die genauen Feldnamen von `ContactFieldBodyDto`/`ContactAddressBodyDto` aus NEW:49367-49553 ablesen (nicht raten).
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` clean.
i18n: keine
Doku: keine
Abhängt von: —

### T5 — api/common: CACHE_CONTROL_VALUES  [ ]
Komponente: libs · Dateien: `libs/src/common/types/http-methods.ts`
Soll: NEW — der Controller nutzt `@Header(HTTP_HEADERS.CacheControl, CACHE_CONTROL_VALUES.NoStore)` (NEW:47512). `HTTP_HEADERS.CacheControl` gibt es im Fork schon (`http-methods.ts:71`), `CACHE_CONTROL_VALUES` **nicht**.
Änderung: `export const CACHE_CONTROL_VALUES = { NoStore: 'no-store' } as const;` additiv in die bestehende Datei (kein neuer Header).
Verify: `iter.sh lint`; `iter.sh cmd "grep -n 'CACHE_CONTROL_VALUES' libs/src/common/types/http-methods.ts"` findet die Zeile.
i18n: keine
Doku: keine
Abhängt von: —

### T6 — api/common: NonEmptyStringPipe + StrictValidationPipe  [ ]
Komponente: apps/api · Dateien: `apps/api/src/common/pipes/nonEmptyString.pipe.ts`, `apps/api/src/common/pipes/strictValidationPipe.ts`
Soll: NEW:47783-47825 (Modul 738, `NonEmptyStringPipe` — trimmt und wirft bei leerem Ergebnis) · `strictValidationPipe` (Modul 297, referenziert NEW:47684 als Controller-`@UsePipes`) — der Fork hat **keine** globale ValidationPipe (Notiz aus p5-calendar T5), deshalb muss sie explizit gesetzt werden.
Änderung: `NonEmptyStringPipe` als `@Injectable()` `PipeTransform<string,string>` nach dem Muster von `apps/api/src/common/pipes/safe-path-segment.pipe.ts`. `strictValidationPipe` als exportierte `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`-Instanz. **`transform:true` ist Pflicht**, sonst greifen `@Type`/`@ValidateNested` zur Laufzeit nicht. SPDX.
Verify: `iter.sh test:api` mit Spec: `NonEmptyStringPipe.transform('  ')` wirft, `transform(' a ')` liefert `'a'`; ein DTO mit Extra-Feld wird von `strictValidationPipe` abgelehnt.
i18n: keine
Doku: keine
Abhängt von: —

### T7 — api/contacts: DTOs  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/dto/{address-book-response,contact-response,contact-body,contact-field-body,contact-address-body,address-book-properties-body,import-result-response,contact-search-result-response}.dto.ts`
Soll: NEW:49160-49230 · 49230-49367 · 49553-49722 · 49367-49416 · 49456-49553 · 49722-49761 · 49761-49802 · 49802-49853. Längen-Limits aus `contactFieldLimits` (Modul 751, NEW:49416-49456 — `TYPE_LABEL` u. a.) mit `@MaxLength` übernehmen.
Änderung: Acht DTOs mit exakten `class-validator`-Dekoratoren und `@ApiProperty`. `ContactBodyDto` nutzt `@ValidateNested({each:true})` + `@Type()` für `emails`/`phones`/`addresses`/`urls`. Shared Types aus T4. SPDX.
Verify: `iter.sh test:api` mit Spec: gültiger Minimal-Body (`fullName`) ok; Body mit unbekanntem Feld → 400; `emails: [{value: 123}]` → 400; überlange `type`-Labels → 400.
i18n: keine
Doku: keine
Abhängt von: T4, T6

### T8 — api/contacts: escapeXml + splitVCards + sanitizeVcardResourceName  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/utils/{escapeXml,splitVCards,sanitizeVcardResourceName}.ts`
Soll: NEW:49127-49160 (escapeXml) · NEW:48948-48997 (splitVCards — teilt eine `.vcf`-Datei an `BEGIN:VCARD`/`END:VCARD`) · NEW:48997-49035 (sanitizeVcardResourceName — macht aus einer UID einen sicheren Dateinamen, `undefined` wenn unmöglich).
Änderung: Drei Utils 1:1, Default-Export am Ende. `escapeXml` wird von den PROPPATCH-/MKCOL-Bodies und vom `.mobileconfig` genutzt — **XML-Injection-Schranke, exakt übernehmen.** SPDX.
Verify: `iter.sh test:api` mit Spec: `escapeXml('<a & "b">')` maskiert alle fünf Entities; `splitVCards` einer 3-Karten-Datei liefert Länge 3; `sanitizeVcardResourceName('../../etc/passwd')` enthält keinen Slash und keinen Punkt-Punkt.
i18n: keine
Doku: keine
Abhängt von: —

### T9 — api/contacts: VCardMapper  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/vcard.mapper.ts`
Soll: NEW:48658-48948 (Modul 743). Öffentliche statische API laut Aufrufstellen: `parseVCard(raw, addressBookId, url, etag?)` (Definition NEW:48772; Aufrufe 48220/48228/48292/48313), `serializeVCard(uid, input, extraProperties?)` (48284/48305), `extractUid(data)` (48241/48266/48470/48507), `extractExtraProperties(data)` (48304 — bewahrt beim Update unbekannte vCard-Properties, damit fremde Clients nichts verlieren).
Änderung: Klasse mit statischen Methoden 1:1. **Kein `ical.js`** — das Soll parst vCard selbst. Round-Trip-Treue ist der Kern: `serializeVCard` darf beim Update keine Properties verlieren, die `extractExtraProperties` gefunden hat. SPDX.
Verify: `iter.sh test:api` mit Spec: Round-Trip `parseVCard(serializeVCard(uid, contact))` ergibt denselben Kontakt; eine vCard mit unbekannter `X-CUSTOM`-Property überlebt `extractExtraProperties`→`serializeVCard`; `extractUid` findet die UID auch bei Zeilenfaltung (`\r\n `).
i18n: keine
Doku: keine
Abhängt von: T4, T8

### T10 — api/contacts: buildConfigurationProfile (.mobileconfig)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/utils/buildConfigurationProfile.ts`
Soll: NEW:49035-49127. `PROFILE_IDENTIFIER='de.netzint.edulution.contacts'` (**im Fork rebranden** — siehe Änderung), `ACCOUNT_IDENTIFIER=`${PROFILE_IDENTIFIER}.carddav``, `deterministicUuid` = sha1 des Seeds, in 8-4-4-4-12 zerlegt (NEW:49066-49069), Port aus der URL oder 443/80, `CardDAVUseSSL` aus dem Protokoll, alle eingesetzten Werte durch `escapeXml`.
Änderung: 1:1, **aber `PROFILE_IDENTIFIER` auf `net.linuxmuster.ui.contacts` ändern** (Rebrand-Gate aus `p1-rebrand`: kein `de.netzint`-Identifier in unserem Produkt). Das ändert die deterministischen UUIDs — unkritisch, weil das Profil bei jedem Download neu erzeugt wird. Ebenso den Anzeigenamen `'edulution Contacts'` (Aufrufstelle NEW:47434) und `filename="edulution-contacts.mobileconfig"` (NEW:47530) rebranden. SPDX.
Verify: `iter.sh test:api` mit Spec: Ausgabe ist wohlgeformtes XML (`fast-xml-parser` ist bereits Dependency), enthält `com.apple.carddav.account`, `<integer>443</integer>` bei `https://…` ohne Port, und die UUID matcht `/^[0-9a-f]{8}-[0-9a-f]{4}-…/`; ein Username mit `&` wird maskiert.
i18n: keine
Doku: in `docs/features/p7-contacts.md`: Rebrand-Abweichung dokumentieren
Abhängt von: T8

### T11 — api/contacts: Service-Basis (Backend-Config, Client, Guards)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.service.ts`
Soll: NEW:47955-48010. `backend={baseUrl:'',authMode:BASIC,rejectUnauthorized:true}`; `onModuleInit`→`updateBackendConfig`; `updateBackendConfig` liest `getAppConfigByName(APPS.CONTACTS).extendedOptions` (NEW:47974-47982) — **plus `@OnEvent(\`${EventEmitterEvents.APPCONFIG_UPDATED}-${APPS.CONTACTS}\`)`**, analog zur CalDavClientFactory (NEW:45986); `assertBackendConfigured` (503 `ContactsBackendNotConfigured`), `assertAuthenticated` (401 `CardDavConnectionFailed`), `assertReady`, `buildDispatcher` (undici `Agent` mit `rejectUnauthorized`), `static describeError` (NEW:48005-48013), `buildClient` (tsdav `DAVClient`, `defaultAccountType:'carddav'`, Auth `Basic`/`Digest`, bei Login-Fehler 502).
Änderung: `@Injectable()`-Service, Konstruktor `(appConfigService, @Inject(CACHE_MANAGER) cacheManager)`. Statische Logger mit `ContactsService.name`. **Bewusste Abweichung vom Soll (Sicherheit):** zusätzlich `assertConfiguredOrigin(url)` wie in `CalDavClientFactory` (NEW:45952-45960) implementieren und in T13/T14 bei jedem direkten `fetch` anwenden — der 2.1.0-ContactsService hat diese Schranke **nicht**, und wir geben hier Klartext-Passwörter weiter. Im Doku-Task begründen. SPDX.
Verify: `iter.sh test:api` mit Spec: ohne `CONTACTS_CARDDAV_BASE_URL` wirft jede Methode 503; mit URL aber ohne Passwort 401; `describeError` hängt `cause.code` in eckigen Klammern an; das Passwort taucht in **keiner** Logausgabe auf (Logger-Spy prüft alle Aufrufe auf das Test-Passwort).
i18n: keine
Doku: keine (in T19)
Abhängt von: T1, T2, T3

### T12 — api/contacts: Adressbücher (list/create/update/delete/export)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.service.ts`
Soll: NEW:48037-48060 (`static mapAddressBook`: `id=base64url(url)`, Fallback-Anzeigename `'Address Book'`, `readOnly=isDirectoryBook`, `isDefault=isDefaultBook`) · NEW:48046-48050 (`listAddressBooks`) · `createAddressBook`/`updateAddressBookProperties`/`deleteAddressBook`/`exportAddressBook` (Aufrufstellen NEW:47437-47450). Hilfsmittel: `encodeId`/`decodeId` (NEW:47881-47882), `COLLECTION_MARKER='/Contacts/'` (47883), `isDirectoryBook` (47891), `DEFAULT_COLLECTION_NAME='personal'` + `isDefaultBook` (47895-47901), `MKCOL_METHOD`/`buildMkcolBody` (47936-47937), `PROPPATCH_METHOD`/`buildProppatchBody` (47933-47934), `DELETE_METHOD` (47936).
Änderung: Fünf Methoden. `deleteAddressBook` muss das Default-Buch schützen (`AddressBookNotDeletable`) und Directory-Bücher als `AddressBookReadOnly` ablehnen — genaue Bedingungen aus NEW:48350-48470 ablesen.
Verify: `iter.sh test:api` mit gemocktem `DAVClient`: `mapAddressBook` setzt `isDefault` nur für `…/Contacts/personal`; `readOnly` für `resourcetype` mit `'directory'`; `deleteAddressBook` auf dem Default-Buch wirft; `buildMkcolBody('<x>')` enthält `&lt;x&gt;`.
i18n: keine
Doku: keine
Abhängt von: T8, T11

### T13 — api/contacts: Kontakte-CRUD  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.service.ts`
Soll: NEW:48200-48330. `listContacts` (PROPFIND mit `PROPFIND_PROPS` NEW:47903-47906, `extractAddressData` NEW:47939-47954 für die drei möglichen Formen `string`/`_cdata`/`_text`), `getContact` (48228), `createContact` (48284-48295: `serializeVCard` → PUT), `updateContact` (48304-48315: **erst `extractExtraProperties` des Bestands**, dann serialisieren — sonst verliert der Update fremde Felder), `deleteContact`, `exportContact`.
Änderung: Sechs Methoden 1:1. Read-only-Bücher bei jedem Schreibzugriff mit `AddressBookReadOnly` ablehnen.
Verify: `iter.sh test:api`: `extractAddressData` liefert für alle drei Formen den String; `updateContact` sendet eine vCard, die die `X-CUSTOM`-Property des Bestands noch enthält; Schreiben in ein `readOnly`-Buch wirft.
i18n: keine
Doku: keine
Abhängt von: T9, T12

### T14 — api/contacts: Import + Export  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.service.ts`
Soll: NEW:48490-48525. `importContacts`: `splitVCards(fileContent)` (48498) → je Karte `extractUid` (48507) → Ressourcenname via `sanitizeVcardResourceName(uid) ?? randomUUID()` (48514) → PUT; zählt `{imported, failed}`. `exportAddressBook` (alle Karten zu einer `.vcf` zusammenfassen) und `exportContact`.
Änderung: Zwei Methoden. Upload-Limit kommt aus dem Controller (`FileInterceptor` mit `CONTACTS_IMPORT_MAX_FILE_SIZE`, T16) — **nicht** doppelt prüfen, aber auf leeren Buffer testen (`FILE_NOT_PROVIDED`, 400, NEW:47455).
Verify: `iter.sh test:api`: Import einer Datei mit 3 Karten, davon 1 kaputt → `{imported:2, failed:1}`; eine Karte ohne UID bekommt trotzdem einen Ressourcennamen; Export liefert genau so viele `BEGIN:VCARD` wie Kontakte.
i18n: keine
Doku: keine
Abhängt von: T13

### T15 — api/contacts: Suche über alle Bücher + Caches  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.service.ts`
Soll: NEW:48050-48090 + 48420-48480. `searchContacts` normalisiert die Query (`normalizeContactSearchText` NEW:47921 — NFC + lowercase + NFC), bricht unter `MIN_QUERY_LENGTH` mit `[]` ab, durchsucht alle Bücher per `Promise.allSettled`, **loggt** jeden Fehlschlag einzeln und wirft `ListContactsFailed` (502) **nur**, wenn *alle* Bücher fehlschlagen (NEW:48069-48075). Server-seitiger CardDAV-Filter `buildContactSearchFilters` über `FN,N,EMAIL,ORG` mit `collation:'i;unicode-casemap'`, `match-type:'contains'` (NEW:47908-47919); Client-seitiges Nachfiltern via `contactMatchesQuery` (47923). Directory-Bücher gehen in den `contactsDirectoryCache` (Key aus `directoryCacheKey` NEW:47884-47889), persönliche Bücher in den `contactsSearchCache` (Key `personalSearchCacheKey` NEW:47890).
Änderung: `searchContacts` + `searchAddressBook` + die beiden Cache-Key-Helfer. Cache über den injizierten `cacheManager`.
Verify: `iter.sh test:api`: Query `'a'` (< 2 Zeichen) liefert `[]` **ohne** einen einzigen DAV-Aufruf; bei 3 Büchern und 1 Fehler kommen die Treffer der anderen 2 zurück; bei 3/3 Fehlern → 502; zweiter identischer Suchlauf trifft den Cache (nur ein DAV-Report); Umlaut-Query findet den NFD-kodierten Kontakt.
i18n: keine
Doku: keine
Abhängt von: T13

### T16 — api/contacts: Controller (13 Routen) + Module + Wiring  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.controller.ts`, `apps/api/src/contacts/contacts.module.ts`, `apps/api/src/app/app.module.ts`
Soll: NEW:47419-47480 (Methoden) + 47481-47680 (Dekoratoren) + 47681-47687 (Klassen-Dekoratoren) + 47353-47363 (Module: `imports:[UsersModule, AppConfigModule]`, `providers/exports:[ContactsService]`). Konstanten NEW:47416-47417 (`VCARD_CONTENT_TYPE='text/vcard; charset=utf-8'`, `MOBILECONFIG_CONTENT_TYPE='application/x-apple-aspen-config; charset=utf-8'`).
Änderung: Alle 13 Routen mit exakten Pfaden, `@HttpCode(204)` bei den beiden Deletes, `@Header(ContentType/ContentDisposition)` bei den drei Downloads, `@Header(CacheControl, NoStore)` bei `search` (NEW:47512), `@UseInterceptors(FileInterceptor('file',{limits:{fileSize:CONTACTS_IMPORT_MAX_FILE_SIZE}}))` beim Import, `@Query('q', NonEmptyStringPipe)` + `@Query('limit', new DefaultValuePipe(MAX_RESULTS), ParseIntPipe)` bei der Suche.
**Guards vollständig mit-portieren (nicht verhandelbar):** `@ApiAuth()`, `@RequireAppAccess(APPS.CONTACTS)`, `@UsePipes(strictValidationPipe)`, `@Controller(CONTACTS_ENDPOINT)`. Keine Route ist `@Public()`. Modul in `app.module.ts` registrieren.
Verify: `iter.sh test:api` (neue `contacts.controller.spec.ts` via `controllerContractReflection`: `APP_ACCESS_KEY === APPS.CONTACTS`, kein `PUBLIC_ROUTE_KEY` auf irgendeinem Handler, 13 Routen mit exakten Pfaden) + am laufenden Stack `iter.sh cmd "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/edu-api/contacts/addressbooks"` liefert `401`.
i18n: keine
Doku: swagger regenerieren, `swagger-spec.json` mit committen
Abhängt von: T5, T6, T7, T10, T14, T15

### T17 — api/contacts: Spec-Coverage-Gate erfüllen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.controller.spec.ts`
Soll: Repo-Policy aus `p1-port-api-specs-ci` — `npm run check-spec-coverage` erzwingt für **jeden** Controller eine Auth-Contract-Spec (CI + pre-commit).
Änderung: Spec vervollständigen (falls T16 nur den Kern abdeckt): pro Route Auth-Metadaten, HTTP-Methode, Pfad, `@HttpCode`.
Verify: `iter.sh cmd 'npm run check-spec-coverage'` grün; `iter.sh test:api` grün.
i18n: keine
Doku: keine
Abhängt von: T16

### T18 — i18n: contacts-Keys (DE/EN/FR)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/locales/{de,en,fr}/translation.json`
Soll: 17 Fehler-Keys aus T1 (`contacts.errors.*`) + 10 appConfig-Keys aus T3 (`appExtendedOptions.contactsCardDav*`) + UI-Keys für T19.
Änderung: Alle Keys in **allen drei** Locales. FR ist erstwertig (siehe `x-i18n-fr`), keine englischen Platzhalter.
Verify: `iter.sh i18n` grün (Parität DE/EN/FR); `iter.sh cmd 'npm run check-error-message-translations'` grün.
i18n: siehe oben
Doku: keine
Abhängt von: T1, T3

### T19 — Frontend: ContactsPage (FORK-ORIGINAL, keine Rekonstruktion)  [?]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Contacts/**`
Soll: **Aus dem Bundle NICHT ableitbar.** Verbindlich ist nur der API-Contract (T7/T16). Live-Referenz optional über ein 2.1.0-Image auf der crabbox.
Änderung: `useContactsStore` (Zustand) mit `eduApi`-Calls für alle 13 Routen — `ResponseType.BLOB` für die drei Downloads (`.vcf`, `.mobileconfig`), `handleApiError` überall, **nie** `fetch`. Seite: Adressbuch-Liste, Kontaktliste, Detail/Edit-Formular (react-hook-form), Import per `react-dropzone` mit Größenlimit aus `CONTACTS_IMPORT_MAX_FILE_SIZE`, globale Suche (debounced, min. 2 Zeichen), Button „Konfigurationsprofil laden". `cn()` für classNames, shadcn-Wrapper mit `SH`-Postfix, nur free-solid-Icons, keine magic strings.
Verify: `iter.sh test:frontend` **und** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean.
i18n: Keys aus T18
Doku: als „Fork-Original" kennzeichnen
Abhängt von: T16, T18

### T20 — Doku + Sidebar/appConfig-Anbindung  [ ]
Komponente: docs, libs · Dateien: `docs/features/p7-contacts.md`, `libs/src/appconfig/constants/defaultAppConfig.ts` (nur falls das Seeding es erfordert)
Soll: 2.1.0 registriert `contacts` als reguläre App über `APPS.CONTACTS` + Extended Options; ein Seed-Eintrag ist **im Bundle nicht nachweisbar** (wie beim Chat in `p2-chat` T12) → Fork-Entscheidung.
Änderung: Spec schreiben: Architektur, SOGo-Voraussetzung, Passwort-Weitergabe + die bewusste `assertConfiguredOrigin`-Abweichung aus T11, PII-Hinweis zum `.mobileconfig`, Rebrand des Profil-Identifiers aus T10, „13 statt 14 Routen"-Klarstellung, was Fork-Original ist. `[?]` markieren, ob `contacts` geseedet wird (2.1-treu: nein).
Verify: `iter.sh cmd 'npm run check-external-references'` grün (kein `netzint`/`edulution.io`-Rest in neuen Dateien); Doku existiert und ist im Commit.
i18n: keine
Doku: `docs/features/p7-contacts.md`
Abhängt von: T19

---

## p7-ai [P7] — AiModule (LiteLLM / Vercel AI SDK)  ·  **PRODUKT- + DSGVO-ENTSCHEIDUNG**

_Ziel:_ 6 Routen (`GET models`, `GET conversations`, `GET conversations/:id`, `DELETE conversations`,
`DELETE conversations/:id`, `POST stream`) + persistierte Konversationen + Streaming über das Vercel
AI SDK. · _Abhängt-von:_ **Kevins Freigabe (T1)** · _Status:_ **[?] blockiert** · _Tasks:_ 15
Soll: main.js:89201-91261 (Module 1327-1363) · 89238-89256 (Module) · 89261-89431 (Controller) ·
89420-89426 (Klassen-Dekoratoren inkl. `RequireInAppPermission`) · 89455-89457 (Throttle) ·
89487 (Decorator) · 79556-79608 (InAppPermissionGuard) · 2366 (`IN_APP_PERMISSION_AI_CHAT`) ·
13866 (`IN_APP_PERMISSION_KEY`) · 2325-2337 (`getInAppPermissions`, Default **DENY**) ·
89528-89623 (AiService) · 89704-89819 (getAiModel) · 90097-90182 (AiChatService) ·
90182-90435 (AiConversationService) · 90435-90580 (Schemas) · 91164-91261 (LiteLLM-Resolver) ·
79274 (2.1.0-package.json mit den AI-Deps)

**Go/No-Go: HALT.** Das ist **keine technische Entscheidung**. Drei Punkte, die Kevin
entscheiden muss, bevor eine Zeile entsteht:
1. **DSGVO.** Jeder Prompt einer Minderjährigen-Plattform verlässt die Schule Richtung LLM-Provider (`AI_BASE_URL`). Ohne AVV + Rechtsgrundlage + Elterninformation ist der Betrieb nicht zulässig. `AiChatMessage.content` (NEW:90533-90570) persistiert die **Volltexte** in Mongo, **ohne** TTL und ohne Aufbewahrungsfrist — Art. 17 ist nur über die beiden Delete-Routen abgedeckt.
2. **Produkt.** Ist ein KI-Chat Teil dessen, was `linuxmuster-ui` sein will? Er zieht Betriebskosten, einen weiteren externen Dienst und eine Support-Erwartung nach sich.
3. **Supply Chain.** 5 neue Prod-Dependencies (`ai@^7`, `@ai-sdk/{openai,anthropic,google,openai-compatible}`, FE `streamdown`) gegen 30 offene high/critical CVEs der Basis (`p1-security-cve-track`, reviewBy 2026-10-15).

**Meine Empfehlung:** **nicht jetzt.** T2 (Guard) trotzdem bauen — der ist unabhängig wertvoll und
schließt eine Lücke im Berechtigungsmodell. Falls doch GO: mit Ollama/self-hosted als
Default-Provider starten (`AI_OLLAMA_BASE_URL`, NEW:89787-89792), dann bleiben die Daten im Haus.

**Fork-Bestand:** `APPS.AICHAT='aichat'` existiert in `libs/src/appconfig/constants/apps.ts` (Altlast
aus 1.6, **unbenutzt** — 2.1.0 hängt die AI-Berechtigung dagegen an `APPS.CHAT`). Throttle-Decorator +
`ThrottleGuard` existieren (`apps/api/src/common/throttle/`). **Fehlt komplett:**
`InAppPermissionGuard`, `RequireInAppPermission`, `IN_APP_PERMISSION_*`-Keys, `getInAppPermissions`,
`isInAppPermissionGranted`, `InAppPermissionWhenUnset`, `strictTransformValidationPipe`, jedes AI-Modul.

**Was bricht:** nichts Bestehendes. **Aber:** T2 führt einen neuen globalen Guard-Mechanismus ein —
er greift nur, wo `@RequireInAppPermission` gesetzt ist (`if (!metadata) return true`, NEW:79585), ist
also rückwärtskompatibel.

**FE rekonstruierbar?** **Nein.** Chat-UI mit Token-Streaming, Markdown-Rendering (2.1.0 nutzt
`streamdown`), Konversations-Sidebar und Modell-Auswahl ist komplett Fork-Original.

### T1 — Entscheidungs-Gate: AI adoptieren?  [?] human-gate
Komponente: — · Dateien: `docs/features/p7-ai.md` (Entscheidungsvorlage)
Soll: Die drei Punkte oben, belegt mit: NEW:90533-90570 (Volltext-Persistenz ohne TTL), NEW:89741-89818 (Provider-/Modell-Auflösung + welche Envs Secrets sind), NEW:79274 (Dependency-Delta), NEW:2325-2337 (Default **DENY**).
Änderung: **Kein Code.** Entscheidungsvorlage schreiben: Datenflussdiagramm (Wer sieht welchen Prompt?), Vorschlag für Aufbewahrungsfrist + TTL-Index, Provider-Empfehlung (self-hosted zuerst), Dependency-/CVE-Delta, Vorschlag für die Elterninformation. Am Ende **eine** Empfehlung, keine Optionsschau.
Verify: Dokument existiert, ist committet und von Kevin abgezeichnet. **Ohne Abzeichnung bleiben T3-T15 gesperrt.**
i18n: keine
Doku: `docs/features/p7-ai.md`
Abhängt von: —

### T2 — InAppPermissionGuard + RequireInAppPermission (auch ohne AI wertvoll)  [ ]
Komponente: libs, apps/api · Dateien: `libs/src/auth/constants/appAccessKeys.ts`, `libs/src/appconfig/constants/extendedOptionKeys.ts`, `libs/src/appconfig/constants/inAppPermissionWhenUnset.ts`, `libs/src/user/utils/isInAppPermissionGranted.ts`, `libs/src/user/utils/getAccessGroups.ts`, `libs/src/user/utils/isUserInAccessGroups.ts`, `apps/api/src/common/decorators/requireInAppPermission.decorator.ts`, `apps/api/src/auth/inAppPermission.guard.ts`
Soll: NEW:13866 (`IN_APP_PERMISSION_KEY='in_app_permission'`) · NEW:89487 (`RequireInAppPermission = (appName, optionKey) => SetMetadata(IN_APP_PERMISSION_KEY, {appName, optionKey})`) · NEW:79570-79603 (Guard: `getAllAndOverride([handler, class])`; **`if (!metadata) return true`**; kein `user` → 401; **Admin-Bypass** über `getIsAdmin(ldapGroups, adminGroups)` → true; sonst `isInAppPermissionGranted(appConfig?.extendedOptions, ldapGroups, optionKey, InAppPermissionWhenUnset.DENY)`, sonst 403) · NEW:2360-2366 (`IN_APP_PERMISSION_{CREATE,PARTICIPATE,AI_CHAT}`) · NEW:2325-2337 (`getInAppPermissions`: CREATE/PARTICIPATE mit `ALLOW`-Default, **AI_CHAT mit `DENY`**). `InAppPermissionWhenUnset` (Modul 62) und `isInAppPermissionGranted` (Modul 65) exakt aus dem Bundle ablesen (`grep -n "const InAppPermissionWhenUnset\|const isInAppPermissionGranted" .reference/2.1.0/api/main.js`).
Änderung: Guard + Decorator + Helfer. **`InAppPermissionWhenUnset.DENY` als Default für AI_CHAT ist der ganze Schutz — nie auf ALLOW drehen.** Guard nutzt `AppConfigService` + `GlobalSettingsService.getAdminGroupsFromCache()` (beides im Fork vorhanden). Statische Logger. SPDX bei neuen Dateien.
Verify: `iter.sh test:api` mit Spec: Handler **ohne** Metadaten → `true` (rückwärtskompatibel); ohne `request.user` → 401; Admin → `true` ohne appConfig-Lookup; Nicht-Admin ohne gesetzte Option → **403** (DENY-Default); Nicht-Admin in einer erlaubten LDAP-Gruppe → `true`.
i18n: keine
Doku: `docs/features/p7-ai.md`: „Guard-Vorarbeit, unabhängig von der AI-Entscheidung nutzbar"
Abhängt von: —

### T3 — Root-Dependencies: ai + @ai-sdk/*  [ ] (gesperrt bis T1)
Komponente: root · Dateien: `package.json`, `package-lock.json`
Soll: NEW:79274 — `"ai":"^7.0.19"`, `"@ai-sdk/openai":"^4.0.11"`, `"@ai-sdk/anthropic":"^4.0.11"`, `"@ai-sdk/google":"^4.0.11"`, `"@ai-sdk/openai-compatible":"^3.0.7"`, FE `"streamdown":"^2.5.0"`.
Änderung: Exakt diese Ranges aufnehmen, `npm install`.
Verify: `iter.sh cmd 'npm ls ai @ai-sdk/openai @ai-sdk/openai-compatible'` sauber; `iter.sh cmd 'npm audit --omit=dev --audit-level=high'` gegen das Ceiling aus `p1-security-cve-track` — **neue** high/critical Funde blockieren den Task.
i18n: keine
Doku: neue Deps ins Accepted-CVE-Register/Supply-Chain-Inventar
Abhängt von: T1

### T4 — libs/ai: Endpoints, Provider, Fehler, Chunk-Types  [ ] (gesperrt bis T1)
Komponente: libs · Dateien: `libs/src/ai/constants/{aiApiEndpoints,aiProviders,aiErrorMessages,aiChunkTypes,aiThrottleConfig}.ts`, `libs/src/common/utils/parseCsvList.ts`
Soll: NEW:848-855 (`AI_EDU_API_ENDPOINT='ai'`, `AI_STREAM_ENDPOINT`, `AI_MODELS_ENDPOINT='ai/models'`, `AI_CONVERSATIONS_ENDPOINT`) · Modul 1340 NEW:89843-89877 (`AiProviders` mit `OPENAI`, `ANTHROPIC`, `GOOGLE`, `OLLAMA`, `OPENAI_COMPATIBLE`) · Modul 1342 NEW:89911-89950 (`AI_ERROR_MESSAGES` mit `PROVIDER_NOT_CONFIGURED`, `MODEL_NOT_CONFIGURED`, `MODEL_NOT_ALLOWED`) · Modul 1334 (AI_CHUNK_TYPES, endet NEW:89700) · NEW:89455-89457 (`AI_STREAM_THROTTLE_LIMIT=5`, `AI_STREAM_THROTTLE_TTL_MS=10_000`) · Modul 1341 NEW:89877-89911 (`parseCsvList`).
Änderung: const-Objekte, Default-Export am Ende, SPDX. `parseCsvList` gehört nach `libs/src/common/utils/` (allgemein nutzbar).
Verify: `iter.sh lint`; `iter.sh test:api` (Spec: `parseCsvList('a, b ,,c')` → `['a','b','c']`, `parseCsvList(undefined)` → `[]`).
i18n: keine
Doku: keine
Abhängt von: T1

### T5 — api/ai: Mongoose-Schemas (Conversation + ChatMessage)  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai-conversation.schema.ts`, `apps/api/src/ai/ai-chat-message.schema.ts`
Soll: NEW:90461-90502 (`AiConversation`: conversationId req, createdBy req, title default `''`, lastMessageAt, modelId, schemaVersion default 1; Indizes `{createdBy:1,conversationId:1}` **unique** und `{createdBy:1,lastMessageAt:-1}`) · NEW:90533-90578 (`AiChatMessage`: conversationId req+index, createdBy req+index, messageId req, role enum aus `chatRoles`, content default `''`, usage `Object`, schemaVersion default 1; Indizes `{createdBy,conversationId,createdAt}` und `{createdBy,conversationId,messageId}` unique).
Änderung: Beide Schemas 1:1. **Empfohlene Abweichung (DSGVO, aus T1):** zusätzlich ein TTL-Feld `expiresAt` mit `index:{expireAfterSeconds:0}` und konfigurierbarer Aufbewahrungsfrist — analog `ExamModeJob` (NEW:19230-19238). Nur umsetzen, wenn T1 es so entscheidet; sonst `[?]` vermerken. SPDX.
Verify: `iter.sh test:api`: SchemaFactory kompiliert, beide Unique-Indizes gesetzt, `role` lehnt einen unbekannten Wert ab.
i18n: keine
Doku: Aufbewahrungsfrist in `docs/features/p7-ai.md`
Abhängt von: T1, T4

### T6 — api/ai: DTOs  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/dto/{ai-stream,delete-ai-conversations,ai-model-response,ai-conversation-response,ai-message-response,ai-message-usage,ai-conversation-summary-response,get-ai-conversation-query}.dto.ts`
Soll: NEW:90673-90744 (AiStreamDto) · 90744-90785 (DeleteAiConversationsDto: `ids`) · 90785-90831 (AiModelResponseDto) · 90831-90903 (AiConversationResponseDto) · 90903-90962 (AiMessageResponseDto) · 90962-91028 (AiMessageUsageDto) · 91028-91087 (Summary) · 91113-91164 (GetAiConversationQueryDto: `limit`, `before`).
Änderung: Acht DTOs mit exakten Dekoratoren. SPDX.
Verify: `iter.sh test:api` (Spec: gültige/ungültige Payloads je DTO; `limit` als String wird durch `transform:true` zur Zahl).
i18n: keine
Doku: keine
Abhängt von: T4

### T7 — api/common: StrictTransformValidationPipe  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/common/pipes/strictTransformValidationPipe.ts`
Soll: Modul 336, referenziert NEW:89296/89357/89377/89399. Anders als `strictValidationPipe` (p7-contacts T6) mit **impliziter Typ-Konvertierung** für Query-Params.
Änderung: `new ValidationPipe({whitelist:true, forbidNonWhitelisted:true, transform:true, transformOptions:{enableImplicitConversion:true}})`. SPDX.
Verify: `iter.sh test:api`: Query `?limit=10` landet als `number` im DTO; unbekannter Query-Param → 400.
i18n: keine
Doku: keine
Abhängt von: T1

### T8 — api/ai: Modell-Auflösung (getAiModel / getAiModels)  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/utils/getAiModel.ts`, `apps/api/src/ai/utils/getAiModels.ts`
Soll: NEW:89704-89819 (`resolveProvider` aus `AI_PROVIDER`, Default OPENAI, unbekannt → 500; `resolveDefaultModel` aus `AI_MODEL` sonst erstem aus `AI_MODELS`, sonst 500; `resolveRequestedModel` prüft gegen die **Allowlist** `getAiModels()` → sonst 400 `MODEL_NOT_ALLOWED`; `requireEnv`; `resolveBaseModel` mit den 5 Providern inkl. `AI_OLLAMA_BASE_URL`/`AI_BASE_URL`+`AI_API_KEY`; optionale `wrapLanguageModel` + `extractReasoningMiddleware` je Tag aus `AI_REASONING_TAGS`) · Modul 1343 NEW:89950-89985 (`getAiModels` aus `AI_MODELS` + `AI_MODEL`).
Änderung: 1:1. **`resolveRequestedModel` ist die Allowlist-Schranke — nie lockern**, sonst kann ein User beliebige (teure) Modelle beim Provider anstoßen. `AI_API_KEY` **nie** loggen.
Verify: `iter.sh test:api` mit gesetzten Test-Envs: unbekannter Provider → 500; `AI_MODELS='a,b'` + Request `'c'` → 400; Request ohne Modell nimmt `a`; Provider `openai_compatible` ohne `AI_BASE_URL` → 500.
i18n: keine
Doku: alle `AI_*`-Envs in `docs/` + `.env.default` (T14)
Abhängt von: T3, T4

### T9 — api/ai: AiService (Modell-Liste) + LiteLLM-Context-Window-Resolver  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai.service.ts`, `apps/api/src/ai/modelContextWindowResolver.ts`, `apps/api/src/ai/liteLlmModelContextWindowResolver.ts`
Soll: NEW:89528-89623 (`AiService`, `listModels()` NEW:89537) · Modul 1346 NEW:90069-90097 (`MODEL_CONTEXT_WINDOW_RESOLVER`-Token) · NEW:91164-91261 (`LiteLlmModelContextWindowResolver`, fragt `AI_BASE_URL` mit `AI_INFO_API_KEY` NEW:91215-91216, per `HttpModule`).
Änderung: Service + Interface-Token + LiteLLM-Implementierung. DI-Provider `{provide: MODEL_CONTEXT_WINDOW_RESOLVER, useClass: LiteLlmModelContextWindowResolver}` (NEW:89252). Statische Logger.
Verify: `iter.sh test:api`: `listModels()` liefert die Allowlist; der Resolver fällt bei HTTP-Fehler auf einen Default zurück, ohne zu werfen.
i18n: keine
Doku: keine
Abhängt von: T8

### T10 — api/ai: AiConversationService  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai-conversation.service.ts`
Soll: NEW:90222-90435. `listForUser` (90324), `findOneForUser(conversationId, username, {limit, before})` (90382 — **neueste Nachrichten paginiert**), `deleteManyForUser(ids, username)` (90419), `deleteForUser`.
Änderung: 1:1. **Jede Query filtert auf `createdBy: username`** — das ist die einzige Mandantentrennung; nie weglassen.
Verify: `iter.sh test:api`: `findOneForUser` eines fremden Users liefert nichts/404; `deleteManyForUser` löscht **nur** eigene Konversationen (Spec mit zwei Usern); Paginierung mit `before` liefert die älteren Nachrichten.
i18n: keine
Doku: keine
Abhängt von: T5, T6

### T11 — api/ai: AiChatService (Streaming)  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai-chat.service.ts`
Soll: NEW:90128-90182, `streamReply(request, username, res)` (90141). Nutzt das Vercel AI SDK, schreibt SSE-Chunks (`AI_CHUNK_TYPES`) direkt in die `express.Response`, persistiert User- und Assistant-Nachricht + `usage`. System-Prompt aus `AI_SYSTEM_PROMPT` (NEW:90064).
Änderung: 1:1. Auf Client-Abbruch (`res.on('close')`) den Stream sauber beenden. Bei Provider-Fehlern kein Stacktrace an den Client.
Verify: `iter.sh test:api` mit gemocktem Modell: `streamReply` schreibt ≥1 Chunk und persistiert genau 2 Nachrichten; Abbruch des Response-Streams beendet den Generator; Provider-Fehler ergibt eine `CustomHttpException` und **keine** halb geschriebene Assistant-Nachricht.
i18n: keine
Doku: keine
Abhängt von: T9, T10

### T12 — api/ai: Controller + Module + Wiring  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai.controller.ts`, `apps/api/src/ai/ai.module.ts`, `apps/api/src/app/app.module.ts`
Soll: NEW:89317-89340 (Methoden) + 89341-89419 (Route-Dekoratoren) + 89420-89426 (Klassen-Dekoratoren) + 89238-89256 (Module mit `MongooseModule.forFeature` für beide Schemas + `HttpModule`).
Änderung: 6 Routen: `GET models`, `GET conversations`, `GET conversations/:id`, `DELETE conversations` (204), `DELETE conversations/:id` (204), `POST stream` (200). Throttle je Route: Reads mit `DEFAULT_READ_THROTTLE_*`, Writes mit `DEFAULT_WRITE_THROTTLE_*`, `stream` mit `AI_STREAM_THROTTLE_LIMIT=5 / 10_000ms`; jeweils `@UseGuards(ThrottleGuard)`.
**Guards (nicht verhandelbar):** `@RequireInAppPermission(APPS.CHAT, ExtendedOptionKeys.IN_APP_PERMISSION_AI_CHAT)` auf der Klasse (NEW:89423) — Default **DENY**. Das Soll setzt nur `@ApiBearerAuth()`; im Fork **zusätzlich `@ApiAuth()`** setzen, sonst fehlt die Authentifizierung und der Guard läuft ins 401-Fallback statt in eine echte Prüfung. `InAppPermissionGuard` global oder per `@UseGuards` registrieren.
Verify: `iter.sh test:api` (Spec: 6 Routen, `IN_APP_PERMISSION_KEY`-Metadaten auf der Klasse mit `{appName:'chat', optionKey:'IN_APP_PERMISSION_AI_CHAT'}`, kein `PUBLIC_ROUTE_KEY`) + am laufenden Stack: unauthentifiziert `401`; authentifiziert **ohne** gesetzte Berechtigung `403`.
i18n: keine
Doku: swagger regenerieren
Abhängt von: T2, T7, T11

### T13 — api/ai: Spec-Coverage + Guard-Regressionstest  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai.controller.spec.ts`
Soll: Repo-Policy `check-spec-coverage`; zusätzlich ein expliziter Regressionstest für den DENY-Default.
Änderung: Spec mit einem Test, der **fehlschlägt, sobald der Default auf ALLOW kippt** (`isInAppPermissionGranted(undefined, [], KEY, DENY) === false`).
Verify: `iter.sh cmd 'npm run check-spec-coverage'` grün; `iter.sh test:api` grün.
i18n: keine
Doku: keine
Abhängt von: T12

### T14 — Env, Installer-Contract, i18n, Doku  [ ] (gesperrt bis T1)
Komponente: apps/api, installer, apps/frontend, docs · Dateien: `apps/api/.env.default`, `edulution-installer/apps/public-page/public/download/edulution-default.yml.template` (+ `-le`-Variante), `apps/frontend/src/locales/{de,en,fr}/translation.json`, `docs/features/p7-ai.md`
Soll: Envs aus T8/T9/T11: `AI_PROVIDER`, `AI_MODEL`, `AI_MODELS`, `AI_BASE_URL`, `AI_API_KEY`, `AI_INFO_API_KEY`, `AI_OLLAMA_BASE_URL`, `AI_REASONING_TAGS`, `AI_SYSTEM_PROMPT`.
Änderung: Contract-Sync-Regel: **neue Env ⇒ Installer schreibt sie ⇒ `.env.default`**. `AI_API_KEY`/`AI_INFO_API_KEY` sind Secrets — nur als leerer Platzhalter, nie mit Wert, nie ins Repo. i18n-Keys `ai.*` in **allen drei** Locales. Doku: Datenfluss, Aufbewahrung, wie ein Admin die Berechtigung freischaltet.
Verify: `iter.sh i18n` grün; `iter.sh cmd "grep -c 'AI_' apps/api/.env.default"` > 0; `iter.sh cmd "git -C ../edulution-installer diff --stat"` zeigt die Template-Änderung.
i18n: `ai.*`-Keys
Doku: `docs/features/p7-ai.md`
Abhängt von: T12

### T15 — Frontend: AI-Chat-UI (FORK-ORIGINAL)  [?] (gesperrt bis T1)
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Chat/**` (AI-Tab) bzw. eigene Seite
Soll: **Nicht rekonstruierbar** — minifiziert. 2.1.0 nutzt FE-seitig `streamdown` fürs Markdown-Streaming (NEW:79274). Verbindlich ist nur der Contract aus T6/T12.
Änderung: Store mit `eduApi`; **Achtung:** `POST ai/stream` ist SSE — der Store braucht einen Stream-Reader (axios `responseType:'stream'` bzw. `EventSource`-Muster wie in `apps/api/src/sse`). Konversations-Sidebar, Modell-Auswahl aus `GET models`, Löschen einzeln/mehrfach. Sichtbarkeit an `canUseAiChat` aus `getInAppPermissions` koppeln (NEW:2336) — die UI darf für Nicht-Berechtigte **gar nicht erscheinen**.
Verify: `iter.sh test:frontend` **und** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean.
i18n: Keys aus T14
Doku: als Fork-Original kennzeichnen
Abhängt von: T12, T14

---

## p7-lmn-exam-jobs [P7] — Exam-Mode als asynchroner Job (BullMQ + SSE)

_Ziel:_ `PUT exam-mode/:state` wird von synchron auf **202 + Job** umgestellt, mit Fortschritt per SSE
und Status-Polling. · _Abhängt-von:_ — · _Status:_ offen · _Tasks:_ 12
Soll: main.js:15756-15786 (Konstanten) · 18177-18195 (Controller-Methoden) · 18352-18377 (2 Route-Dekoratoren)
· 18930-19110 (ExamModeService) · 19174-19246 (ExamModeJob-Schema, TTL 19230-19238, Collection 19242)
· 14863-14881 (`toggleExamModeBatch`) · 17073-17092 (`enqueue` mit `options`) · 2223
(`SSE_MESSAGE_TYPE.EXAM_MODE_PROGRESS='exam_mode_progress'`) · 11294 (`QUEUE_CONSTANTS.EXAM_MODE_QUEUE`)

**Go/No-Go: GO.** Löst ein reales Problem: der Fork ruft heute `POST exam-mode/{start,stop}` synchron
für **alle** Schüler einer Klasse in einem Request — bei 30 Accounts läuft das gegen das
15s-Axios-Timeout (`lmn-api-request.queue.ts:41`). 2.1.0 chunked in 10er-Batches
(`EXAM_MODE_BATCH_SIZE`) mit 60s Einzel-Timeout und meldet Teilerfolge. Keine externe
Voraussetzung außer dem echten LMN — den es fürs Verify sowieso braucht.

**Fork-Bestand:** `PUT exam-mode/:state` (`lmnApi.controller.ts:80-89`) ruft synchron
`startExamMode`/`stopExamMode` (`lmnApi.service.ts:123/144`). BullMQ + Redis + `LmnApiRequestQueue`
sind da. `SseService.sendEventToUser` ist da (`sse.service.ts:147`). `splitArrayIntoChunks` ist da
(`libs/src/common/utils/splitArrayIntoChunks.ts`). **Fehlt:** `EXAM_MODE_QUEUE`, das Job-Schema,
`ExamModeService`, `toggleExamModeBatch`, die `enqueue`-Optionen, der SSE-Typ.

**Was bricht:** Der Antwort-Contract (200-Ergebnis → 202-Job) und damit `useLessonStore.ts:151/171`.
Route + Store müssen im selben Commit landen. Details in `riskNotes`.

**FE rekonstruierbar?** **Nein.** Fortschrittsanzeige und Teilerfolg-Darstellung sind Fork-Original;
der Store-Umbau (T10) ist aber durch den API-Contract eng geführt.

### T1 — libs/lmnApi: examModeConstants  [ ]
Komponente: libs · Dateien: `libs/src/lmnApi/constants/examModeConstants.ts`
Soll: NEW:15756-15786 — `EXAM_MODE_BATCH_SIZE=10`, `EXAM_MODE_REQUEST_ATTEMPTS=1`, `EXAM_MODE_REQUEST_TIMEOUT_MS=60000`, `EXAM_MODE_REQUEST_BACKOFF_MS=1000`, `EXAM_MODE_JOB_TTL_MS=24*60*60*1000`, `EXAM_MODE_JOB_POLL_INTERVAL_MS=5000`, `EXAM_MODE_ACTION={START:'start',STOP:'stop'}`, `EXAM_MODE_USER_STATE={PENDING,SUCCESS,FAILED}` (lowercase-Werte), `EXAM_MODE_JOB_STATE={PENDING,RUNNING,COMPLETED,PARTIAL,FAILED}` (lowercase).
Änderung: Eine Datei mit named exports (wie im Soll — es sind 9 Konstanten, kein sinnvoller Default). SPDX.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import {EXAM_MODE_JOB_STATE as S, EXAM_MODE_BATCH_SIZE as B} from \"./libs/src/lmnApi/constants/examModeConstants\"; if(Object.keys(S).length!==5||B!==10||S.PARTIAL!==\"partial\") process.exit(1)"'` exit 0.
i18n: keine
Doku: keine
Abhängt von: —

### T2 — libs: SSE-Typ + Queue-Konstante + Fehler-Keys  [ ]
Komponente: libs · Dateien: `libs/src/common/constants/sseMessageType.ts`, `libs/src/queue/constants/queueConstants.ts`, `libs/src/lmnApi/types/lmnApiErrorMessage.ts`
Soll: NEW:2223 (`EXAM_MODE_PROGRESS:'exam_mode_progress'`) · NEW:11294 (`EXAM_MODE_QUEUE:'EXAM_MODE_QUEUE'`) · Fehler-Keys aus den Wurfstellen: `ExamModeInvalidAction` (NEW:18180), `ExamModeJobNotFound` (NEW:18980), `ExamModeJobFailed` (NEW:18990).
Änderung: Drei bestehende Objekte **additiv** erweitern. `lmnApiErrorMessage.ts` ist im Fork ein `enum` (Altbestand) — dort im bestehenden Stil ergänzen (AGENTS.md-Ausnahme für bestehende Error-Enums).
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import Q from \"./libs/src/queue/constants/queueConstants\"; if(Q.EXAM_MODE_QUEUE!==\"EXAM_MODE_QUEUE\") process.exit(1)"'` exit 0.
i18n: die 3 Fehler-Keys kommen in T11
Doku: keine
Abhängt von: —

### T3 — api/lmnApi: ExamModeJob-Schema mit TTL-Index  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/examMode/exam-mode-job.schema.ts`
Soll: NEW:19174-19246. Felder: `jobId` (String, required, **unique+index**), `initiator` (required+index), `action` (enum `EXAM_MODE_ACTION`), `state` (enum `EXAM_MODE_JOB_STATE`, default PENDING), `total` (Number required), `users` (Array aus `{username req, status enum EXAM_MODE_USER_STATE, reason?}`, default `[]`), `groupName?`, `groupType?`, `expiresAt` (Date, required, **`index:{expireAfterSeconds:0}`**, default `() => new Date(Date.now()+EXAM_MODE_JOB_TTL_MS)`). `@Schema({timestamps:true, strict:true, collection:'exammodejobs'})`, `toJSON: {virtuals:true}`.
Änderung: 1:1. Neue Collection ⇒ keine Migration nötig; `schemaVersion` führt das Soll hier **nicht** — bewusst so lassen (der TTL räumt selbst auf). SPDX.
Verify: `iter.sh test:api`: SchemaFactory kompiliert; `jobId` ist unique; `expiresAt` trägt `expireAfterSeconds: 0`; `state` lehnt `'bogus'` ab; Default-`expiresAt` liegt ~24h in der Zukunft.
i18n: keine
Doku: keine
Abhängt von: T1

### T4 — api/lmnApi: enqueue mit per-Request-Optionen (Signatur-Änderung)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/queue/lmn-api-request.queue.ts`, `apps/api/src/lmnApi/lmnApi.service.ts`
Soll: NEW:17073-17092 — `enqueue(method, endpoint, payload, config, options?)` mit `options={attempts?, timeoutMs?, backoffMs?}`; `timeoutMs` überschreibt `config.timeout`; `attempts ?? this.defaultAttempts`; `backoff.delay = options?.backoffMs ?? this.retryDelayMs`. Passthrough in `LmnApiService.request` (NEW:14770).
Änderung: Fünften optionalen Parameter ergänzen. **Der Default muss exakt das heutige Verhalten sein** (`attempts: 3`, `delay: this.retryDelayMs`) — die Queue bedient **alle** LMN-Aufrufe. `defaultAttempts = 3` als benannte Klassenkonstante einführen (keine magic number).
Verify: `iter.sh test:api`: bestehende `lmn-api-request.queue.spec.ts` unverändert grün (Regression); neuer Test: mit `{attempts:1, timeoutMs:60000, backoffMs:1000}` landen exakt diese Werte in `queue.add`; ohne Optionen bleibt es bei `attempts:3`.
i18n: keine
Doku: keine
Abhängt von: —

### T5 — api/lmnApi: toggleExamModeBatch  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnApi.service.ts`
Soll: NEW:14863-14881 — `toggleExamModeBatch(lmnApiToken, action, users, group?)`: Endpoint `${EXAM_MODE_LMN_API_ENDPOINT}/${action}`; Payload bei **STOP mit group** `{users, group_name, group_type}`, sonst `{users}`; `X-Api-Key`-Header; Optionen `{attempts: EXAM_MODE_REQUEST_ATTEMPTS, timeoutMs: EXAM_MODE_REQUEST_TIMEOUT_MS, backoffMs: EXAM_MODE_REQUEST_BACKOFF_MS}`; Fehler wird als `Error` **durchgereicht** (nicht in `CustomHttpException` verpackt) — der Worker braucht ihn roh für die `reason`.
Änderung: Methode ergänzen. Die alten `startExamMode`/`stopExamMode` bleiben zunächst stehen (T7 räumt auf), damit dieser Commit isoliert grün ist.
Verify: `iter.sh test:api`: STOP+group sendet `group_name`/`group_type`; START sendet **nur** `users`; ein Upstream-Fehler kommt als `Error` heraus, nicht als `CustomHttpException`.
i18n: keine
Doku: keine
Abhängt von: T1, T4

### T6 — api/lmnApi: ExamModeService (Queue, Worker, Job-Lifecycle)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/examMode/examMode.service.ts`
Soll: NEW:18930-19110. `onModuleInit` legt `Queue`+`Worker` auf `QUEUE_CONSTANTS.EXAM_MODE_QUEUE` an (`setMaxListeners(0)`, `concurrency: EXAM_MODE_WORKER_CONCURRENCY`); `onModuleDestroy` schließt beide. `createJob` (18954-18975: `randomUUID`, alle User auf PENDING, Dokument anlegen, Job mit `{removeOnComplete:true, removeOnFail:true, attempts:1}` einreihen, `mapToStatus` zurück). `getJob(jobId, initiator)` (18976-18981) — **wirft 404, wenn `doc.initiator !== initiator`** (Mandantentrennung, nie weglassen). `processJob` (18982-19086: Status auf RUNNING, Fortschritt senden, in `EXAM_MODE_BATCH_SIZE`-Batches `toggleExamModeBatch`, Batch-Erfolg → alle User SUCCESS, Batch-Fehler → FAILED mit `reason`, Endzustand COMPLETED/PARTIAL/FAILED). `emitProgress` (19087: `sseService.sendEventToUser(initiator, JSON.stringify(status), SSE_MESSAGE_TYPE.EXAM_MODE_PROGRESS)`). `static mapToStatus` (19091-19108).
Änderung: 1:1. `EXAM_MODE_WORKER_CONCURRENCY` als benannte Konstante (Wert aus dem Soll ablesen). Statische Logger mit `ExamModeService.name`. **`lmnApiToken` landet in den BullMQ-Job-Daten → in Redis. Nie loggen.** SPDX.
Verify: `iter.sh test:api` mit gemocktem Model/Service/SSE: `createJob` legt genau ein Dokument mit `total===users.length` an; `getJob` mit fremdem `initiator` wirft 404; 25 User → 3 Batch-Aufrufe; ein fehlgeschlagener Batch von dreien ⇒ Endzustand `partial` und genau 10 User `failed`; `emitProgress` geht **nur** an den Initiator.
i18n: keine
Doku: keine
Abhängt von: T2, T3, T5

### T7 — api/lmnApi: Controller-Routen + DTO + Modul-Wiring  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnApi.controller.ts`, `apps/api/src/lmnApi/dto/exam-mode-body.dto.ts`, `apps/api/src/lmnApi/lmnApi.module.ts`
Soll: NEW:18177-18195 + 18352-18377. `PUT exam-mode/:state`: `@HttpCode(HttpStatus.ACCEPTED)` (**202**), `@UsePipes(strictTransformValidationPipe)`, prüft `params.state` gegen `Object.values(EXAM_MODE_ACTION)` → sonst 400 `ExamModeInvalidAction`, ruft `examModeService.createJob({action, users, lmnApiToken, initiator: username, groupName, groupType})`. `GET exam-mode/jobs/:jobId` → `examModeService.getJob(jobId, username)`.
Änderung: Beide Routen; `ExamModeBodyDto` (`users: string[]`, `groupName?`, `groupType?`). `ExamModeService` + `MongooseModule.forFeature([ExamModeJob])` + `SseModule` im `LmnApiModule` registrieren. **Bestehende Guards des Controllers unverändert lassen; die alten `startExamMode`/`stopExamMode` in `lmnApi.service.ts` jetzt entfernen** (nur noch `toggleExamModeBatch`). `strictTransformValidationPipe` kommt aus `p7-ai` T7 — falls dieses Paket zuerst läuft, die Pipe hier anlegen und in p7-ai T7 als erledigt markieren.
Verify: `iter.sh test:api` (angepasste `lmnApi.controller.spec.ts`: `state:'bogus'` → 400; `state:'start'` ruft `createJob` mit `action:'start'`; Response-Status ist 202) + am laufenden Stack `iter.sh cmd "curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:3001/edu-api/lmnapi/exam-mode/start"` liefert `401`.
i18n: keine
Doku: swagger regenerieren
Abhängt von: T6

### T8 — api/lmnApi: Spec-Coverage + Guard-Contract  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnApi.controller.spec.ts`
Soll: Repo-Policy `check-spec-coverage`.
Änderung: Specs für beide neuen Routen ergänzen (Auth-Metadaten, Pfade, `@HttpCode(202)`). Die alten `startExamMode`/`stopExamMode`-Tests (`lmnApi.service.spec.ts:185/271`) entsprechend umschreiben — nicht einfach löschen.
Verify: `iter.sh cmd 'npm run check-spec-coverage'` grün; `iter.sh test:api` grün.
i18n: keine
Doku: keine
Abhängt von: T7

### T9 — libs: Shared Types für Job-Status (BE↔FE)  [ ]
Komponente: libs · Dateien: `libs/src/lmnApi/types/examModeJobStatus.ts`
Soll: Rückgabeform von `mapToStatus` (NEW:19091-19108): `{jobId, action, state, total, users: [{username, status, reason?}], groupName?, groupType?}`.
Änderung: Interface + abgeleitete Typen aus T1. Wird von T7 (DTO) und T10 (Store) geteilt. SPDX.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` clean.
i18n: keine
Doku: keine
Abhängt von: T1

### T10 — Frontend: useLessonStore auf Job + SSE umstellen (FORK-ORIGINAL)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/ClassManagement/LessonPage/useLessonStore.ts`, zugehörige Komponenten
Soll: **Nicht rekonstruierbar** (minifiziert). Verbindlich: der Contract aus T7/T9. Heutiger Stand: `useLessonStore.ts:151/171` erwartet ein synchrones Ergebnis von `${EXAM_MODE}/start` bzw. `/stop`.
Änderung: Store ruft `PUT lmnapi/exam-mode/{start|stop}` über `eduApi`, erhält 202 + `jobId`, abonniert `SSE_MESSAGE_TYPE.EXAM_MODE_PROGRESS` (bestehendes SSE-Muster des Repos) und pollt als Fallback `GET lmnapi/exam-mode/jobs/:jobId` im `EXAM_MODE_JOB_POLL_INTERVAL_MS`-Takt. UI: Fortschritt (`x von total`), Endzustand `partial` mit Liste der fehlgeschlagenen User + `reason`. `handleApiError`, keine magic strings.
Verify: `iter.sh test:frontend` (Store-Test: 202-Antwort startet die Beobachtung; ein `partial`-Status setzt die Fehlerliste) **und** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean.
i18n: Keys aus T11
Doku: als Fork-Original kennzeichnen
Abhängt von: T7, T9, T11

### T11 — i18n (DE/EN/FR)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/locales/{de,en,fr}/translation.json`
Soll: 3 Fehler-Keys aus T2 + UI-Keys für T10.
Änderung: `lmnApi.errors.{ExamModeInvalidAction,ExamModeJobNotFound,ExamModeJobFailed}` + `classmanagement.examMode.{progress,partial,failedUsers,pending,running,completed}` in **allen drei** Locales.
Verify: `iter.sh i18n` grün; `iter.sh cmd 'npm run check-error-message-translations'` grün.
i18n: siehe oben
Doku: keine
Abhängt von: T2

### T12 — Voll-Stack-Verify am echten LMN  [?] human-gate
Komponente: — · Dateien: —
Soll: Exam-Mode schaltet **echte** Schüler-Accounts um — nur gegen einen echten linuxmuster.net-Server verifizierbar, und das ist prompt-pflichtig.
Änderung: Kein Code. Ablauf: `iter.sh deploy` → Klasse mit ≥15 Testschülern → Exam-Mode start → SSE-Fortschritt beobachten → `GET jobs/:jobId` liefert `completed` → LMN zeigt `sophomorixExamMode` gesetzt → stop → Gegenprobe. Ergebnis (inkl. Zeiten) im Ledger vermerken.
Verify: Protokoll im Task-Kommentar, mit HTTP-Codes und Job-Endzustand.
i18n: keine
Doku: Verify-Protokoll in `docs/features/p7-lmn-exam-jobs.md`
Abhängt von: T10

---

## p7-lmn-pdf-fallback [P7] — Eigener PDF-Generator als Fallback (pdfkit + DejaVu)

_Ziel:_ Wenn linuxmuster-api7 die Passwortlisten-/Klassenlisten-PDFs nicht liefert, erzeugt die API
sie selbst. · _Abhängt-von:_ — · _Status:_ offen · _Tasks:_ 10
Soll: main.js:17195-17475 (LmnPdfService) · 17477 (`require("pdfkit")`) · 17568-17620 (Labels DE/EN/FR)
· 17621-17624 (Font-Pfade) · 17626-17634 (Font-Namen + Fallback) · 17636ff (Layout) ·
14772-14781 (`buildPdfJobResult`) · 14782-14808 (printPasswords-Fallback) · 14809-14848
(getStudentsList + tryStudentsListFallback) · 79274 (`pdfkit ^0.15.2`, `@types/pdfkit ^0.17.6`)

**Go/No-Go: GO nach Lizenz-Klärung (T2 ist der Gate).** Technisch klein und sauber gekapselt.
Die einzige echte Frage sind die **Font-Binaries**: `DejaVuSans.woff` / `DejaVuSans-Bold.woff` sind
Fremd-Assets und müssen vor dem Public-Gehen korrekt attribuiert werden. Ohne die Fonts fällt der
Generator auf Helvetica zurück (NEW:17240-17246) — dann brechen aber Umlaute/Akzente, also genau die
Namen, um die es an einer deutschen/französischen Schule geht.

**Fork-Bestand:** `printPasswords` (`lmnApi.service.ts:96`) reicht 1:1 durch und wirft bei Fehler
`PrintPasswordsFailed`. **`getStudentsList` gibt es im Fork gar nicht** — die Route
`GET students-list/:schoolclass/:format` ist ebenfalls neu (NEW:18335-18350). `data/public/assets`
existiert und wird vom `apps/api/Dockerfile` ins Image kopiert; der Installer bind-mountet
`./data:/opt/edulution/api/data`, und der Container-CMD kopiert beim Boot nach — **neue Assets landen
automatisch, keine Installer-Template-Änderung nötig** (verifiziert gegen `apps/api/Dockerfile` und
`docker-compose.yml.template:47-50`).

**Was bricht:** nichts. Der Fallback greift nur im Fehlerpfad. **Aber:** er erzeugt dann PDFs mit
**Klartext-Passwörtern** in unserem Prozess — s. `riskNotes`.

**FE rekonstruierbar?** Entfällt weitgehend: die Downloads laufen über bestehende FE-Pfade. Nur die
neue `students-list`-Route braucht einen Store-Call (T9).

### T1 — Root-Dependency: pdfkit  [ ]
Komponente: root · Dateien: `package.json`, `package-lock.json`
Soll: NEW:79274 — `"pdfkit":"^0.15.2"` (dependencies), `"@types/pdfkit":"^0.17.6"` (devDependencies).
Änderung: Exakt diese Ranges, `npm install`.
Verify: `iter.sh cmd 'npm ls pdfkit'` sauber; `iter.sh cmd 'node -e "require(\"pdfkit\")"'` exit 0; `iter.sh cmd 'npm audit --omit=dev --audit-level=high'` ohne **neue** Funde.
i18n: keine
Doku: Dep ins Supply-Chain-Inventar
Abhängt von: —

### T2 — Font-Assets + Lizenz-Attribution  [?] human-gate
Komponente: apps/api, docs · Dateien: `data/public/assets/fonts/DejaVuSans.woff`, `data/public/assets/fonts/DejaVuSans-Bold.woff`, `NOTICE`, `docs/third-party-licenses.md`
Soll: NEW:17621-17624 — die Laufzeitpfade sind fix `./data/public/assets/fonts/DejaVuSans{,-Bold}.woff`.
Änderung: Beide Dateien aus der offiziellen DejaVu-Distribution beziehen (nicht aus dem edulution-Image extrahieren — Provenienz!), im WOFF-Format nach `data/public/assets/fonts/` legen, den DejaVu-Lizenztext (Bitstream Vera / Public Domain, je nach Glyph-Herkunft) in `NOTICE` und `docs/third-party-licenses.md` aufnehmen. **Gate für Kevin:** Binär-Assets im Repo + Fremdlizenz neben AGPL — bewusste Entscheidung. Alternative, falls abgelehnt: Fonts nicht ausliefern und den Helvetica-Fallback akzeptieren (dann aber Umlaut-Verlust dokumentieren).
Verify: `iter.sh cmd 'ls -l data/public/assets/fonts/'` zeigt beide Dateien; `iter.sh cmd 'grep -c DejaVu NOTICE'` > 0; `iter.sh cmd 'grep -n "COPY ./data/public/assets" apps/api/Dockerfile'` bestätigt, dass sie ins Image kommen (**keine** Dockerfile-Änderung nötig — nachweisen, nicht ändern).
i18n: keine
Doku: `NOTICE`, `docs/third-party-licenses.md`
Abhängt von: —

### T3 — libs/lmnApi: lmnPdfLayout (Labels DE/EN/FR, Fonts, Layout)  [ ]
Komponente: libs · Dateien: `libs/src/lmnApi/constants/lmnPdfLayout.ts`
Soll: NEW:17568-17620 (`LMN_PDF_LANGUAGE={DE,EN,FR}` + `LMN_PDF_LABELS` mit je 13 Feldern: credentials, classList, schoolClass, name, firstname, login, password, number, page, welcome, teachers, changePasswordHint, locale — Werte **byte-exakt** übernehmen, z. B. DE `'Zugangsdaten'`/`'de-DE'`, FR `'Identifiants'`/`'fr-FR'`) · NEW:17621-17624 (`LMN_PDF_FONT_PATHS`) · NEW:17626-17629 (`LMN_PDF_FONTS={regular:'LmnBody',bold:'LmnBodyBold'}`) · NEW:17631-17634 (`LMN_PDF_FALLBACK_FONTS={regular:'Helvetica',bold:'Helvetica-Bold'}`) · NEW:17636ff (`LMN_PDF_LAYOUT` mit `pageSize:'A4'`, `pageMargin:40`, `headerFontSize:16`, `footerFontSize:8`, … — Rest ab 17640 ablesen).
Änderung: Eine Datei, named exports + Default-Export `LMN_PDF_LAYOUT` am Ende. **Diese Labels sind PDF-interne Strings, keine i18n-Keys** — sie gehören bewusst nicht ins `translation.json` (das PDF wird serverseitig ohne i18next gerendert). SPDX.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import {LMN_PDF_LABELS as L} from \"./libs/src/lmnApi/constants/lmnPdfLayout\"; if(Object.keys(L).length!==3||L.FR.locale!==\"fr-FR\"||L.DE.credentials!==\"Zugangsdaten\") process.exit(1)"'` exit 0.
i18n: keine (bewusst — s. o.)
Doku: in `docs/features/p7-lmn-pdf-fallback.md` begründen
Abhängt von: —

### T4 — api/lmnApi: LmnPdfService — Grundgerüst (Doc, Fonts, Sprache)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnPdf.service.ts`
Soll: NEW:17195-17250. `static cachedFontBuffers`, `loadFontBuffers` (17198-17213: `readFileSync` beider Pfade; bei Fehler **einmal** `Logger.warn('Unicode PDF font unavailable, falling back to Helvetica…')` und `null` cachen), `createDocument` (17238: `new PDFDocument({size, margin, bufferPages:true})`), `registerFonts` (17240-17246: ohne Buffer → Helvetica-Namen zurück), `streamToBuffer` (17248-17256: `data`/`end`/`error`), `resolveLanguage` (17258ff: erste `preferredLanguage` der Mitglieder, lowercase, auf DE/EN/FR mappen).
Änderung: `@Injectable()`-Klasse, statische Helfer, statischer Logger mit `LmnPdfService.name`. SPDX.
Verify: `iter.sh test:api`: ohne Font-Dateien liefert `registerFonts` `{regular:'Helvetica',bold:'Helvetica-Bold'}` und loggt **genau einmal** (Cache greift); `resolveLanguage([{preferredLanguage:'fr-FR'}])` → `'FR'`; `resolveLanguage([])` → `'DE'` (Default aus dem Soll ablesen).
i18n: keine
Doku: keine
Abhängt von: T1, T3

### T5 — api/lmnApi: generatePasswordListPdf  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnPdf.service.ts`
Soll: NEW:17214-17226 (`generatePasswordListPdf(classes, {onePerPage})` → `buildPasswordCards`, dann `renderPasswordPages` **oder** `renderPasswordGrid`) + die zugehörigen statischen Render-Methoden (`buildPasswordCards`, `buildClassMeta`, `renderPasswordPages`, `renderPasswordGrid` — Zeilen zwischen 17260 und 17390 ablesen).
Änderung: 1:1. **`buildPasswordCards` muss auch von außen aufrufbar sein** — `lmnApi.service.ts` prüft `LmnPdfService.buildPasswordCards(classes).length > 0`, bevor es den Fallback nutzt (NEW:14792). **Keine Passwörter in Logs.**
Verify: `iter.sh test:api`: erzeugter Buffer beginnt mit `%PDF-`; `onePerPage:true` ergibt ≥ so viele Seiten wie Karten; leere Klassenliste → `buildPasswordCards` liefert `[]`; ein Logger-Spy sieht das Test-Passwort **nirgends**.
i18n: keine
Doku: keine
Abhängt von: T4

### T6 — api/lmnApi: generateStudentsListPdf  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnPdf.service.ts`
Soll: NEW:17228-17237 (`generateStudentsListPdf(schoolClass)`) · `buildStudentEntries` (nach Locale sortiert) · `renderStudentsTable` (17391-17439) · `drawStudentsFooter` (17440-17460: `bufferedPageRange`, Datum zentriert, `Seite N` rechts, `page.margins.bottom` temporär auf 0) · `static isStudentMember` (17461-17463: `sophomorixRole === SOPHOMORIX_GROUP_TYPES.STUDENT`).
Änderung: 1:1. `SOPHOMORIX_GROUP_TYPES` gibt es im Fork bereits (`libs/src/lmnApi/`) — vorher per grep bestätigen, **nicht** neu anlegen (AGENTS.md: erst suchen).
Verify: `iter.sh test:api`: Buffer beginnt mit `%PDF-`; eine Klasse mit 60 Schülern erzeugt >1 Seite und jede Seite trägt eine Fußzeile; Nicht-Schüler-Mitglieder tauchen nicht in der Tabelle auf.
i18n: keine
Doku: keine
Abhängt von: T4

### T7 — api/lmnApi: printPasswords-Fallback verdrahten  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnApi.service.ts`
Soll: NEW:14772-14781 (`static buildPdfJobResult(buffer, filename)` mit `Content-Type: application/pdf` + `buildAttachmentContentDisposition(filename)`) · NEW:14782-14808 (im `catch`: **nur** wenn `options.format === FILE_EXPORT_FORMAT.PDF`, alle Klassen via `getSchoolClass(token, c, true)` holen, bei ≥1 Karte PDF bauen, `Logger.warn('LMN password PDF failed, served edulution fallback for …')` — **im Fork rebranden**, Dateiname `${classes}-${school}-passwords.pdf`; scheitert auch der Fallback: `Logger.error` und weiter zum ursprünglichen 502).
Änderung: Fallback-Zweig ergänzen, `LmnPdfService` injizieren. `FILE_EXPORT_FORMAT` und `buildAttachmentContentDisposition` im Fork suchen; falls nicht vorhanden, minimal anlegen. Log-Text auf `linuxmuster-ui` rebranden (Rebrand-Gate).
Verify: `iter.sh test:api`: Upstream-Fehler + `format:'pdf'` ⇒ 200 mit `%PDF-`-Buffer und `Content-Disposition: attachment`; Upstream-Fehler + `format:'csv'` ⇒ unverändert 502; Upstream-Fehler + leere Klasse ⇒ 502 (kein leeres PDF).
i18n: keine
Doku: keine
Abhängt von: T5

### T8 — api/lmnApi: getStudentsList-Route + Fallback  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnApi.service.ts`, `apps/api/src/lmnApi/lmnApi.controller.ts`
Soll: NEW:14809-14831 (`getStudentsList(token, schoolclass, format)` → `${SCHOOL_CLASSES_LMN_API_ENDPOINT}/${schoolclass}/${format}_students_list`, `responseType: ARRAYBUFFER`; Fehlerklassifikation: `'not found or empty'` → `GetStudentsListEmpty`, `'Compilation failed'` → `GetStudentsListInvalidName`, sonst `GetStudentsListFailed`, alle 502) · NEW:14833-14848 (`tryStudentsListFallback`) · NEW:18335-18350 (Route `GET students-list/:schoolclass/:format`, `@Headers(X-Api-Key)`, `@Res()`) · NEW:18106-18114 (`static sendFileResponse`).
Änderung: Service-Methoden + Route + `sendFileResponse`-Helfer. **Guards des Controllers unverändert** — keine neue `@Public()`-Route. 3 neue Fehler-Keys in `lmnApiErrorMessage`.
Verify: `iter.sh test:api` (Spec: die drei Fehlerklassen werden korrekt zugeordnet; `format:'pdf'` + Upstream-Fehler + nicht-leere Klasse ⇒ PDF-Buffer; leere Klasse ⇒ `null` aus dem Fallback ⇒ 502) + am laufenden Stack `curl` auf die Route ⇒ `401`.
i18n: 3 Keys in T10
Doku: swagger regenerieren
Abhängt von: T6, T7

### T9 — Frontend: students-list-Download anbinden (FORK-ORIGINAL)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/ClassManagement/**`
Soll: **Nicht rekonstruierbar.** Verbindlich ist die Route aus T8.
Änderung: Store-Action mit `eduApi` und `ResponseType.BLOB`, `handleApiError`, Download-Trigger. Kein `fetch`, Call gehört in den Store.
Verify: `iter.sh test:frontend` **und** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean.
i18n: Keys aus T10
Doku: als Fork-Original kennzeichnen
Abhängt von: T8, T10

### T10 — i18n + Doku  [ ]
Komponente: apps/frontend, docs · Dateien: `apps/frontend/src/locales/{de,en,fr}/translation.json`, `docs/features/p7-lmn-pdf-fallback.md`
Änderung: `lmnApi.errors.{GetStudentsListEmpty,GetStudentsListInvalidName,GetStudentsListFailed}` + UI-Keys für T9 in **allen drei** Locales. Doku: wann der Fallback greift, warum die PDF-Labels **keine** i18n-Keys sind, Font-Lizenz-Verweis, Sicherheitshinweis zu Klartext-Passwörtern.
Verify: `iter.sh i18n` grün; `iter.sh cmd 'npm run check-error-message-translations'` grün.
i18n: siehe oben
Doku: `docs/features/p7-lmn-pdf-fallback.md`
Abhängt von: T8

---

## p7-surveys-limiter-collection [P7] — Backend-Limiter in eigene Collection

_Ziel:_ `Survey.backendLimiters` (eingebettet) → eigene Collection `SurveysBackendLimiter` mit
Unique-Index und `selectionCount`. · _Abhängt-von:_ — · _Status:_ offen · _Tasks:_ 9
Soll: main.js:58984-59025 (Schema, Props 58999-59015, Indizes 59020-59021) · 59054-59146 (Choice-Subschema)
· 62619-62740 (Migration 002) · 63093ff (Migration 005) · 63518-63662 (SurveysBackendLimiterService) ·
60198-60210 (Model-Injektion) · 58605 (`forFeature`) · 62406 (Migrations-Liste)

**Go/No-Go: GO — kleinstes Paket, guter Einstieg in die 2.1.0-Welle.** Klar begrenzt, gut testbar,
und die Migration ist das erste echte 2.1.0-Datenmodell-Beispiel im Fork. Einzige Vorsicht: sie ist
**destruktiv** (`$unset: backendLimiters`) und rechnet `selectionCount` aus allen Antworten neu.

**Fork-Bestand:** `Survey.backendLimiters?: {questionName, choices}[]` eingebettet
(`apps/api/src/surveys/survey.schema.ts:35-39`), gelesen an **genau einer** Stelle
(`survey-answers.service.ts:98`), gespiegelt in `libs/src/survey/types/api/survey.dto.ts:28` und
`libs/src/survey/utils/resetSurveyIdFromFormulasBackendLimiters.ts`. Migrations-Infrastruktur
(`surveysMigrationsList.ts`, `migration.type.ts`) ist da; höchste Survey-Migration ist `001Attachments`
(version 1). Kein `selectionCount`, kein Unique-Index, kein SSE-Broadcast.

**Was bricht:** vier Stellen gleichzeitig (Schema, DTO, Util, Leser) + eine destruktive Migration.
Details in `riskNotes`.

**FE rekonstruierbar?** Für den Kern **irrelevant** — die Limiter-Verwaltung im Survey-Editor arbeitet
über die Formel, nicht über das Schema. Erst die optionalen 2.1-Extras (T7-T9, SSE-Live-Update) hätten
eine FE-Hälfte, und die ist nicht rekonstruierbar.

### T1 — api/surveys: Choice-Subschema  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/choice.schema.ts`
Soll: NEW:59054-59146. `@Schema({_id:false})`, Felder: `name` (String required), `title` (String required), `limit` (Number, default 0, **min 0**), `selectionCount` (Number, default 0), `isCustomUserEntry` (Boolean).
Änderung: Neues Subschema. Der Fork hat `ChoiceDto` in `libs/src/survey/types/api/choice.dto.ts` — **erst prüfen**, ob `selectionCount`/`isCustomUserEntry` dort fehlen, und den DTO additiv nachziehen. SPDX.
Verify: `iter.sh test:api`: SchemaFactory kompiliert; `limit:-1` wird abgelehnt; Defaults sind 0/0.
i18n: keine
Doku: keine
Abhängt von: —

### T2 — api/surveys: SurveysBackendLimiter-Schema  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/surveys-backend-limiter.schema.ts`
Soll: NEW:58989-59025. `@Schema({timestamps:true, strict:true})`; `surveyId` (`SchemaTypes.ObjectId`, `ref:'Survey'`, required), `questionName` (String required), `choices` (`[ChoiceSchema]`, required, default `[]`), `schemaVersion` (default 1). Indizes: **`{surveyId:1, questionName:1}` unique** und `{surveyId:1}`. `toJSON: {virtuals:true}`.
Änderung: 1:1. Default-Export ist das **Schema** (nicht die Klasse) — wie im Soll (NEW:59025); Klasse als named export für `InjectModel`. SPDX.
Verify: `iter.sh test:api`: beide Indizes gesetzt, der erste unique; zwei Dokumente mit gleichem `{surveyId,questionName}` → Duplicate-Key-Fehler.
i18n: keine
Doku: keine
Abhängt von: T1

### T3 — api/surveys: Modul-Wiring + Model-Injektion  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/surveys.module.ts`, `apps/api/src/surveys/survey-answers.service.ts`
Soll: NEW:58605 (`MongooseModule.forFeature([{name: SurveysBackendLimiter.name, schema: SurveysBackendLimiterSchema}])`) · NEW:60198-60210 (Injektion in `SurveyAnswersService`).
Änderung: `forFeature` ergänzen, Model in `SurveyAnswersService` injizieren. **Noch keine Verhaltensänderung** — dieser Commit ist rein additiv und muss isoliert grün sein.
Verify: `iter.sh test:api` — alle bestehenden Survey-Specs unverändert grün (Regression); das Modul kompiliert mit dem neuen Model.
i18n: keine
Doku: keine
Abhängt von: T2

### T4 — api/surveys: Migration 002 (verschieben) — DESTRUKTIV  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/migrations/surveysMigration002MoveBackendLimitersToOwnCollection.ts`, `apps/api/src/surveys/migrations/surveysMigrationsList.ts`
Soll: NEW:62619-62740. `version: 2`; `previousSchemaVersion=1`, `newSchemaVersion=2`. Cursor über Surveys mit `schemaVersion===1` **oder** fehlendem `schemaVersion` **oder** nicht-leerem `backendLimiters`. Ohne Limiter: nur `schemaVersion` setzen (gesammelt per `bulkWrite`). Mit Limitern: über alle `SurveyAnswer`-Dokumente des Surveys zählen (`countChoiceMatchesInAnswer`; bei `isCustomUserEntry` gegen `${questionName}${SURVEYJS_COMMENT_SUFFIX}`), Ergebnis als `selectionCount` in die neuen Dokumente (`upsert` mit `$setOnInsert`, `ordered:false`). **Bei Write-Errors: `Logger.error`, Survey in `failedSurveyIds`, `schemaVersion`-Bump überspringen (Retry beim nächsten Boot).** Erfolgreiche: `$unset:{backendLimiters:''}` + `$max:{schemaVersion:2}` mit `{strict:false}`. Abschluss-Logs für migrierte und fehlgeschlagene Dokumente.
Änderung: 1:1, in `surveysMigrationsList` **nach** `001Attachments` einsortieren (Monotonie). Hilfsfunktionen `countChoiceMatchesInAnswer` (Modul 950 — Zeilen per grep bestätigen) und `SURVEYJS_COMMENT_SUFFIX` im Fork suchen, sonst anlegen. **Forward-only.** SPDX.
Verify: `iter.sh test:api` mit Spec: (a) Survey ohne Limiter → nur `schemaVersion:2`; (b) Survey mit 1 Limiter + 3 Antworten, davon 2 auf Choice A → neues Dokument mit `selectionCount:2` für A, `backendLimiters` weg, `schemaVersion:2`; (c) simulierter Bulk-Write-Fehler → `schemaVersion` bleibt 1 **und** `backendLimiters` bleibt erhalten (Retry-Fähigkeit).
i18n: keine
Doku: `docs/features/p7-surveys-limiter-collection.md`: „destruktiv, forward-only, Rollback = Dump + `./data/master.key`"
Abhängt von: T3

### T5 — api/surveys: Leser umstellen (BREAKING, 4 Stellen)  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/surveys/survey.schema.ts`, `apps/api/src/surveys/survey-answers.service.ts`, `libs/src/survey/types/api/survey.dto.ts`, `libs/src/survey/utils/resetSurveyIdFromFormulasBackendLimiters.ts`
Soll: NEW:58753-58805 (Survey **ohne** `backendLimiters`) · NEW:60256-60280 + 60307 (Lesen aus dem Limiter-Model statt aus dem Survey-Dokument).
Änderung: `backendLimiters`-Prop aus `survey.schema.ts:35-39` entfernen; `survey-answers.service.ts:98` auf `surveysBackendLimiterModel.findOne({surveyId, questionName}).lean()` umstellen (Fehlerfall bleibt `NoBackendLimiters`); `survey.dto.ts:28` und die Util nachziehen. **Alle vier im selben Commit** — sonst kompiliert es nicht bzw. liest ins Leere.
Verify: `iter.sh test:api` grün (angepasste `survey-answers.service.spec.ts`); `iter.sh cmd "grep -rn 'backendLimiters' apps/api/src libs/src | grep -v migrations | wc -l"` liefert `0`; `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` clean.
i18n: keine
Doku: keine
Abhängt von: T4

### T6 — api/surveys: Schreiber + Lösch-Pfade  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/surveys.service.ts`, `apps/api/src/surveys/survey-answers.service.ts`
Soll: NEW:60307-60360 (`updateOne`/`bulkWrite` auf dem Limiter-Model) · NEW:60494-60510 (`$inc` auf `choices.$.selectionCount` mit `$elemMatch`-Fallback) · NEW:63636-63655 (Löschen eines Limiters bzw. aller Limiter eines Surveys).
Änderung: Beim Anlegen/Ändern eines Surveys die Limiter-Dokumente pflegen; beim Löschen eines Surveys **alle** zugehörigen Limiter mitlöschen (sonst Waisen). `selectionCount` beim Beantworten hochzählen.
Verify: `iter.sh test:api`: Survey löschen entfernt alle Limiter-Dokumente; zweimal dieselbe Choice beantworten ⇒ `selectionCount===2`; ein Limiter für eine gelöschte Frage verschwindet.
i18n: keine
Doku: keine
Abhängt von: T5

### T7 — api/surveys: Migration 005 (Choice-Duplikate)  [?]
Komponente: apps/api · Dateien: `apps/api/src/surveys/migrations/surveysMigration005DeduplicateBackendLimiterChoices.ts`
Soll: NEW:63093ff (`surveysMigration005DeduplicateBackendLimiterChoices`).
Änderung: **Nur bauen, wenn T4 in der Praxis Duplikate erzeugt** (2.1.0 brauchte sie offenbar nachträglich). Erst nach dem Migrations-Testlauf aus T4 entscheiden; sonst `[~]` mit Begründung. Beachten: 2.1.0 hat dazwischen `003StripOriginFromSurveyUrls` und `004AddParticipatedUsernames` — die gehören **nicht** in dieses Paket; die Versionsnummer hier entsprechend an die Fork-Migrationsliste anpassen, nicht blind `005` übernehmen.
Verify: falls gebaut: `iter.sh test:api` mit Spec (Limiter mit zwei gleichen `title`-Choices wird zu einem zusammengeführt, `selectionCount` summiert).
i18n: keine
Doku: Entscheidung im Task-Kommentar festhalten
Abhängt von: T4

### T8 — api/surveys: SurveysBackendLimiterService (2.1-Parität)  [?]
Komponente: apps/api · Dateien: `apps/api/src/surveys/surveys-backend-limiter.service.ts`
Soll: NEW:63536-63662. `broadcastBackendLimiterUpdate` (63545: bei `isPublic` `sseService.informAllUsers`, sonst `sendEventToUsers` an die eingeladenen Mitglieder, Typ `SSE_MESSAGE_TYPE.SURVEY_BACKEND_LIMITER_UPDATED`), `static createChoiceRecordFromChoicesMap` (63555), `throwErrorIfAppendingOwnChoicesIsNotAllowedForQuestions` (63576-63585: Frage muss `showOtherItem` haben, sonst 403), `updateOrCreateSurveysBackendLimiters` (63587ff, mit `hasUniqueChoiceTitles`-Prüfung → 400 `DuplicateChoiceTitle`), Lösch-Methoden (63636-63655).
Änderung: **Optional — deutlich mehr als „Collection verschieben".** Bringt Live-Aktualisierung der Restplätze und selbst angelegte Choices. Braucht zusätzlich `SSE_MESSAGE_TYPE.SURVEY_BACKEND_LIMITER_UPDATED`, `flattenSurveyElements`, `getTopLevelElements`, `hasUniqueChoiceTitles`, `SURVEYJS_OTHER_VALUE` — alle erst im Fork suchen. **Entscheidung:** jetzt bauen oder als eigenes Ticket parken?
Verify: falls gebaut: `iter.sh test:api` (Broadcast geht bei `isPublic` an alle, sonst nur an Eingeladene; doppelte Choice-Titel → 400; eigene Choice bei Frage ohne `showOtherItem` → 403).
i18n: keine
Doku: Entscheidung dokumentieren
Abhängt von: T6

### T9 — Doku + Migrations-Testlauf gegen eine Kopie  [ ]
Komponente: docs · Dateien: `docs/features/p7-surveys-limiter-collection.md`
Soll: Die Migration aus T4 ist der erste destruktive 2.1.0-Datenschritt im Fork.
Änderung: Spec schreiben (Vorher/Nachher-Datenmodell, Migrationslogik, Retry-Verhalten, Rollback = Dump **+ `./data/master.key`**, offene `[?]` aus T7/T8). Migration auf der crabbox gegen eine **Kopie** einer realistischen Survey-DB laufen lassen und Laufzeit + migrierte Dokumentzahl protokollieren.
Verify: `iter.sh cmd 'node dist/apps/api/main.js'`-Bootlog zeigt `Migration completed: N documents migrated` und **keine** `un-migrated`-Fehlerzeile; Protokoll im Doc.
i18n: keine
Doku: `docs/features/p7-surveys-limiter-collection.md`
Abhängt von: T6
