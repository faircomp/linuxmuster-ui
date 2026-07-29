# p3-wiki — Wiki-Modul (WebDAV-gestützt, TipTap/KaTeX-Editor, Share-Visibility)

> Kalibrierung: **P3 — geerdetes Rekonstruktions-Ledger**, kein voll durchgetakteter Wochenplan.
> Die BE-Struktur ist 1:1 aus `main.js` verifiziert (Controller/Services/DTOs mit Zeilenankern),
> die FE-Task-Granularität **schärft sich nach dem Chat-Piloten (`p2-chat`)** + der P0-Basis-Drift-
> Analyse: Chat etabliert das native-App-FE-Muster (Zustand-Store mit `eduApi`, Native-Route-
> Registrierung, i18n-Sweep), das Wiki erbt. **Wiki ist der größte FE-Kostenblock des ganzen Forks**
> (~20–35 PT, Editor-Chunk allein 1,35 MB); die Tasks sind bewusst fein geschnitten, damit jede
> unabhängig auf der crabbox verifizierbar bleibt. Bewusste Scope-Entscheidung (Master-Plan §4.3
> Zeile 224): **TipTap-StarterKit + KaTeX „gut genug" statt pixel-/verhaltensgleicher Nachbau.**

## Problem / Motivation

edulution 2.0 hat ein natives **Wiki-Modul**, das in 1.6.266 **0×** existiert (weder BE noch FE,
kein Rescue-Branch `upstream/*`). Der Fork soll Feature-Parität erreichen; Wiki ist eine eigene
Phase mit eigenem Budget (Master-Plan §8 P3, Zeile 365).

Belegte Realität:
- BE komplett aus `main.js` rekonstruierbar: `WikiModule` (`main.js:69628`), `WikiController`
  (`main.js:71593`, 9 Routen), vier Services (`WikiTreeService`, `WikiPageService`,
  `WikiFolderService`, `WikiSearchService`) + `WikiFileproxyClient`, alle DTOs/Konstanten/Helper
  mit Originalnamen.
- **Wiki-Inhalte liegen NICHT in Mongo**, sondern als Markdown-Dateien auf **WebDAV**: Seiten als
  `<slug>.md` in `.wiki`-Ordnern (`WIKI_CONSTANTS.WIKI_FOLDER_NAME = '.wiki'`, `main.js:69944`).
  Das Wiki ist damit eine **View auf die bestehende WebDAV/FileSharing-Infrastruktur** — nicht eine
  neue Collection. Einzige DB-Änderung: zwei Felder auf `WebdavShares` (siehe Datenmodell).
- FE ist **Neubau gegen Live-Referenz** (crabbox 2.0.200 + Chunks `WikiPage-CCeoG8Ux.js` 58 KB /
  `wiki-editor-uttP9V64.js` 1,35 MB, beide un-gemappt, nur grobe Verhaltensreferenz). i18n-Keys
  `wiki.*` sind aus dem `WikiPage`-Chunk gehoben (siehe i18n-Impact).

## Ziel & Nicht-Ziele (YAGNI)

**Ziel**
- BE: `WikiModule` mit 9 Routen (shares/tree/page-CRUD/folder/search) auf WebDAV, inkl.
  ETag-optimistischer Nebenläufigkeit, Pfad-Safety, 5-MB-Limit, App-Access-Guard.
- BE-Contract: `WebdavShares` erhält `wikiAccessGroups` + `wikiDisabled`; `findAllWikiShares`
  filtert Freigaben; **Migration forward-only** (`schemaVersion` 1→2).
- BE: `WIKI` als natives App in `defaultAppConfig` (Fresh-Install-Parität) +
  `WIKI_SHARE_VISIBILITY_TABLE`-ExtendedOption (Admin steuert je Share `wikiDisabled`/`wikiAccessGroups`).
- FE: Wiki-Seite (Sidebar-Baum, Seitenansicht, Editor, Dialoge, Konflikt-/Merge-UI, Draft-Recovery,
  Suche) + Admin-Share-Visibility-Tabelle + i18n DE+EN.
- FE-Editor: TipTap-StarterKit + KaTeX + Codeblock-Highlight + Tabellen + Bild-Upload nach WebDAV.

**Nicht-Ziele (YAGNI)**
- **Kein** pixelgenauer/verhaltensgleicher Nachbau des 1,35-MB-Editors (StarterKit „gut genug").
- **Kein** Eigenbau des Volltext-Such-Index: die Suche spricht einen **externen `fileproxy`-Dienst**
  (`/wiki/search`, `/wiki/list`) an; fehlt er, degradiert die Suche sichtbar (`status: unavailable`).
  Wir bauen den Client + die degradierte UX nach, **nicht** den Suchdienst selbst.
- **Keine** Realtime-Kollaboration (kein Yjs/CRDT) — Nebenläufigkeit ist ETag-basiert (If-Match +
  3-Wege-Merge-UI), exakt wie 2.0.
- **Keine** neue Mongo-Collection für Seiten (Storage bleibt WebDAV).
- MobileDevices-/Satellites-Bezüge: außerhalb Scope.

## Betroffene Komponenten & Dateien (konkrete Pfade)

**libs (shared, AGPL-SPDX)**
- `libs/src/wiki/constants/` — `wikiEndpoints.ts` (BASE/SHARES/TREE/PAGE/FOLDER/SEARCH),
  `wikiConstants.ts`, `wikiNodeType.ts`, `wikiSearchStatus.ts`, `unavailableShareReason.ts`,
  `wikiSearchScope.ts`, `wikiSearchThrottleConfig.ts`, `wikiErrorMessages.ts`.
- `libs/src/wiki/types/` — `wikiPageDto.ts`, `wikiTreeChildDto.ts`, `createWikiPageDto.ts`,
  `updateWikiPageDto.ts`, `createWikiFolderDto.ts`, `wikiFolderCreatedDto.ts`, `wikiSuccessDto.ts`,
  `wikiSearchRequestDto.ts`, `wikiSearchResponseDto.ts` (+ Hit/UnavailableShare).
- `libs/src/appconfig/constants/apps.ts` — `WIKI: 'wiki'` (fehlt in 1.6; 2.0 `main.js:218`).
- `libs/src/appconfig/constants/extendedOptionKeys.ts` — `WIKI_SHARE_VISIBILITY_TABLE` (`main.js:2098`).
- `libs/src/appconfig/constants/extendedOptions/wikiShareVisibilityExtendedOptions.ts` (neu).
- `libs/src/filesharing/types/webdavShareDto.ts` — `wikiAccessGroups`, `wikiDisabled`
  (`main.js:58251/58297/58301`).

**apps/api (NestJS)**
- `apps/api/src/wiki/` (neu) — `wiki.module.ts`, `wiki.controller.ts`,
  `wiki-tree.service.ts`, `wiki-page.service.ts`, `wiki-folder.service.ts`,
  `wiki-search.service.ts`, `wiki-fileproxy.client.ts` + Helper (`resolveWikiPath.ts`,
  `wikiDiskPaths.ts`, `wrapWikiPathOp.ts`, `extractTitleFromMarkdown.ts`, `WikiPathError.ts`,
  `assertShareAccessible.ts`, `wikiEtagConflict.http-exception.ts`) + `*.spec.ts`.
- `apps/api/src/webdav/webdav.service.ts` — **erweitern** um `probeFolder`,
  `getFileContentWithRange` (Range/ETag), `WebdavEtagConflictError` (fehlen in 1.6, siehe Drift).
- `apps/api/src/webdav/shares/webdav-shares.schema.ts` — Felder `wikiAccessGroups`/`wikiDisabled`,
  `schemaVersion` default bleibt, **neu** `migration001.ts` + `webdavSharesMigrationList.ts`.
- `apps/api/src/webdav/shares/webdav-shares.service.ts` — `findAllWikiShares` (`main.js:4992`).
- `apps/api/src/appconfig/…` defaultAppConfig-Seed — `WIKI`-Eintrag (`main.js:2456`).
- `apps/api/src/common/` — Throttle-Decorator + Guard für die Such-Route (fehlt in 1.6; siehe Drift).
- `apps/api/src/app.module.ts` (o. ä.) — `WikiModule` registrieren (`main.js:846`).
- `apps/api/src/assets/` — `edu_Wiki.svg` (SVG-Quelle `main.js:2585`).

**apps/frontend (React/Vite)**
- `apps/frontend/src/pages/Wiki/` (neu) — `WikiPage.tsx`, Sidebar-Baum, Seitenansicht (Markdown/KaTeX-
  Render), Editor-Wrapper, Dialoge, Konflikt-/Merge-Panel, Draft-Recovery-Banner, Such-Panel.
- `apps/frontend/src/pages/Wiki/editor/` — TipTap-Editor (StarterKit+KaTeX), Toolbar, Bild-Upload.
- `apps/frontend/src/store/…` — `useWikiStore.ts` (Zustand, `eduApi`).
- `apps/frontend/src/components/structure/layout/NativeAppPageManager.tsx` — `WIKI`→`WikiPage`-Mapping.
- `apps/frontend/src/pages/Settings/AppConfig/appConfigOptions.ts` — `WIKI`-Section +
  `WIKI_SHARE_VISIBILITY_TABLE`.
- `apps/frontend/src/locales/{de,en}/translation.json` — `wiki.*`-Keys.

## Quelle des Solls (Zeilenanker / Baseline)

- **Kein Rescue-Branch** (`upstream/*` hat kein Wiki) → reine Rekonstruktion aus `main.js`.
- `WikiModule` `main.js:69628` · Registrierung `main.js:846`
- `WikiController` `main.js:71593` (Routen 71648–71772) · Endpoints `WIKI_ENDPOINTS` `main.js:71807`
- `WikiTreeService` `main.js:69691` · `WikiPageService` `main.js:70610` ·
  `WikiFolderService` `main.js:70884` · `WikiSearchService` `main.js:71024`
- `WikiFileproxyClient` `main.js:70322` (`/wiki/search` 70367, `/wiki/list` 70427)
- Konstanten: `WIKI_CONSTANTS` `main.js:69943`, `WIKI_NODE_TYPE` `main.js:69976`,
  `WIKI_SEARCH_STATUS`/`UNAVAILABLE_SHARE_REASON` `main.js:70490`,
  `WIKI_ERROR_MESSAGES` `main.js:1205`, Throttle `main.js:71843`
- Helper: `resolveWikiPath`/`joinWikiPath` `main.js:70007`, `wikiDiskPaths` `main.js:70129`,
  `extractTitleFromMarkdown` `main.js:70190`, `wrapWikiPathOp` `main.js:70271`,
  `assertShareAccessible` `main.js:70228`
- DTOs: `CreateWikiPageDto` 71876 · `CreateWikiFolderDto` 71932 · `UpdateWikiPageDto` 71979 ·
  `WikiPageDto` 72025 · `WikiTreeChildDto` 72095 · `WikiSearchRequestDto` 72170 ·
  `WikiSearchResponseDto`/`WikiSearchHitDto`/`UnavailableShareDto` 72241 · `WikiSuccessDto` 72432 ·
  `WikiFolderCreatedDto` 72470
- `WebdavShares`-Felder `main.js:5219–5224` · `findAllWikiShares` `main.js:4992` ·
  `WebdavShareDto` `main.js:58251/58297/58301`
- `WIKI_SHARE_VISIBILITY_TABLE` `main.js:2098` · `defaultAppConfig`-WIKI-Eintrag `main.js:2456` ·
  `WIKI`-App-Slug `main.js:218` · Icon-SVG `main.js:2585`
- FE-Referenz (nur Verhaltensreferenz): `scratchpad/ui-img/.../WikiPage-CCeoG8Ux.js`,
  `.../wiki-editor-uttP9V64.js`
- **Baseline-Screenshot fehlt** (`scratchpad/real/` endet bei 18-settings) → muss beim FE-Bau frisch
  gegen crabbox 2.0.200 aufgenommen werden.

## Datenmodell / API / Migrationen

**Routen (`WikiController`, Base `wiki`, alle unter ApiAuth + RequireAppAccess(WIKI))**

| Methode | Pfad | Handler | Body/Query | Antwort |
|---|---|---|---|---|
| GET | `wiki/shares` | listShares | — | `WebdavShareResponseDto[]` |
| GET | `wiki/tree?path=` | getTree | `path` | `WikiTreeChildDto[]` |
| GET | `wiki/page?path=` | getPage | `path` | `WikiPageDto` (+`ETag`-Header) |
| POST | `wiki/page` | createPage | `CreateWikiPageDto` | `WikiPageDto` (201) |
| PUT | `wiki/page?path=` | updatePage | `If-Match` + `UpdateWikiPageDto` | `WikiPageDto` / 409 / 428 |
| DELETE | `wiki/page?path=` | deletePage | `path` | `WikiSuccessDto` |
| POST | `wiki/folder` | createFolder | `CreateWikiFolderDto` | `WikiFolderCreatedDto` (201) |
| DELETE | `wiki/folder?path=` | deleteFolder | `path` | `WikiSuccessDto` |
| POST | `wiki/search` | search | `WikiSearchRequestDto` | `WikiSearchResponseDto` (Throttle 60/60 s) |

Frontend-Pfadformat durchgehend `<shareDisplayName>/<relativePath>` (ohne `.wiki`/`.md`). Disk-Mapping
via `wikiDiskPaths`: Seite → `<...>/.wiki/<slug>.md`, Ordner-Index → `<parent>/.wiki/index.md`.

**Nebenläufigkeit:** PUT verlangt ETag (If-Match-Header **oder** `body.etag`). Fehlt er → **428
Precondition Required** (`PAGE_ETAG_MISSING`). Mismatch → **409** mit `{ currentEtag, serverContent }`
für die 3-Wege-Merge-UI (`WikiEtagConflictHttpException`, `main.js:71628`). 5-MB-Grenze
(`MAX_WIKI_PAGE_SIZE_BYTES`) → **413** bzw. `MaxLength` im DTO.

**DB-Migration nötig: JA (forward-only).** `WebdavShares` bekommt `wikiAccessGroups: []` und
`wikiDisabled: false` (in 1.6 nicht vorhanden, verifiziert). Neue `migration001` auf dem
`WebdavShares`-Modell hebt `schemaVersion` 1→2 und setzt die Defaults auf Bestandsdokumenten;
`webdavSharesMigrationList` wird ergänzt. Ko-lokalisiert mit diesem Feature-Paket (Owner-Map
`p0-migrations-inventory`), läuft in `onModuleInit` über `MigrationService.runMigrations`.

**Contract-Drift (API↔DTO↔FE↔appconfig):**
- `WebdavShareDto` (libs) muss `wikiAccessGroups`/`wikiDisabled` spiegeln, sonst schluckt die
  bestehende Share-Update-Route die Wiki-Felder nicht (Persistenz der Share-Visibility läuft über die
  **bestehende** `webdav-shares.controller` PUT-Route, nicht über eine neue Wiki-Route).
- `apps.ts` (FE+BE geteilt) muss `WIKI` enthalten, sonst schlägt `RequireAppAccess(WIKI)` bzw. die
  Native-Route fehl.
- `defaultAppConfig`-Seed: WIKI-Eintrag (`position: 7`, `appType: NATIVE`, `isPinned: true`) — sonst
  zeigt ein Fresh-Install ein anderes Standard-Layout (Master-Plan §6, Zeile 127).
- `WIKI_SHARE_VISIBILITY_TABLE` muss in `extendedOptionKeys` **und** als ExtendedOption-Definition
  gewirt sein, sonst rendert die Admin-Tabelle nicht.

## Auth / Guards (welche mit-portieren)

- **Controller-Ebene:** `@ApiAuth()` (`api_auth_decorator`, `main.js:71775`) +
  `@RequireAppAccess(APPS.WIKI)` (`main.js:71776`) — **beide zwingend mit-portieren**, sonst
  Auth-Bypass (Guardrail aus Audit).
- **Such-Route zusätzlich:** `@Throttle(WIKI_SEARCH_THROTTLE_LIMIT=60, TTL=60000)` + `ThrottleGuard`
  (`main.js:71761`). Throttle-Infra fehlt in 1.6 → mit-portieren bzw. `@nestjs/throttler` einführen.
- **Param-Decorators:** `@GetCurrentUsername()` / `@GetCurrentUserGroups()` (bestehen in 1.6) liefern
  die Identität an alle Service-Aufrufe; Zugriff wird **datenseitig** über `findAllWikiShares` +
  `assertShareAccessible` erzwungen (Gruppen-Sichtbarkeit, `wikiDisabled`, Admin-Bypass via
  `getAdminGroupsFromCache`).

## Externe Integrationen

- **WebDAV** (bereits in 1.6, `WebdavService`): primärer Storage. Wiki nutzt `createFolder` (vorhanden)
  **plus** `probeFolder` und `getFileContentWithRange` (**fehlen in 1.6** — Drift, eigener Task).
- **`fileproxy`-Suchdienst** (Companion-Image, pro Share via `share.url`): `WikiFileproxyClient` ruft
  `POST /wiki/search` + `GET /wiki/list` mit Header `X-Edulution-Groups`; Timeout 8000 ms; bei
  Fehler `status: unavailable`/`degraded` mit `reason`. → **Supply-Chain-Eintrag** (Master-Plan §5,
  P0-Lieferkette): ohne diesen Dienst funktioniert alles außer Volltextsuche; die Suche degradiert
  sichtbar. Für die crabbox-Verifikation muss geklärt werden, ob der fileproxy im echten LMN-Stack
  läuft (siehe Offene Fragen).
- **`slugify`** (Pure-JS, `main.js` webpack 1083): Seiten-Slugs; **muss in Root-`package.json`**
  (Master-Plan §5, Zeile 131 — sonst 0× in generierter API-pkg).
- **TipTap/ProseMirror/KaTeX** (FE): `@tiptap/*`, `prosemirror-*`, `katex` — neu in Root-`package.json`.
  Markdown-Render kann `remark-gfm` + `rehype-highlight` (bereits vorhanden) nutzen.

## Secrets / Env / master.key

- **Keine** neuen Secrets, **keine** `master.key`-Berührung. Wiki authentifiziert WebDAV über die
  bestehende Session/Kerberos-Kette des `WebdavService`; der fileproxy nutzt den
  `X-Edulution-Groups`-Header (keine Credentials im Klartext).
- Eventuelle fileproxy-Basis-URL wird aus `share.url` abgeleitet (`fileproxyBase`, `main.js:70366`),
  nicht aus Env — kein `.env`-Delta zwingend. Falls der fileproxy im Fork-Stack einen eigenen
  Endpoint braucht, landet der in `.env.default` (Contract-Sync Env↔.env.default) — offen bis
  Supply-Chain-Klärung.

## Trade-offs & Alternativen (mit Empfehlung)

1. **Editor: StarterKit vs. voller Nachbau** — Empfehlung **StarterKit + KaTeX** (Master-Plan-Vorgabe).
   Der 1,35-MB-Chunk pixelgenau zu treffen frisst Monate ohne Sourcemaps; StarterKit liefert
   Überschriften/Listen/Code/Tabellen/Fett/Kursiv, KaTeX-Extension die Formeln. Risiko: kleinere
   Toolbar-/Verhaltensabweichungen — akzeptiert.
2. **Suche: fileproxy-Client nachbauen vs. weglassen** — Empfehlung **Client + degradierte UX bauen,
   Suchdienst nicht**. Der Client ist klein und die degradierte UX ist Teil des 2.0-Contracts
   (`unavailableShares`). Wenn der fileproxy im Fork-Stack fehlt, ist das Modul trotzdem voll nutzbar.
3. **Share-Visibility-Persistenz: neue Wiki-Route vs. bestehende Share-Route** — 2.0 nutzt die
   **bestehende** `webdav-shares`-Update-Route (Felder auf dem Share-Dokument). Empfehlung: **1:1
   übernehmen** (kein neuer Endpoint), nur DTO/Schema/Tabelle erweitern — minimaler Drift.
4. **Throttle: `@nestjs/throttler` vs. Eigen-Guard** — Empfehlung **`@nestjs/throttler`** (wartungsarm,
   Security-Track-freundlich), sofern das 2.0-Verhalten (60 Anfragen/60 s pro User) abbildbar ist;
   sonst minimaler Eigen-Guard wie in `main.js`.

## Risiken & Rollback

- **R-W1 (Drift, hoch):** `WebdavService` in 1.6 hat **kein** `probeFolder`/`getFileContentWithRange`/
  ETag-Handling. Alle Tree-/Page-Services hängen daran. → **eigener Vorab-Task** (T7), sonst blockiert
  der ganze BE-Strang. Fallback: Methoden minimal nachziehen gegen die WebDAV-Bibliothek in 1.6.
- **R-W2 (Supply-Chain, mittel):** Suche braucht den externen fileproxy. Ohne ihn kein Volltext.
  Rollback/Degrade ist eingebaut (`status: unavailable`) → kein harter Fehler.
- **R-W3 (Migration, mittel):** `migration001` läuft auf Produktions-Shares. Forward-only, kein `down()`
  → Rollback = DB-Dump + `master.key` vor Upgrade (DR-Runbook). Idempotenz über `schemaVersion`-Filter.
- **R-W4 (FE-Umfang, hoch):** Größter Kostenblock; Gefahr des Scope-Creeps im Editor. Gegenmittel:
  StarterKit-Grenze hart halten, Editor-Erweiterungen (Bild-Upload, Tabellen) als eigene Tasks.
- **Rollback gesamt:** additiv — Modul deaktivierbar durch Entfernen des `WIKI`-appConfig-Eintrags;
  WebDAV-`.wiki`-Ordner bleiben unberührt lesbar. Schema-Felder sind additiv/nullsafe.

## Doku-Impact (Augenmaß)

- Kurzer Abschnitt „Wiki" in der Nutzer-Doku (Seiten/Ordner anlegen, Editor, Suche, Konflikt-Merge) —
  DE+EN, knapp.
- Admin-Doku: Share-Visibility (`wikiDisabled`/`wikiAccessGroups`) je WebDAV-Share.
- Ops/Supply-Chain: fileproxy-Companion in die Image-Liste (Master-Plan §5) aufnehmen, sobald geklärt.
- Migrations-Register (`p0-migrations-inventory`): `migration001` (WebdavShares 1→2) eintragen.

## i18n-Impact (DE+EN)

Neuer Namespace `wiki.*` (aus `WikiPage`-Chunk gehoben, DE+EN Pflicht). Kerngruppen:
- `wiki.description`, `wiki.sidebar`, `wiki.titlePlaceholder`, `wiki.empty.selectPageHint`
- `wiki.menu.newPage|newFolder`
- `wiki.dialog.createPage.{heading,title,titlePlaceholder,filename,location,asIndex,indexSlugReserved}`
- `wiki.dialog.createFolder.{heading,name,namePlaceholder,location}`
- `wiki.dialog.delete.{pageTitle,pageBody,folderTitle,folderBody}`, `wiki.dialog.noLocationSelected`
- `wiki.saveStatus.{saving,savedAt,error,conflict}`, `wiki.actions.{finishEditing,retrySave}`
- `wiki.conflict.{title,description,keepMine,keepTheirs,manualMerge,manualMergeHint,manualMergeSeedHint,manualMergeSeedLabel,save}`
- `wiki.draftRecovery.{banner,restore,discard}`, `wiki.notifications.pageSaved`, `wiki.metadata.updatedAt`
- `wiki.attachmentPreview.title`
- `wiki.search.{title,placeholder,inputLabel,loading,resultCount,resultsLabel,resultsLabel}`,
  `wiki.search.scope.{label,all,current}`, `wiki.search.empty.{title,subtitle}`,
  `wiki.search.degraded.{title,subtitle}`,
  `wiki.search.unavailable.{title,subtitle,affectedLabel,reasons.*}`
- `wiki.errors.*` (Server-Fehlermeldungs-Keys aus `WIKI_ERROR_MESSAGES`, `main.js:1205`):
  `invalidPath`, `invalidName`, `pageNotFound`, `pageAlreadyExists`, `pageCreationFailed`,
  `pageUpdateFailed`, `pageDeletionFailed`, `pageEtagConflict`, `pageEtagMissing`, `pageTooLarge`,
  `folderNotFound`, `folderAlreadyExists`, `folderCreationFailed`, `folderDeletionFailed`,
  `accessDenied`, `invalidSearchParams`.

## Offene Fragen

- **OF-1 (Supply-Chain):** Läuft der `fileproxy`-Volltext-Suchdienst im echten LMN-/Fork-Stack, oder
  liefern wir Wiki bewusst mit „Suche degradiert" aus? Entscheidet, ob T-Suche voll oder nur die
  degradierte UX verifizierbar ist. → an `p0-supply-chain-inventory` koppeln.
- **OF-2 (WebDAV-Drift):** Welche `WebdavService`-Methoden fehlen exakt (Range-Read/ETag/PROPFIND-
  probe) und lässt die in 1.6 genutzte WebDAV-Client-Bibliothek Range/If-Match zu? → in
  `p0-base-drift-analysis` verifizieren, bevor T7 startet.
- **OF-3 (Throttle):** `@nestjs/throttler` einführen (bevorzugt) oder Eigen-Guard nachbauen? Abhängig
  davon, ob throttler das per-User-Verhalten sauber abbildet.
- **OF-4 (Editor-Tiefe):** Reicht StarterKit + KaTeX + Codeblock + Tabellen + Bild-Upload, oder braucht
  der reale 2.0-Editor Extras (Aufgabenlisten, Callouts, Einbettungen)? → nach Baseline-Screenshot der
  Live-Instanz entscheiden; Design-Gate.
- **OF-5 (Share-Visibility-UI-Ort):** Rendert die `WIKI_SHARE_VISIBILITY_TABLE` in der FileSharing-
  appconfig-Section (wie die WebDAV-Share-Tabelle) oder in einer eigenen WIKI-Section? Live-Referenz
  prüfen.
