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

> **Adressierung:** die Task-Nummern starten in **jedem** Sub-Paket wieder bei T1. Tasks dieses
> Abschnitts heißen deshalb `p7-calendar-sogo-sharing:T<n>` (z. B. `p7-calendar-sogo-sharing:T7`);
> Querverweise aus anderen Ledgers müssen diese Form benutzen — ein blankes „T7" ist im Datei-Kontext
> mehrdeutig. (Nicht umnummerieren: das bräche alle bestehenden Verweise.)
>
> **Lint-Gate (gilt für jeden `iter.sh lint` unten):** `iter.sh lint` fährt `npm run lint`, und
> `apps/api/project.json` setzt im `lint`-Target `"fix": true` — autofixbare Regeln werden also **still
> repariert** statt gemeldet. Der belastbare Gate-Befehl ist zusätzlich
> `iter.sh cmd 'NODE_OPTIONS=--max-old-space-size=6144 npx nx run-many -t lint --skip-nx-cache --fix=false --parallel=1'`.

_Ziel:_ Das im Fork gebaute, **eigene** Share-Modell (`CalendarShareEntry` in Mongo) durch die
2.1.0-Lösung ersetzen: Freigaben liegen als **SOGo-ACLs** auf dem Server, nicht mehr in unserer DB.
+ 7 neue Routen. · _Abhängt-von:_ `p5-calendar` (erledigt) · _Status:_ offen · _Tasks:_ 16
Soll: main.js:43099-43131 (Controller-Methoden — beginnt bei `async updateCalendar` auf 43099; 43107 ist erst `searchShareTargets`, die alte Zahl ließ zwei der sieben Methoden aus) · 43202-43296 (7 Route-Dekoratoren; der Block endet erst auf 43296 mit `], CalendarController.prototype, "unsubscribeCalendar", null);` — 43285 war mitten im letzten Dekorator) · 43404-43411
(Path-Segments) · 43835-43932 (Service-Sharing-Methoden) · 45817-45998 (CalDavClientFactory) ·
46035-46108 (SogoSharingClient — `SOGO_SPECIAL_ACL_UIDS` steht schon auf 46035, `exports["default"]` auf 46108) · 46138-46165 (CalendarMetadata **ohne** shares; `schemaVersion` ist dort `@Prop({ type: Number, default: 2 })`, 46157-46159 — **nicht** default 1) · 46225-46239
(migration000) · 46272-46315 (migration001) · 46340 (deriveCalendarId) · 46369-46377
(decodeLegacyCalendarId) · 44737-44743 (CalendarAccessLevel) · 44770-44830 (Rights-Mapping)

**Go/No-Go:** **GO, mit offener Betriebsfrage.** Technisch vollständig rekonstruierbar. Aber:
Sharing funktioniert **ausschließlich gegen SOGo** — `getSoBaseUrl()` (main.js:45939-45946) leitet die
`/dav`-Basis-URL auf den SOGo-Web-Baum `/so` um und wirft sonst 503. Der p5-Voll-Stack-Verify lief
gegen **Radicale**; damit ist Sharing **nicht** testbar. Vor dem Start: entscheiden, ob mailcow/SOGo
zur unterstützten Referenz-Plattform für Kalender wird (dann passt es zu `p4-mail-rework`) oder ob
Sharing ein „nur mit SOGo"-Feature bleibt. Das ist eine Produktentscheidung, keine technische.

**Fork-Bestand:** `apps/api/src/calendar/` mit 7 Routen (list/create calendars, set tags, CRUD events),
`CalendarMetadata{calendarId,ownerUsername,shares[],tags[]}`, embedded `CalendarShareEntry`
(`subjectId/subjectType/label/permission`), `CalendarSharePermission`/`CalendarShareSubjectType` in
`libs/src/calendar/constants/`, Kalender-ID = `base64url(url)` (calendar.service.ts:53-54), DAV-Client
**inline** in `calendar.service.ts` (buildClient/backend/dispatcher, Zeilen 84-180).
`CreateCalendarBodyDto.shares` ist **required**.

**Korrektur der früheren Fassung (am Tree nachgeprüft, nicht angenommen):** dort stand, `shares` sei
„toter Ballast", keine Route lese oder schreibe es. Das ist **falsch**. `POST calendar/calendars`
schreibt die Einträge nach Mongo (`calendar.service.ts:387` `shareEntries = input.shares.filter(…)`,
`:392` `$set: { ownerUsername, shares: shareEntries, tags }`), und `GET calendar/calendars` gibt sie
zurück (`:306` `shares: doc?.shares ?? []`, `:427` `return { ...base, shares: shareEntries, tags }`).
Daran hängt außerdem eine **lebende Fork-UI**: `apps/frontend/src/pages/Calendar/ShareEditor.tsx`,
`buildCalendarCreateBody.ts` (:14/:22), `CalendarManagementDialog.tsx` (:46/:62/:113) sowie die Tests
`CalendarManagementDialog.test.tsx` (:33/:43/:48-67) und `useCalendarStore.test.ts` (:49/:51), dazu
`libs/src/calendar/types/calendarCreateBody.ts` (`shares` **required**). Der Ausbau ist also ein
echter Feature-Rückbau mit FE-Fallout — T9 trägt ihn deshalb jetzt explizit mit.

**Was bricht:** (1) `shares` fällt aus Schema + DTOs (required→weg!) + FE-Store; (2) Kalender-ID wechselt
auf `sha256hex(url)` und ist **nicht mehr dekodierbar** → jeder ID-Konsument muss auflösen statt
dekodieren; (3) zwei Migrationen auf derselben Collection, forward-only, mit `deleteOne`-Merge.
Details in `riskNotes`.

**FE rekonstruierbar?** **Nein.** Share-Dialog, Zugriffsstufen-Auswahl und Ziel-Suche sind
Fork-Original (T14/T15). Der API-Contract ist exakt, das Aussehen nicht.

### T1 — libs/calendar: DavAuthMode vereinheitlichen (Rename + OAUTH)  [ ]
Komponente: libs · Dateien: `libs/src/calendar/constants/calDavAuthMode.ts` → **umbenennen zu** `libs/src/common/constants/davAuthMode.ts`; Consumer (am Tree nachgezählt): `apps/api/src/calendar/calendar.service.ts` (32/33/37/86/103/109/155), `libs/src/appconfig/constants/extendedOptions/calendarCaldavExtendedOptions.ts` (25/28/29), `apps/frontend/src/pages/Settings/AppConfig/appConfigOptions.spec.ts` (Import + 55/56). **Nicht** `calendar.service.spec.ts` — die Datei nennt `CalDavAuthMode` nirgends; die frühere Fassung führte sie fälschlich und ließ dafür die FE-Spec aus, die der Rename tatsächlich bricht
Soll: NEW:3085-3089 (`const DavAuthMode = { BASIC:'BASIC', DIGEST:'DIGEST', OAUTH:'OAUTH' }`, webpack-Modul 78 — in 2.1.0 **shared** zwischen calendar und contacts, deshalb nicht mehr unter `calendar/`).
Änderung: Datei verschieben, Default-Export `DavAuthMode` (Dateiname == Export, AGENTS.md), dritten Wert `OAUTH` ergänzen, alle Importe nachziehen. Werte `BASIC`/`DIGEST` bleiben byte-gleich → **datenneutral** für bereits persistierte appConfigs. Kein neuer SPDX-Header (Datei existiert, Header bleibt).
Verify: `iter.sh lint` sauber; `iter.sh cmd "grep -rnE 'calDavAuthMode|CalDavAuthMode' apps libs | wc -l"` liefert `0` — **beide** Schreibweisen, sonst wäre „Datei verschoben, Bezeichner aber nicht umbenannt" grün (AGENTS.md: Dateiname == Export); `iter.sh cmd 'npx tsx -e "import D from \"./libs/src/common/constants/davAuthMode\"; if(Object.keys(D).length!==3||D.OAUTH!==\"OAUTH\") process.exit(1)"'` exit 0; **zusätzlich** `iter.sh test:frontend` grün — `apps/frontend/src/pages/Settings/AppConfig/appConfigOptions.spec.ts` importiert den alten Pfad und geht sonst rot, und weder `iter.sh lint` noch `apps/api/tsconfig.app.json` fangen das.
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T2 — libs/calendar: CalendarAccessLevel + CalendarShareRole + isSogoTrue  [ ]
Komponente: libs · Dateien: `libs/src/calendar/constants/calendarAccessLevel.ts`, `libs/src/calendar/constants/calendarShareRole.ts`, `libs/src/calendar/utils/isSogoTrue.ts`
Soll: NEW:44737-44742 (`CalendarAccessLevel = { NONE, FREE_BUSY, READ, WRITE }`, Werte == Keys) · NEW:44850-44856 (Modul 695, `CalendarShareRole`) · NEW:44884 (Modul 696, `isSogoTrue`; benutzt in 43859/43890/43913 und in `rightsToAccessLevel` 44810/44811).
**Zwei Korrekturen der früheren Fassung — beide direkt aus dem Bundle gelesen, nicht abgeleitet:**
(1) `CalendarShareRole` hat **fünf** Member und **Werte ≠ Keys** (es sind SOGo-Wire-Strings):
`{ NONE: 'None', DATE_AND_TIME_VIEWER: 'DAndTViewer', VIEWER: 'Viewer', RESPONDER: 'Responder', MODIFIER: 'Modifier' }`.
Die frühere Fassung nannte vier Member ohne Werte — `RESPONDER` fehlte (T3 mappt ihn auf `READ`), und
Keys-als-Werte hätten jeden `saveUserRights`-Aufruf still falsch gemacht, ohne dass ein Test es merkt.
(2) `isSogoTrue` ist exakt `(value) => value === true || value === 1` — **kein** String-Handling.
`'1'`/`'YES'` waren erfunden; ein zusätzlicher String-Zweig wäre eine Abweichung vom Soll.
Änderung: Drei Dateien, const-Objekte (**keine enums**), Default-Export am Dateiende, abgeleitete Typen `TCalendarAccessLevel`/`TCalendarShareRole` via `(typeof X)[keyof typeof X]`. SPDX-Header.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import A from \"./libs/src/calendar/constants/calendarAccessLevel\"; import R from \"./libs/src/calendar/constants/calendarShareRole\"; import S from \"./libs/src/calendar/utils/isSogoTrue\"; const okRole = JSON.stringify(R)===JSON.stringify({NONE:\"None\",DATE_AND_TIME_VIEWER:\"DAndTViewer\",VIEWER:\"Viewer\",RESPONDER:\"Responder\",MODIFIER:\"Modifier\"}); const okSogo = S(1)===true && S(true)===true && S(\"1\")===false && S(0)===false; if(A.FREE_BUSY!==\"FREE_BUSY\"||Object.keys(A).length!==4||!okRole||!okSogo) process.exit(1)"'` exit 0. Der `JSON.stringify`-Vergleich erzwingt fünf Member **in Soll-Reihenfolge mit den Wire-Strings** und schlägt bei Keys-als-Werten fehl; `S(\"1\")===false` schlägt fehl, sobald jemand den erfundenen String-Zweig einbaut. **Keine Spec unter `libs/`** — `libs/project.json` hat nur ein `lint`-Target, unter `libs/` liegt heute keine einzige `*.spec.ts`, und `apps/api/jest.config.ts` sammelt nur `apps/api`; eine Spec dort liefe nie.
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T3 — libs/calendar: Rights-Mapping (accessLevelToRights / rightsToAccessLevel)  [ ]
Komponente: libs · Dateien: `libs/src/calendar/utils/calendarShareRights.ts`
Soll: NEW:44770-44830. `RIGHTS_BY_ACCESS_LEVEL` mappt jede Stufe auf `{Public, Confidential, Private, canCreateObjects, canEraseObjects}` — NONE→alle `NONE`/false; FREE_BUSY→alle `DATE_AND_TIME_VIEWER`/false; **READ→`Public: VIEWER`, aber `Confidential`/`Private: DATE_AND_TIME_VIEWER`** (bewusst asymmetrisch: privat markierte Termine bleiben verdeckt); WRITE→alle `MODIFIER`/true/true. `accessLevelToRights` (NEW:44805) fällt bei unbekannter Stufe auf NONE zurück; `rightsToAccessLevel` (NEW:44807-44822) leitet in genau dieser Reihenfolge zurück ab: `isSogoTrue(rights.canCreateObjects) || isSogoTrue(rights.canEraseObjects) || Rolle MODIFIER` → WRITE (44810-44813 — die beiden Flags laufen durch `isSogoTrue`, weil SOGo `1` statt `true` liefert; eine simple Truthiness-Prüfung wäre für `0`/`1` zufällig richtig, für `'0'` aber falsch) · Rolle `VIEWER` **oder `RESPONDER`** → READ (44815; `RESPONDER` fehlte in der früheren Fassung ganz) · Rolle `DATE_AND_TIME_VIEWER` → FREE_BUSY (44818) · sonst NONE.
Änderung: Named exports `accessLevelToRights`/`rightsToAccessLevel` (Ausnahme von der Default-Export-Regel, wie im Soll — zwei Funktionen, ein Modul). SPDX.
Verify: **Spec-Ort korrigiert** — sie darf **nicht** unter `libs/` liegen (`libs/project.json` hat nur ein `lint`-Target, unter `libs/` existiert keine einzige `*.spec.ts`, `apps/api/jest.config.ts` sammelt nur `apps/api`; die Spec wäre nie gelaufen und der Verify trotzdem grün). Stattdessen `apps/api/src/calendar/calendarShareRights.spec.ts` — Präzedenz: `apps/api/src/appconfig/pickSafeExtendedOptions.spec.ts` testet genauso eine `libs`-Funktion aus `apps/api` heraus. Lauf: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=calendarShareRights'` (jest 29.7 → Singular; findet das Pattern nichts, endet jest nicht-null, der Verify ist also nicht vakuum-grün). Inhalt: Round-Trip für alle 4 Stufen (`rightsToAccessLevel(accessLevelToRights(l)) === l`) · `accessLevelToRights(READ).Private === CalendarShareRole.DATE_AND_TIME_VIEWER` · `rightsToAccessLevel({Public:RESPONDER,Confidential:NONE,Private:NONE,canCreateObjects:0,canEraseObjects:0}) === READ` (fängt den fehlenden RESPONDER-Zweig) · `rightsToAccessLevel({Public:NONE,Confidential:NONE,Private:NONE,canCreateObjects:1,canEraseObjects:0}) === WRITE` (fängt ein vergessenes `isSogoTrue`).
i18n: keine
Doku: keine (intern)
Abhängt von: T2

### T4 — libs/calendar: Endpoint-Segmente + Fehler-Messages erweitern  [ ]
Komponente: libs · Dateien: `libs/src/calendar/constants/calendar-endpoint.ts`, `libs/src/calendar/constants/calendar-error-messages.ts`
Soll: NEW:43409-43411 (`CALENDAR_SHARES_PATH_SEGMENT='shares'`, `CALENDAR_SHARE_TARGETS_PATH_SEGMENT='share-targets'`, `CALENDAR_SUBSCRIPTION_PATH_SEGMENT='subscription'`) · **Definition** des vollständigen Objekts NEW:43439-43462 (23 Keys) — die frühere Fassung ankerte nur die Aufrufstellen. Aus dem Delta zum Fork (9 Keys) sind **acht** neu: `ListSharesFailed` (Aufruf 43871), `SetShareFailed` (43875/43895), `DeleteShareFailed` (43898/43904), `SearchShareTargetsFailed` (43921), `UnsubscribeCalendarFailed` (43929), `UpdateCalendarFailed` (43804), `DeleteCalendarFailed` (43824/43827), `MissingCalDavCredentials` (45877).
**`CalendarNotFound` ist NICHT neu** — es steht bereits in `libs/src/calendar/constants/calendar-error-messages.ts` und in allen drei Locales (nachgezählt: je 9 `calendar.errors.*`-Keys). Die frühere Fassung zählte es mit und kam deshalb auf „9 neue"; richtig sind **8 neue → 17 gesamt**.
Änderung: Nur bestehende Objekte **additiv** erweitern (Fork-Konvention: `calendar.errors.<Key>`). Keine neue Datei ⇒ kein neuer Header. **Achtung Bestand:** `calendar-error-messages.ts` ist im Fork ein `enum` (nicht das von AGENTS.md geforderte const-Objekt). Das bleibt so — die acht Keys additiv als Enum-Member ergänzen; eine Umstellung auf ein const-Objekt wäre ein Drive-by-Refactor und gehört nicht in diesen Task. `calendar-endpoint.ts` ist dagegen bereits ein Modul aus named exports + Default — die drei Segmente dort als weitere named exports anhängen.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import E from \"./libs/src/calendar/constants/calendar-error-messages\"; import {CALENDAR_SHARES_PATH_SEGMENT as SH, CALENDAR_SHARE_TARGETS_PATH_SEGMENT as ST, CALENDAR_SUBSCRIPTION_PATH_SEGMENT as SU} from \"./libs/src/calendar/constants/calendar-endpoint\"; const need=[\"ListSharesFailed\",\"SetShareFailed\",\"DeleteShareFailed\",\"SearchShareTargetsFailed\",\"UnsubscribeCalendarFailed\",\"UpdateCalendarFailed\",\"DeleteCalendarFailed\",\"MissingCalDavCredentials\"]; if(SH!==\"shares\"||ST!==\"share-targets\"||SU!==\"subscription\"||Object.keys(E).length!==17||need.some((k)=>E[k]!==\"calendar.errors.\"+k)) process.exit(1)"'` exit 0. Die Zahl 17 ist der **Zielstand** (9 vorhandene + 8 neue) und ist heute nicht erfüllt — der Verify schlägt also fehl, solange die Keys fehlen.
i18n: die **8** neuen `calendar.errors.*`-Keys kommen in T15 (`CalendarNotFound` ist in DE/EN/FR schon da).
Doku: keine (intern)
Abhängt von: —

### T5 — api/calendar: deriveCalendarId + decodeLegacyCalendarId  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/utils/deriveCalendarId.ts`, `apps/api/src/calendar/utils/decodeLegacyCalendarId.ts`
Soll: NEW:46340 (`sha256(url,'utf-8').digest('hex')`) · NEW:46369-46377 (`Buffer.from(id,'base64url').toString('utf-8')`, danach `/^https?:\/\//i`-Test; bei Fehler `undefined`).
Änderung: Zwei kleine Utils, Default-Export am Ende, `node:crypto`. **Noch nicht** verdrahten — T6 zieht die Service-Umstellung nach. SPDX.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=calendar/utils'` grün — Spec `apps/api/src/calendar/utils/deriveCalendarId.spec.ts` deckt beide Utils ab. (Ein blankes `iter.sh test:api` wäre auch grün, wenn die Spec gar nicht geschrieben wurde; das Pattern erzwingt, dass sie existiert und läuft — jest endet nicht-null, wenn nichts matcht.) Inhalt: `deriveCalendarId('https://a/b')` ist 64 Hex-Zeichen und über zwei Aufrufe stabil; `decodeLegacyCalendarId(Buffer.from('https://a/b').toString('base64url')) === 'https://a/b'`; `decodeLegacyCalendarId(Buffer.from('kein-url').toString('base64url'))` ist `undefined` (der `/^https?:\/\//i`-Test, NEW:46368); `decodeLegacyCalendarId('nonsense')` ist `undefined`.
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T6 — api/calendar: Kalender-ID auf Hash umstellen (BREAKING)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/calendar.service.ts`
Soll: NEW:43553/43560ff — 2.1.0 nutzt durchgängig `deriveCalendarId(calendar.url)`; ein `decodeCalendarId` existiert **nicht** mehr. Auflösung ID→URL läuft über `findCalendar(client, calendarId)` bzw. `resolveUrlForId` (NEW:43850-43854).
Änderung: `encodeCalendarId`/`decodeCalendarId` (Zeilen 53-54) durch `deriveCalendarId` aus T5 ersetzen. Jede Stelle, die heute `decodeCalendarId(id)` aufruft, auf „Kalenderliste holen und per `deriveCalendarId(c.url) === id` matchen" umbauen (`findCalendar`, Zeile 467). **Keine** Verhaltensänderung außer dem ID-Format.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=calendar.service'` grün (bestehende `calendar.service.spec.ts` angepasst) + `iter.sh cmd "grep -rnE 'encodeCalendarId|decodeCalendarId' apps/api/src | wc -l"` liefert `0`. **Beide** Namen gehören in den Guard: `encodeCalendarId` (Zeile 53) erzeugt die IDs an :279/:386/:439/:463 — bliebe es stehen und nur `decodeCalendarId` verschwände, wären die ausgegebenen IDs weiterhin base64url, der Task also verfehlt, der alte Ein-Namen-Grep aber grün. (`decodeLegacyCalendarId` aus T5 löst das Muster nicht aus — anderer Bezeichner.)
i18n: keine
Doku: `docs/features/p7-calendar-sogo-sharing.md`: Abschnitt „ID-Format-Wechsel + warum irreversibel"
Abhängt von: T5

### T7 — api/calendar: die in Welle 3 gebauten Migrationen verdrahten  [ ]
> **DATEI-OWNERSHIP GEKLÄRT (Kollision mit `p6-migrations-2-1-catchup` T22/T23).** Die drei Dateien
> (`migration000DropLegacyShares.ts`, `migration001RekeyMetadataToUrlHashIds.ts`,
> `calendarMetadataMigrationsList.ts`) **baut `p6-migrations-2-1-catchup`** — das ist Welle 3, dieses Paket ist
> Welle 4b, und `PORT-2.1.0-MASTER.md` sagt es wörtlich: 4b „verdrahtet die in Welle 3 gebaute, bewusst
> unverdrahtete `calendar/001`". **Diese Task legt die Dateien also NICHT an**, sondern setzt voraus, dass sie
> existieren, und übernimmt nur das Einhängen in die Liste bzw. das Modul, sobald T8 das `shares`-Feld entfernt
> hat. Sind die Dateien beim Ausführen nicht da, ist die Welle-3-Reihenfolge verletzt — dann abbrechen, nicht
> selbst bauen.
Komponente: apps/api · Dateien: `apps/api/src/calendar/migrations/migration000DropLegacyShares.ts`, `apps/api/src/calendar/migrations/migration001RekeyMetadataToUrlHashIds.ts`, `apps/api/src/calendar/migrations/calendarMetadataMigrationsList.ts`, `apps/api/src/calendar/calendar.module.ts`
Soll: NEW:46225-46240 (`name:'000-drop-legacy-shares'`, `version:1`, `updateMany({$or:[{shares:{$exists:true}},{schemaVersion:{$exists:false}},{schemaVersion:{$lt:1}}]}, {$unset:{shares:''},$set:{schemaVersion:1}})`) · NEW:46272-46312 (`name:'001-rekey-metadata-to-url-hash-ids'`, `version:2`; lädt zuerst alle Dokumente mit `schemaVersion` fehlend oder `< 2` und bricht bei `length === 0` ab). Es sind **drei** Zweige, nicht zwei — der erste fehlte in der früheren Fassung: (a) `decodeLegacyCalendarId` liefert nichts **oder** die neue ID ist gleich der alten ⇒ **nur** `schemaVersion` setzen, `calendarId` bleibt (46287-46290) — ohne diesen Zweig bleiben genau diese Dokumente unter TARGET_VERSION hängen und werden bei jedem Start erneut angefasst; (b) Ziel-ID existiert schon ⇒ Tags **mergen** (`Array.from(new Set([...existing.tags, ...doc.tags]))`), `ownerUsername` des Bestands bevorzugen (`existing.ownerUsername ?? doc.ownerUsername`), `schemaVersion` setzen, Alt-Dokument `deleteOne`, `merged += 1`; (c) sonst `calendarId` umschreiben + `schemaVersion`, `rekeyed += 1`. Am Ende Log `re-keyed X and merged Y`.
Änderung: Beide Migrationen 1:1, Muster wie `apps/api/src/surveys/migrations/*` (Objekt mit `name`/`version`/`execute`). Liste in dieser Reihenfolge registrieren und im Modul einhängen. **Forward-only.** SPDX.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=calendar/migrations'` grün. `mongodb-memory-server` ist **nicht** im Repo (nachgeprüft: kein Treffer in `package.json`) → Model-Mock, Shape wie in den bestehenden Survey-Migration-Specs. Fälle: (a) Dokument mit `shares` + ohne `schemaVersion` → nach 000 kein `shares`, `schemaVersion===1`; (b) **Merge** — ein Bestandsdokument, dessen `calendarId` **schon** die Hash-ID ist, plus ein Alt-Dokument mit der base64url-ID derselben URL → nach 001 **ein** Dokument, Tags vereinigt, `ownerUsername` des Bestands gewonnen, `schemaVersion===2`, und `deleteOne` genau einmal mit der Alt-ID aufgerufen. (Die frühere Fassung verlangte hier „zwei Alt-Dokumente, deren URLs auf dieselbe Hash-ID zeigen" — das kann es wegen des `unique`-Index auf `calendarId` nicht geben, der Fall war nicht konstruierbar.) (c) **Nicht dekodierbare** Alt-ID → `calendarId` unverändert, aber `schemaVersion===2` (deckt Zweig (a) aus dem Soll).
i18n: keine
Doku: `docs/features/p7-calendar-sogo-sharing.md`: „Rollback = Dump **+ `./data/master.key`**, forward-only"
Abhängt von: T5, **T6**, T8 — T6 fehlte und ist zwingend: 001 schreibt die Metadaten auf Hash-IDs um, während erst T6 den Service Hash-IDs erzeugen und auflösen lässt. Ohne die Kante ist die Reihenfolge T5→T8→T7→T6 zulässig und liefert einen Commit, in dem die DB Hash-IDs führt, der Service aber noch base64url ausgibt — Tags und `ownerUsername` hängen sich dann von jedem Kalender ab. (Zyklusfrei: T6 hängt nur an T5.)

### T8 — api/calendar: CalendarMetadata ohne shares, CalendarShareEntry löschen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/calendar-metadata.schema.ts`, **löschen** `apps/api/src/calendar/calendar-share-entry.schema.ts`, `apps/api/src/calendar/calendar.service.ts`
Soll: NEW:46138-46165 — `CalendarMetadata` hat exakt `calendarId` (`@Prop({ required: true, unique: true, index: true })`, 46146), `ownerUsername` (`required: false`, 46150), `tags` (`{ type: [String], default: [] }`, 46154) und `schemaVersion` (`@Prop({ type: Number, default: 2 })`, **46157-46159**). **Kein** `shares`.
**Korrektur:** die frühere Fassung sagte „default 1". Das Bundle sagt **2** — und das ist nicht kosmetisch: mit Default 1 sähe jedes neu angelegte Dokument für `migration001` (TARGET_VERSION 2) dauerhaft „pending" aus und würde bei jedem Start erneut verarbeitet. Der Fork hat heute **gar kein** `schemaVersion`-Feld in `calendar-metadata.schema.ts`, das Feld kommt in diesem Task komplett neu dazu.
Änderung: `shares`-Prop + Import entfernen, `schemaVersion` ergänzen, `calendar-share-entry.schema.ts` löschen. In `calendar.service.ts` die drei Lese-/Schreibstellen (`shares: doc?.shares ?? []` Zeile 306, `shareEntries` Zeile 387/392, `return {...base, shares…}` Zeile 427) entfernen. `MappedCalendar = Omit<Calendar,'shares'|'tags'>` (Zeile 41) auf `Omit<Calendar,'tags'>` ziehen.
Verify: `iter.sh test:api` grün; `iter.sh cmd "grep -rn 'CalendarShareEntry' apps libs | wc -l"` liefert `0`; `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` clean.
i18n: keine
Doku: keine (in T15 gesammelt)
Abhängt von: —

### T9 — libs+api: shares aus Calendar-Typ und DTOs entfernen (BREAKING)  [ ]
Komponente: libs, apps/api, **apps/frontend** · Dateien: `libs/src/calendar/types/calendar.ts`, `libs/src/calendar/types/calendarCreateBody.ts`, **löschen** `libs/src/calendar/types/calendarShare.ts` (bzw. auf die neue Share-Form umbauen — s. T10), `libs/src/calendar/types/index.ts`, `apps/api/src/calendar/dto/calendar-response.dto.ts`, `apps/api/src/calendar/dto/create-calendar-body.dto.ts` · **FE-Fallout, gehört in denselben Commit:** **löschen** `apps/frontend/src/pages/Calendar/ShareEditor.tsx`, `apps/frontend/src/pages/Calendar/buildCalendarCreateBody.ts` (:14/:22) und `apps/frontend/src/pages/Calendar/CalendarManagementDialog.tsx` (:46/:62/:113) von `shares` befreien, Tests `apps/frontend/src/pages/Calendar/CalendarManagementDialog.test.tsx` (:33/:43/:48-67) und `apps/frontend/src/pages/Calendar/useCalendarStore.test.ts` (:49/:51) nachziehen
Soll: NEW:46510-46547 (`CalendarResponseDto`: id, displayName, color?, description?, ctag?, readOnly, isSubscribed, url, tags — **kein** `shares`) · NEW:47032-47056 (`CreateCalendarBodyDto`: displayName, description?, color?, tags — **kein** `shares`).
Änderung: `shares` aus Typ, `CalendarCreateBody` und beiden DTOs entfernen. **Achtung:** im Fork ist `CreateCalendarBodyDto.shares` `@IsArray()` **required** (kein `@IsOptional`) — ersatzlos streichen. Die alten `CalendarSharePermission`/`CalendarShareSubjectType`-Konstanten werden von T10 ersetzt; erst dort löschen. **FE im selben Commit:** `ShareEditor.tsx` löschen, `shares`-State + `<ShareEditor>`-Verwendung aus `CalendarManagementDialog.tsx` entfernen, `buildCalendarCreateBody` ohne `shares`, beide betroffenen Tests nachziehen. Das gehört **hierher** und nicht in T16: T16 ist `[?]` und hängt an T14/T15 — bliebe der Rückbau dort, wäre `iter.sh test:frontend` über mehrere Commits hinweg rot. Der neue Share-Dialog entsteht später in T16 auf grüner Wiese.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=calendar-dtos'` — in der bestehenden `apps/api/src/calendar/dto/calendar-dtos.spec.ts` neu: `await validate(plainToInstance(CreateCalendarBodyDto, { displayName: 'x' }))` ergibt `[]`. Das schlägt **heute** fehl (`shares` ist `@IsArray()` ohne `@IsOptional`) und ist damit ein echter Guard. · `iter.sh cmd "grep -rn 'shares' apps/api/src/calendar/dto/create-calendar-body.dto.ts apps/api/src/calendar/dto/calendar-response.dto.ts libs/src/calendar/types/calendar.ts libs/src/calendar/types/calendarCreateBody.ts | wc -l"` liefert `0` (alle vier Dateien existieren, der Grep ist also nicht vakuum-grün) · `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` clean · **FE:** `iter.sh test:frontend` grün **und** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean.
**Gestrichen:** „Body **mit** `shares` wird von `strictValidationPipe` mit 400 abgelehnt". Nachgeprüft falsch — `POST calendar/calendars` läuft unter dem Controller-Pipe `new ValidationPipe({ whitelist: true, transform: true })` (`calendar.controller.ts:44`), also **ohne** `forbidNonWhitelisted`: ein Extra-Feld wird stillschweigend gestrippt, nicht abgelehnt. 2.1.0 setzt `strictValidationPipe` ausschließlich auf `PATCH calendars/:id` (NEW:43204). Die alte Zusicherung wäre bei korrekter, Soll-treuer Arbeit rot geworden oder hätte zu einem Pipe-Umbau auf POST verleitet.
i18n: keine
Doku: keine
Abhängt von: T8

### T10 — api/calendar: Share-DTOs (Body/Response/Target)  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/calendar/dto/calendar-share-body.dto.ts` (**überschreiben**), `apps/api/src/calendar/dto/calendar-share-response.dto.ts`, `apps/api/src/calendar/dto/calendar-share-target-response.dto.ts`, `apps/api/src/calendar/dto/update-calendar-body.dto.ts` (**neu — fehlte im Ledger komplett**), `libs/src/calendar/types/calendarShare.ts`
Soll: NEW:47191/47211 (`CalendarShareBodyDto`: `uid` + `accessLevel`) · NEW:47247/47268 (`CalendarShareResponseDto`: uid, displayName, email?, isGroup, accessLevel) · `CalendarShareTargetResponseDto` = `{uid, displayName, email?, isGroup}` (Feldsatz aus `searchShareTargets` NEW:43911-43916) · **NEW:47087-47110 `UpdateCalendarBodyDto`** — drei Felder, alle optional: `displayName` (`@ApiPropertyOptional` + `@IsOptional` + `@IsString`), `description` (dito), `color` (`@IsOptional` + **`@IsHexColor`**). Die alten Fork-Felder `subjectId/subjectType/label/permission` gibt es in 2.1.0 **nicht** mehr.
**Warum hier:** `UpdateCalendarBodyDto` ist der Body von `PATCH calendars/:id` (Dekorator NEW:43208) und kam im Ledger bisher in **keiner** Task vor — T14 hätte ihn erfinden müssen. T14 erreicht ihn über T13 → T10.
Änderung: Alte `CalendarShareBodyDto` durch die 2.1.0-Form ersetzen (`@IsString()@IsNotEmpty() uid`, `@IsIn(Object.values(CalendarAccessLevel)) accessLevel`), zwei Response-DTOs neu (`@ApiProperty`). Shared Type `CalendarShare = {uid, displayName, email?, isGroup, accessLevel}`. `calendarSharePermission.ts`/`calendarShareSubjectType.ts` löschen. SPDX bei neuen Dateien.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=calendar-dtos'` (Spec: `{uid:'a@b',accessLevel:'WRITE'}` validiert zu `[]`; `accessLevel:'ADMIN'` liefert einen Fehler auf `accessLevel`; leerer `uid` liefert einen Fehler auf `uid`; `UpdateCalendarBodyDto` mit `{}` validiert zu `[]`, mit `{color:'nicht-hex'}` zu einem Fehler auf `color`); `iter.sh cmd "grep -rnE 'CalendarSharePermission|CalendarShareSubjectType' apps libs | wc -l"` liefert `0` — **beide** Konstanten, denn dieser Task löscht `calendarSharePermission.ts` **und** `calendarShareSubjectType.ts`, und `CalendarShareSubjectType` hat heute eigene Consumer (`calendar-share-body.dto.ts`, `calendar-share-entry.schema.ts`, `libs/src/calendar/types/*`); der alte Ein-Namen-Grep hätte sie übersehen.
i18n: keine
Doku: keine
Abhängt von: T2, T9

### T11 — api/calendar: CalDavClientFactory aus dem Service extrahieren  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/calDavClientFactory.ts` (neu), `apps/api/src/calendar/calendar.service.ts`, `apps/api/src/calendar/calendar.module.ts`
Soll: NEW:45817-45996 (webpack-Modul 709; die Klasse endet mit `exports["default"] = CalDavClientFactory;` auf 45996). Konstanten NEW:45817-45822 (je eine Zeile, nachgezählt): `CLIENT_CACHE_TTL_MS=60_000`, `CLIENT_CACHE_MAX_ENTRIES=256`, `DEFAULT_ACCOUNT_TYPE='caldav'`, `DAV_PATH_SUFFIX_PATTERN=/\/dav\/?$/i`, `SO_PATH_SUFFIX='/so'`, `TRAILING_SLASH_PATTERN=/\/$/`. Methoden: `onModuleInit`, `updateBackendConfig` (mit `@OnEvent(\`${EventEmitterEvents.APPCONFIG_UPDATED}-${APPS.CALENDAR}\`)`, NEW:45986-45991), `assertBackendConfigured`, `assertAuthenticated`, `static describeError`, `buildDispatcher` (Dispatcher-Cache pro `rejectUnauthorized`), `invalidateClientCache`, `clientCacheKey` (sha256 über das Passwort — **nie das Klartext-Passwort als Key**), `buildClient` (mit Cache), `getDavBaseUrl`, `getSoBaseUrl`, `assertConfiguredOrigin`, `sogoFetch`, `cacheClient`.
Änderung: Neue `@Injectable()`-Klasse; die entsprechenden Teile aus `calendar.service.ts` (Zeilen 84-180) herausziehen, Service injiziert die Factory. Statische Logger mit `CalDavClientFactory.name`. **`assertConfiguredOrigin` ist die einzige SSRF-Schranke von `sogoFetch` — nicht weglassen.** Zwei Warn-Logs aus dem Soll übernehmen (TLS-Validierung aus; Basis-URL endet nicht auf `/dav`). SPDX.
Verify: `iter.sh test:api` mit Spec: `getSoBaseUrl()` macht aus `https://h/SOGo/dav` → `https://h/SOGo/so`; ohne `/dav`-Suffix wirft es `CalendarBackendNotConfigured` (503); `sogoFetch` gegen fremde Origin wirft `CalendarNotFound` (404); zweiter `buildClient`-Aufruf mit gleichen Credentials trifft den Cache (nur **ein** `login()`).
i18n: keine
Doku: keine (in T15)
Abhängt von: T1, T4

### T12 — api/calendar: SogoSharingClient  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/sogoSharingClient.ts`, `apps/api/src/calendar/calendar.module.ts`
Soll: NEW:46035-46108 (46035 `SOGO_SPECIAL_ACL_UIDS`, 46036-46040 `SOGO_USER_CLASS`, 46041-46102 die Klasse, 46108 `exports["default"]`). `SOGO_SPECIAL_ACL_UIDS=['anonymous','<default>']`, `SOGO_USER_CLASS={NORMAL_USER:'normal-user',NORMAL_GROUP:'normal-group',PUBLIC_USER:'public-user'}`. Methoden: `calendarWebBase` (dav→so-Ersetzung, Trailing-Slash weg), `request` (wirft bei `!response.ok` mit HTTP-Status + Body), `listAcl` (`GET …/acls`, `public-user` **herausfiltern**), `getUserRights` (`GET …/userRights?uid=`), `addUser` (`…/addUserInAcls?uid=`), `setUserRights` (`POST …/saveUserRights`, Body `[{uid,rights}]`, Content-Type JSON), `deleteUser` (`…/removeUserFromAcls?uid=`), `subscribeUsers` (`…/subscribeUsers?uids=a,b`, jede uid einzeln `encodeURIComponent`), `unsubscribe`, `searchUsers` (`{soBase}/{encodeURIComponent(email)}/usersSearch?search=`).
Änderung: `@Injectable()`, Konstruktor nimmt `CalDavClientFactory`. Named exports für die beiden Konstanten, Default-Export der Klasse am Ende. SPDX.
Verify: `iter.sh test:api` mit Spec + gemocktem `sogoFetch`: `listAcl` filtert `public-user`; `setUserRights` sendet exakt `[{uid,rights}]`; `subscribeUsers([])` macht **keinen** Request; `request` wirft bei HTTP 403 mit Statuscode im Text.
i18n: keine
Doku: keine
Abhängt von: T11

### T13 — api/calendar: Service-Methoden fürs Sharing  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/calendar.service.ts`
Soll: NEW:43835-43932. `static toCalendarShare` (43835-43838: `isGroup` = `userClass===NORMAL_GROUP`; `email` = `c_email` **oder** die uid, wenn sie ein `@` enthält) · `static assertNotSpecialSogoUid` (43839-43844, 400 bei `anonymous`/`<default>`) · `static rethrowAsSogoFailure` (43845-43849, `CustomHttpException` durchreichen, sonst 502) · `resolveUrlForId` (43850-43854) · `resolveAccessLevel` (43855-43862: inaktive SOGo-User → `NONE`) · `listCalendarShares` (43863-43873) · `setCalendarShare` (43874-43896: `NONE` ⇒ `deleteUser`; sonst ggf. `addUser`, `setUserRights`, und **nur wenn nicht schon subscribed** `subscribeUsers`) · `deleteCalendarShare` (43897-43906) · `searchShareTargets` (43907-43922: den eigenen User herausfiltern) · `unsubscribeCalendar` (43923-43932).
Änderung: **Zehn** Methoden 1:1 ergänzen (die Soll-Liste oben zählt zehn: `toCalendarShare`, `assertNotSpecialSogoUid`, `rethrowAsSogoFailure`, `resolveUrlForId`, `resolveAccessLevel`, `listCalendarShares`, `setCalendarShare`, `deleteCalendarShare`, `searchShareTargets`, `unsubscribeCalendar` — die frühere Fassung sagte „neun"), `SogoSharingClient` injizieren. Statische Logger mit `CalendarService.name`.
Verify: `iter.sh test:api` mit Spec + gemocktem `SogoSharingClient`: `setCalendarShare(...,'NONE')` ruft **nur** `deleteUser`; bei neuem uid Reihenfolge `listAcl → addUser → setUserRights → subscribeUsers`; bei bereits subscribed **kein** `subscribeUsers`; `setCalendarShare(...,'<default>',...)` wirft 400; `searchShareTargets` enthält den eigenen `emailAddress` nicht.
i18n: keine
Doku: keine
Abhängt von: T3, T10, T12

### T14 — api/calendar: 7 Routen + Controller-Verdrahtung  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/calendar.controller.ts`
Soll: NEW:43099-43131 (Methoden — `updateCalendar` 43099, `deleteCalendar` 43103, `searchShareTargets` 43107, `listCalendarShares` 43113, `setCalendarShare` 43117, `deleteCalendarShare` 43121, `unsubscribeCalendar` 43128) + NEW:43202-43296 (Dekoratoren; der letzte Block endet auf 43296). Die sieben: `PATCH calendars/:id` (`updateCalendar`, `@UsePipes(strictValidationPipe)`) · `DELETE calendars/:id` (204) · `GET calendars/share-targets` (Query `search`) · `GET calendars/:id/shares` · `PUT calendars/:id/shares` (204) · `DELETE calendars/:id/shares?uid=` (204) · `DELETE calendars/:id/subscription` (204). Alle mit `@GetCurrentUsername()` + `@GetUsersEmailAddress()`, Passwort via `usersService.getPassword(username)` (NEW:43110/43114/43118/43125/43129 — die frühere Fassung nannte 43108, das ist die `if (!search …)`-Zeile). `deleteCalendarShare` prüft **vor** dem Service auf leeren `uid` und wirft `DeleteShareFailed` mit 400 (NEW:43122-43124).
Änderung: Sieben Routen ergänzen. **Reihenfolge:** die Bundle-Reihenfolge übernehmen (PATCH `:id` → DELETE `:id` → GET `share-targets` → GET/PUT/DELETE `:id/shares` → DELETE `:id/subscription`). *Begründungs-Korrektur:* die frühere Fassung schrieb, sonst „frisst der Param-Matcher `share-targets` als `:id`". Das stimmt nicht — `calendars/share-targets` hat zwei Segmente, `calendars/:id/shares` drei, und ein `GET calendars/:id` existiert weder im Bundle noch im Fork; es gibt hier also nichts zu verschatten. Die Reihenfolge bleibt trotzdem Soll-treu.
**Guard-Block — Korrektur zum Fork-Bestand:** der Fork-Controller trägt `@ApiTags`, **`@ApiBearerAuth()`** (nicht `@ApiAuth()` — den Helper gibt es in `apps/`/`libs/` nirgends), `@RequireAppAccess(APPS.CALENDAR)`, `@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))` und `@Controller(CALENDAR_ENDPOINT)` (`calendar.controller.ts:42-46`). Der Block bleibt unverändert, **kein** `@Public()`. Und zur Klarstellung: `ApiAuth` wäre auch im Bundle (NEW:14097) nur `applyDecorators(ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse)` — reine Swagger-Doku, **keine** Authentifizierung. Die trägt der globale `AuthGuard` + `AccessGuard` über `@RequireAppAccess`.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=calendar.controller'` grün. Die bestehende `calendar.controller.spec.ts` um die 7 neuen Handler erweitern, exakt im vorhandenen Muster (:146-161): `it.each([...alle 14 Handler...])` mit `controllerContractReflection.isRoutePublic(CalendarController, route) === false` und `Reflect.getMetadata(APP_ACCESS_KEY, CalendarController) === APPS.CALENDAR`. Zusätzlich: `Reflect.getMetadata(PATH_METADATA, CalendarController.prototype.<handler>)` je Route gegen den erwarteten Pfad und `METHOD_METADATA` gegen das Verb.
**Gestrichen: der `curl`-Teil.** `iter.sh` läuft auf der Box **ohne** deployten Stack; `curl` scheitert an `connection refused`, `-w '%{http_code}'` druckt dann `000`, und da nirgends verglichen wird, ist der Exit-Code der von `curl` — die Zusicherung „liefert 401" konnte gar nicht fehlschlagen. Auth am laufenden Stack gehört in den `/test`-Voll-Stack-Lauf, nicht in den Task-Verify.
i18n: keine
Doku: swagger regenerieren (`npm run generate:swagger`), `swagger-spec.json` im selben Commit
Abhängt von: T13

### T15 — i18n + Doku (DE/EN/FR)  [ ]
Komponente: apps/frontend, docs · Dateien: `apps/frontend/src/locales/{de,en,fr}/translation.json`, `docs/features/p7-calendar-sogo-sharing.md`
Soll: Die **8** neuen Fehler-Keys aus T4 (Zielstand 17) plus UI-Keys für T16.
Änderung: **Neu** die 8 Keys `calendar.errors.{ListSharesFailed,SetShareFailed,DeleteShareFailed,SearchShareTargetsFailed,UnsubscribeCalendarFailed,UpdateCalendarFailed,DeleteCalendarFailed,MissingCalDavCredentials}` in **allen drei** Locales. `calendar.errors.CalendarNotFound` steht in DE/EN/FR schon drin (nachgezählt: je 9 Keys) — **nicht** noch einmal anlegen.
**`calendar.share` ist kein leerer Namensraum** — hier hängt der Rückbau aus T9 dran. Bestand heute in allen drei Locales: `calendar.share.{title, add, subject, subjectType.{user,group}, permission.{none,free_busy,view,modify,admin}}`. `title` **bleibt** (nicht neu anlegen). Die Keys `add`, `subject`, `subjectType.*` und `permission.*` gehören zum alten Subject/Permission-Modell und sind nach dem Löschen von `ShareEditor.tsx` (T9) verwaist — **entfernen**, in allen drei Locales. **Neu** dazu: `calendar.share.{accessLevel.NONE, accessLevel.FREE_BUSY, accessLevel.READ, accessLevel.WRITE, searchPlaceholder, unsubscribe, noTargets}`. Spec-Dokument schreiben (Design, SOGo-Voraussetzung, Migrationspfad, was Fork-Original ist).
Verify: `iter.sh i18n` grün (Parität DE/EN/FR) **plus** eine Spec, die den Inhalt prüft — die Parität allein kann nicht fehlschlagen: sie ist auch grün, wenn **kein einziger** Key ergänzt wurde, solange alle drei Dateien gleich bleiben. (`npm run check-error-message-translations` hilft hier ebenfalls nicht: `scripts/checkErrorMessages.ts` liest ausschließlich `libs/src/error/errorMessage.ts` und sieht `calendar-error-messages.ts` nie.)
Also: neue Spec `apps/frontend/src/pages/Calendar/calendarShareTranslations.spec.ts`, die die drei `translation.json` importiert und je Sprache prüft — (a) alle 8 neuen `calendar.errors.*`-Keys vorhanden, (b) `calendar.share.{title,accessLevel.NONE,accessLevel.FREE_BUSY,accessLevel.READ,accessLevel.WRITE,searchPlaceholder,unsubscribe,noTargets}` vorhanden, (c) `calendar.share.add`, `.subject`, `.subjectType`, `.permission` **nicht mehr** vorhanden (fängt die verwaisten Alt-Keys aus T9), (d) kein Wert ist der englische Platzhalter aus einer anderen Sprache. Lauf: `iter.sh cmd 'npx nx test frontend --run src/pages/Calendar/calendarShareTranslations.spec.ts'`.
i18n: siehe oben
Doku: `docs/features/p7-calendar-sogo-sharing.md`
Abhängt von: T4

### T16 — Frontend: Share-Dialog (FORK-ORIGINAL, keine Rekonstruktion)  [?]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Calendar/**` (Store + Dialog)
Soll: **Aus dem Bundle NICHT ableitbar** — `.reference/2.1.0/ui/assets/index-CHsBOwUD.js` ist minifiziert, es gibt keine Baseline-Screenshots. Verbindlich ist **nur** der API-Contract aus T10/T14. Optional als Live-Referenz: 2.1.0-Image auf einer crabbox hochziehen und beobachten (Verfahren aus p5-calendar).
Änderung: `useCalendarStore` um `eduApi`-Calls für die 7 Routen erweitern (**nie** `fetch`, Calls gehören in den Zustand-Store, nicht in Komponenten). Dialog mit Ziel-Suche (debounced auf `share-targets`), Zugriffsstufen-Auswahl (`SelectSH`-Wrapper), Liste bestehender Freigaben, „Abo beenden" für fremde Kalender. `cn()` für classNames, nur `@fortawesome/free-solid-svg-icons`. Alle Strings über T15-Keys.
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/Calendar/useCalendarStore.test.ts'` — dort neu: jede der 7 Actions ruft `eduApi` mit dem exakten Pfad/Verb (`PATCH calendar/calendars/:id`, `DELETE calendar/calendars/:id`, `GET calendar/calendars/share-targets` mit `params:{search}`, `GET|PUT|DELETE calendar/calendars/:id/shares`, `DELETE calendar/calendars/:id/subscription`). Der Datei-Pfad im Befehl verhindert, dass ein voller `test:frontend`-Lauf grün ist, obwohl die Spec nie geschrieben wurde. **Und** `iter.sh test:frontend` gesamt grün **und** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean.
**Ausgangslage:** die alte Share-UI (`ShareEditor.tsx`, `shares` in `CalendarManagementDialog.tsx`/`buildCalendarCreateBody.ts`) ist bereits in T9 entfernt — dieser Task baut auf grüner Wiese, er migriert nichts.
i18n: Keys aus T15
Doku: in `docs/features/p7-calendar-sogo-sharing.md` als „Fork-Original" kennzeichnen
Abhängt von: T14, T15

---

## p7-contacts [P7] — ContactsModule (CardDAV über SOGo) + .mobileconfig

> **Adressierung:** Die Task-Nummerierung startet in **jedem** Sub-Paket neu. Tasks in diesem Abschnitt
> heißen deshalb `p7-contacts:T<n>` (also `p7-contacts:T7` = die DTO-Task). Querverweise aus anderen
> Ledgern müssen diese Form benutzen — ein blankes `T7` ist im File mehrdeutig. Nicht umnummerieren,
> das bräche jede bestehende Referenz.

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
ist und wiederverwendet wird: `tsdav`/`undici`, `AppConfigService.getAppConfigByName` (appconfig.service.ts:**286**,
nicht 287), `EVENT_EMITTER_EVENTS` (Fork-Name; `libs/src/appconfig/constants/eventEmitterEvents.ts` — im Bundle heißt
die Variable `EventEmitterEvents`), `CustomHttpException`, `@RequireAppAccess`, `HTTP_HEADERS`
(http-methods.ts:61/71 — `ContentDisposition`:61, `CacheControl`:71, beide nachgemessen), `cache-manager`
(`app.module.ts:94` registriert `CacheModule.registerAsync({ isGlobal: true, … })`, deshalb genügt im ContactsModule
`@Inject(CACHE_MANAGER)` **ohne** eigenen Modul-Import — genau wie im Soll, dessen `imports` nur `[UsersModule,
AppConfigModule]` sind). **Fehlt** im Fork: `CACHE_CONTROL_VALUES` und eine `NonEmptyStringPipe` — und die ist
**T6**, nicht T7.
**Korrektur dieses Absatzes:** `strictValidationPipe` **fehlt nicht**. Die Datei liegt seit `p6-fundament` unter
`apps/api/src/common/pipes/strictValidationPipe.ts` (neben `strictTransformValidationPipe.ts`,
`whitelistValidationPipe.ts`, `uuid.pipe.ts`, `safe-path-segment.pipe.ts`). T6 sagt das bereits richtig; dieser
Absatz widersprach ihm und hätte einen Agenten dazu gebracht, die Fundament-Datei zu überschreiben.
**Contract-Sync, den bisher keine Task nannte:** `CustomHttpException(errorMessage: ErrorMessage, status, …)`
(`apps/api/src/common/CustomHttpException.ts:24`) akzeptiert **ausschließlich** den Union-Typ aus
`libs/src/error/errorMessage.ts`. `ContactsErrorMessages` muss dort importiert **und** in die Union aufgenommen
werden (Präzedenz: `CalendarErrorMessages`, errorMessage.ts:44 + Union-Ende), sonst schlägt **jeder** `throw` in
T11–T15 in `tsc` fehl. Das ist in T1 nachgetragen.

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
Komponente: libs · Dateien: `libs/src/contacts/constants/contacts-endpoint.ts`, `contactsImportMaxFileSize.ts`, `contactsSearch.ts`, `contactsDirectoryCache.ts`, `contactsSearchCache.ts`, `contacts-error-messages.ts`, **`libs/src/error/errorMessage.ts`** (Import + Union-Mitglied `ContactsErrorMessages` — ohne diesen Eintrag typprüft kein einziger `throw new CustomHttpException(ContactsErrorMessages.…)` aus T11–T15; Präzedenz `CalendarErrorMessages` in errorMessage.ts:44)
Soll (Anker gegen `main.js` nachgemessen, die alten waren um 1–3 Zeilen daneben): NEW:**47713-47720** (`CONTACTS_ENDPOINT='contacts'` als Default-Export in 47713 + `ADDRESSBOOKS='addressbooks'` 47714, `CONTACTS='contacts'` 47715, `IMPORT='import'` 47716, `EXPORT='export'` 47717, `CONFIGURATION_PROFILE='configuration-profile'` 47718, `SEARCH='search'` 47719 — 47712 ist nur die `void 0`-Export-Zeile) · NEW:47747 (`10*1024*1024`) · NEW:**47775-47778** (`const CONTACTS_SEARCH = {MIN_QUERY_LENGTH:2, MAX_RESULTS:50}`) · NEW:**48619-48622** (`{KEY_PREFIX:'contacts-directory-', TTL_MS:15*60*1000}`; 48616-48619 zeigte auf den Lizenzheader) · NEW:**48650-48653** (`{PERSONAL_ADDRESS_BOOK_KEY_PREFIX:'contacts-search-personal:', TTL_MS:60*1000}`) · NEW:48574-48592 (**16** Keys `contacts.errors.*`, Zeilen 48575-48590 — die Vorgabe „17" war falsch; gezählt: CardDavConnectionFailed, ContactsBackendNotConfigured, AddressBookNotFound, ContactNotFound, ListContactsFailed, CreateContactFailed, UpdateContactFailed, DeleteContactFailed, AddressBookReadOnly, CreateAddressBookFailed, UpdateAddressBookFailed, DeleteAddressBookFailed, AddressBookNotDeletable, ImportContactsFailed, ExportContactsFailed, ConfigurationProfileFailed).
Änderung: Sechs Dateien, Default-Export am Ende, Dateiname == Export. Die **fünf** Konstanten-Dateien als const-Objekte (keine enums), wie AGENTS.md verlangt. **Ausnahme `contacts-error-messages.ts`: `enum ContactsErrorMessages`** — zwei nachgeprüfte Gründe, beide nicht verhandelbar: (a) `libs/src/error/errorMessage.ts` ist eine Union aus Wert-Typen und der Fork-Präzedenzfall `libs/src/calendar/constants/calendar-error-messages.ts` ist ebenfalls ein `enum`; (b) `scripts/checkErrorMessages.ts` sammelt seine Kandidaten über `ts.isEnumDeclaration` und **nur** aus den Dateien, die `errorMessage.ts` importiert (`parseErrorMessageFile` + `getEnumFullPaths`) — als const-Objekt wäre das Gate aus T18 stumm und würde fehlende DE/EN/FR-Keys durchwinken. Also: `enum` + Import + Union-Eintrag in `errorMessage.ts`. Fehler-Enum exakt mit den **16** Keys aus dem Soll. SPDX in allen neuen Dateien.
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import S from \"./libs/src/contacts/constants/contactsSearch\"; import M from \"./libs/src/contacts/constants/contactsImportMaxFileSize\"; import D from \"./libs/src/contacts/constants/contactsDirectoryCache\"; import C from \"./libs/src/contacts/constants/contactsSearchCache\"; import E from \"./libs/src/contacts/constants/contacts-error-messages\"; const k=Object.keys(E); if(S.MAX_RESULTS!==50||S.MIN_QUERY_LENGTH!==2||M!==10485760||D.TTL_MS!==900000||C.TTL_MS!==60000||k.length!==16||!k.every(n=>E[n]===\"contacts.errors.\"+n)) process.exit(1)"'` exit 0 (fällt bei 15/17 Keys, falschem Prefix und falschen TTLs durch; lokal geprüft, dass `npx tsx -e` bei alias-freien libs-Dateien ohne Extra-Env auflöst). Dazu `iter.sh cmd "grep -q 'ContactsErrorMessages' libs/src/error/errorMessage.ts"` exit 0 — ohne den Union-Eintrag kompiliert T11 nicht.
i18n: die **16** Fehler-Keys kommen in T18 (die Vorgabe „17" war falsch, im Bundle stehen 16)
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
Komponente: libs, apps/frontend · Dateien: `libs/src/appconfig/constants/extendedOptions/contactsCardDavExtendedOptions.ts`, `libs/src/appconfig/types/appConfigExtendedOption.ts`, `libs/src/appconfig/constants/secretExtendedOptionKeys.ts`, `apps/frontend/src/pages/Settings/AppConfig/appConfigOptions.ts`, `apps/frontend/src/pages/Settings/AppConfig/components/dropdown/AppConfigDropdownSelect.tsx`
Soll: NEW:3121-3154. Drei Felder: Base-URL (`type: input`, `value:''`, `width:'full'`); Auth-Mode (`type: dropdown`, `value: DavAuthMode.BASIC`, `width:'third'`, **`disabled: true`** mit `disabledWarningText`, Optionen BASIC/DIGEST/**OAUTH**); Reject-Unauthorized (`type: switch`, `value: true`, `width:'third'`). i18n-Keys exakt: `appExtendedOptions.contactsCardDav{BaseUrl,AuthMode,RejectUnauthorized}{Title,Description}`, `appExtendedOptions.contactsCardDavAuthModeDisabled`, `appExtendedOptions.contactsCardDavAuthMode.{basic,digest,oauth}`.
Änderung: Neue Datei nach dem Muster von `calendarCaldavExtendedOptions.ts`. SPDX. **Drei Mitzieher, ohne die die Task nicht baut — am Baum nachgeprüft, nicht vermutet:**
(a) `AppConfigExtendedOption` (`libs/src/appconfig/types/appConfigExtendedOption.ts`) hat **kein** `disabled`-Feld (nur `disabledWarningText`). `disabled: true` ist damit ein Excess-Property-Fehler → das Interface additiv um `disabled?: boolean;` erweitern.
(b) `AppConfigDropdownSelect.tsx:39-41` leitet `isDisabled` **ausschließlich** aus `useRequiredContainers(option.requiredContainers)` ab. Ohne Auswertung von `option.disabled` bleibt das Auth-Mode-Dropdown editierbar, ein Admin kann `OAUTH` wählen, und der CardDAV-Client aus T11 kennt nur `Basic`/`Digest` → kaputte Konfiguration statt 503. Also `isDisabled ||= option.disabled === true` (und damit auch `disabledWarningText` anziehen).
(c) `libs/src/appconfig/constants/secretExtendedOptionKeys.ts` führt eine **Hand-Liste** `OPTION_MODULES`; `apps/api/src/appconfig/pickSafeExtendedOptions.spec.ts:73-78` prüft `aggregatedOptionModuleCount === Anzahl .ts-Dateien in libs/src/appconfig/constants/extendedOptions`. Eine neue Datei, die dort nicht registriert wird, macht **`test:api` rot**. `CONTACTS_CARDDAV_EXTENDED_OPTIONS` dort eintragen (es hat kein `password`-Feld, die abgeleitete Secret-Liste ändert sich also nicht — die Registrierung ist trotzdem Pflicht).
Zusätzlich den App-Eintrag in `apps/frontend/src/pages/Settings/AppConfig/appConfigOptions.ts` anlegen (`{ id: APPS.CONTACTS, icon: ContactsIcon, isNativeApp: true, extendedOptions: { [AppConfigSectionsKeys.contacts]: CONTACTS_CARDDAV_EXTENDED_OPTIONS }, defaultDisplayLocations: [...ALL_DISPLAY_LOCATIONS] }`, Muster: der CALENDAR-Block appConfigOptions.ts:156-164). **Ohne ihn ist `CONTACTS_CARDDAV_BASE_URL` über die Oberfläche gar nicht setzbar und das ganze Modul liefert dauerhaft 503.**
Verify: `iter.sh lint`; `iter.sh cmd 'TSX_TSCONFIG_PATH=tsconfig.base.json npx tsx -e "import O from \"./libs/src/appconfig/constants/extendedOptions/contactsCardDavExtendedOptions\"; if(O.length!==3||O[1].disabled!==true||O[1].options.length!==3||O[1].options.map(o=>o.id).join()!==\"BASIC,DIGEST,OAUTH\"||O[2].value!==true) process.exit(1)"'` exit 0. **Das `TSX_TSCONFIG_PATH` ist Pflicht, nicht Kosmetik:** die Datei importiert über `@libs/...`, und ohne die Env bricht `npx tsx -e` mit `MODULE_NOT_FOUND` ab — der alte Verify wäre also auch bei perfekter Arbeit rot gewesen (lokal an `calendarCaldavExtendedOptions` reproduziert). Dazu: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=pickSafeExtendedOptions'` grün (fällt durch, wenn die neue Datei nicht in `OPTION_MODULES` steht) und `iter.sh cmd 'npx nx test frontend --run src/pages/Settings/AppConfig/appConfigOptions.spec.ts'` grün mit einem neuen Block, der `APP_CONFIG_OPTIONS.find(o=>o.id===APPS.CONTACTS)?.extendedOptions?.[AppConfigSectionsKeys.contacts]` auf `CONTACTS_CARDDAV_EXTENDED_OPTIONS` prüft (Muster: der bestehende CALENDAR-Block appConfigOptions.spec.ts:32-43).
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
Verify: `iter.sh lint`; `iter.sh cmd 'npx tsx -e "import {HTTP_HEADERS, CACHE_CONTROL_VALUES} from \"./libs/src/common/types/http-methods\"; if(CACHE_CONTROL_VALUES.NoStore!==\"no-store\"||HTTP_HEADERS.CacheControl!==\"Cache-Control\") process.exit(1)"'` exit 0. (Der frühere `grep -n` war grün, sobald der Bezeichner irgendwo stand — ein vertippter Wert wäre durchgerutscht. `npx tsx -e` löst diese Datei ohne Extra-Env auf, lokal geprüft.)
i18n: keine
Doku: keine
Abhängt von: —

### T6 — api/common: NonEmptyStringPipe (+ StrictValidationPipe **bereits gebaut**)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/common/pipes/nonEmptyString.pipe.ts`, `apps/api/src/common/pipes/strictValidationPipe.ts`
Soll: NEW:**47810-47820** (Modul 738, `NonEmptyStringPipe`). **Korrektur der Beschreibung:** die Pipe **trimmt nicht**. `transform(value)` wirft `new CustomHttpException(CommonErrorMessages.INVALID_REQUEST_DATA, HttpStatus.BAD_REQUEST)`, wenn `typeof value !== 'string' || value.trim().length === 0`, und gibt sonst **`value` unverändert** zurück (inkl. führender/nachfolgender Leerzeichen). Sie ist reiner Validator, kein Transformer. `CommonErrorMessages.INVALID_REQUEST_DATA` existiert im Fork (`libs/src/common/constants/common-error-messages.ts:31`). · `strictValidationPipe` (Modul 297, referenziert NEW:**47681** im Klassen-Dekorator-Block als Controller-`@UsePipes`) — der Fork hat **keine** globale ValidationPipe (Notiz aus p5-calendar T5), deshalb muss sie explizit gesetzt werden.
Änderung: `NonEmptyStringPipe` als `@Injectable()` `PipeTransform<string,string>` nach dem Muster von `apps/api/src/common/pipes/safe-path-segment.pipe.ts`. `strictValidationPipe` **existiert bereits** (`apps/api/src/common/pipes/strictValidationPipe.ts`, aus `p6-fundament`) — **nicht neu anlegen und nicht überschreiben**. Die Datei bildet `NEW:14694` ab: `whitelist` + `forbidNonWhitelisted` + `disableErrorMessages: process.env.NODE_ENV === 'production'`, **ohne** `transform`.
**Korrektur der ursprünglichen Vorgabe hier:** die frühere Fassung dieses Tasks verlangte `transform: true` mit der Begründung „sonst greifen `@Type`/`@ValidateNested` zur Laufzeit nicht". Das stimmt nicht — NestJS ruft `plainToInstance` + `validate` **vor** `isTransformEnabled` (`node_modules/@nestjs/common/pipes/validation.pipe.js:60-72`), verschachtelte Validierung greift also auch ohne `transform`. Wer braucht, dass die Instanz **zurückgegeben** wird, nimmt `strictTransformValidationPipe` (`NEW:18878`), der genau dafür existiert. Der alte Verify war ein `grep` und wäre in beiden Welten grün gewesen — ein späterer Agent hätte die Fundament-Datei still umgeschrieben.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=nonEmptyString'` grün mit Spec: `transform('  ')` wirft (400, `common.errors.invalidRequestData`), `transform('')` wirft, `transform(42 as unknown as string)` wirft, und **`transform(' a ')` liefert `' a '` — nicht `'a'`** (der alte Verify verlangte `'a'` und wäre bei einer treuen 1:1-Portierung rot geworden; er hätte den Agenten gezwungen, ein `trim()` zu erfinden, das im Soll nicht steht). Dazu Spec-Teil: ein DTO mit Extra-Feld wird von `strictValidationPipe` abgelehnt (`forbidNonWhitelisted`). Specs werden von `tsc -p apps/api/tsconfig.app.json` **nicht** typgeprüft → zusätzlich `iter.sh cmd 'npm run check-spec-types'`.
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
Soll: NEW:**49150-49155** (escapeXml — genau fünf Ersetzungen in dieser Reihenfolge: `&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`, `"`→`&quot;`, `'`→`&apos;`; `&` **zuerst**, sonst Doppel-Escaping) · NEW:**48974-48992** (splitVCards — normalisiert `\r\n`/`\r` auf `\n`, sammelt ab `BEGIN:VCARD` bis `END:VCARD` und gibt jede Karte mit `CRLF` verbunden **und** abschließendem `CRLF` zurück) · NEW:**49020-49030** (sanitizeVcardResourceName: `DISALLOWED_CHARACTERS=/[^A-Za-z0-9._-]/g` entfernen, auf `MAX_RESOURCE_NAME_LENGTH=128` kürzen, und **`null`** — nicht `undefined` — zurückgeben, wenn der Input leer ist, der Rest leer ist oder nur aus Punkten besteht (`ONLY_DOTS=/^\.+$/`)).
Änderung: Drei Utils 1:1, Default-Export am Ende. `escapeXml` wird von den PROPPATCH-/MKCOL-Bodies und vom `.mobileconfig` genutzt — **XML-Injection-Schranke, exakt übernehmen.** SPDX.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=contacts/utils'` grün mit Spec: `escapeXml('<a & "b">\'')` maskiert alle fünf Entities und erzeugt **kein** `&amp;amp;`; `splitVCards` einer 3-Karten-Datei mit `\r\n` liefert Länge 3 und jede Karte endet auf `\r\n`; `sanitizeVcardResourceName('../../etc/passwd')` enthält **keinen** Slash und ist ≤ 128 Zeichen; `sanitizeVcardResourceName('..')` und `sanitizeVcardResourceName('///')` liefern **`null`**; `sanitizeVcardResourceName('x'.repeat(300)).length === 128`.
**Der alte Verify war falsch und wäre bei korrekter 1:1-Portierung rot geworden:** er verlangte, dass `'../../etc/passwd'` „keinen Punkt-Punkt" enthält — das Soll entfernt aber nur die nicht-erlaubten Zeichen, das Ergebnis ist `'....etcpasswd'` und enthält sehr wohl `..`. Sicher ist das trotzdem, weil kein `/` überleben kann; genau das ist jetzt die Assertion.
i18n: keine
Doku: keine
Abhängt von: —

### T9 — api/contacts: VCardMapper  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/vcard.mapper.ts`
Soll: NEW:48658-48948 (Modul 743). Öffentliche statische API laut Aufrufstellen: `parseVCard(raw, addressBookId, url, etag?)` (Definition NEW:48772; Aufrufe 48220/48228/48292/48313), `serializeVCard(uid, input, extraProperties?)` (48284/48305), `extractUid(data)` (48241/48266/48470/48507), `extractExtraProperties(data)` (48304 — bewahrt beim Update unbekannte vCard-Properties, damit fremde Clients nichts verlieren).
Änderung: 1:1 übernehmen — **als const-Objekt, nicht als Klasse.** Im Soll ist `VCardMapper` ein Objekt-Literal aus Arrow-Functions (`const VCardMapper = { parseVCard, serializeVCard, extractUid, extractExtraProperties }`, NEW:48938-48944) mit Default-Export am Dateiende; die Einzeldefinitionen stehen bei NEW:48772 (`parseVCard`), NEW:48908 (`serializeVCard`), NEW:48932 (`extractUid`), NEW:48754 (`extractExtraProperties`, filtert `unfoldLines(raw)` gegen `MANAGED_PROPERTIES`). Die frühere Formulierung „Klasse mit statischen Methoden" widersprach dem Soll **und** der AGENTS.md-Regel (const-Objekte statt Klassen-Namespaces) — der `IcalMapper` des Kalenders ist eine Klasse, der VCardMapper ist es bewusst nicht. **Kein `ical.js`** — das Soll parst vCard selbst. Round-Trip-Treue ist der Kern: `serializeVCard` darf beim Update keine Properties verlieren, die `extractExtraProperties` gefunden hat. SPDX.
Verify: `iter.sh test:api` mit Spec: Round-Trip `parseVCard(serializeVCard(uid, contact))` ergibt denselben Kontakt; eine vCard mit unbekannter `X-CUSTOM`-Property überlebt `extractExtraProperties`→`serializeVCard`; `extractUid` findet die UID auch bei Zeilenfaltung (`\r\n `).
i18n: keine
Doku: keine
Abhängt von: T4, T8

### T10 — api/contacts: buildConfigurationProfile (.mobileconfig)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/utils/buildConfigurationProfile.ts`
Soll: NEW:49035-49127, Funktion ab NEW:49070. `PROFILE_IDENTIFIER='de.netzint.edulution.contacts'` (**NEW:49061**, im Fork rebranden — siehe Änderung), `ACCOUNT_IDENTIFIER=`${PROFILE_IDENTIFIER}.carddav`` (NEW:49062), `deterministicUuid` = sha1 des Seeds, in 8-4-4-4-12 zerlegt (NEW:49066-49069), Seeds sind `${PROFILE_IDENTIFIER}:${username}:${serverUrl}` bzw. `${ACCOUNT_IDENTIFIER}:${username}:${serverUrl}` (NEW:49076-49077), Port aus der URL oder 443/80, `CardDAVUseSSL` als `<true/>`/`<false/>` aus dem Protokoll, alle eingesetzten Werte (displayName, hostname, principalPath, username) durch `escapeXml` — die beiden Identifier und die UUIDs bewusst **nicht**.
Änderung: 1:1, **aber `PROFILE_IDENTIFIER` auf `net.linuxmuster.ui.contacts` ändern** (Rebrand-Gate aus `p1-rebrand`: kein `de.netzint`-Identifier in unserem Produkt). Das ändert die deterministischen UUIDs — unkritisch, weil das Profil bei jedem Download neu erzeugt wird. Ebenso den Anzeigenamen `'edulution Contacts'` (Aufrufstelle NEW:47434, exakt) und `filename="edulution-contacts.mobileconfig"` (NEW:**47525**, nicht 47530) rebranden. SPDX.
Verify: `iter.sh test:api` mit Spec: Ausgabe ist wohlgeformtes XML (`fast-xml-parser` ist bereits Dependency), enthält `com.apple.carddav.account`, `<integer>443</integer>` bei `https://…` ohne Port, und die UUID matcht `/^[0-9a-f]{8}-[0-9a-f]{4}-…/`; ein Username mit `&` wird maskiert.
i18n: keine
Doku: in `docs/features/p7-contacts.md`: Rebrand-Abweichung dokumentieren
Abhängt von: T8

### T11 — api/contacts: Service-Basis (Backend-Config, Client, Guards)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.service.ts`
Soll: NEW:**47955-48033** (die alte Obergrenze 48010 schnitt `describeError` mitten durch und ließ `buildClient` ganz weg, obwohl die Task es beschreibt). `backend={baseUrl:'',authMode:BASIC,rejectUnauthorized:true}` (47958-47962); `onModuleInit`→`updateBackendConfig` (47967-47969); `updateBackendConfig` (47970-47983) liest `getAppConfigByName(APPS.CONTACTS)` (**NEW:47971**) und fällt bei fehlender/nicht-objektiger `extendedOptions` auf die Defaults zurück, `rejectUnauthorized` ist `opts[…] !== false` (also **true**, wenn der Key fehlt); `assertBackendConfigured` (47984-47988, 503 `ContactsBackendNotConfigured`), `assertAuthenticated` (47989-47993, 401 `CardDavConnectionFailed`), `assertReady` (47994-47997), `buildDispatcher` (47998-48002, undici `Agent` mit `connect.rejectUnauthorized`), `static describeError` (**NEW:48003-48012**, Format `${primary} -> ${causeMessage}${causeCode ? ' ['+causeCode+']' : ''}`), `buildClient` (48013-48032, tsdav `DAVClient`, `defaultAccountType:'carddav'`, `authMethod` `Digest` nur bei `authMode===DIGEST`, sonst `Basic`, bei Login-Fehler `CardDavConnectionFailed` mit **502**).
**Korrektur der bisherigen Behauptung:** das `@OnEvent(\`${APPCONFIG_UPDATED}-${APPS.CONTACTS}\`)` ist **kein** Fork-Zusatz — es steht im Soll bei **NEW:48536**, dekoriert dort `updateBackendConfig`, und ist damit 1:1 zu portieren (Fork-Import heißt `EVENT_EMITTER_EVENTS` aus `@libs/appconfig/constants/eventEmitterEvents`, Muster `mails.service.ts:108`). Die alte Formulierung „plus …, analog zur CalDavClientFactory" las sich wie eine Abweichung und hätte einen Reviewer eine korrekte Portierung als Extra beanstanden lassen.
Änderung: `@Injectable()`-Service, Konstruktor `(appConfigService, @Inject(CACHE_MANAGER) cacheManager)`. Statische Logger mit `ContactsService.name`. **Bewusste Abweichung vom Soll (Sicherheit):** zusätzlich `assertConfiguredOrigin(url)` wie in `CalDavClientFactory` (NEW:45952-45960) implementieren und in T13/T14 bei jedem direkten `fetch` anwenden — der 2.1.0-ContactsService hat diese Schranke **nicht**, und wir geben hier Klartext-Passwörter weiter. Im Doku-Task begründen. SPDX.
Verify: `iter.sh test:api` mit Spec: ohne `CONTACTS_CARDDAV_BASE_URL` wirft jede Methode 503; mit URL aber ohne Passwort 401; `describeError` hängt `cause.code` in eckigen Klammern an; das Passwort taucht in **keiner** Logausgabe auf (Logger-Spy prüft alle Aufrufe auf das Test-Passwort).
i18n: keine
Doku: keine (in T19)
Abhängt von: T1, T2, T3

### T12 — api/contacts: Adressbücher (list/create/update/delete/export)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.service.ts`
Soll (alle Anker neu gemessen, die alten lagen 1–3 Zeilen daneben, `mapAddressBook` reichte fälschlich bis in `searchContacts`): NEW:**48033-48046** (`static mapAddressBook`: `id=encodeId(url)`, Fallback-Anzeigename `'Address Book'`, `readOnly=isDirectoryBook(addressBook)`, `isDefault=isDefaultBook(url)`) · NEW:**48047-48052** (`listAddressBooks`: `assertReady` → `buildClient` → `client.fetchAddressBooks()` → mappen) · `createAddressBook` NEW:**48355-48381** · `updateAddressBookProperties` NEW:**48406-48422** · `deleteAddressBook` NEW:**48423-48446** · `exportAddressBook` NEW:**48460-48466** (Aufrufstellen im Controller NEW:47436-47450). Pflicht-Hilfsmittel: `encodeId`/`decodeId` (NEW:**47880-47881**), `COLLECTION_MARKER='/Contacts/'` (**47882**), `isDirectoryBook` (**47890-47893**), `DEFAULT_COLLECTION_NAME='personal'` (**47894**) + `isDefaultBook` (**47895-47901**), `PROPPATCH_METHOD`/`buildProppatchBody` (47933/47934, exakt), `MKCOL_METHOD` (**47935**), `DELETE_METHOD` (47936, exakt), `buildMkcolBody` (**47937**), `findAddressBook` (NEW:**48164-48172**, wirft `AddressBookNotFound`/404), `static assertWritable` (NEW:**48344-48348**, wirft `AddressBookReadOnly`/**403** für Directory-Bücher), `static assertDavResponsesOk` (NEW:**48382-48387**), `applyDisplayName` (NEW:**48388-48405**, wird von create **und** update benutzt), `invalidateDirectoryCache`/`invalidatePersonalSearchCache` (NEW:**48349-48354**).
Änderung: Fünf Methoden plus `static mapAddressBook` und die oben gelisteten Helfer. `deleteAddressBook` (NEW:48423-48446) prüft in **dieser** Reihenfolge: `findAddressBook` → `assertWritable` (Directory-Buch ⇒ `AddressBookReadOnly`, **403**) → `isDefaultBook(addressBook.url)` (⇒ `AddressBookNotDeletable`, **409 CONFLICT**, nicht 403) → `davRequest` mit `DELETE_METHOD` (`convertIncoming:false`, `parseOutgoing:false`) → `assertDavResponsesOk` → **beide** Caches invalidieren (`invalidateDirectoryCache(addressBook.url)` und `invalidatePersonalSearchCache(emailAddress, addressBook.url)`). Der frühere Verweis „NEW:48350-48470" war ein 120-Zeilen-Sammelbereich über vier fremde Methoden.
Verify: `iter.sh test:api` mit gemocktem `DAVClient`: `mapAddressBook` setzt `isDefault` nur für `…/Contacts/personal`; `readOnly` für `resourcetype` mit `'directory'`; `deleteAddressBook` auf dem Default-Buch wirft; `buildMkcolBody('<x>')` enthält `&lt;x&gt;`.
i18n: keine
Doku: keine
Abhängt von: T8, T11

### T13 — api/contacts: Kontakte-CRUD  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.service.ts`
Soll: NEW:**48176-48343**. `listContacts` (NEW:**48176-48203**, PROPFIND mit `PROPFIND_PROPS` NEW:**47902-47905**, `extractAddressData` NEW:**47938-47954** für die drei möglichen Formen `string`/`_cdata`/`_text`), `enumerateViaPropfind` (48204-48215), die statischen Mapper `mapVCard`/`mapDavResponse`/`mapResponsesToContacts` (48216-48234), `findVCard`/`findVCardViaPropfind` (48235-48277), `createContact` (NEW:**48278-48297**: `serializeVCard` → PUT), `updateContact` (NEW:**48298-48318**: **erst `extractExtraProperties` des Bestands** (48304), dann `serializeVCard(uid, input, extraProperties)` (48305) — sonst verliert der Update fremde Felder), `deleteContact` (48319-48332), `exportContact` (48333-48343).
**Korrektur: ein `getContact` gibt es in 2.1.0 nicht.** Die alte Zeile „`getContact` (48228)" zeigte auf eine Zeile **innerhalb** des statischen Helfers `mapDavResponse` (48222-48229); unter den 13 Routen ist keine Einzel-Kontakt-GET-Route, und der Service hat keine solche Methode. Nicht erfinden.
Änderung: **Fünf** öffentliche Methoden (`listContacts`, `createContact`, `updateContact`, `deleteContact`, `exportContact`) plus die oben gelisteten Helfer, 1:1 — nicht sechs, `getContact` existiert nicht. Read-only-Bücher bei jedem Schreibzugriff über den **bestehenden** Helfer `ContactsService.assertWritable` (T12, NEW:48344-48348) mit `AddressBookReadOnly`/403 ablehnen, nicht pro Aufrufstelle neu bauen. Nach jedem Schreibzugriff die beiden Caches invalidieren, wie es die Schreibmethoden im Soll tun.
Verify: `iter.sh test:api`: `extractAddressData` liefert für alle drei Formen den String; `updateContact` sendet eine vCard, die die `X-CUSTOM`-Property des Bestands noch enthält; Schreiben in ein `readOnly`-Buch wirft.
i18n: keine
Doku: keine
Abhängt von: T9, T12

### T14 — api/contacts: Import + Export  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.service.ts`
Soll: NEW:**48493-48527**. `importContacts`: `assertReady` → `findAddressBook` → `assertWritable` → `splitVCards(fileContent)` (48498) → **`fetchExistingVCardIndex(client, addressBook)`** (48502, Definition NEW:48467-48492) → je Karte `extractUid` (48507) → **wenn die UID schon existiert: `client.updateVCard({vCard:{url,etag,data:card}})` (48510-48512), sonst** Ressourcenname via `sanitizeVcardResourceName(uid) ?? randomUUID()` (48514) und `client.createVCard({addressBook, filename: `${resourceName}.vcf`, vCardString: card})` (48515); zählt `{imported, failed}` (jeder Fehler wird einzeln geloggt und nur gezählt, nicht geworfen) und invalidiert am Ende **beide** Caches. `exportAddressBook` (NEW:48460-48466, über `fetchRawVCards` NEW:48447-48459 alle Karten zu einer `.vcf` zusammenfassen).
**Zwei Korrekturen:** (1) Der Import ist ein **Upsert**, keine reine Anlage — wer `fetchExistingVCardIndex`/`updateVCard` weglässt, dupliziert bei jedem erneuten Import jeden Kontakt. (2) Leerer Input: der **Service** wirft bei `cards.length === 0` `ImportContactsFailed` mit **422 UNPROCESSABLE_ENTITY** (NEW:48499-48501); `FILE_NOT_PROVIDED`/400 ist die Prüfung im **Controller** und steht bei NEW:**47454** (nicht 47455).
Änderung: Zwei Methoden plus `fetchExistingVCardIndex`. Upload-Limit kommt aus dem Controller (`FileInterceptor` mit `CONTACTS_IMPORT_MAX_FILE_SIZE`, T16, NEW:47596) — **nicht** doppelt prüfen. Der leere/kartenlose Buffer wird im Service mit `ImportContactsFailed`/**422** quittiert (NEW:48499-48501); die `FILE_NOT_PROVIDED`/400-Prüfung gehört in den Controller (T16, NEW:47454) und nicht hierher.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=contacts.service'` grün mit Spec: Import einer Datei mit 3 Karten, davon 1 kaputt → `{imported:2, failed:1}`; eine Karte ohne UID bekommt trotzdem einen Ressourcennamen (`randomUUID`-Fallback) und geht durch `createVCard`; **eine Karte, deren UID im Buch schon existiert, ruft `updateVCard` und *nicht* `createVCard`** (fällt bei einer create-only-Portierung durch); ein Input ohne jede `BEGIN:VCARD`-Zeile wirft 422; nach dem Import sind `cacheManager.del` für Directory- **und** Personal-Key aufgerufen; Export liefert genau so viele `BEGIN:VCARD` wie Kontakte.
i18n: keine
Doku: keine
Abhängt von: T13

### T15 — api/contacts: Suche über alle Bücher + Caches  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.service.ts`
Soll: NEW:**48053-48093** (`searchContacts`) + **48094-48112** (`searchAddressBook`) + **48113-48132** (`queryContactsOrEnumerate`) + **48133-48152** (`fetchPersonalContactsForSearch`) + **48153-48163** (`fetchDirectoryContactsForSearch`) + **48349-48354** (die beiden Invalidierer). Der frühere zweite Bereich „48420-48480" war falsch — dort stehen `deleteAddressBook`/`fetchRawVCards`/`exportAddressBook`, nichts von der Suche.
`searchContacts` normalisiert die Query (`normalizeContactSearchText` NEW:47921, exakt — NFC + `toLocaleLowerCase` + NFC), bricht unter `MIN_QUERY_LENGTH` mit `[]` ab **bevor** `assertReady` läuft (48054-48056), durchsucht alle Bücher per `Promise.allSettled`, **loggt** jeden Fehlschlag einzeln (48061-48065) und wirft `ListContactsFailed` (502) **nur**, wenn *alle* Bücher fehlschlagen und es überhaupt Bücher gab (NEW:**48066-48069**). Danach — im alten Text komplett fehlend, aber Teil des Verhaltens: **Dedupe pro Adressbuch über die kleingeschriebene E-Mail** (48073-48082), **Sortierung** Directory-Treffer zuletzt, dann `fullName`, dann `email`, dann `addressBookDisplayName` (48085-48090), und **Limit-Klemmung** auf `min(MAX_RESULTS, max(1, floor(limit)))` (48083-48084).
Server-seitiger CardDAV-Filter `buildContactSearchFilters` über `FN,N,EMAIL,ORG` mit `collation:'i;unicode-casemap'`, `match-type:'contains'` (NEW:**47911-47920**); persönliche Bücher benutzen stattdessen den festen `CONTACTS_WITH_EMAIL_FILTER` (NEW:47908-47910). Client-seitiges Nachfiltern via `contactMatchesQuery` (NEW:**47922-47932**), gesteuert durch das Flag `needsQueryFilter`.
**Cache-Regel exakt, hier lag der gefährlichste Fehler:** persönliche Bücher werden **immer** gecacht (`personalSearchCacheKey` NEW:**47888-47889**, gespeichert werden nur die reduzierten Kandidatenfelder, `needsQueryFilter` ist dort **immer `true`**). Directory-Bücher werden **nur dann** in den `contactsDirectoryCache` geschrieben (`directoryCacheKey` NEW:**47883-47887**), **wenn `queryContactsOrEnumerate` auf PROPFIND-Enumeration zurückgefallen ist** (`viaFallback === true`, NEW:48160-48162) — denn nur dann ist das Ergebnis query-unabhängig; `needsQueryFilter` ist dann ebenfalls `viaFallback`. Der alte Text sagte pauschal „Directory-Bücher gehen in den contactsDirectoryCache": wer das so baut, legt **query-gefilterte** Treffer unter einem **query-freien** Key ab und liefert der nächsten, anderen Suche die Treffer der vorigen.
Änderung: `searchContacts` + `searchAddressBook` + die beiden Cache-Key-Helfer. Cache über den injizierten `cacheManager`.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=contacts.service'` grün: Query `'a'` (< 2 Zeichen) liefert `[]` **ohne** einen einzigen DAV-Aufruf **und ohne** `assertReady` (also auch bei unkonfiguriertem Backend `[]` statt 503); bei 3 Büchern und 1 Fehler kommen die Treffer der anderen 2 zurück und der Fehlschlag wird geloggt; bei 3/3 Fehlern → 502; bei **0** Büchern → `[]`, **kein** 502; zweiter identischer Suchlauf über ein **persönliches** Buch trifft den Cache (nur ein DAV-Report); ein **Directory**-Buch, dessen `addressBookQuery` durchgeht, wird **nicht** gecacht — zweite Suche mit **anderer** Query löst einen neuen Report aus und liefert **nicht** die Treffer der ersten (genau der Bug, den die pauschale Cache-Formulierung erzeugt hätte); ein Directory-Buch, dessen `addressBookQuery` mit `501` scheitert, landet über den PROPFIND-Fallback **doch** im Cache; zwei Kontakte mit derselben E-Mail im selben Buch ergeben **einen** Treffer; `limit: 0` und `limit: 999` werden auf 1 bzw. 50 geklemmt; Directory-Treffer stehen hinter Personal-Treffern; Umlaut-Query findet den NFD-kodierten Kontakt.
i18n: keine
Doku: keine
Abhängt von: T13

### T16 — api/contacts: Controller (13 Routen) + Module + Wiring  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.controller.ts`, `apps/api/src/contacts/contacts.module.ts`, `apps/api/src/app/app.module.ts`
Soll: NEW:47419-47480 (Methoden) + 47481-47676 (Route-Dekoratoren, 13 Stück nachgezählt) + NEW:**47677-47684** (Klassen-Dekoratoren) + 47353-47363 (Module: `imports:[UsersModule, AppConfigModule]`, `controllers:[ContactsController]`, `providers/exports:[ContactsService]`). Konstanten NEW:47416-47417 (`VCARD_CONTENT_TYPE='text/vcard; charset=utf-8'`, `MOBILECONFIG_CONTENT_TYPE='application/x-apple-aspen-config; charset=utf-8'`).
**Der alte Klassen-Anker 47681-47687 war gefährlich falsch:** er begann bei `@UsePipes` (47681) und ließ damit **`@ApiAuth()` (47679) und `@RequireAppAccess(APPS.CONTACTS)` (47680) außerhalb des Bereichs** — genau die zwei Zeilen, die diese Task „nicht verhandelbar" nennt. Der vollständige Block ist: `@ApiTags` 47678, `@ApiAuth()` 47679, `@RequireAppAccess(APPS.CONTACTS)` 47680, `@UsePipes(strictValidationPipe)` 47681, `@Controller(CONTACTS_ENDPOINT)` 47682.
Route-Inventar (aus den Dekoratoren gezählt, HTTP-Methoden explizit, weil sie sich unterscheiden): `GET addressbooks` · `GET search` · `GET configuration-profile` · `POST addressbooks` · **`PATCH` `addressbooks/:addressBookId`** · `DELETE addressbooks/:addressBookId` (204) · `GET addressbooks/:addressBookId/export` · `POST addressbooks/:addressBookId/import` · `GET addressbooks/:addressBookId/contacts` · `POST addressbooks/:addressBookId/contacts` · **`PUT` `addressbooks/:addressBookId/contacts/:uid`** (nicht PATCH) · `DELETE addressbooks/:addressBookId/contacts/:uid` (204) · `GET addressbooks/:addressBookId/contacts/:uid/export`.
Änderung: Alle 13 Routen mit exakten Pfaden, `@HttpCode(204)` bei den beiden Deletes, `@Header(ContentType/ContentDisposition)` bei den drei Downloads, `@Header(CacheControl, NoStore)` bei `search` (NEW:47512), `@UseInterceptors(FileInterceptor('file',{limits:{fileSize:CONTACTS_IMPORT_MAX_FILE_SIZE}}))` beim Import, `@Query('q', NonEmptyStringPipe)` + `@Query('limit', new DefaultValuePipe(MAX_RESULTS), ParseIntPipe)` bei der Suche.
**Guards vollständig mit-portieren (nicht verhandelbar):** `@ApiAuth()`, `@RequireAppAccess(APPS.CONTACTS)`, `@UsePipes(strictValidationPipe)`, `@Controller(CONTACTS_ENDPOINT)`. Keine Route ist `@Public()`. Modul in `app.module.ts` registrieren.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=contacts.controller'` grün mit neuer `contacts.controller.spec.ts`:
* `Reflect.getMetadata(APP_ACCESS_KEY, ContactsController)` ist `APPS.CONTACTS` — **klassen-level**. `controllerContractReflection.getRequiredAppAccess()` taugt hier **nicht**: es liest die Metadaten am *Handler* (controllerContractReflection.ts:24-25) und liefert bei einem Klassen-Dekorator `undefined`, der alte Verify wäre also bei korrekter Arbeit rot gewesen. Fork-Muster: `apps/api/src/calendar/calendar.controller.spec.ts:160`.
* `controllerContractReflection.isRoutePublic(ContactsController, m) === false` für **alle 13** Handler.
* Alle 13 Pfade + HTTP-Methoden exakt (inkl. `PATCH` fürs Adressbuch und `PUT` für den Kontakt), 2× `@HttpCode(204)`, 3× Download-Header, `@Header(CacheControl, NoStore)` auf `search`.
* Zusätzlich `iter.sh cmd 'npm run check-spec-types'` — Specs werden von `tsc -p apps/api/tsconfig.app.json` **nicht** typgeprüft, ein „tsc clean" sagt über diese Spec nichts.
**Der curl-Teil ist gestrichen:** `curl -s -o /dev/null -w '%{http_code}'` exitet auch ohne laufenden Stack mit 0 und druckt `000` — die Prüfung konnte nie fehlschlagen und war deploy-abhängig.
i18n: keine
Doku: swagger regenerieren, `swagger-spec.json` mit committen
Abhängt von: T5, T6, T7, T10, T14, T15

### T17 — api/contacts: Spec-Coverage-Gate erfüllen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/contacts/contacts.controller.spec.ts`
Soll: Repo-Policy aus `p1-port-api-specs-ci` — `npm run check-spec-coverage` erzwingt für **jeden** Controller eine Auth-Contract-Spec (CI + pre-commit).
Änderung: Spec vervollständigen (falls T16 nur den Kern abdeckt): pro Route Auth-Metadaten, HTTP-Methode, Pfad, `@HttpCode`.
Verify: `iter.sh cmd 'npm run check-spec-coverage'` grün **und** `iter.sh cmd 'npx nx run api:test -- --testPathPattern=contacts.controller'` grün — wobei die Spec einen Handler-Abgleich enthalten muss, der wirklich fehlschlagen kann: aus `Object.getOwnPropertyNames(ContactsController.prototype)` (ohne `constructor`) die Handler ziehen und gegen die im Test gepflegte 13er-Tabelle aus Name → HTTP-Methode → Pfad → erwartetem `@HttpCode` prüfen (`expect(handlers.sort()).toEqual(TABLE.map(t=>t.name).sort())`). Jede künftig ergänzte, ungeprüfte Route bricht damit sofort.
**Warum der alte Verify nichts taugte:** `npm run check-spec-coverage` prüft ausschließlich, ob **eine Datei** `<name>.controller.spec.ts` neben dem Controller liegt (`scripts/checkSpecCoverage.ts:29-30`, `fs.existsSync`) — es liest sie nie. Nach T16 existiert sie, das Gate ist also schon grün und konnte die Arbeit dieser Task weder belegen noch widerlegen.
i18n: keine
Doku: keine
Abhängt von: T16

### T18 — i18n: contacts-Keys (DE/EN/FR)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/locales/{de,en,fr}/translation.json`
Soll: **16** Fehler-Keys aus T1 (`contacts.errors.*`, im Bundle 48575-48590 — die Vorgabe „17" war falsch) + 10 appConfig-Keys aus T3 (`appExtendedOptions.contactsCardDav{BaseUrl,AuthMode,RejectUnauthorized}{Title,Description}` = 6, `…contactsCardDavAuthModeDisabled` = 1, `…contactsCardDavAuthMode.{basic,digest,oauth}` = 3) + UI-Keys für T19.
Änderung: Alle Keys in **allen drei** Locales. FR ist erstwertig (siehe `x-i18n-fr`), keine englischen Platzhalter.
Verify: `iter.sh i18n` grün (Parität DE/EN/FR); `iter.sh cmd 'npm run check-error-message-translations'` grün. **Bedingung, damit die zweite Prüfung überhaupt etwas prüft:** `scripts/checkErrorMessages.ts` sammelt seine Keys über `ts.isEnumDeclaration` und **nur** aus den Dateien, die `libs/src/error/errorMessage.ts` importiert. Sie greift also genau dann, wenn T1 `ContactsErrorMessages` als `enum` gebaut **und** in `errorMessage.ts` importiert hat; als const-Objekt oder ohne den Import läuft sie stumm grün durch und belegt nichts. Gegenprobe im selben Lauf — **nicht per `grep`**: `translation.json` ist **verschachtelt** (`{"contacts":{"errors":{…}}}`), der String `contacts.errors.` kommt darin nie vor, ein `grep -c` lieferte also `0` und wäre bei korrekter Arbeit rot. Stattdessen: `iter.sh cmd 'npx tsx -e "import fr from \"./apps/frontend/src/locales/fr/translation.json\"; if (Object.keys(fr.contacts.errors).length !== 16) process.exit(1)"'` exit 0.
i18n: siehe oben
Doku: keine
Abhängt von: T1, T3

### T19 — Frontend: ContactsPage (FORK-ORIGINAL, keine Rekonstruktion)  [?]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Contacts/**`, `apps/frontend/src/components/structure/layout/NativeAppPageManager.tsx` (Eintrag `[APPS.CONTACTS]: <ContactsPage />` in `nativeAppPages` — **ohne ihn rendert die Route nichts**, `NativeAppPageManager` gibt schlicht `undefined` zurück; Muster: der `[APPS.CALENDAR]`-Eintrag Zeile 43), `apps/frontend/src/assets/icons/index.ts` + das zugehörige `fontawsome-solid`-SVG (Muster `CalendarIcon`, index.ts:41 — wird von `PageLayout`/`nativeAppHeader` und vom App-Config-Eintrag gebraucht). Der Eintrag in `appConfigOptions.ts` gehört bewusst zu T3 (dort entsteht die Options-Liste), damit die Datei nur einen Besitzer hat
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
Verify: `iter.sh cmd 'test -f apps/api/src/contacts/utils/buildConfigurationProfile.ts && test -f docs/features/p7-contacts.md && ! grep -rniE "de\.netzint|edulution" apps/api/src/contacts libs/src/contacts'` exit 0 — die `test -f` stehen **vor** dem negierten Grep, sonst wäre die Prüfung auf einer noch nicht angelegten Datei bedeutungslos. Zusätzlich `iter.sh cmd 'npm run check-external-references'` grün (schadet nicht, belegt hier aber nichts).
**Warum der alte Verify nicht taugte:** `scripts/checkExternalReferences.ts` sucht ausschließlich nach `edulution.io`-URLs, `raw.githubusercontent.com/edulution-io` und `edulution-io.github.io` sowie nach nicht-leeren Sentry-DSNs (HOST_PATTERNS, Zeilen 14-18). Ein Reverse-DNS-Identifier wie `de.netzint.edulution.contacts` enthält kein Schema und keinen dieser Hosts — das Skript ist heute grün und wäre es auch mit unrebrandetem Identifier geblieben.
i18n: keine
Doku: `docs/features/p7-contacts.md`
Abhängt von: T16 (API-Contract steht), T18 — und T19 **nur, falls die FE-Task gebaut wird**. Der Doku-Inhalt (Architektur, SOGo-Voraussetzung, Passwort-Weitergabe + `assertConfiguredOrigin`-Abweichung aus T11, PII-Hinweis zum `.mobileconfig`, Rebrand aus T10, „13 statt 14 Routen") ist vollständig API-seitig; die Spec darf nicht an einer `[?]`-Task hängen, sonst blockiert ein übersprungenes T19 die Doku dauerhaft

---

## p7-ai [P7] — AiModule (LiteLLM / Vercel AI SDK)  ·  **PRODUKT- + DSGVO-ENTSCHEIDUNG**

> **Adressierung:** Die Task-Nummern starten in **jedem** Sub-Paket dieses Ledgers neu, „T7" ist file-weit
> also mehrdeutig. Tasks dieses Abschnitts heißen `p7-ai:T<n>` (z. B. `p7-ai:T2`); Querverweise aus anderen
> Ledgers bitte ausschließlich in dieser Form schreiben. **Nicht umnummerieren** — das bräche jeden
> bestehenden Verweis.

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
`isInAppPermissionGranted`, `InAppPermissionWhenUnset`, `getAccessGroups`, `isUserInAccessGroups`,
`parseCsvList`, `DEFAULT_{READ,WRITE}_THROTTLE_{LIMIT,TTL_MS}` (Soll NEW:88238-88245), jedes AI-Modul.

**Vier Aussagen dieses Kopfes am 2026-07-28 gegen den echten Baum nachgezogen — sie galten nicht mehr:**
1. **`strictTransformValidationPipe` fehlt NICHT.** `apps/api/src/common/pipes/strictTransformValidationPipe.ts`
   existiert seit `9e90e90bc` („feat(fundament): add the shared primitives five ledgers assume") und ist
   optionsgleich mit NEW:18878-18884 → `p7-ai:T7` ist nur noch Verifikation, kein Neubau.
2. **`CHAT_ROLES` ist im Fork unvollständig:** `libs/src/chat/constants/chatRoles.ts` hat **nur** `USER: 'user'`;
   2.1.0 hat `USER` **und** `ASSISTANT` (NEW:88738-88741). Ohne die Erweiterung lehnt das `role`-Enum des
   `AiChatMessage`-Schemas (NEW:90556-90558, `enum: Object.values(chatRoles)`) jede Assistant-Nachricht ab —
   `p7-ai:T5` muss die Konstante mitziehen (additiv, Union-Erweiterung, für den Chat-Bestand harmlos).
3. **Es gibt im Fork keinen `@ApiAuth()`-Decorator** — bewusst verworfen (`tasks/backlog.md` T8, `ed3cb4400`);
   Fork-Swagger-Konvention ist `@ApiBearerAuth()`. Und in 2.1.0 ist `ApiAuth` reine Swagger-Deko
   (`applyDecorators(ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse)`), **keine** Auth-Kontrolle.
   Authentifiziert wird global durch `AuthGuard` + `AccessGuard` als `APP_GUARD`
   (`apps/api/src/app/app.module.ts:160-167`); der einzige Ausstieg ist `@Public()`.
4. **Die i18n-Keys der AI-Fehler liegen nicht unter `ai.*`,** sondern unter `chat.errors.ai*`
   (`AI_ERROR_MESSAGES`, NEW:89935-89945, **neun** Keys) bzw. `chat.aiError`/`chat.aiSessionExpired`/
   `chat.aiAccessDenied` (`AI_CONSTANTS`, NEW:89652-89667). Der `chat.errors`-Namensraum existiert im Fork
   bereits (`apps/frontend/src/locales/*/translation.json`).

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
**Zusätzlich zwingend — dass der Guard auch *angewendet* wird:** die Logik-Spec oben bliebe grün, wenn niemand
`@UseGuards(InAppPermissionGuard)` setzt; ein Guard, der existiert aber nicht hängt, schützt nichts. Genau dieser
Fehler steckte im Fork schon einmal in `parent-child-pairing.controller.ts` (`@UseGuards(DynamicAppAccessGuard)`
ohne Wirkung, behoben in `4934c5686`). Der Contract-Test dafür existiert bereits:
`controllerContractReflection.getRouteGuards(<Controller>, '<route>')` muss `InAppPermissionGuard` enthalten —
je geschützter Route eine Assertion, nach dem Muster von `apps/api/src/wiki/wiki.controller.spec.ts`.
i18n: keine
Doku: `docs/features/p7-ai.md`: „Guard-Vorarbeit, unabhängig von der AI-Entscheidung nutzbar"
Abhängt von: —

### T3 — Root-Dependencies: ai + @ai-sdk/*  [ ] (gesperrt bis T1)
Komponente: root · Dateien: `package.json`, `package-lock.json`
Soll: NEW:79274 — `"ai":"^7.0.19"`, `"@ai-sdk/openai":"^4.0.11"`, `"@ai-sdk/anthropic":"^4.0.11"`, `"@ai-sdk/google":"^4.0.11"`, `"@ai-sdk/openai-compatible":"^3.0.7"`, FE `"streamdown":"^2.5.0"`.
Änderung: Exakt diese Ranges aufnehmen, `npm install`.
Verify: `iter.sh cmd 'npm ls ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google @ai-sdk/openai-compatible streamdown'` exit 0 (fehlt oder driftet eine der sechs, ist `npm ls` rot); `iter.sh cmd 'npm run check-npm-audit'` grün. **Nicht** `npm audit --omit=dev --audit-level=high` nehmen — die Basis trägt 30 baselinete high/critical CVEs (`p1-security-cve-track`), der rohe Aufruf ist heute schon rot und taugt darum als Gate nichts. `scripts/security/checkNpmAudit.ts` vergleicht gegen `scripts/security/npmAuditAllowlist` und wird genau dann rot, wenn ein **neuer**, nicht-allowlisteter, abgelaufener oder eskalierter high/critical-Fund dazukommt — das ist die Zusicherung, die dieser Task braucht.
i18n: keine
Doku: neue Deps ins Accepted-CVE-Register/Supply-Chain-Inventar
Abhängt von: T1

### T4 — libs/ai: Endpoints, Provider, Fehler, Chunk-Types  [ ] (gesperrt bis T1)
Komponente: libs · Dateien: `libs/src/ai/constants/{aiApiEndpoints,aiProviders,aiErrorMessages,aiChunkTypes,aiThrottleConfig,aiConstants}.ts`, `libs/src/common/constants/defaultThrottleConfig.ts`, `libs/src/common/utils/parseCsvList.ts`
Soll: NEW:848-855 (`AI_EDU_API_ENDPOINT='ai'`, `AI_STREAM_ENDPOINT`, `AI_MODELS_ENDPOINT`, `AI_CONVERSATIONS_ENDPOINT` — die drei letzten sind Template-Literals über `AI_EDU_API_ENDPOINT`, ergeben `ai/stream`, `ai/models`, `ai/conversations`) · Modul 1340 **NEW:89866-89872**: der Export heißt **`AI_PROVIDERS`** (nicht `AiProviders`) und die Werte sind **kleingeschrieben und teils mit Bindestrich** — `OPENAI:'openai'`, `ANTHROPIC:'anthropic'`, `GOOGLE:'google'`, `OLLAMA:'ollama'`, `OPENAI_COMPATIBLE:'openai-compatible'` (NEW:89871; **kein** Unterstrich, der Wert geht als `name` an `createOpenAICompatible`) · Modul 1342 **NEW:89935-89945**: `AI_ERROR_MESSAGES` hat **neun** Keys, nicht drei — `MODEL_NOT_CONFIGURED`, `MODEL_NOT_ALLOWED`, `PROVIDER_NOT_CONFIGURED`, `RATE_LIMITED`, `CONTEXT_TOO_LARGE`, `CONVERSATION_PERSIST_FAILED`, `INVALID_CONVERSATION_ID`, `INVALID_STREAM_REQUEST`, `CONVERSATION_NOT_FOUND`; die Werte sind **i18n-Keys unter `chat.errors.ai*`** (z. B. `'chat.errors.aiModelNotAllowed'`), nicht unter `ai.*` · Modul 1334 **NEW:89695-89699** (`AI_CHUNK_TYPES = {TEXT_DELTA:'text-delta', REASONING_DELTA:'reasoning-delta', FINISH:'finish'}`) · NEW:89455-89457 (`AI_STREAM_THROTTLE_LIMIT=5`, `AI_STREAM_THROTTLE_TTL_MS=10_000`) · Modul 1341 **NEW:89901-89906** (`parseCsvList` — split an `','`, `trim`, `filter(Boolean)` **und `new Set` (dedupliziert!)**) · **neu ergänzt, im ursprünglichen Task vergessen:** Modul 1333 **NEW:89652-89667** (`AI_CONSTANTS` — `ASSISTANT_USERNAME`, `STREAM_ERROR`, `SESSION_EXPIRED_ERROR`, `ACCESS_DENIED_ERROR`, `MESSAGE_MAX_LENGTH`, `MESSAGE_ID_MAX_LENGTH`, `MESSAGES_MAX_COUNT`, `DELETE_IDS_MAX_COUNT`, `MODEL_ID_MAX_LENGTH`, `CONVERSATION_ID_MAX_LENGTH`, `CONVERSATION_TITLE_MAX_LENGTH`, `CONVERSATION_TITLE_DISPLAY_LENGTH`, `MODEL_CONTEXT_WINDOW_CACHE_TTL_MS`, `MODEL_CONTEXT_WINDOW_NEGATIVE_CACHE_TTL_MS`) — ohne diese Datei müssten `p7-ai:T6` die DTO-Limits und `p7-ai:T9` die Cache-TTLs erfinden · **NEW:88238-88245** (`DEFAULT_READ_THROTTLE_LIMIT=30`, `DEFAULT_READ_THROTTLE_TTL_MS=5_000`, `DEFAULT_WRITE_THROTTLE_LIMIT=10`, `DEFAULT_WRITE_THROTTLE_TTL_MS=5_000`) — im Fork nicht vorhanden, `p7-ai:T12` setzt sie voraus.
Änderung: const-Objekte, Default-Export am Ende, SPDX. `parseCsvList` gehört nach `libs/src/common/utils/` (allgemein nutzbar).
Verify: `iter.sh lint`; `iter.sh cmd 'npx nx run api:test -- --testPathPattern=aiConstants'` grün. **Die Spec MUSS unter `apps/api/src/ai/` liegen** (z. B. `apps/api/src/ai/aiConstants.spec.ts`, importiert über `@libs/...`) — `libs/project.json` hat **kein** `test`-Target und `apps/api/jest.config.ts` wurzelt in `apps/api`, eine Spec unter `libs/` läuft also **nirgends** und wäre eine leere Zusicherung (im Repo existiert bis heute keine einzige `libs/**/*.spec.ts`). Inhalt: `parseCsvList('a, b ,,c')` → `['a','b','c']`, `parseCsvList('a,a,b')` → `['a','b']` (fällt ohne das `new Set` des Solls), `parseCsvList(undefined)` → `[]`; `AI_PROVIDERS.OPENAI_COMPATIBLE === 'openai-compatible'` und `Object.keys(AI_PROVIDERS).length === 5`; `Object.keys(AI_ERROR_MESSAGES).length === 9` und jeder Wert matcht `/^chat\.errors\.ai/`; `AI_CONSTANTS.MESSAGES_MAX_COUNT === 1000`; `DEFAULT_READ_THROTTLE_LIMIT === 30 && DEFAULT_WRITE_THROTTLE_LIMIT === 10`.
i18n: keine
Doku: keine
Abhängt von: T1

### T5 — api/ai: Mongoose-Schemas (Conversation + ChatMessage)  [ ] (gesperrt bis T1)
Komponente: apps/api, libs · Dateien: `apps/api/src/ai/ai-conversation.schema.ts`, `apps/api/src/ai/ai-chat-message.schema.ts`, `libs/src/chat/constants/chatRoles.ts` (**erweitern**, siehe Änderung)
Soll: NEW:90461-90502 (`AiConversation`: conversationId req, createdBy req, title default `''`, lastMessageAt, modelId, schemaVersion default 1; Indizes `{createdBy:1,conversationId:1}` **unique** und `{createdBy:1,lastMessageAt:-1}`) · NEW:90533-90578 (`AiChatMessage`: conversationId req+index, createdBy req+index, messageId req, role enum aus `chatRoles`, content default `''`, usage `Object`, schemaVersion default 1; Indizes `{createdBy,conversationId,createdAt}` und `{createdBy,conversationId,messageId}` unique).
Änderung: Beide Schemas 1:1. **Vorbedingung, die der Task ursprünglich verschwieg:** `AiChatMessage.role` ist `@Prop({type:String, enum: Object.values(CHAT_ROLES), required:true})` (NEW:90556-90558). Der Fork hat in `libs/src/chat/constants/chatRoles.ts` **nur** `USER: 'user'`; 2.1.0 hat `USER` **und** `ASSISTANT: 'assistant'` (NEW:88738-88741). Ohne das Nachziehen der Konstante lehnt Mongoose jede Assistant-Nachricht aus `p7-ai:T11` zur Laufzeit ab — der Fehler fällt in keinem Build auf. Erweiterung ist rein additiv (der abgeleitete `ChatRole`-Union wird breiter, `chat.service.ts` benutzt weiter `CHAT_ROLES.USER`). **Empfohlene Abweichung (DSGVO, aus T1):** zusätzlich ein TTL-Feld `expiresAt` mit `index:{expireAfterSeconds:0}` und konfigurierbarer Aufbewahrungsfrist — analog `ExamModeJob` (NEW:19230-19238). Nur umsetzen, wenn T1 es so entscheidet; sonst `[?]` vermerken. SPDX.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=ai-chat-message.schema'` grün: SchemaFactory kompiliert, beide Unique-Indizes gesetzt (`{createdBy,conversationId,messageId}` und `{createdBy,conversationId}` auf der Conversation), `role` **akzeptiert `'assistant'`** und lehnt `'system'` ab. Der Assistant-Fall ist der eigentliche Test — „lehnt einen unbekannten Wert ab" allein wäre auch mit dem heutigen, unvollständigen `CHAT_ROLES` grün geblieben.
i18n: keine
Doku: Aufbewahrungsfrist in `docs/features/p7-ai.md`
Abhängt von: T1, T4

### T6 — api/ai: DTOs  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/dto/{ai-stream,delete-ai-conversations,ai-model-response,ai-conversation-response,ai-message-response,ai-message-usage,ai-conversation-summary-response,get-ai-conversation-query}.dto.ts`
Soll: NEW:90673-90744 (AiStreamDto) · 90744-90785 (DeleteAiConversationsDto: `ids`) · 90785-90831 (AiModelResponseDto) · 90831-90903 (AiConversationResponseDto) · 90903-90962 (AiMessageResponseDto) · 90962-91028 (AiMessageUsageDto) · 91028-91087 (Summary) · 91113-91164 (GetAiConversationQueryDto: `limit`, `before`). **Alle Längen-/Mengen-Limits kommen aus `AI_CONSTANTS` (T4, NEW:89652-89667) — nicht erfinden:** `MESSAGE_MAX_LENGTH`, `MESSAGE_ID_MAX_LENGTH`, `MESSAGES_MAX_COUNT`, `DELETE_IDS_MAX_COUNT`, `MODEL_ID_MAX_LENGTH`, `CONVERSATION_ID_MAX_LENGTH`, `CONVERSATION_TITLE_MAX_LENGTH`. `GetAiConversationQueryDto.limit` trägt `@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(AI_CONSTANTS.MESSAGES_MAX_COUNT)` (NEW:91145-91151) — das `@Type` ist das, was die Query-Konvertierung trägt, **nicht** eine implizite Konvertierung in der Pipe (siehe `p7-ai:T7`); `before` ist `@IsOptional() @IsISO8601()`.
Änderung: Acht DTOs mit exakten Dekoratoren. SPDX.
Verify: `iter.sh test:api` (Spec: gültige/ungültige Payloads je DTO; `limit` als String wird durch `transform:true` zur Zahl).
i18n: keine
Doku: keine
Abhängt von: T4

### T7 — api/common: StrictTransformValidationPipe — **bereits gebaut, nur verifizieren**  [ ]
> **NICHT NEU ANLEGEN, NICHT ÜBERSCHREIBEN.** `apps/api/src/common/pipes/strictTransformValidationPipe.ts`
> existiert seit `9e90e90bc` („feat(fundament): add the shared primitives five ledgers assume") und ist
> optionsgleich mit dem Soll. Die Datei ist geteilte Fundament-Infrastruktur (Muster wie `strictValidationPipe`
> in `p7-contacts` T6) — ein Umschreiben hier wirkt still auf fremde Consumer. Weil sie AI-unabhängig ist und
> schon steht, ist dieser Task **nicht** an das T1-Gate gebunden.
Komponente: apps/api · Dateien: `apps/api/src/common/pipes/strictTransformValidationPipe.ts` (**Bestand, unverändert**), `apps/api/src/common/pipes/strictTransformValidationPipe.spec.ts` (neu, SPDX)
Soll: Modul 336, **NEW:18878-18884** — `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, disableErrorMessages: true, transform: true })`. Referenzen im AI-Controller: Import **NEW:89296**, `@UsePipes` auf **genau drei** Routen — `GET conversations/:id` (**NEW:89368**), `DELETE conversations` (**NEW:89382**), `POST stream` (**NEW:89411**).
**Korrektur der ursprünglichen Vorgabe:** die frühere Fassung nannte die Anker 89357/89377/89399 (alle drei falsch, s. o.) und verlangte `transformOptions: { enableImplicitConversion: true }` ohne `disableErrorMessages`. Beides steht **nicht** in NEW:18878-18884 und weicht vom Bestand ab. Implizite Konvertierung ist auch gar nicht nötig: `GetAiConversationQueryDto.limit` trägt `@Type(() => Number)` (NEW:91147), damit konvertiert bereits `transform: true`.
Änderung: **Keine an der Pipe.** Nur die fehlende Spec ergänzen. Weicht der Bestand wider Erwarten vom Soll ab, ist das ein Fund für `p6-fundament` — melden, nicht hier stillschweigend umschreiben.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=strictTransformValidationPipe'` grün — Spec fährt die Pipe verhaltensseitig gegen ein Test-DTO mit `@Type(() => Number) limit`: (a) `{limit:'10'}` kommt als `number` `10` heraus, (b) ein unbekanntes Feld wird mit `BadRequestException` abgelehnt, (c) diese Exception trägt **keine** feldweisen Validierungs-Messages (belegt `disableErrorMessages: true`) — (c) wird rot, sobald jemand die Fundament-Datei umkonfiguriert. Zusätzlich `iter.sh cmd 'npm run check-spec-types'` grün — Spec-Dateien werden von `tsc -p apps/api/tsconfig.app.json` **nicht** erfasst.
i18n: keine
Doku: keine
Abhängt von: — (bewusst **nicht** T1: die Datei existiert bereits und ist AI-unabhängig)

### T8 — api/ai: Modell-Auflösung (getAiModel / getAiModels)  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/utils/getAiModel.ts`, `apps/api/src/ai/utils/getAiModels.ts`
Soll: NEW:89704-89819 (`resolveProvider` aus `AI_PROVIDER`, Default OPENAI, unbekannt → 500; `resolveDefaultModel` aus `AI_MODEL` sonst erstem aus `AI_MODELS`, sonst 500; `resolveRequestedModel` prüft gegen die **Allowlist** `getAiModels()` → sonst 400 `MODEL_NOT_ALLOWED`; `requireEnv`; `resolveBaseModel` mit den 5 Providern inkl. `AI_OLLAMA_BASE_URL`/`AI_BASE_URL`+`AI_API_KEY`; optionale `wrapLanguageModel` + `extractReasoningMiddleware` je Tag aus `AI_REASONING_TAGS`) · Modul 1343 NEW:89950-89985 (`getAiModels` aus `AI_MODELS` + `AI_MODEL`).
Änderung: 1:1. **`resolveRequestedModel` ist die Allowlist-Schranke — nie lockern**, sonst kann ein User beliebige (teure) Modelle beim Provider anstoßen. `AI_API_KEY` **nie** loggen.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=getAiModel'` grün, mit gesetzten Test-Envs: unbekannter Provider → 500 `PROVIDER_NOT_CONFIGURED` (NEW:89745-89747); `AI_MODELS='a,b'` + Request `'c'` → 400 `MODEL_NOT_ALLOWED` (NEW:89765-89767); Request ohne Modell nimmt `a`; `AI_PROVIDER` leer ⇒ Default `openai` (NEW:89742-89744); **Provider `'openai-compatible'`** ohne `AI_BASE_URL` → 500 über `requireEnv` (NEW:89771-89777/89790-89796). **Achtung, alte Falle:** die frühere Fassung schrieb `openai_compatible` mit Unterstrich — dieser Wert steht in `AI_PROVIDERS` gar nicht (NEW:89871 ist `'openai-compatible'`), lief also schon in `resolveProvider` in denselben 500er und hätte die Zusicherung auch bei komplett kaputtem OpenAI-Compatible-Zweig grün gehalten.
i18n: keine
Doku: alle `AI_*`-Envs in `docs/` + `.env.default` (T14)
Abhängt von: T3, T4

### T9 — api/ai: AiService (Modell-Liste) + LiteLLM-Context-Window-Resolver  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai.service.ts`, `apps/api/src/ai/modelContextWindowResolver.ts`, `apps/api/src/ai/liteLlmModelContextWindowResolver.ts`
Soll: NEW:89528-89622 (`AiService`) — **fünf** Member, nicht nur die Modell-Liste: `assertModelAvailable(model)` (NEW:89534, delegiert an `resolveRequestedModel` aus T8), `listModels()` (NEW:89537, hängt `contextWindow` an jedes `getAiModels()`-Element), `getModelContextWindows()` (NEW:89541, Cache mit `AI_CONSTANTS.MODEL_CONTEXT_WINDOW_CACHE_TTL_MS` bzw. `…_NEGATIVE_CACHE_TTL_MS` bei leerem Ergebnis), `static mapUsage(totalUsage)` (NEW:89553) und — **im ursprünglichen Task fälschlich dem AiChatService zugeschlagen** — **`streamCompletion(messages, res, model, onComplete)` (NEW:89562-89611)**: `AbortController`, `res.on('close')`/`res.on('error')` → `abort()`; `streamText({model: getAiModel(model), instructions: getAiSystemPrompt() (NEW:90064), messages, abortSignal, onChunk/onEnd/onAbort/onError})`; Text-Puffer, damit Abbruch und Fehler das bis dahin Empfangene noch persistieren; genau **ein** `finalize` (Flag `finalized`); `toUIMessageStream({sendReasoning:true, messageMetadata: FINISH → mapUsage, onError: getAiStreamErrorCode})` + `pipeUIMessageStreamToResponse({response: res, stream})`; am Ende `await finalizedPromise`. Ein Fehler beim Persistieren wird **geloggt, nicht geworfen** (NEW:89578-89582) — sonst reißt er den schon laufenden Stream ab. Mitgebraucht: `getAiStreamErrorCode` (Modul 1344, NEW:89985-90040 — mappt `APICallError`/Statuscodes auf `AI_ERROR_MESSAGES`) und `getAiSystemPrompt` (Modul 1345, NEW:90041-90068). · Modul 1346 NEW:90069-90097 (`MODEL_CONTEXT_WINDOW_RESOLVER`-Token, Wert NEW:90093) · NEW:91164-91261 (`LiteLlmModelContextWindowResolver`, `resolve()` liest `AI_BASE_URL` + `AI_INFO_API_KEY` NEW:91215-91216, per `HttpModule`; fehlt eines von beiden → `{}`, kein Wurf).
Änderung: Service + Interface-Token + LiteLLM-Implementierung. DI-Provider `{provide: MODEL_CONTEXT_WINDOW_RESOLVER, useClass: LiteLlmModelContextWindowResolver}` (NEW:89252). Statische Logger.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=ai.service'` grün: `listModels()` liefert die Allowlist aus `getAiModels()` **mit** angehängtem `contextWindow`; ein zweiter Aufruf innerhalb der TTL trifft den Cache (Resolver genau **einmal** aufgerufen); der Resolver liefert bei HTTP-Fehler `{}` und wirft nicht; `streamCompletion` mit gemocktem `streamText` schreibt in die übergebene `res` und ruft `onComplete` **genau einmal**, auch wenn `onError` und `onEnd` beide feuern (Regression auf das `finalized`-Flag); ein `close`-Event auf `res` abortet den `AbortController`; wirft `onComplete`, wird der Fehler geloggt und **nicht** propagiert.
i18n: keine
Doku: keine
Abhängt von: T8

### T10 — api/ai: AiConversationService  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai-conversation.service.ts`
Soll: NEW:90222-90434 — **elf** Member, nicht vier. Lese-/Löschpfade: `listForUser` (90324), `findOneForUser(conversationId, username, {limit, before})` (90382 — **neueste Nachrichten paginiert**: wirft 404 `CONVERSATION_NOT_FOUND`, wenn die Konversation dem User nicht gehört, liest `limit + 1` und leitet daraus `hasMore` ab, dreht das Fenster mit `.reverse()` zurück in Chronologie), `deleteForUser` (90414), `deleteManyForUser(ids, username)` (90419). **Im ursprünglichen Task komplett fehlend, aber von `p7-ai:T11` vorausgesetzt:** `static assertValidConversationId` (90229), `writeSafely` (90234), `appendUserMessage` (90244), `getRegenerationTarget` (90270), `deleteMessageById` (90286), `getHistory(conversationId, username, {excludeMessageId})` (90290), `appendAssistantMessage` (90302). Mitgebrauchte Helfer: `toChatMessage` (Modul 1352, NEW:90629), `buildUsageByMessageId` (Modul 1353, NEW:90663), `CHAT_MESSAGES_DEFAULT_LIMIT = 50` (Modul 1309, NEW:88177) — **vor dem Bauen prüfen, ob der Fork die drei im Chat-Modul schon hat**, statt sie zu duplizieren (AGENTS.md: erst suchen, dann anlegen).
Änderung: 1:1. **Jede Query filtert auf `createdBy: username`** — das ist die einzige Mandantentrennung; nie weglassen.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=ai-conversation.service'` grün: `findOneForUser` auf eine fremde Konversation **wirft** `CustomHttpException(AI_ERROR_MESSAGES.CONVERSATION_NOT_FOUND, 404)` (NEW:90387-90389) — nicht „liefert nichts"; eine Spec, die auf `undefined` prüft, wäre bei korrekter Arbeit rot. Jede der elf Methoden setzt `createdBy: username` in ihren Filter: die Spec prüft die an das gemockte Model übergebenen Query-Objekte und fällt, sobald die Mandantentrennung in **einer** Methode fehlt (das ist die einzige Trennung, die es gibt). `deleteManyForUser` löscht bei zwei Usern in der Collection **nur** die eigenen; Paginierung mit `before` liefert die älteren Nachrichten, `hasMore === true`, solange mehr als `limit` existieren, und die zurückgegebene Liste ist aufsteigend nach `createdAt` sortiert.
i18n: keine
Doku: keine
Abhängt von: T5, T6

### T11 — api/ai: AiChatService (Streaming)  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai-chat.service.ts`
Soll: NEW:90128-90181 — `static assertContentXorRegenerate` (90135-90140) und `streamReply(request, username, res)` (90141-90170). **Korrektur der ursprünglichen Vorgabe:** dieser Service schreibt **nichts** selbst in die `express.Response`, ruft das AI-SDK **nicht** direkt und persistiert **nicht** direkt. Er ist reine Orchestrierung: (1) `assertContentXorRegenerate` — `content` und `regenerate` schließen sich gegenseitig aus, beides gesetzt **oder** beides leer ⇒ 400 `INVALID_STREAM_REQUEST`; (2) `aiService.assertModelAvailable(request.model)`; (3) bei `regenerate` `aiConversationService.getRegenerationTarget(...)`, sonst `appendUserMessage({content, userMessageId, modelId})`; (4) `getHistory(..., {excludeMessageId: previousAssistantMessageId})`; (5) `aiService.streamCompletion(history, res, request.model, onComplete)` — **dort** liegen SSE-Schreiben, `res.on('close')`-Abort und der System-Prompt (`getAiSystemPrompt`, NEW:90064), also in `p7-ai:T9`; (6) im `onComplete`-Callback `appendAssistantMessage({assistantMessageId, content, usage, modelId})` und, nur bei `regenerate`, anschließend `deleteMessageById(previousAssistantMessageId)`. Leerer `result.content` ⇒ **gar keine** Assistant-Nachricht (NEW:90159-90161).
Änderung: 1:1 als Orchestrierung. Keine eigene Response-Behandlung in dieser Datei — wer hier `res.write`/`pipe` schreibt, hat die Verantwortungsgrenze zu T9 verletzt. Bei Provider-Fehlern kein Stacktrace an den Client (`getAiStreamErrorCode` in T9 mappt auf `chat.errors.ai*`). Statische Logger mit `AiChatService.name`.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=ai-chat.service'` grün, `AiService` und `AiConversationService` gemockt: `content` **und** `regenerate` gesetzt ⇒ 400, beides leer ⇒ ebenfalls 400 (XOR, nicht OR); Normalfall ruft in der Reihenfolge `appendUserMessage → getHistory → streamCompletion`; `regenerate: true` ruft **kein** `appendUserMessage`, sondern `getRegenerationTarget`, übergibt dessen ID als `excludeMessageId` an `getHistory` und löscht die alte Assistant-Nachricht **erst nach** erfolgreichem `appendAssistantMessage`; ein `onComplete` mit leerem `content` persistiert **nichts** und löscht **nichts**.
i18n: keine
Doku: keine
Abhängt von: T9, T10

### T12 — api/ai: Controller + Module + Wiring  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai.controller.ts`, `apps/api/src/ai/ai.module.ts`, `apps/api/src/app/app.module.ts`
Soll: NEW:89319-89339 (die sechs Methoden; 89310 Klassenkopf, 89314-89318 Konstruktor, 89340 schließt die Klasse) + NEW:89341-89418 (Route-Dekoratoren, sechs `tslib_1.__decorate`-Blöcke) + NEW:89419-89426 (Klassen-Dekoratoren) + NEW:89238-89256 (Module: `MongooseModule.forFeature` für beide Schemas + `HttpModule`, Provider inkl. `{provide: MODEL_CONTEXT_WINDOW_RESOLVER, useClass: LiteLlmModelContextWindowResolver}` NEW:89252, `exports: [AiService]`).
Änderung: 6 Routen: `GET models`, `GET conversations`, `GET conversations/:id`, `DELETE conversations` (204), `DELETE conversations/:id` (204), `POST stream` (200). Throttle je Route: Reads mit `DEFAULT_READ_THROTTLE_*`, Writes mit `DEFAULT_WRITE_THROTTLE_*`, `stream` mit `AI_STREAM_THROTTLE_LIMIT=5 / 10_000ms`; jeweils `@UseGuards(ThrottleGuard)` — **alle sechs** Routen tragen den Guard. Die vier `DEFAULT_*`-Konstanten legt `p7-ai:T4` an (NEW:88238-88245); im Fork gab es sie vorher nicht. `@UsePipes(strictTransformValidationPipe)` steht im Soll auf **genau drei** Routen: `GET conversations/:id` (NEW:89368), `DELETE conversations` (NEW:89382), `POST stream` (NEW:89411) — **nicht** auf `GET models`, `GET conversations`, `DELETE conversations/:id`.
**Guards (nicht verhandelbar):** `@RequireInAppPermission(APPS.CHAT, ExtendedOptionKeys.IN_APP_PERMISSION_AI_CHAT)` auf der Klasse (NEW:89423) — Default **DENY**. `InAppPermissionGuard` global oder per `@UseGuards` registrieren. **Korrektur der ursprünglichen Vorgabe:** die frühere Fassung verlangte „zusätzlich `@ApiAuth()`, sonst fehlt die Authentifizierung". Beide Hälften stimmen nicht — im Fork existiert **kein** `ApiAuth`-Decorator (bewusst verworfen, `tasks/backlog.md` T8 / `ed3cb4400`; Fork-Konvention ist `@ApiBearerAuth()`), und in 2.1.0 ist `ApiAuth` reine Swagger-Deko (`applyDecorators(ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse)`) **ohne** Laufzeitwirkung. Authentifiziert wird global über `AuthGuard` + `AccessGuard` als `APP_GUARD` (`apps/api/src/app/app.module.ts:160-167`). Die sicherheitsrelevante Vorgabe lautet deshalb schlicht: **kein `@Public()`** auf Klasse oder Route — dann greift der globale Guard, und `InAppPermissionGuard` läuft auf einem echten `request.user` statt in seinen 401-Zweig.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=ai.controller'` grün — Spec über `apps/api/src/common/controllerContractReflection` (existiert, Muster: `linbo`-/`license`-Specs): (a) für alle 6 Handler `controllerContractReflection.isRoutePublic(AiController, m) === false`; (b) `Reflect.getMetadata(IN_APP_PERMISSION_KEY, AiController)` ist exakt `{ appName: APPS.CHAT, optionKey: ExtendedOptionKeys.IN_APP_PERMISSION_AI_CHAT }` — fällt, sobald jemand den Klassen-Decorator entfernt oder auf eine andere App zeigt; (c) `getRouteGuards` enthält `ThrottleGuard` auf allen 6; (d) `Reflect.getMetadata(PIPES_METADATA, handler)` ist **genau** auf `getConversation`, `deleteConversations`, `stream` gesetzt. **Kein `curl` gegen einen Stack** — ohne laufenden Stack liefert `curl` `000`, und eine Zusicherung darauf wäre grün, ohne irgendetwas geprüft zu haben.
i18n: keine
Doku: swagger regenerieren
Abhängt von: T2, T7, T11

### T13 — api/ai: Spec-Coverage + Guard-Regressionstest  [ ] (gesperrt bis T1)
Komponente: apps/api · Dateien: `apps/api/src/ai/ai.controller.spec.ts`, `apps/api/src/auth/inAppPermission.guard.spec.ts` (Regressionstest, Datei aus T2)
Soll: Repo-Policy `check-spec-coverage` (`scripts/checkSpecCoverage.ts`, läuft über den Dateibaum — kein Staging nötig); zusätzlich ein expliziter Regressionstest für den DENY-Default.
Änderung: **Korrektur der ursprünglichen Vorgabe:** die frühere Formulierung `isInAppPermissionGranted(undefined, [], KEY, DENY) === false` prüft nur den Helfer mit einem Argument, das der Test **selbst** setzt — sie bliebe grün, wenn `InAppPermissionGuard` künftig `InAppPermissionWhenUnset.ALLOW` übergibt, also genau im Regressionsfall. Der Test muss den **Guard** fahren: `isInAppPermissionGranted` spionieren und zusichern, dass `canActivate` ihn mit `InAppPermissionWhenUnset.DENY` als viertem Argument aufruft (NEW:79598), **plus** verhaltensseitig: Nicht-Admin, `appConfig.extendedOptions` **ohne** `IN_APP_PERMISSION_AI_CHAT` ⇒ `canActivate` wirft 403.
Verify: `iter.sh cmd 'npm run check-spec-coverage'` grün; `iter.sh cmd 'npx nx run api:test -- --testPathPattern=inAppPermission.guard'` grün (Guard-Spec aus T2 + diese Regression); `iter.sh cmd 'npx nx run api:test -- --testPathPattern=ai.controller'` grün; `iter.sh cmd 'npm run check-spec-types'` grün — Spec-Dateien werden von `tsc -p apps/api/tsconfig.app.json` **nicht** erfasst, „tsc clean" sagt über eine Spec nichts.
i18n: keine
Doku: keine
Abhängt von: T12

### T14 — Env, Installer-Contract, i18n, Doku  [ ] (gesperrt bis T1)
Komponente: apps/api, installer, apps/frontend, docs · Dateien: `apps/api/.env.default`, `edulution-installer/apps/public-page/public/download/edulution-default.yml.template` (+ `-le`-Variante), `apps/frontend/src/locales/{de,en,fr}/translation.json`, `docs/features/p7-ai.md`
Soll: Envs aus T8/T9/T11: `AI_PROVIDER`, `AI_MODEL`, `AI_MODELS`, `AI_BASE_URL`, `AI_API_KEY`, `AI_INFO_API_KEY`, `AI_OLLAMA_BASE_URL`, `AI_REASONING_TAGS`, `AI_SYSTEM_PROMPT`.
Änderung: Contract-Sync-Regel: **neue Env ⇒ Installer schreibt sie ⇒ `.env.default`**. `AI_API_KEY`/`AI_INFO_API_KEY` sind Secrets — nur als leerer Platzhalter, nie mit Wert, nie ins Repo, nie in ein Log. **Korrektur des i18n-Namensraums: nicht `ai.*`.** Die user-sichtbaren Keys stehen im Soll fest: `AI_ERROR_MESSAGES` (NEW:89935-89945) zeigt auf `chat.errors.{aiModelNotConfigured,aiModelNotAllowed,aiProviderNotConfigured,aiRateLimited,aiContextTooLarge,aiConversationPersistFailed,aiInvalidConversationId,aiInvalidStreamRequest,aiConversationNotFound}`, `AI_CONSTANTS` (NEW:89652-89667) auf `chat.aiError`, `chat.aiSessionExpired`, `chat.aiAccessDenied`. Der `chat.errors`-Namensraum existiert im Fork bereits — **additiv erweitern**, keinen zweiten aufmachen (sonst zeigt jede Fehlermeldung des Backends ins Leere). Reine UI-Keys aus T15 hängen unter `chat.ai*`. Alle in **DE+EN+FR**. Doku: Datenfluss, Aufbewahrung, wie ein Admin die Berechtigung freischaltet.
Verify: `iter.sh i18n` (= `npm run check-translations`) grün; Key-Existenz statt Parität allein: `iter.sh cmd 'for k in aiModelNotConfigured aiModelNotAllowed aiProviderNotConfigured aiRateLimited aiContextTooLarge aiConversationPersistFailed aiInvalidConversationId aiInvalidStreamRequest aiConversationNotFound; do for l in de en fr; do grep -q "\"$k\"" apps/frontend/src/locales/$l/translation.json || exit 1; done; done'` exit 0. Env-Vollständigkeit: `iter.sh cmd 'for v in AI_PROVIDER AI_MODEL AI_MODELS AI_BASE_URL AI_API_KEY AI_INFO_API_KEY AI_OLLAMA_BASE_URL AI_REASONING_TAGS AI_SYSTEM_PROMPT; do grep -q "^$v=" apps/api/.env.default || exit 1; done'` exit 0 — das alte `grep -c 'AI_' … > 0` wäre schon mit **einer** der neun Envs grün gewesen (heute liefert es 0, es ist also nicht vorab erfüllt, aber als Gate wertlos). Installer-Templates **lokal** prüfen, das Schwester-Repo liegt nicht auf der Box: `for f in edulution-default.yml.template edulution-default-le.yml.template; do grep -q 'AI_PROVIDER' ../edulution-installer/apps/public-page/public/download/$f || exit 1; done` exit 0 — das alte `git … diff --stat` hat nur ausgegeben und konnte nie fehlschlagen.
i18n: `chat.errors.ai*` (9 Keys) + `chat.aiError`/`chat.aiSessionExpired`/`chat.aiAccessDenied`, je DE+EN+FR
Doku: `docs/features/p7-ai.md`
Abhängt von: T12

### T15 — Frontend: AI-Chat-UI (FORK-ORIGINAL)  [?] (gesperrt bis T1)
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/Chat/**` (AI-Tab) bzw. eigene Seite
Soll: **Nicht rekonstruierbar** — minifiziert. 2.1.0 nutzt FE-seitig `streamdown` fürs Markdown-Streaming (NEW:79274). Verbindlich ist nur der Contract aus T6/T12.
Änderung: Store mit `eduApi`; **Achtung:** `POST ai/stream` liefert einen SSE-formatierten Body auf einer **POST**-Antwort (`pipeUIMessageStreamToResponse`, NEW:89609). **`EventSource` scheidet damit aus** — das kann nur GET, ohne Body und ohne Header; das `useSseStore`-Muster des Forks ist hier also **nicht** übertragbar. Gangbar sind: axios mit `onDownloadProgress` + inkrementellem Parsen des wachsenden `responseText`, oder die Client-Seite des Vercel-AI-SDK. Der Weg ist eine Fork-Entscheidung und gehört ins Doku-Kapitel. Konversations-Sidebar, Modell-Auswahl aus `GET models`, Löschen einzeln/mehrfach. Sichtbarkeit an `canUseAiChat` aus `getInAppPermissions` koppeln (**NEW:2333-2334**; 2336 ist nur die `exports`-Zeile) — die UI darf für Nicht-Berechtigte **gar nicht erscheinen**.
Verify: `iter.sh test:frontend` **und** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean.
i18n: Keys aus T14
Doku: als Fork-Original kennzeichnen
Abhängt von: T12, T14

---

## p7-lmn-exam-jobs [P7] — Exam-Mode als asynchroner Job (BullMQ + SSE)

> **Adressierung:** Die Task-Nummern starten in **jedem** Sub-Paket dieser Datei bei `T1` neu — „T4"/„T7" sind
> dateiweit mehrdeutig. Tasks in diesem Abschnitt heißen deshalb **`p7-lmn-exam-jobs:T<n>`**; Verweise aus
> anderen Ledgern bitte ausschließlich in dieser Form schreiben. Innerhalb dieses Abschnitts bleibt die kurze
> Form `T<n>` (nicht umnummerieren — das bräche jede bestehende Referenz).

_Ziel:_ `PUT exam-mode/:state` wird von synchron auf **202 + Job** umgestellt, mit Fortschritt per SSE
und Status-Polling. · _Abhängt-von:_ — · _Status:_ offen · _Tasks:_ 12
Soll: main.js:15756-15786 (Konstanten) · **18176-18192** (Controller-Methoden `startExamMode` + `getExamModeJob`;
18177 ist bereits `const validActions`, 18193 schon `addManagementGroup`) · 18352-18377 (2 Route-Dekoratoren)
· **18929-19108** (ExamModeService — `EXAM_MODE_WORKER_CONCURRENCY = 3` steht auf **18929**, also außerhalb des
früher zitierten `18930-…`) · **19174-19247** (ExamModeJob-Schema; TTL-Prop **19232-19240**, Collection 19242,
`toJSON` 19245-19247 — das frühere `19230-19238` begann noch im `groupType`-Dekorator)
· 14863-14881 (`toggleExamModeBatch`) · 17073-17092 (`enqueue` mit `options`) · 2223
(`SSE_MESSAGE_TYPE.EXAM_MODE_PROGRESS='exam_mode_progress'`) · 11294 (`QUEUE_CONSTANTS.EXAM_MODE_QUEUE`)

**Go/No-Go: GO.** Löst ein reales Problem: der Fork bedient heute `PUT lmn-api/exam-mode/:state`
(`lmnApi.controller.ts:80-90`) **synchron** und schickt **alle** Schüler einer Klasse in **einem** Upstream-Request
(`lmnApi.service.ts:123` bzw. `:144` → `POST exammode/{start,stop}`) — bei 30 Accounts läuft das gegen das
15s-Axios-Timeout (`lmn-api-request.queue.ts:41`). 2.1.0 chunked in 10er-Batches
(`EXAM_MODE_BATCH_SIZE`) mit 60s Einzel-Timeout und meldet Teilerfolge. Keine externe
Voraussetzung außer dem echten LMN — den es fürs Verify sowieso braucht.

**Fork-Bestand:** `PUT exam-mode/:state` (`lmnApi.controller.ts:80-89`) ruft synchron
`startExamMode`/`stopExamMode` (`lmnApi.service.ts:123/144`). BullMQ + Redis + `LmnApiRequestQueue`
sind da. `SseService.sendEventToUser` ist da (`sse.service.ts:147`). `splitArrayIntoChunks` ist da
(`libs/src/common/utils/splitArrayIntoChunks.ts`). **Fehlt:** `EXAM_MODE_QUEUE`, das Job-Schema,
`ExamModeService`, `toggleExamModeBatch`, die `enqueue`-Optionen, der SSE-Typ.

**Was bricht:** Der Antwort-Contract (200-Ergebnis → 202-Job) für `useLessonStore.ts:150-158` und `:170-180`
(`${EXAM_MODE}/start` auf 151, `/stop` auf 171).
**Korrektur der früheren Fassung:** „Route + Store müssen im selben Commit landen" stimmt **nicht** — nachgeprüft:
der Store schreibt ein blankes `await eduApi.put<LmnApiSession>(…)` **ohne** `const { data } =` und ohne jeden
Konsumenten des Rückgabewerts, verwirft die Antwort also. Ein 202 mit Job-Body bricht ihn nicht; er zeigt bis T10
nur keinen Fortschritt mehr an. T7 und T10 dürfen deshalb getrennte Commits sein.
**Was dagegen wirklich brechen kann:** `PUT exam-mode/:state` bekommt in 2.1.0 `@UsePipes(strictTransformValidationPipe)`
mit `forbidNonWhitelisted: true`. Der heutige Store sendet `{users}` (start) bzw. `{users, groupName, groupType}` (stop)
plus den `X-Api-Key`-Header — `ExamModeBodyDto` (T7) muss **exakt** diese Feldnamen tragen, sonst antwortet die Route
dem unveränderten Store mit 400. (Der frühere Verweis auf `riskNotes` lief ins Leere: eine solche Sektion gibt es in
dieser Datei nicht.)

**FE rekonstruierbar?** **Nein.** Fortschrittsanzeige und Teilerfolg-Darstellung sind Fork-Original;
der Store-Umbau (T10) ist aber durch den API-Contract eng geführt.

### T1 — libs/lmnApi: examModeConstants  [ ]
Komponente: libs · Dateien: `libs/src/lmnApi/constants/examModeConstants.ts`
Soll: NEW:15756-15786 — `EXAM_MODE_BATCH_SIZE=10`, `EXAM_MODE_REQUEST_ATTEMPTS=1`, `EXAM_MODE_REQUEST_TIMEOUT_MS=60000`, `EXAM_MODE_REQUEST_BACKOFF_MS=1000`, `EXAM_MODE_JOB_TTL_MS=24*60*60*1000`, `EXAM_MODE_JOB_POLL_INTERVAL_MS=5000`, `EXAM_MODE_ACTION={START:'start',STOP:'stop'}`, `EXAM_MODE_USER_STATE={PENDING,SUCCESS,FAILED}` (lowercase-Werte), `EXAM_MODE_JOB_STATE={PENDING,RUNNING,COMPLETED,PARTIAL,FAILED}` (lowercase).
Änderung: Eine Datei mit named exports (wie im Soll — es sind 9 Konstanten, kein sinnvoller Default). SPDX.
Verify: `iter.sh cmd 'NODE_OPTIONS=--max-old-space-size=6144 npx nx run-many -t lint --skip-nx-cache --fix=false --parallel=1'` — **nicht** `iter.sh lint`: das ist `npm run lint`, und `apps/api/project.json:12` + `apps/frontend/project.json:12` setzen `"fix": true`, der Lauf repariert autofixbare Regeln still und ist als Gate wertlos. Dazu `iter.sh cmd 'npx tsx -e "import {EXAM_MODE_JOB_STATE as S, EXAM_MODE_USER_STATE as U, EXAM_MODE_BATCH_SIZE as B, EXAM_MODE_REQUEST_TIMEOUT_MS as TO, EXAM_MODE_JOB_TTL_MS as TTL} from \"./libs/src/lmnApi/constants/examModeConstants\"; if(Object.keys(S).length!==5||Object.keys(U).length!==3||B!==10||TO!==60000||TTL!==86400000||S.PARTIAL!==\"partial\"||U.SUCCESS!==\"success\") process.exit(1)"'` exit 0 (die alte Fassung prüfte nur `JOB_STATE`+`BATCH_SIZE`; ein falscher Timeout oder ein fehlendes `USER_STATE` wäre grün durchgelaufen).
i18n: keine
Doku: keine
Abhängt von: —

### T2 — libs: SSE-Typ + Queue-Konstante + Fehler-Keys  [ ]
Komponente: libs · Dateien: `libs/src/common/constants/sseMessageType.ts`, `libs/src/queue/constants/queueConstants.ts`, `libs/src/lmnApi/types/lmnApiErrorMessage.ts`
Soll: NEW:2223 (`EXAM_MODE_PROGRESS:'exam_mode_progress'`) · NEW:11294 (`EXAM_MODE_QUEUE:'EXAM_MODE_QUEUE'`) · Fehler-Keys **im Original als Enum-Member NEW:15578-15580**: `ExamModeJobFailed = 'lmnApi.errors.ExamModeJobFailed'`, `ExamModeJobNotFound = 'lmnApi.errors.ExamModeJobNotFound'`, `ExamModeInvalidAction = 'lmnApi.errors.ExamModeInvalidAction'` (Werte exakt so übernehmen). Wurfstellen dazu — **Anker korrigiert**: `ExamModeInvalidAction` NEW:**18179** (400, war 18180 = schließende Klammer), `ExamModeJobNotFound` NEW:**18978** (404, war 18980 = `return mapToStatus`), `ExamModeJobFailed` NEW:18990 (404, korrekt).
Änderung: Drei bestehende Objekte **additiv** erweitern. `lmnApiErrorMessage.ts` ist im Fork ein `enum` (Altbestand) — dort im bestehenden Stil ergänzen (AGENTS.md-Ausnahme für bestehende Error-Enums).
Verify: `iter.sh cmd 'npx tsx -e "import Q from \"./libs/src/queue/constants/queueConstants\"; import S from \"./libs/src/common/constants/sseMessageType\"; if(Q.EXAM_MODE_QUEUE!==\"EXAM_MODE_QUEUE\"||S.EXAM_MODE_PROGRESS!==\"exam_mode_progress\") process.exit(1)"'` exit 0 — deckt **beide** neuen Konstanten ab; die alte Fassung prüfte nur die Queue und wäre grün geblieben, wenn der SSE-Typ fehlt. Dazu `iter.sh cmd 'npm run check-error-message-translations'` grün (schlägt fehl, solange die 3 Enum-Werte nicht in DE+EN+FR stehen) und `iter.sh cmd 'NODE_OPTIONS=--max-old-space-size=6144 npx nx run-many -t lint --skip-nx-cache --fix=false --parallel=1'` (nicht `iter.sh lint`, s. T1).
i18n: **Die 3 `lmnApi.errors.*`-Keys müssen in DIESEM Commit in DE+EN+FR landen — nicht erst in T11.** Nachgeprüft: `.husky/pre-commit` ruft `npm run check-error-message-translations`; `scripts/checkErrorMessages.ts` liest die Import-Liste von `libs/src/error/errorMessage.ts`, und `LmnApiErrorMessage` ist dort importiert. Sobald die Enum-Member ohne Übersetzung existieren, bricht **jeder** Commit mit „Missing key in JSON" — die frühere Aufteilung (Keys hier, i18n in T11) hätte T2 bis T10 unkommittierbar gemacht.
Doku: keine
Abhängt von: —

### T3 — api/lmnApi: ExamModeJob-Schema mit TTL-Index  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/examMode/exam-mode-job.schema.ts`
Soll: NEW:**19174-19247** (Klassen-Rumpf 19174-19184, Prop-Dekoratoren 19186-19240, `@Schema` 19241-19243, `SchemaFactory` 19244, `toJSON` 19245-19247). Felder: `jobId` (String, required, **unique+index**), `initiator` (required+index), `action` (enum `EXAM_MODE_ACTION`), `state` (enum `EXAM_MODE_JOB_STATE`, default PENDING), `total` (Number required), `users` (Array aus `{username req, status enum EXAM_MODE_USER_STATE, reason?}`, default `[]`), `groupName?`, `groupType?`, `expiresAt` (Date, required, **`index:{expireAfterSeconds:0}`**, default `() => new Date(Date.now()+EXAM_MODE_JOB_TTL_MS)`). `@Schema({timestamps:true, strict:true, collection:'exammodejobs'})`, `toJSON: {virtuals:true}`.
Änderung: 1:1. Neue Collection ⇒ keine Migration nötig; `schemaVersion` führt das Soll hier **nicht** — bewusst so lassen (der TTL räumt selbst auf). SPDX.
Verify: `iter.sh test:api`: SchemaFactory kompiliert; `jobId` ist unique; `expiresAt` trägt `expireAfterSeconds: 0`; `state` lehnt `'bogus'` ab; Default-`expiresAt` liegt ~24h in der Zukunft.
i18n: keine
Doku: keine
Abhängt von: T1

### T4 — api/lmnApi: enqueue mit per-Request-Optionen (Signatur-Änderung)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/queue/lmn-api-request.queue.ts`, `apps/api/src/lmnApi/lmnApi.service.ts`
Soll: NEW:17073-17092 — `enqueue(method, endpoint, payload, config, options?)` mit `options={attempts?, timeoutMs?, backoffMs?}`; `timeoutMs` überschreibt `config.timeout`; `attempts ?? this.defaultAttempts`; `backoff.delay = options?.backoffMs ?? this.retryDelayMs`. Passthrough in `LmnApiService.request` (NEW:14770).
Änderung: Fünften optionalen Parameter ergänzen. Fork-Anker (verifiziert): `enqueue<T>(` steht auf `lmn-api-request.queue.ts:172`, das hartkodierte `attempts: 3` auf `:184`, `backoff: { type: 'exponential', delay: this.retryDelayMs }` auf `:185`, `retryDelayMs = 1000` auf `:43`, `timeoutMs = +(process.env.LMN_API_TIMEOUT_MS ?? 15000)` auf `:41`. **Der Default muss exakt das heutige Verhalten sein** (`attempts: 3`, `delay: this.retryDelayMs`) — die Queue bedient **alle** LMN-Aufrufe. `defaultAttempts = 3` als benannte Klassenkonstante einführen (keine magic number).
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
Soll: NEW:18929-19108 — **alle Methoden-Anker neu nachgezählt.** `onModuleInit` (18941-18949) legt `Queue`+`Worker` auf `QUEUE_CONSTANTS.EXAM_MODE_QUEUE` an (`setMaxListeners(0)`, `concurrency: EXAM_MODE_WORKER_CONCURRENCY`); `onModuleDestroy` (18950-18953) schließt beide. `createJob` (**18954-18974**: `randomUUID`, alle User auf PENDING, Dokument anlegen, Job mit `{removeOnComplete:true, removeOnFail:true, attempts:1}` einreihen, `mapToStatus` zurück). `getJob(jobId, initiator)` (**18975-18981**) — **wirft 404, wenn `!doc` ODER `doc.initiator !== initiator`** (Mandantentrennung, nie weglassen). `processJob` (**18982-19051**: Status auf RUNNING, Fortschritt senden, in `EXAM_MODE_BATCH_SIZE`-Batches `toggleExamModeBatch`, Batch-Erfolg → alle User SUCCESS, Batch-Fehler → FAILED mit `reason` (19012-19022), nach **jedem** Batch `findOneAndUpdate({users})` + `emitProgress` (19024-19029), Endzustand COMPLETED/PARTIAL/FAILED (19031-19045); der äußere `catch` ruft nur `await this.failJob(job, error)`).
**`failJob(job, error)` (19052-19083) — in der früheren Fassung komplett unterschlagen, unbedingt mitbauen:** loggt den Grund, setzt das Dokument per `findOneAndUpdate` auf FAILED und emittiert; wirft *dieses* Update selbst (Mongo weg), wird der Fehler geschluckt (19065-19068) und stattdessen ein **Fallback-Status** ohne DB gebaut (19069-19081: alle User `failed` mit `reason`, `groupName`/`groupType` nur wenn gesetzt) und emittiert — der Client bleibt also auch bei DB-Ausfall nicht hängen. `emitProgress` (**19084-19086**: `sseService.sendEventToUser(initiator, JSON.stringify(status), SSE_MESSAGE_TYPE.EXAM_MODE_PROGRESS)`). `static mapToStatus` (**19087-19101**; 19091-19108 traf die Objekt-Mitte bzw. schon den `__decorate`-Block).
Änderung: 1:1. `EXAM_MODE_WORKER_CONCURRENCY = 3` als benannte Modul-Konstante — der Wert steht auf **NEW:18929** und lag damit außerhalb des früher hier zitierten Bereichs, „aus dem Soll ablesen" war also nicht ausführbar. Statische Logger mit `ExamModeService.name`. **`lmnApiToken` landet in den BullMQ-Job-Daten → in Redis. Nie loggen.** SPDX.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=examMode.service.spec'` mit gemocktem Model/Service/SSE: `createJob` legt genau ein Dokument mit `total===users.length` an **und** ruft `queue.add` mit `{removeOnComplete:true, removeOnFail:true, attempts:1}`; `getJob` wirft 404 sowohl bei fremdem `initiator` als auch bei `!doc`; 25 User → **3** `toggleExamModeBatch`-Aufrufe der Größen 10/10/5; schlägt der **erste** Batch fehl ⇒ Endzustand `partial`, genau 10 User `failed`, jeder mit gesetztem `reason` (die frühere Formulierung „ein fehlgeschlagener Batch von dreien ⇒ genau 10 failed" war bei einem Fehler im *dritten* Batch schlicht falsch — 5 — und wäre bei korrekter Implementierung rot geworden); `emitProgress` geht **nur** an den Initiator; **`failJob`**: wirft `findOneAndUpdate` dort, kommt trotzdem genau ein Fallback-Status mit **allen** Usern auf `failed` beim Initiator an.
i18n: keine
Doku: keine
Abhängt von: T2, T3, T5, T9 (T9 liefert die `mapToStatus`-Rückgabeform — ohne die Kante definiert T6 sie ein zweites Mal)

### T7 — api/lmnApi: Controller-Routen + DTO + Modul-Wiring  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnApi.controller.ts`, `apps/api/src/lmnApi/dto/exam-mode-body.dto.ts`, `apps/api/src/lmnApi/lmnApi.module.ts`
Soll: NEW:18176-18192 (Methoden) + 18352-18377 (Dekoratoren). `PUT exam-mode/:state`: `@HttpCode(HttpStatus.ACCEPTED)` (**202**), `@UsePipes(strictTransformValidationPipe)`, prüft `params.state` gegen `Object.values(EXAM_MODE_ACTION)` → sonst 400 `ExamModeInvalidAction`, ruft `examModeService.createJob({action, users, lmnApiToken, initiator: username, groupName, groupType})`. `GET exam-mode/jobs/:jobId` → `examModeService.getJob(jobId, username)`.
Änderung: Beide Routen; `ExamModeBodyDto` (`users: string[]`, `groupName?`, `groupType?`) — **Feldnamen exakt so**, der heutige Store schickt genau diese (`useLessonStore.ts:170-180`), und `forbidNonWhitelisted` quittiert jede Abweichung mit 400. `ExamModeService` + `MongooseModule.forFeature([ExamModeJob])` + `SseModule` im `LmnApiModule` registrieren. **Bestehende Guards des Controllers unverändert lassen** — konkret `@ApiTags(ROOT)` + `@ApiBearerAuth()` + `@Controller(ROOT)` (`lmnApi.controller.ts:56-58`); der Controller hat **kein** `@RequireAppAccess` und **kein** `@Public()`, geschützt wird er vom globalen `AuthGuard`. **Die alten `startExamMode`/`stopExamMode` in `lmnApi.service.ts` (123 bzw. 144) jetzt entfernen** (nur noch `toggleExamModeBatch`); die dadurch unbenutzten Enum-Member `StartExamModeFailed`/`StopExamModeFailed` **stehen lassen** — sie zu löschen wäre ein Drive-by, und ihre Locale-Keys bleiben gültig.
**Fork-Stand korrigiert (nachgeprüft, nicht angenommen):** `strictTransformValidationPipe` **existiert bereits** — `apps/api/src/common/pipes/strictTransformValidationPipe.ts`, inhaltlich byte-gleich zu NEW:18878-18883 (`whitelist`, `forbidNonWhitelisted`, `disableErrorMessages`, `transform`), mit SPDX-Header. Also **nur importieren — nicht anlegen, nicht überschreiben.** Der frühere Satz „kommt aus `p7-ai` T7 … die Pipe hier anlegen" ist überholt und hätte eine Fundament-Datei überschrieben.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=lmnApi.controller.spec'` (angepasste `lmnApi.controller.spec.ts`: `state:'bogus'` → 400 mit `LmnApiErrorMessage.ExamModeInvalidAction`; `state:'start'` ruft `createJob` mit `action:'start'` **und** `initiator === username`; `Reflect.getMetadata(HTTP_CODE_METADATA, LmnApiController.prototype.startExamMode) === HttpStatus.ACCEPTED` (Konstante aus `@nestjs/common/constants`); `controllerContractReflection.isRoutePublic(LmnApiController, 'startExamMode')` **und** `…'getExamModeJob'` sind `false` — der Helfer existiert unter `apps/api/src/common/controllerContractReflection.ts` und wird von den `linbo`/`license`-Specs schon so benutzt) + `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` clean.
**Der frühere curl-Verify ist gestrichen — er konnte nicht fehlschlagen und prüfte den falschen Pfad:** `/edu-api/lmnapi/…` gibt es nicht, der Controller hängt an `LMN_API_EDU_API_ENDPOINT = 'lmn-api'` (`libs/src/lmnApi/constants/lmnApiEduApiEndpoints.ts:20`), und ohne laufenden Stack liefert `curl -s -o /dev/null -w '%{http_code}'` `000` statt `401`.
i18n: keine
Doku: **`swagger-spec.json` NICHT mitcommitten und kein `npm run generate:swagger` aufrufen** — das Skript existiert im Repo nicht (nachgeprüft), die Datei steht in `.gitignore:377` und wird ausschließlich beim API-Start unter `NODE_ENV=development` geschrieben (`apps/api/src/main.ts:79` + `:91`). Stattdessen: `@ApiOperation`/`@ApiParam`/`@ApiBody`/`@ApiResponse` beider Routen 1:1 aus NEW:18355-18358 bzw. 18369-18371 mitportieren, damit `/docs` beim nächsten Dev-Start stimmt.
Abhängt von: T6, T9

### T8 — api/lmnApi: Spec-Coverage + Guard-Contract  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnApi.controller.spec.ts`
Soll: Repo-Policy `check-spec-coverage`.
Änderung: Specs für beide neuen Routen ergänzen (Auth-Metadaten, Pfade, `@HttpCode(202)`). Die alten `startExamMode`/`stopExamMode`-Tests (`lmnApi.service.spec.ts:185` und `:271`, beide Anker verifiziert) entsprechend umschreiben — nicht einfach löschen.
Verify: **`npm run check-spec-coverage` ist hier KEIN Gate und wurde entfernt** — `scripts/checkSpecCoverage.ts` prüft nur, ob zu jedem `*.controller.ts` eine gleichnamige `*.controller.spec.ts` **existiert**; `apps/api/src/lmnApi/lmnApi.controller.spec.ts` existiert längst, der Befehl ist heute grün und kann durch nichts in dieser Task rot werden. Stattdessen:
· `iter.sh cmd 'grep -q "exam-mode/jobs" apps/api/src/lmnApi/lmnApi.controller.spec.ts && grep -q "getExamModeJob" apps/api/src/lmnApi/lmnApi.controller.spec.ts'` — heute nachweislich rot: beide Begriffe kommen **0×** vor. (Die Spec nennt zwar `ExamMode` an 7 Stellen — die frühere Formulierung „kein einziges `exam`-Vorkommen" war falsch —, aber weder die Job-Route noch den Job-Getter.)
· `iter.sh cmd 'npx nx run api:test -- --testPathPattern=lmnApi.controller.spec'` grün.
· `iter.sh cmd 'npx nx run api:test -- --testPathPattern=lmnApi.service.spec'` grün.
· `iter.sh cmd 'npm run check-spec-types'` grün — Spec-Dateien werden **nur** hiervon getypt, `apps/api/tsconfig.app.json` schließt `src/**/*.spec.ts` explizit aus.
i18n: keine
Doku: keine
Abhängt von: T7

### T9 — libs: Shared Types für Job-Status (BE↔FE)  [ ]
Komponente: libs · Dateien: `libs/src/lmnApi/types/examModeJobStatus.ts`
Soll: Rückgabeform von `static mapToStatus` (NEW:**19087-19101** — nachgezählt; 19091-19108 traf die Mitte des Objekt-Literals bzw. schon den `__decorate`-Block); `reason`, `groupName` und `groupType` werden per Spread **weggelassen**, wenn `undefined` (NEW:19096/19098/19099), im Interface also `?:` und **nicht** `| undefined`. Dieselbe Form baut `failJob` als Fallback (NEW:19069-19081): `{jobId, action, state, total, users: [{username, status, reason?}], groupName?, groupType?}`.
Änderung: Interface + abgeleitete Typen **aus T1** (`(typeof EXAM_MODE_JOB_STATE)[keyof typeof EXAM_MODE_JOB_STATE]` bzw. `…EXAM_MODE_USER_STATE…` — keine handgeschriebenen String-Unions). Wird von **T6** (`mapToStatus`-Rückgabe), T7 (Controller-Response) und T10 (Store) geteilt — **deshalb vor T6 bauen**, sonst erfindet T6 die Form ein zweites Mal. SPDX.
Verify: `iter.sh cmd 'test -f libs/src/lmnApi/types/examModeJobStatus.ts && grep -q "typeof EXAM_MODE_JOB_STATE" libs/src/lmnApi/types/examModeJobStatus.ts && grep -q "typeof EXAM_MODE_USER_STATE" libs/src/lmnApi/types/examModeJobStatus.ts'`; `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` clean — **das greift wirklich**, weil `apps/api/tsconfig.app.json` `"include": ["./**/*", "../../libs/src/**/*"]` setzt, die neue Datei also getypt wird, obwohl sie noch kein Konsument importiert (nicht als vakuum wegstreichen); `iter.sh cmd 'NODE_OPTIONS=--max-old-space-size=6144 npx nx run-many -t lint --skip-nx-cache --fix=false --parallel=1'` statt `iter.sh lint` (fix:true, s. T1).
i18n: keine
Doku: keine
Abhängt von: T1

### T10 — Frontend: useLessonStore auf Job + SSE umstellen (FORK-ORIGINAL)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/ClassManagement/LessonPage/useLessonStore.ts`, zugehörige Komponenten
Soll: **Nicht rekonstruierbar** (minifiziert). Verbindlich: der Contract aus T7/T9. Heutiger Stand: `useLessonStore.ts:151/171` erwartet ein synchrones Ergebnis von `${EXAM_MODE}/start` bzw. `/stop`.
Änderung: Store ruft `PUT ${EXAM_MODE}/{start|stop}` über `eduApi` — **Präfix ist `lmn-api`, nicht `lmnapi`**; die Konstante `LMN_API_EDU_API_ENDPOINTS.EXAM_MODE` (`libs/src/lmnApi/constants/lmnApiEduApiEndpoints.ts:33`) bleibt unverändert, nur die Antwortverarbeitung ändert sich. Heute steht dort ein blankes `await eduApi.put<LmnApiSession>(…)`, das die Antwort **verwirft** — neu `const { data } = await …`, um an `jobId` zu kommen. Danach `SSE_MESSAGE_TYPE.EXAM_MODE_PROGRESS` über den bestehenden `apps/frontend/src/store/useSseStore.ts` abonnieren und als Fallback `GET ${EXAM_MODE}/jobs/:jobId` im `EXAM_MODE_JOB_POLL_INTERVAL_MS`-Takt pollen. UI: Fortschritt (`x von total`), Endzustand `partial` mit Liste der fehlgeschlagenen User + `reason`. `handleApiError`, keine magic strings.
Verify: `iter.sh test:frontend` (Store-Test: 202-Antwort startet die Beobachtung; ein `partial`-Status setzt die Fehlerliste) **und** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean.
i18n: Keys aus T11
Doku: als Fork-Original kennzeichnen
Abhängt von: T7, T9, T11

### T11 — i18n (DE/EN/FR)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/locales/{de,en,fr}/translation.json`
Soll: 3 Fehler-Keys aus T2 + UI-Keys für T10.
Änderung: Die drei `lmnApi.errors.{ExamModeInvalidAction,ExamModeJobNotFound,ExamModeJobFailed}` sind **bereits mit T2 gelandet** (Pre-commit-Zwang, Begründung dort) — hier nur gegenprüfen, **nicht** doppelt anlegen. Neu in **allen drei** Locales: `classmanagement.examMode.{progress,partial,failedUsers,pending,running,completed}`.
Verify: `iter.sh i18n` grün (führt `check-translations` **und** `check-error-message-translations` aus). **Zusätzlich nötig**, weil `check-translations` nur die **Parität** DE/EN/FR prüft und drei überall fehlende Keys durchwinkt: `iter.sh cmd 'grep -l "failedUsers" apps/frontend/src/locales/de/translation.json apps/frontend/src/locales/en/translation.json apps/frontend/src/locales/fr/translation.json | wc -l | grep -qx 3'`.
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

> **Task-Adressierung:** die Task-Nummern beginnen in **jedem** Sub-Paket dieser Datei wieder bei `T1`.
> Tasks in diesem Abschnitt heißen darum eindeutig `p7-lmn-pdf-fallback:T<n>`. In Quer-Verweisen aus
> anderen Ledgers, Reviews oder Commit-Messages immer diese Langform benutzen, nie das nackte „T7".

_Ziel:_ Wenn linuxmuster-api7 die Passwortlisten-/Klassenlisten-PDFs nicht liefert, erzeugt die API
sie selbst. · _Abhängt-von:_ — · _Status:_ offen · _Tasks:_ 10
Soll: main.js:17195-17468 (LmnPdfService — Klassenrumpf bis 17464, `__decorate`/`Injectable` 17465-17467, Default-Export 17468) · 17475 (`module.exports = require("pdfkit")`, webpack-Modul 322) · 17567-17620 (LMN_PDF_LANGUAGE + Labels DE/EN/FR)
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

**Gegen den heutigen Baum nachgeprüft (2026-07-28) — nicht raten, das steht so im Fork:**
* `FILE_EXPORT_FORMAT` (NEW:15658-15661) und `buildAttachmentContentDisposition` (NEW:15689-15696) fehlen **beide** — sie werden in T7 neu angelegt. Es gibt aber bereits `PrintPasswordsFormat` (`libs/src/classManagement/types/printPasswordsFormat.ts`, enum, Werte `pdf`/`csv` — inhaltlich identisch), und `PrintPasswordsRequest.format` hängt daran. Die neue Konstante kommt **additiv** dazu; der alte Enum wird in diesem Paket **nicht** angefasst (der FE-Store `usePrintPasswordsStore.ts` benutzt ihn). Die Doppelung in T10 dokumentieren, Konsolidierung ist eine eigene spätere Task.
* `LMN_API_EDU_API_ENDPOINTS` hat **kein** `STUDENTS_LIST` — 2.1.0 hat es (NEW:807, `${LMN_API_EDU_API_ENDPOINT}/students-list`). `tasks/backlog.md:3310` hat es beim LINBO-Port bewusst ausgelassen („eigene Module"); T8 holt es nach, T9 braucht es.
* `SOPHOMORIX_GROUP_TYPES.STUDENT === 'student'` ✓ (`libs/src/lmnApi/constants/sophomorixGroupTypes.ts:23`). `LmnUserInfo` hat `preferredLanguage?` (:140), `sophomorixFirstPassword` (:166) sowie `sn`/`givenName`/`sAMAccountName`/`displayName`/`sophomorixRole` ✓ — der PDF-Generator braucht keine Typ-Erweiterung an `LmnUserInfo`.
* **Typ-Falle:** `getSchoolClass()` liefert `Promise<LmnApiSchoolClass>` (`lmnApi.service.ts:218-222`). Dieser Typ hat `members: LmnUserInfo[]`, aber **kein** `admins` — `admins: LmnUserInfo[]` sitzt allein auf `LmnApiSchoolClassWithMembers`. `buildClassMeta` (NEW:17285-17294) liest `schoolClass.admins ?? []`. Auflösung steht in T5.
* **Header-Casing-Falle:** `LmnApiRequestQueue` reicht `response.headers` von axios unverändert durch (`lmn-api-request.queue.ts:88`; in 2.1.0 identisch, NEW:17000) und schickt das Ergebnis durch BullMQ — übrig bleiben **kleingeschriebene** Header-Keys. Der Controller liest heute passend dazu `apiResponse.headers['content-disposition']` (`lmnApi.controller.ts:76`). Ein 1:1 portiertes `buildPdfJobResult`/`sendFileResponse` benutzt dagegen `HTTP_HEADERS.ContentDisposition` = `'Content-Disposition'`. Konsequenz und Fix in T7/T8.
* `NOTICE` existiert bereits (Repo-Root), `docs/third-party-licenses.md` **nicht** — T2 legt sie an. `pdfkit`/`@types/pdfkit` stehen **nicht** in `package.json` ✓ (T1). `RequestResponseContentType.APPLICATION_PDF` gibt es (`libs/src/common/types/http-methods.ts:48`) — nicht neu anlegen.

**Was bricht:** nichts. Der Fallback greift nur im Fehlerpfad. **Aber:** er erzeugt dann PDFs mit
**Klartext-Passwörtern** in unserem Prozess — s. `riskNotes`.

**FE rekonstruierbar?** Entfällt weitgehend: die Downloads laufen über bestehende FE-Pfade. Nur die
neue `students-list`-Route braucht einen Store-Call (T9).

### T1 — Root-Dependency: pdfkit  [ ]
Komponente: root · Dateien: `package.json`, `package-lock.json`
Soll: NEW:79274 — `"pdfkit":"^0.15.2"` (dependencies), `"@types/pdfkit":"^0.17.6"` (devDependencies).
Änderung: Exakt diese Ranges, `npm install`.
Verify: `iter.sh cmd 'npm ls pdfkit'` sauber; `iter.sh cmd 'node -e "require(\"pdfkit\")"'` exit 0; `iter.sh cmd 'node -e "const p=require(\"./package.json\"); if(!p.dependencies.pdfkit||!p.devDependencies[\"@types/pdfkit\"]) process.exit(1)"'` exit 0 (pdfkit gehört in `dependencies`, die Typen in `devDependencies` — ohne die Typen scheitert T4 am isolierten tsc); `iter.sh cmd 'npm run check-npm-audit'` grün.
**Nicht** `npm audit --omit=dev --audit-level=high` als Gate nehmen: das failt heute schon an den 30 baseline-erlaubten high/critical-CVEs der v1.6.266-Basis, und „ohne neue Funde" ist maschinell nicht entscheidbar. `scripts/security/checkNpmAudit.ts` ist das Baseline-Gate — es meldet nur **nicht** allowlistete, abgelaufene oder eskalierte Advisories und failt damit exakt dann, wenn `pdfkit` etwas Neues einschleppt.
i18n: keine
Doku: Dep ins Supply-Chain-Inventar
Abhängt von: —

### T2 — Font-Assets + Lizenz-Attribution  [?] human-gate
Komponente: apps/api, docs · Dateien: `data/public/assets/fonts/DejaVuSans.woff`, `data/public/assets/fonts/DejaVuSans-Bold.woff`, `NOTICE`, `docs/third-party-licenses.md`
Soll: NEW:17621-17624 — die Laufzeitpfade sind fix `./data/public/assets/fonts/DejaVuSans{,-Bold}.woff`.
Änderung: Beide Dateien aus der offiziellen DejaVu-Distribution beziehen (nicht aus dem edulution-Image extrahieren — Provenienz!), im WOFF-Format nach `data/public/assets/fonts/` legen, den DejaVu-Lizenztext (Bitstream Vera / Public Domain, je nach Glyph-Herkunft) in `NOTICE` und `docs/third-party-licenses.md` aufnehmen. **Gate für Kevin:** Binär-Assets im Repo + Fremdlizenz neben AGPL — bewusste Entscheidung. Alternative, falls abgelehnt: Fonts nicht ausliefern und den Helvetica-Fallback akzeptieren (dann aber Umlaut-Verlust dokumentieren).
Verify: `iter.sh cmd 'test -s data/public/assets/fonts/DejaVuSans.woff && test -s data/public/assets/fonts/DejaVuSans-Bold.woff'` exit 0 — **nicht** `ls -l` auf das Verzeichnis, das exitet auch bei leerem Verzeichnis mit 0 und kann damit nie fehlschlagen; `iter.sh cmd 'head -c4 data/public/assets/fonts/DejaVuSans.woff | grep -q wOFF && head -c4 data/public/assets/fonts/DejaVuSans-Bold.woff | grep -q wOFF'` exit 0 (echte WOFF-Magic — schützt vor umbenanntem TTF, das `registerFont` erst zur Laufzeit zerlegt); `iter.sh cmd 'grep -q DejaVu NOTICE && grep -q DejaVu docs/third-party-licenses.md'` exit 0 (`NOTICE` existiert bereits, `docs/third-party-licenses.md` legt diese Task an); `iter.sh cmd 'grep -n "COPY ./data/public/assets" apps/api/Dockerfile'` bestätigt, dass sie ins Image kommen (**keine** Dockerfile-Änderung nötig — nachweisen, nicht ändern; verifiziert: `apps/api/Dockerfile:30` kopiert nach `/opt/edulution/api/assets`, der CMD in `:34` kopiert beim Boot nach `data/public/assets/` zurück, und `LMN_PDF_FONT_PATHS` ist CWD-relativ `./data/public/assets/fonts/…`).
i18n: keine
Doku: `NOTICE`, `docs/third-party-licenses.md`
Abhängt von: —

### T3 — libs/lmnApi: lmnPdfLayout (Labels DE/EN/FR, Fonts, Layout)  [ ]
Komponente: libs · Dateien: `libs/src/lmnApi/constants/lmnPdfLayout.ts`
Soll: NEW:17568-17620 (`LMN_PDF_LANGUAGE={DE,EN,FR}` + `LMN_PDF_LABELS` mit je 13 Feldern: credentials, classList, schoolClass, name, firstname, login, password, number, page, welcome, teachers, changePasswordHint, locale — Werte **byte-exakt** übernehmen, z. B. DE `'Zugangsdaten'`/`'de-DE'`, FR `'Identifiants'`/`'fr-FR'`) · NEW:17621-17624 (`LMN_PDF_FONT_PATHS`) · NEW:17626-17629 (`LMN_PDF_FONTS={regular:'LmnBody',bold:'LmnBodyBold'}`) · NEW:17631-17634 (`LMN_PDF_FALLBACK_FONTS={regular:'Helvetica',bold:'Helvetica-Bold'}`) · NEW:17636ff (`LMN_PDF_LAYOUT` mit `pageSize:'A4'`, `pageMargin:40`, `headerFontSize:16`, `footerFontSize:8`, … — Rest ab 17640 ablesen).
Änderung: Eine Datei, named exports + Default-Export `LMN_PDF_LAYOUT` am Ende. **Diese Labels sind PDF-interne Strings, keine i18n-Keys** — sie gehören bewusst nicht ins `translation.json` (das PDF wird serverseitig ohne i18next gerendert). SPDX.
Verify: `iter.sh lint`; `iter.sh cmd 'TSX_TSCONFIG_PATH=tsconfig.base.json npx tsx -e "import LAYOUT, {LMN_PDF_LABELS as L, LMN_PDF_FONT_PATHS as P} from \"./libs/src/lmnApi/constants/lmnPdfLayout\"; if(Object.keys(L).length!==3) process.exit(1); if(Object.values(L).some((v)=>Object.keys(v).length!==13)) process.exit(1); if(L.DE.credentials!==\"Zugangsdaten\"||L.EN.locale!==\"en-GB\"||L.FR.locale!==\"fr-FR\") process.exit(1); if(P.regular!==\"./data/public/assets/fonts/DejaVuSans.woff\") process.exit(1); if(LAYOUT.pageMargin!==40||LAYOUT.passwordCardsPerRow!==4||LAYOUT.passwordRowsPerPage!==9||LAYOUT.studentRowsPerPage!==30) process.exit(1)"'` exit 0.
`TSX_TSCONFIG_PATH=tsconfig.base.json` ist **Pflicht**, sobald die geladene Datei oder eine ihrer Importe einen `@libs/…`-Alias benutzt — lokal nachgestellt: ohne die Variable bricht `npx tsx -e` mit `MODULE_NOT_FOUND` ab (und `npx tsx --tsconfig` hilft nicht). Werte gegen NEW:17636-17650 gegengeprüft.
i18n: keine (bewusst — s. o.)
Doku: in `docs/features/p7-lmn-pdf-fallback.md` begründen
Abhängt von: —

### T4 — api/lmnApi: LmnPdfService — Grundgerüst (Doc, Fonts, Sprache)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/lmnApi/lmnPdf.service.ts`
Soll: NEW:17195-17268. `static cachedFontBuffers` (17197), `loadFontBuffers` (17198-17213: `readFileSync` beider Pfade; bei Fehler **einmal** `Logger.warn('Unicode PDF font unavailable, falling back to Helvetica: …')` und `null` cachen — der `null`-Cache ist die Sperre gegen wiederholte Platten-Zugriffe **und** gegen Log-Spam), `createDocument` (17239-17241: `new PDFDocument({size: LMN_PDF_LAYOUT.pageSize, margin: LMN_PDF_LAYOUT.pageMargin, bufferPages: true})` — `bufferPages` ist Voraussetzung für `drawStudentsFooter` in T6), `registerFonts` (17242-17250: ohne Buffer → `LMN_PDF_FALLBACK_FONTS` zurück; **mit** Buffer zwei `doc.registerFont(...)`-Aufrufe und Rückgabe der `LMN_PDF_FONTS`-Namen — die alte Obergrenze 17246 schnitt genau diesen zweiten Zweig ab), `streamToBuffer` (17251-17258: Promise über `data`/`end`/`error`, wird **vor** `doc.end()` aufgesetzt), `resolveLanguage` (17259-17268: erste `preferredLanguage` der Mitglieder, lowercase; `startsWith('en')`→EN, `startsWith('fr')`→FR, sonst DE).
Änderung: `@Injectable()`-Klasse, statische Helfer, statischer Logger mit `LmnPdfService.name`. SPDX.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=lmnPdf'` grün — das Pattern erzwingt, dass die neue Spec existiert (jest 29.7 exitet 1, wenn kein Pfad passt); `iter.sh test:api` allein wäre auch **ohne** neue Spec grün und damit kein Gate. Inhalt: bei fehlgeschlagenem Font-Laden liefert `registerFonts` `{regular:'Helvetica',bold:'Helvetica-Bold'}` und loggt über zwei Aufrufe hinweg **genau einmal**; mit Buffern kommen `{regular:'LmnBody',bold:'LmnBodyBold'}` zurück; `resolveLanguage([{preferredLanguage:'fr-FR'}])` → `'FR'`; `resolveLanguage([{preferredLanguage:'en-US'}])` → `'EN'`; `resolveLanguage([])` → `'DE'` (Default, NEW:17267).
**Zwei Fallen in dieser Spec:** (a) „ohne Font-Dateien" darf **nicht** heißen „die Dateien liegen halt noch nicht da" — nach T2 liegen sie im Repo und jest läuft aus dem Repo-Root, wo `./data/public/assets/fonts/…` dann auflöst; also `readFileSync` gezielt mocken und werfen lassen, sonst ist die Assertion von der Reihenfolge der Tasks abhängig. (b) `cachedFontBuffers` ist **static** und überlebt `beforeEach` — vor jedem Fall explizit zurücksetzen, sonst misst der „genau einmal"-Assert die Reihenfolge der Testfälle statt das Verhalten.
i18n: keine
Doku: keine
Abhängt von: T1, T3

### T5 — api/lmnApi: generatePasswordListPdf  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/lmnApi/lmnPdf.service.ts`, `libs/src/lmnApi/types/lmnPdfSchoolClass.ts` (neu — Eingabetyp, s. Änderung)
Soll: NEW:17214-17228 (`generatePasswordListPdf(classes, {onePerPage})` → Labels über `resolveLanguage(classes.flatMap(c => c.members))`, `buildPasswordCards`, `createDocument`, `registerFonts`, `streamToBuffer`, dann `renderPasswordPages` **oder** `renderPasswordGrid`, danach `doc.end()` und `return buffer` — der `streamToBuffer`-Promise wird bewusst **vor** dem Rendern aufgesetzt) + die zugehörigen statischen Methoden, jede mit eigenem Anker: `buildPasswordCards` 17269-17279 · `buildStudentEntries` 17280-17284 (gehört zu T6) · `buildClassMeta` 17285-17294 · `displayName` 17295-17297 · `renderPasswordGrid` 17298-17316 · `drawPasswordCard` 17317-17335 · `renderPasswordPages` 17336-17365 · `drawCredentialCard` 17366-17390. Die beiden `draw*`-Helfer und `displayName` fehlten in der alten Sammelangabe „zwischen 17260 und 17390", sind aber Pflicht — ohne sie rendert gar nichts.
Änderung: 1:1. **`buildPasswordCards` muss auch von außen aufrufbar sein** — `lmnApi.service.ts` prüft `LmnPdfService.buildPasswordCards(classes).length > 0`, bevor es den Fallback nutzt (NEW:14792). **Keine Passwörter in Logs.**
**Eingabetyp — entscheiden, nicht raten (im Bundle sind die Typen wegkompiliert):** `buildClassMeta` (NEW:17289-17290) liest `schoolClass.sophomorixSchoolname` und `schoolClass.admins ?? []`. Im Fork liefert `getSchoolClass()` aber `LmnApiSchoolClass`, und dieser Typ hat **kein** `admins` (nur `sophomorixAdmins: string[]`); `admins: LmnUserInfo[]` sitzt allein auf `LmnApiSchoolClassWithMembers`. Deshalb einen eigenen schmalen Eingabetyp `LmnPdfSchoolClass` in `libs/src/lmnApi/types/lmnPdfSchoolClass.ts` anlegen — `Pick<LmnApiSchoolClass, 'cn' | 'sophomorixSchoolname' | 'members'> & { admins?: LmnUserInfo[] }` — und `LmnPdfService` **darauf** typisieren. Dann sind `LmnApiSchoolClass` und `LmnApiSchoolClassWithMembers` beide strukturell zuweisbar, T7 braucht **keinen** Cast (AGENTS.md: generische Typen statt unsicherem Cast) und `LmnApiSchoolClass` (Kommentar: „based on a third-party object definition") bleibt unangetastet. Ohne das schlägt in T7 `npx tsc -p apps/api/tsconfig.app.json --noEmit` fehl.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=lmnPdf'` grün (Pattern-Treffer erzwungen, Begründung s. T4): erzeugter Buffer beginnt mit `%PDF-`; `onePerPage:true` mit 3 Karten ergibt **genau 3** Seiten (NEW:17339-17342 legt ab Index 1 pro Karte eine Seite an) — „≥ so viele Seiten wie Karten" war als Assert wertlos, weil per Konstruktion immer wahr; `onePerPage:false` mit 37 Karten ergibt **genau 2** Seiten (`passwordCardsPerRow*passwordRowsPerPage = 4*9 = 36`, NEW:17641-17642), mit 36 Karten **eine**; leere Klassenliste → `buildPasswordCards` liefert `[]`; ein Logger-Spy sieht das Test-Passwort **nirgends**. Fonts wie in T4 wegmocken, damit die Spec nicht davon abhängt, ob T2 schon gelaufen ist.
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
Komponente: apps/api, libs · Dateien: `apps/api/src/lmnApi/lmnApi.service.ts`, `apps/api/src/lmnApi/lmnApi.module.ts`, `apps/api/src/lmnApi/lmnApi.controller.ts`, `apps/api/src/lmnApi/lmnApi.service.spec.ts`, `libs/src/common/constants/fileExportFormat.ts` (neu), `libs/src/common/utils/buildAttachmentContentDisposition.ts` (neu)
Soll: NEW:14772-14781 (`static buildPdfJobResult(buffer, filename)` → `{data, status: HttpStatus.OK, headers: {[HTTP_HEADERS.ContentType]: RequestResponseContentType.APPLICATION_PDF, [HTTP_HEADERS.ContentDisposition]: buildAttachmentContentDisposition(filename)}}`; `RequestResponseContentType.APPLICATION_PDF` existiert im Fork bereits, `http-methods.ts:48`) · NEW:15658-15661 (`FILE_EXPORT_FORMAT = {PDF:'pdf', CSV:'csv'}`, webpack-Modul 302) · NEW:15689-15696 (`buildAttachmentContentDisposition`: `NON_PRINTABLE_ASCII = /[^\x20-\x7E]/g` und `QUOTE_OR_BACKSLASH = /["\\]/g` je auf `_` ersetzen, dann `attachment; filename="<ascii>"; filename*=UTF-8''<encodeURIComponent(filename)>` — RFC-5987-Form byte-exakt übernehmen) · NEW:14782-14808 (im `catch`: **nur** wenn `options.format === FILE_EXPORT_FORMAT.PDF`, alle Klassen via `getSchoolClass(token, c, true)` holen, bei ≥1 Karte PDF bauen, `Logger.warn('LMN password PDF failed, served edulution fallback for …')` — **im Fork rebranden**, Dateiname `${options.schoolclasses.join('-')}-${options.school}-passwords.${FILE_EXPORT_FORMAT.PDF}`; scheitert auch der Fallback: `Logger.error` und weiter zum ursprünglichen 502).
Änderung: Fallback-Zweig ergänzen, `LmnPdfService` injizieren. `FILE_EXPORT_FORMAT` und `buildAttachmentContentDisposition` fehlen im Fork **beide** (nachgeprüft, nicht angenommen) → als `libs/src/common/constants/fileExportFormat.ts` (const-Objekt, `as const`, Default-Export) und `libs/src/common/utils/buildAttachmentContentDisposition.ts` neu anlegen, SPDX-Header. Den bestehenden Enum `PrintPasswordsFormat` (gleiche Werte, vom FE-Store benutzt) **nicht** anfassen — Doppelung nur in T10 dokumentieren. Log-Text auf `linuxmuster-ui` rebranden (Rebrand-Gate).
**Mit-zu-ziehen, sonst bricht der Commit:** (1) `LmnPdfService` in `lmnApi.module.ts` unter `providers` eintragen; (2) `lmnApi.service.spec.ts` baut `LmnApiService` mit **expliziter** Provider-Liste — ohne einen `LmnPdfService`-Mock scheitert jede bestehende Spec mit „Nest can't resolve dependencies of LmnApiService".
**Header-Casing (Contract-Sync, Surgical-Regel gilt hier nicht):** `buildPdfJobResult` erzeugt ein **plain object** mit dem Key `'Content-Disposition'`; der Controller liest heute `apiResponse.headers['content-disposition']` (`lmnApi.controller.ts:76`, passend zu den kleingeschriebenen axios-Keys aus der Queue). Beim Fallback ist der Lookup damit `undefined`, und `res.setHeader(name, undefined)` wirft `ERR_HTTP_INVALID_HEADER_VALUE` → 500 statt PDF. Fix in **dieser** Task, nicht erst in T8: im Controller `apiResponse.headers[HTTP_HEADERS.ContentDisposition] ?? apiResponse.headers[HTTP_HEADERS.ContentDisposition.toLowerCase()]` lesen (beide Schreibweisen, weiterhin ohne magic string) und `setHeader` überspringen, wenn der Wert `undefined` bleibt. Bewusste Abweichung vom Bundle — dort deckt der `??`-Default nur den Content-Type ab.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=lmnApi.service'` grün: Upstream-Fehler + `format:'pdf'` ⇒ Ergebnis mit `status === 200`, `%PDF-`-Buffer und einem `Content-Disposition`, das mit `attachment;` beginnt und ein `filename*=UTF-8''` trägt; Upstream-Fehler + `format:'csv'` ⇒ unverändert `CustomHttpException(PrintPasswordsFailed, 502)` und `generatePasswordListPdf` **nie** aufgerufen; Upstream-Fehler + Klasse ohne Schüler ⇒ ebenfalls 502 (kein leeres PDF); ein Logger-Spy sieht das Test-Passwort **nirgends**.
**Zusätzlich auf Controller-Ebene** `iter.sh cmd 'npx nx run api:test -- --testPathPattern=lmnApi.controller'`: `printPasswords` mit einem Fallback-Ergebnis ruft `res.setHeader` für `Content-Disposition` mit einem **definierten** Wert auf. Dieser eine Assert ist der einzige, der die Casing-Falle aufdeckt — ohne ihn ist die Service-Spec grün und die Route wirft im Betrieb `ERR_HTTP_INVALID_HEADER_VALUE`.
i18n: keine
Doku: keine
Abhängt von: T5

### T8 — api/lmnApi: getStudentsList-Route + Fallback  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/lmnApi/lmnApi.service.ts`, `apps/api/src/lmnApi/lmnApi.controller.ts`, `apps/api/src/lmnApi/lmnApi.service.mock.ts`, `apps/api/src/lmnApi/lmnApi.controller.spec.ts`, `libs/src/lmnApi/types/lmnApiErrorMessage.ts`, `libs/src/lmnApi/constants/lmnApiEduApiEndpoints.ts`
Soll: NEW:14809-14833 (`getStudentsList(token, schoolclass, format)` → `${SCHOOL_CLASSES_LMN_API_ENDPOINT}/${schoolclass}/${format}_students_list`, `responseType: ARRAYBUFFER`). **Reihenfolge im `catch` ist tragend und war bisher nicht beschrieben:** zuerst `msg.includes('not found or empty')` → sofort `GetStudentsListEmpty` (14819-14821) — **hier läuft kein Fallback**; erst danach `format === FILE_EXPORT_FORMAT.PDF` → `tryStudentsListFallback`, und nur wenn der `null` liefert, geht es weiter (14822-14827); zuletzt `msg.includes('Compilation failed')` → `GetStudentsListInvalidName`, sonst `GetStudentsListFailed` (14828-14831). Alle drei 502, alle mit `${schoolclass}: ${format}` als Detail · NEW:14834-14848 (`tryStudentsListFallback`: `getSchoolClass(token, schoolclass, true)`, bei `members.length === 0` → `null`, sonst PDF + `Logger.warn` + `buildPdfJobResult(buffer, \`${schoolclass}-students-list.pdf\`)`; jeder Fehler → `Logger.error` + `null`) · NEW:18334-18350 (Route `GET students-list/:schoolclass/:format` mit `@Param()` als Objekt, `@Headers(HTTP_HEADERS.XApiKey)`, `@Res()`, plus `@ApiOperation`/`@ApiParam`×2/`@ApiResponse`) · NEW:18157-18164 (`static sendFileResponse` — **nicht** 18106-18114, das ist der Import-Block des Controller-Moduls) · NEW:807 (`STUDENTS_LIST: ${LMN_API_EDU_API_ENDPOINT}/students-list` in `LMN_API_EDU_API_ENDPOINTS`).
Änderung: Service-Methoden + Route + `sendFileResponse`-Helfer. **Guards des Controllers unverändert** — keine neue `@Public()`-Route; `LmnApiController` trägt selbst keine Guards, der Schutz kommt aus den globalen `AuthGuard`/`AccessGuard` (`app.module.ts:159-167`), deshalb ist „nichts hinzufügen" hier korrekt und „`@Public()` weglassen" die eigentliche Sicherheitsanforderung. 3 neue Fehler-Keys in `lmnApiErrorMessage` — die Datei ist ein **`enum`**, und `scripts/checkErrorMessages.ts` erkennt ausschließlich `enum`-Deklarationen (`getEnumFullPaths`); ein Umbau auf ein const-Objekt würde das i18n-Gate aus T10 lautlos wirkungslos machen, also additiv im Enum bleiben. `STUDENTS_LIST` (NEW:807) in `LMN_API_EDU_API_ENDPOINTS` ergänzen — `tasks/backlog.md:3310` hat den Key beim LINBO-Port bewusst zurückgestellt; T9 braucht ihn, damit der Store keinen magic string benutzt. `lmnApi.service.mock.ts` um `getStudentsList` erweitern, sonst läuft die Controller-Spec gegen `undefined`.
**`sendFileResponse` bewusst nicht 1:1:** das Bundle liest `apiResponse.headers[HTTP_HEADERS.ContentType/ContentDisposition]`, also gross geschrieben — die Queue liefert aber axios-Keys, also **klein** (`lmn-api-request.queue.ts:88`). 1:1 portiert würde der heute funktionierende Upstream-Pfad von `printPasswords` brechen. Also denselben `?? …toLowerCase()`-Doppelzugriff wie in T7 benutzen und die Abweichung in `docs/features/p7-lmn-pdf-fallback.md` festhalten.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=lmnApi.service'` grün — Spec: Fehler mit `'not found or empty'` ⇒ `GetStudentsListEmpty` **und** `tryStudentsListFallback` wurde **nicht** aufgerufen (das ist der Assert, der die Reihenfolge aus dem Soll festnagelt); `'Compilation failed'` + `format:'csv'` ⇒ `GetStudentsListInvalidName`; beliebiger anderer Fehler + `format:'csv'` ⇒ `GetStudentsListFailed`; `format:'pdf'` + Fehler **ohne** `'not found or empty'` + nicht-leere Klasse ⇒ PDF-Buffer; leere Klasse ⇒ `null` aus dem Fallback ⇒ 502. Dann `iter.sh cmd 'npx nx run api:test -- --testPathPattern=lmnApi.controller'` grün — Guard-Nachweis über den bereits vorhandenen Helfer `apps/api/src/common/controllerContractReflection.ts` (Muster: `linbo.controller.spec.ts`): `isRoutePublic(LmnApiController, 'getStudentsList') === false`. **Kein** `curl` gegen den laufenden Stack als Gate: ohne Deploy liefert das `000` und ist damit immer „nicht 401" bzw. je nach Schreibweise immer grün.
i18n: 3 Keys in T10
Doku: **Kein** Swagger-Regenerat — der Fork hat weder `swagger-spec.json` im Root noch ein `generate:swagger`/`check-swagger`-Script in `package.json` (nachgeprüft 2026-07-28; die Erwähnung in `AGENTS.md` stammt aus der Upstream-Vorlage). Stattdessen die Swagger-Dekoratoren aus NEW:18336-18343 (`@ApiOperation`, zwei `@ApiParam`, `@ApiResponse` mit `application/octet-stream`) 1:1 mitportieren und die neue Route in `docs/features/p7-lmn-pdf-fallback.md` dokumentieren.
Abhängt von: T6, T7

### T9 — Frontend: students-list-Download anbinden (FORK-ORIGINAL)  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/ClassManagement/**`
Soll: **Nicht rekonstruierbar.** Verbindlich ist die Route aus T8.
Änderung: Store-Action mit `eduApi` und `handleApiError`, Download-Trigger. Kein `fetch`, Call gehört in den Store. **Vorbild ist `apps/frontend/src/pages/ClassManagement/PasswordsPage/usePrintPasswordsStore.ts`** — derselbe Download-Mechanismus, dort mit `ResponseType.ARRAYBUFFER` + `new Blob([...], {type})` + Object-URL; diesem Muster folgen statt `ResponseType.BLOB` einzuführen. Pfad über `LMN_API_EDU_API_ENDPOINTS.STUDENTS_LIST` (aus T8), kein magic string; `HTTP_HEADERS.XApiKey` mit dem Token aus `useLmnApiStore` mitgeben.
Verify: `iter.sh cmd 'npx nx test frontend --run src/pages/ClassManagement'` grün — der Pfad-Filter erzwingt, dass mindestens eine Spec darunter existiert (vitest exitet ohne Treffer mit 1, `passWithNoTests` ist nicht gesetzt); unter `ClassManagement` liegt heute **keine** Spec, `iter.sh test:frontend` allein wäre also auch mit null neuen Tests grün. Inhalt: die Store-Action ruft `eduApi` mit `LMN_API_EDU_API_ENDPOINTS.STUDENTS_LIST` + `/${schoolclass}/${format}` auf und setzt bei Fehler `error`. **Und** `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean.
i18n: Keys aus T10
Doku: als Fork-Original kennzeichnen
Abhängt von: T8, T10

### T10 — i18n + Doku  [ ]
Komponente: apps/frontend, docs · Dateien: `apps/frontend/src/locales/{de,en,fr}/translation.json`, `docs/features/p7-lmn-pdf-fallback.md`
Soll: kein direkter Bundle-Anker — die drei Fehler-Keys folgen aus dem Enum in T8, die UI-Keys aus dem Fork-Original T9. **Abgrenzung:** die PDF-internen Labels (NEW:17573-17619) gehören ausdrücklich **nicht** hierher, sie bleiben in `lmnPdfLayout.ts` (T3).
Änderung: `lmnApi.errors.{GetStudentsListEmpty,GetStudentsListInvalidName,GetStudentsListFailed}` + die UI-Keys für T9 — konkret `classmanagement.studentsList.{title,downloadPdf,downloadCsv,failed}` (Namespace `classmanagement` existiert bereits und ist kleingeschrieben; `classmanagement.examMode.*` aus `p7-lmn-exam-jobs:T11` ist das Schwester-Muster) — in **allen drei** Locales. Doku: wann der Fallback greift, warum die PDF-Labels **keine** i18n-Keys sind, Font-Lizenz-Verweis, Sicherheitshinweis zu Klartext-Passwörtern, dazu die zwei bewussten Abweichungen vom Bundle (Header-Casing in T7/T8, `FILE_EXPORT_FORMAT` neben dem bestehenden `PrintPasswordsFormat`).
Verify: `iter.sh i18n` grün — das führt `check-translations` **und** `check-error-message-translations` aus (`scripts/crabbox/iter.sh:19`), der separate zweite Aufruf war redundant. Der Fehler-Message-Check greift hier wirklich: `libs/src/error/errorMessage.ts` importiert `LmnApiErrorMessage`, und `scripts/checkErrorMessages.ts` liest aus jeder importierten Datei die `enum`-Werte und prüft sie gegen DE/EN/FR. Für die **UI**-Keys reicht das nicht (`check-translations` prüft nur Parität, ein überall fehlender Key fällt nicht auf) → zusätzlich `iter.sh cmd 'for l in de en fr; do grep -q "\"studentsList\"" apps/frontend/src/locales/$l/translation.json || exit 1; done'` exit 0.
i18n: siehe oben
Doku: `docs/features/p7-lmn-pdf-fallback.md`
Abhängt von: T8

---

## p7-surveys-limiter-collection [P7] — Backend-Limiter in eigene Collection

_Ziel:_ `Survey.backendLimiters` (eingebettet) → eigene Collection `SurveysBackendLimiter` mit
Unique-Index und `selectionCount`. · _Abhängt-von:_ — · _Status:_ offen · _Tasks:_ 9
_Adressierung:_ Die Task-Nummern starten in **jedem** Sub-Paket dieser Datei neu. Tasks dieses Abschnitts heißen
daher eindeutig `p7-surveys-limiter-collection:T<n>` — Querverweise aus anderen Ledgern bitte nur in dieser Form.
Soll: main.js:58984-59025 (Schema, Props 58996-59015, Indizes 59020-59021) · 59054-59085 (Choice-Subschema)
· 62619-62740 (Migration 002) · 63093-63144 (Migration 005) · 63518-63662 (SurveysBackendLimiterService) ·
60198-60210 (Model-Injektion) · 58605 (`forFeature`) · 62406 (Migrations-Liste)

**Go/No-Go: GO — kleinstes Paket, guter Einstieg in die 2.1.0-Welle.** Klar begrenzt, gut testbar,
und die Migration ist das erste echte 2.1.0-Datenmodell-Beispiel im Fork. Einzige Vorsicht: sie ist
**destruktiv** (`$unset: backendLimiters`) und rechnet `selectionCount` aus allen Antworten neu.

**Fork-Bestand:** `Survey.backendLimiters?: {questionName, choices}[]` eingebettet
(`apps/api/src/surveys/survey.schema.ts:34-38` — Decorator auf 34, Feld 35-38), gelesen an **genau einer**
Stelle (`survey-answers.service.ts:98`), gespiegelt in `libs/src/survey/types/api/survey.dto.ts:28`.
Über diesen DTO hängt **zusätzlich** `apps/api/src/surveys/migrations/surveyAnswerMigration002UseChoiceTitleInsideOfAnswers.ts:76/87`
daran (`.populate({ path: 'surveyId', select: 'backendLimiters' })` + `const { backendLimiters } = doc.surveyId as unknown as SurveyDto`).
`libs/src/survey/utils/resetSurveyIdFromFormulasBackendLimiters.ts` gehört **nicht** dazu (verifiziert): die Util
nimmt eine `SurveyFormula` und schreibt über `resetSurveyIdForRestfulChoices` nur `choicesByUrl` um — „BackendLimiters"
steht ausschließlich im Namen, einziger Aufrufer ist `apps/frontend/src/pages/Surveys/Editor/dialog/TemplateDialog.tsx:74`.
Migrations-Infrastruktur (`surveysMigrationsList.ts`, `migration.type.ts`) ist da; die beiden vorhandenen
Survey-Migrationen `000SurveyIds` und `001Attachments` tragen **beide** `version: 1`, und
`MigrationService.runMigrations` (`apps/api/src/migration/migration.service.ts:25-34`) führt **jede** Migration bei
**jedem** Boot sequenziell aus, ohne `version` je zu lesen — `version` ist reine Dokumentation, der echte Schutz ist
der `$or`-Filter in der Migration selbst. `Survey.schemaVersion` steht auf `@Prop({ default: 1 })`
(`survey.schema.ts:73`). Kein `selectionCount`, kein Unique-Index, kein SSE-Broadcast — und **kein**
`mongodb-memory-server` im `package.json`: die Jest-Suite bringt keine Mongo-Instanz mit, alle Task-Verifies unten
müssen ohne DB auskommen (echte DB erst in T9).

**Was bricht:** fünf Stellen gleichzeitig — Schema, `SurveyDto`, Leser (`survey-answers.service.ts:98`), die
Answer-Migration `surveyAnswerMigration002UseChoiceTitleInsideOfAnswers.ts` und die Limiter-getriebenen Specs/Mocks
— plus eine destruktive Migration. **Nicht** betroffen: `resetSurveyIdFromFormulasBackendLimiters.ts` (s. o.).
Unterschiedliche Bruchart beachten: die Destrukturierung in der Answer-Migration ist ein **harter tsc-Fehler**, die
beiden Mocks (`mocks/surveys/public-surveys.ts:139`, `mocks/surveys/answered-surveys.ts:207`) kompilieren wegen
`as unknown as SurveyDocument` **weiter** und veralten still — `survey-answers.service.spec.ts:140-201` fährt
`getSelectableChoices` heute über `surveyModel.findById → publicSurvey02.backendLimiters` und wird damit grün-aber-blind.
Details in `riskNotes`.

**FE rekonstruierbar?** Für den Kern **irrelevant** — die Limiter-Verwaltung im Survey-Editor arbeitet
über die Formel, nicht über das Schema. Erst die optionalen 2.1-Extras (T7-T9, SSE-Live-Update) hätten
eine FE-Hälfte, und die ist nicht rekonstruierbar.

### T1 — api/surveys: Choice-Subschema  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/surveys/choice.schema.ts`, `libs/src/survey/types/api/choice.dto.ts`
Soll: NEW:59054-59085. `@Schema({_id:false})`, Felder: `name` (String required), `title` (String required), `limit` (Number, default 0, **min 0**), `selectionCount` (Number, default 0), `isCustomUserEntry` (Boolean).
Änderung: Neues Subschema. `ChoiceDto` (`libs/src/survey/types/api/choice.dto.ts`) hat im Fork **verifiziert nur** `name`/`title`/`limit`; `selectionCount` und `isCustomUserEntry` fehlen beide und werden **additiv und optional** (`selectionCount?: number`, `isCustomUserEntry?: boolean`) ergänzt — optional, weil sonst sämtliche bestehenden Erzeuger (`libs/src/survey/constants/templates/*`, `libs/src/survey/types/editor/getSurveyEditorForm.schema.ts:65`, `getSurveyTemplateForm.schema.ts:70`, `apps/frontend/.../useQuestionsContextMenuStore.ts`) auf einen Schlag rot werden. SPDX **nur** für die neue Datei; `choice.dto.ts` behält seinen bestehenden Header.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=choice.schema'` mit neuem Spec, das ohne DB-Verbindung auskommt (`mongoose.model('ChoiceProbe', new Schema({ items: [ChoiceSchema] }))` + `validateSync()`): `limit: -1` liefert einen ValidationError (fällt durch, wenn `min: 0` vergessen wurde), ein Choice ohne `name` bzw. ohne `title` wirft, `{name, title}` allein ergibt nach `validateSync()` `limit === 0` **und** `selectionCount === 0`, und das Subdokument hat **kein** `_id` (Nachweis für `@Schema({_id:false})`). Zusätzlich `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'`.
i18n: keine
Doku: keine
Abhängt von: —

### T2 — api/surveys: SurveysBackendLimiter-Schema  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/surveys-backend-limiter.schema.ts`
Soll: NEW:58989-59025. `@Schema({timestamps:true, strict:true})`; `surveyId` (`SchemaTypes.ObjectId`, `ref:'Survey'`, required), `questionName` (String required), `choices` (`[ChoiceSchema]`, required, default `[]`), `schemaVersion` (default 1). Indizes: **`{surveyId:1, questionName:1}` unique** und `{surveyId:1}`. `toJSON: {virtuals:true}`.
Änderung: 1:1. Default-Export ist das **Schema** (nicht die Klasse) — wie im Soll (NEW:59025); Klasse als named export für `InjectModel`. SPDX.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=surveys-backend-limiter.schema'` mit Spec über `SurveysBackendLimiterSchema.indexes()`: genau zwei Einträge, `[{ surveyId: 1, questionName: 1 }, expect.objectContaining({ unique: true })]` und `[{ surveyId: 1 }, …]` — die `unique`-Option **explizit** mitprüfen, sonst bleibt der Test bei vergessenem `unique` grün. Ergänzend `validateSync()`: fehlendes `surveyId`/`questionName` wirft, `choices` ist ohne Angabe `[]`, `schemaVersion` ist 1. **Kein** Duplicate-Key-Insert-Test: der Fork hat kein `mongodb-memory-server`, die Jest-Suite bringt keine Mongo-Instanz mit — der echte Index-Nachweis läuft in T9 gegen die crabbox-DB.
i18n: keine
Doku: keine
Abhängt von: T1

### T3 — api/surveys: Modul-Wiring + Model-Injektion  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/surveys.module.ts`, `apps/api/src/surveys/survey-answers.service.ts`, `apps/api/src/surveys/survey-answers.service.spec.ts`, `apps/api/src/surveys/public-surveys.controller.spec.ts`
Soll: NEW:58605 (`MongooseModule.forFeature([{name: SurveysBackendLimiter.name, schema: SurveysBackendLimiterSchema}])`) · NEW:60198-60210 (Injektion in `SurveyAnswersService`).
Änderung: `forFeature` ergänzen (in 2.1.0 als **vierter** `forFeature`-Eintrag hinter `SurveysTemplate`, main.js:58602-58605), Model in `SurveyAnswersService` injizieren. **Noch keine Verhaltensänderung** — dieser Commit ist rein additiv und muss isoliert grün sein. Die neue `@InjectModel`-Abhängigkeit bricht dabei **beide** Specs, die `SurveyAnswersService` über `Test.createTestingModule` bauen (`survey-answers.service.spec.ts:106-128`, `public-surveys.controller.spec.ts:68-98` — dort steht `SurveyAnswersService` als Provider auf :75): in beiden je einen `{ provide: getModelToken(SurveysBackendLimiter.name), useValue: … }` ergänzen, im selben Commit.
Verify: `iter.sh test:api` — die volle API-Suite muss grün sein und ist hier der echte Gate: ohne den neuen Provider wirft Nest beim Modul-Bau `Nest can't resolve dependencies of the SurveyAnswersService (…, ?, …)` und die beiden Specs fallen durch. Zusätzlich `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'`.
i18n: keine
Doku: keine
Abhängt von: T2

### T4 — api/surveys: die in Welle 3 gebaute Migration 002 verdrahten — DESTRUKTIV  [ ]
> **DATEI-OWNERSHIP GEKLÄRT (Kollision mit `p6-migrations-2-1-catchup` T33).**
> `surveysMigration002MoveBackendLimitersToOwnCollection.ts` und `surveysMigrationsList.ts` **baut
> `p6-migrations-2-1-catchup`** (Welle 3). `PORT-2.1.0-MASTER.md` führt dieses Paket als Welle 4c mit dem Zusatz
> „Struktur kam in Welle 3". **Diese Task legt die Dateien also NICHT an**; sie ergänzt die Feature-Schicht
> (SSE-Broadcast, `selectionCount`-Reconcile) auf der bereits vorhandenen Struktur. Fehlen die Dateien, ist die
> Wellen-Reihenfolge verletzt — abbrechen, nicht selbst bauen.
Komponente: apps/api · Dateien: `apps/api/src/surveys/migrations/surveysMigration002MoveBackendLimitersToOwnCollection.ts`, `apps/api/src/surveys/migrations/surveysMigrationsList.ts`
Soll: NEW:62619-62740. `version: 2`; `previousSchemaVersion=1`, `newSchemaVersion=2`. Cursor über Surveys mit `schemaVersion===1` **oder** fehlendem `schemaVersion` **oder** nicht-leerem `backendLimiters`. Ohne Limiter: nur `schemaVersion` setzen (gesammelt per `bulkWrite`). Mit Limitern: über alle `SurveyAnswer`-Dokumente des Surveys zählen (`countChoiceMatchesInAnswer`; bei `isCustomUserEntry` gegen `${questionName}${SURVEYJS_COMMENT_SUFFIX}`), Ergebnis als `selectionCount` in die neuen Dokumente (`upsert` mit `$setOnInsert`, `ordered:false`). **Bei Write-Errors: `Logger.error`, Survey in `failedSurveyIds`, `schemaVersion`-Bump überspringen (Retry beim nächsten Boot).** Erfolgreiche: `$unset:{backendLimiters:''}` + `$max:{schemaVersion:2}` mit `{strict:false}`. Abschluss-Logs für migrierte und fehlgeschlagene Dokumente.
Änderung: Die Migrationsdatei **und** `surveysMigrationsList.ts` kommen aus Welle 3 (s. Blockquote) — hier wird **nichts davon neu geschrieben**, sondern gegen `NEW:62619-62740` abgeglichen und die Einreihung geprüft (`version: 2`, **nach** `001Attachments`; beide bestehenden Migrationen tragen `version: 1`, `runMigrations` gated ohnehin nicht auf `version` — der wirksame Filter ist der `$or` in der Migration). Dasselbe gilt für die zwei Hilfen, die die Migration braucht: fehlen sie, ist das dieselbe Wellen-Verletzung wie bei der Migration selbst (abbrechen, nicht hier nachbauen). Was **geprüft** wird: `SURVEYJS_COMMENT_SUFFIX` existiert mit dem Wert `'-Comment'` (2.1.0: main.js:61347); und `countChoiceMatchesInAnswer` liegt als **eigene Util** vor mit der 2.1.0-Signatur `(answer, questionName, choiceMatchers: string[])` (2.1.0: Modul **952**, main.js:62744-62812, Funktion 62805, Helfer `countChoiceMatchesInValue(questionAnswer, acceptedValues)` 62777). **Nicht** die bestehende statische Methode `SurveyAnswersService.countChoiceMatchesInAnswer` (`survey-answers.service.ts:150`, weitere Aufrufer :159/:168/:189) für die Migration umbiegen: sie nimmt ein einzelnes `choiceTitle: string`, die Migration matcht aber gegen `[choice.name, choice.title]` — wird sie wiederverwendet, zählt die Migration jede unter `choice.name` gespeicherte Antwort still auf 0. **Forward-only.**
Verify: `iter.sh test:api` mit Spec: (a) Survey ohne Limiter → nur `schemaVersion:2`; (b) Survey mit 1 Limiter + 3 Antworten, davon 2 auf Choice A → neues Dokument mit `selectionCount:2` für A, `backendLimiters` weg, `schemaVersion:2`; (c) simulierter Bulk-Write-Fehler → `schemaVersion` bleibt 1 **und** `backendLimiters` bleibt erhalten (Retry-Fähigkeit).
i18n: keine
Doku: `docs/features/p7-surveys-limiter-collection.md`: „destruktiv, forward-only, Rollback = Dump + `./data/master.key`"
Abhängt von: T3

### T5 — api/surveys: Leser umstellen (BREAKING, 4 Stellen)  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/surveys/survey.schema.ts`, `apps/api/src/surveys/survey-answers.service.ts`, `apps/api/src/surveys/migrations/surveyAnswerMigration002UseChoiceTitleInsideOfAnswers.ts`, `apps/api/src/surveys/mocks/surveys/public-surveys.ts`, `apps/api/src/surveys/mocks/surveys/answered-surveys.ts`, `apps/api/src/surveys/survey-answers.service.spec.ts`, `libs/src/survey/types/api/survey.dto.ts`
Soll: NEW:58753-58805 (Survey **ohne** `backendLimiters`; `schemaVersion` dort mit `@Prop({ default: 5 })` = höchste ausgelieferte Migration, main.js:58803) · NEW:60255-60280 + 60307 (Lesen aus dem Limiter-Model statt aus dem Survey-Dokument; 60307 ist exakt `const limiter = await this.surveysBackendLimiterModel.findOne({ surveyId: surveyObjectId, questionName }).lean();`) · NEW:61898-61912 + 61924 (`loadLimitersForSurvey` mit Per-Survey-Cache: die Answer-Migration holt die Limiter aus der neuen Collection) · NEW:61869-61872 (`updateSurveyQuestionAnswer` nimmt in 2.1.0 einen nach `questionName` gekeyten **Record**, kein Array mehr).
Änderung: `backendLimiters`-Prop aus `survey.schema.ts:34-38` entfernen und **im selben Zug** `schemaVersion` von `@Prop({ default: 1 })` auf `default: 2` heben (`survey.schema.ts:73`) — sonst startet jedes neu angelegte Survey wieder auf 1 und wird bei jedem Boot erneut von Migration 002 aufgegriffen (`runMigrations` läuft ungated); 2.1.0 hält den Default konsequent auf der höchsten Migration. `survey-answers.service.ts:98` auf `surveysBackendLimiterModel.findOne({surveyId, questionName}).lean()` umstellen (Fehlerfall bleibt `NoBackendLimiters`); `survey.dto.ts:28` nachziehen. **Nicht** anfassen: `libs/src/survey/utils/resetSurveyIdFromFormulasBackendLimiters.ts` — verifiziert kein Konsument dieses Feldes (s. Fork-Bestand). Mit-brechen dagegen: (a) `surveyAnswerMigration002UseChoiceTitleInsideOfAnswers.ts:76/87` — harter tsc-Fehler, muss vom `.populate({ path: 'surveyId', select: 'backendLimiters' })` auf einen Lookup in der neuen Collection umgestellt werden (2.1.0-Vorbild `loadLimitersForSurvey`, dabei `updateSurveyQuestionAnswer` von Array auf Record umstellen; den 2.1.0-Helfer `batchedSchemaVersionMigration` **nicht** mitportieren, der gehört nicht in dieses Paket); (b) die zwei Mocks und `survey-answers.service.spec.ts:140-201`, die `getSelectableChoices` heute über `surveyModel.findById → publicSurvey02.backendLimiters` fahren — die Mocks kompilieren wegen `as unknown as SurveyDocument` weiter und würden sonst still veralten, der Spec muss stattdessen `surveysBackendLimiterModel.findOne` mocken. Reihenfolge-Falle: `surveysMigrationsList` läuft in `SurveysService.onModuleInit` (`surveys.service.ts:57`), `surveyAnswersMigrationsList` aber in `SurveyAnswersService.onModuleInit` (`survey-answers.service.ts:56`) — welche zuerst dran ist, entscheidet Nests Instanziierungsreihenfolge, nicht wir. Die Answer-Migration muss deshalb bei noch leerer Limiter-Collection den Datensatz überspringen, **ohne** `schemaVersion` zu bumpen (Retry beim nächsten Boot); das heutige `continue` tut genau das und darf nicht wegoptimiert werden. **Alles im selben Commit** — sonst kompiliert es nicht bzw. liest ins Leere.
Verify: `iter.sh test:api` grün (angepasste `survey-answers.service.spec.ts`, `public-surveys.controller.spec.ts`); `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` clean (fängt die Destrukturierung in der Answer-Migration); `iter.sh cmd '! grep -q backendLimiters apps/api/src/surveys/survey.schema.ts libs/src/survey/types/api/survey.dto.ts'`; `iter.sh cmd 'grep -q surveysBackendLimiterModel apps/api/src/surveys/survey-answers.service.ts'`; `iter.sh cmd 'test -f apps/api/src/surveys/migrations/surveyAnswerMigration002UseChoiceTitleInsideOfAnswers.ts && ! grep -q populate apps/api/src/surveys/migrations/surveyAnswerMigration002UseChoiceTitleInsideOfAnswers.ts'`; `iter.sh cmd 'grep -q "default: 2" apps/api/src/surveys/survey.schema.ts'`. **Ausdrücklich kein** globales `grep -rn backendLimiters … | wc -l → 0` — der Begriff bleibt legitim in `libs/src/survey/constants/templates/*`, `libs/src/survey/types/editor/getSurveyEditorForm.schema.ts:65`, `getSurveyTemplateForm.schema.ts:70`, den API-Mocks und im Frontend-Editor stehen; 2.1.0 führt ihn dort ebenfalls (main.js:65862 `template.backendLimiters`).
i18n: keine
Doku: keine
Abhängt von: T4

### T6 — api/surveys: Schreiber + Lösch-Pfade  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/surveys.service.ts`, `apps/api/src/surveys/survey-answers.service.ts`
Soll: NEW:60331-60358 (`revertChoiceIncrements`: `$inc` −quantity + `$pull` per `bulkWrite(bulkOps, {ordered:true})` auf dem Limiter-Model) · NEW:60359-60393 (`buildLimiterBulkOp`: `$push` für neue Custom-Choices, `$inc` für bestehende) · NEW:60485-60510 (`executeLimiterOps`: `updateOne`, bei neuer Choice Fallback über `choices: {$elemMatch: …}` + `$inc` auf `choices.$.selectionCount`) · NEW:63637-63655 (`deleteBackendLimiter` / `onSurveyDeletion`) · NEW:63819-63821 (Aufruf von `onSurveyDeletion` im Lösch-Pfad, in `Promise.allSettled` neben Answer- und Attachment-Cleanup).
Änderung: **Achtung, hier weicht der Fork strukturell von 2.1.0 ab.** In 2.1.0 werden Limiter beim Speichern eines Surveys **gar nicht** mitgeschrieben, sondern ausschließlich über die eigene Route `updateChoices` → `SurveysBackendLimiterService.updateOrCreateSurveysBackendLimiters` (Aufruf main.js:63876, Implementierung 63587-63636) — und das ist T8. Im Fork kommen die Limiter dagegen heute als Teil des Survey-Dokuments über `updateOrCreateSurvey` (`surveys.service.ts:188`) herein; nach T5 gibt es dafür **keinen** Schreibpfad mehr. Diese Task muss ihn deshalb überbrücken: die im Editor-Payload weiterhin mitgelieferten Limiter in die neue Collection schreiben (Upsert auf `{surveyId, questionName}`, entfallene Fragen wegräumen). Konsequenz für die Planung: **T8 ist damit nicht rein optional**, sondern der 2.1.0-Zuschnitt derselben Funktion — wird T8 geparkt, bleibt diese Brücke dauerhaft stehen und muss dokumentiert werden (T9); wird T8 gebaut, ersetzt sie sie. Beim Löschen eines Surveys (`surveys.service.ts:159 deleteSurveys`) **alle** zugehörigen Limiter mitlöschen (`deleteMany({surveyId: {$in: …}})`, sonst Waisen). `selectionCount` beim Beantworten hochzählen.
Verify: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=surveys'` mit Specs gegen ein gemocktes `surveysBackendLimiterModel` (kein Mongo verfügbar, s. Fork-Bestand): (a) `deleteSurveys(['<id>'])` ruft `deleteMany` **genau einmal** mit `{surveyId: {$in: [ObjectId]}}` — Spy-Assertion, fällt durch, wenn der Cleanup fehlt; (b) eine Antwort auf Choice A erzeugt ein `updateOne` mit `$inc: {'choices.$.selectionCount': 1}`; (c) `updateOrCreateSurvey` mit Limitern im Payload schreibt sie in die Collection (Spy auf `bulkWrite`/`updateOne`), und ein aus dem Payload entfernter Limiter erzeugt die entsprechende Lösch-/`$pull`-Operation. Zusätzlich `iter.sh test:api` (volle Suite als Regressionsnachweis) und `iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'`.
i18n: keine
Doku: keine
Abhängt von: T5

### T7 — api/surveys: Migration 005 (Choice-Duplikate)  [?] — **zusätzlicher Blocker: Versionslücke 002→005**
> **Beim Einspielen der Patches gefunden, am Bundle und am Runner nachgemessen.** Upstream hat für `surveys`
> **sechs** Migrationen: `000`, `001`, `002` (→2), `003-strip-origin-from-survey-urls` (2→3, NEW:62838-62840),
> `004-add-participated-usernames` (3→4, NEW:63010-63012), `005` (4→5, NEW:63059-63061).
> `MigrationService.runMigrations` (`apps/api/src/migration/migration.service.ts:25-34`) führt **jede** Migration
> der Liste aus; gefiltert wird in der Migration selbst über ihre `previousSchemaVersion`.
> **Folge:** baut der Fork nur `002` und dann `005`, stehen die Surveys auf `schemaVersion: 2`, `005` filtert auf
> `4` und findet **nie ein Dokument** — sie läuft bei jedem Boot, tut nichts und meldet Erfolg. Kein Test und kein
> Gate fängt das, weil die Migration formal fehlerfrei durchläuft.
> **Zwei Wege, einer davon zu entscheiden:** (a) `003` und `004` mitportieren — dann stimmt die Kette, aber es sind
> zwei zusätzliche Migrationen, deren fachlichen Nutzen der Fork erst braucht (`003` normalisiert Survey-URLs,
> `004` füllt `participatedUsernames`); (b) `005` als **`003`** mit `previousSchemaVersion = 2` bauen — weniger
> Arbeit, aber eine bewusste Nummern-Divergenz zu 2.1.0, die im Migrations-Nummernband dokumentiert werden muss.
> Ohne diese Entscheidung ist T7 nicht ausführbar.
Komponente: apps/api · Dateien: `apps/api/src/surveys/migrations/surveysMigration005DeduplicateBackendLimiterChoices.ts`
Soll: NEW:63093ff (`surveysMigration005DeduplicateBackendLimiterChoices`).
Änderung: **Nur bauen, wenn Migration 002 in der Praxis Duplikate erzeugt** (2.1.0 brauchte sie offenbar nachträglich). Entschieden wird **nach dem Migrations-Testlauf gegen die echte Kopie in `p7-surveys-limiter-collection:T9`** — T4 verifiziert nur gegen Mocks und kann diese Frage nicht beantworten; sonst `[~]` mit Begründung. Beachten: 2.1.0 hat dazwischen `003StripOriginFromSurveyUrls` und `004AddParticipatedUsernames` — die gehören **nicht** in dieses Paket; nach diesem Paket ist `002MoveBackendLimitersToOwnCollection` die höchste Fork-Migration, die Datei heißt hier also `surveysMigration003DeduplicateBackendLimiterChoices.ts` mit `version: 3` (`previousSchemaVersion=2`, `newSchemaVersion=3`) — `005` **nicht** blind übernehmen, und `Survey.schemaVersion`-Default in `survey.schema.ts` mit anheben.
Verify: falls gebaut: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=DeduplicateBackendLimiterChoices'` mit Spec: ein Limiter mit zwei Choices gleichen `title` wird zu **einem** Choice zusammengeführt und dessen `selectionCount` ist die **Summe** beider (nicht der Wert des ersten) — beides einzeln assertieren, sonst bleibt der Test bei „letzter gewinnt" grün; ein Limiter ohne Duplikate bleibt unverändert. Falls **nicht** gebaut: Status auf `[~]` setzen und die Begründung mit den Zahlen aus dem T9-Testlauf belegen.
i18n: keine
Doku: Entscheidung im Task-Kommentar festhalten
Abhängt von: T4, T9

### T8 — api/surveys: SurveysBackendLimiterService (2.1-Parität)  [?]
Komponente: apps/api · Dateien: `apps/api/src/surveys/surveys-backend-limiter.service.ts`
Soll: NEW:63536-63662. `broadcastBackendLimiterUpdate` (63545: bei `isPublic` `sseService.informAllUsers`, sonst `sendEventToUsers` an die eingeladenen Mitglieder, Typ `SSE_MESSAGE_TYPE.SURVEY_BACKEND_LIMITER_UPDATED`), `static createChoiceRecordFromChoicesMap` (63554), `throwErrorIfAppendingOwnChoicesIsNotAllowedForQuestions` (63576-63586: Frage muss `showOtherItem` haben, sonst 403), `updateOrCreateSurveysBackendLimiters` (63587-63636, mit `hasUniqueChoiceTitles`-Prüfung → 400 `DuplicateChoiceTitle`), Lösch-Methoden (63637-63655).
Änderung: **Optional — deutlich mehr als „Collection verschieben".** Bringt Live-Aktualisierung der Restplätze und selbst angelegte Choices. Übernimmt außerdem die in `p7-surveys-limiter-collection:T6` gebaute Fork-Brücke für den Schreibpfad (s. dort) — dieser Teil ist **nicht** optional, nur seine 2.1.0-Form. Braucht zusätzlich `SSE_MESSAGE_TYPE.SURVEY_BACKEND_LIMITER_UPDATED`, `flattenSurveyElements`, `getTopLevelElements`, `hasUniqueChoiceTitles`, `SURVEYJS_OTHER_VALUE` — alle erst im Fork suchen. **Entscheidung:** jetzt bauen oder als eigenes Ticket parken?
Verify: falls gebaut: `iter.sh cmd 'npx nx run api:test -- --testPathPattern=surveys-backend-limiter.service'` (Broadcast geht bei `isPublic` an alle — Spy auf `informAllUsers`, und `sendEventToUsers` wurde **nicht** gerufen —, sonst nur an die aus `getInvitedMembers`; doppelte Choice-Titel → 400 mit `SurveyErrorMessages.DuplicateChoiceTitle`; eigene Choice bei Frage ohne `showOtherItem` → 403) **plus** `iter.sh cmd 'npm run check-error-message-translations'`.
i18n: **DE+EN+FR** für jeden neuen `SurveyErrorMessages`-Member, hier mindestens `survey.errors.duplicateChoiceTitleError` (2.1.0-Key, main.js:59389). `SurveyErrorMessages` ist im Fork ein TS-`enum` (`libs/src/survey/constants/survey-error-messages.ts`), und `scripts/checkErrorMessages.ts` (`npm run check-error-message-translations`) liest genau diese Enum-Member und blockt den Pre-Commit, wenn der Key in einer der drei `apps/frontend/src/locales/<lng>/translation.json` fehlt. „i18n: keine" wäre hier also schlicht ein roter Pre-Commit.
Doku: Entscheidung dokumentieren
Abhängt von: T6

### T9 — Doku + Migrations-Testlauf gegen eine Kopie  [ ]
Komponente: docs · Dateien: `docs/features/p7-surveys-limiter-collection.md`
Soll: Die Migration aus T4 ist der erste destruktive 2.1.0-Datenschritt im Fork.
Änderung: Spec schreiben (Vorher/Nachher-Datenmodell, Migrationslogik, Retry-Verhalten, Rollback = Dump **+ `./data/master.key`**, offene `[?]` aus T7/T8). Migration auf der crabbox gegen eine **Kopie** einer realistischen Survey-DB laufen lassen und Laufzeit + migrierte Dokumentzahl protokollieren.
Verify: Der reine Bootlog-Grep **genügt nicht** — `Migration completed: … documents migrated` wird nur bei `counter > 0` geloggt (main.js:62733) und die `un-migrated`-Zeile nur bei Fehlern (62736): auf einer leeren Kopie sind beide Bedingungen trivial erfüllt und der Task meldet grün, ohne etwas geprüft zu haben. Stattdessen: (1) Kopie so seeden, dass mindestens ein Survey mit nicht-leeren `backendLimiters` **und** dazu passende `SurveyAnswer`-Dokumente enthalten sind; Ist-Zahlen (Surveys mit Limitern, (Survey,Frage)-Paare, Antworten je Choice) vorher notieren. (2) Stack starten wie im `/test`-Skill (`iter.sh deploy`), **nicht** `iter.sh cmd 'node dist/apps/api/main.js'` — das läuft im Vordergrund und kehrt nie zurück. (3) Danach **gegen die DB** prüfen: `db.surveysbackendlimiters.countDocuments()` === Zahl der erwarteten (Survey,Frage)-Paare · `db.surveys.countDocuments({backendLimiters: {$exists: true}})` === 0 · `db.surveys.countDocuments({schemaVersion: {$lt: 2}})` === 0 · die Summe der `selectionCount` je Frage stimmt mit den vorher gezählten Antworten überein (deckt die `choice.name`-vs-`choice.title`-Matcher-Falle aus T4 auf) · `db.surveysbackendlimiters.getIndexes()` zeigt den Unique-Index (der einzige echte Nachweis, den die Jest-Suite nicht führen kann). (4) Zweiter Boot: `Migration completed` erscheint **nicht** mehr (Konvergenz-Nachweis; schlägt fehl, wenn der `schemaVersion`-Default aus T5 auf 1 stehen geblieben ist). Laufzeit, Dokumentzahlen und alle vier Zählwerte ins Doc.
i18n: keine
Doku: `docs/features/p7-surveys-limiter-collection.md`
Abhängt von: T6
