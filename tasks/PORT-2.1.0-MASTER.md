# Master-Ausführungsplan — Fork → 2.1.0

Gilt für alle 2.1.0-Pakete (P6/P7). Ergänzt `tasks/backlog.md`; die Paket-Ledger bleiben die Detailebene, dieser Plan ist die Reihenfolge- und Entscheidungsschicht.

Zählung: 7 gelieferte Ledger (`p6-auth-hardening` 34 · `p6-onlyoffice-hardening` 28 · `p6-migrations-2-1-catchup` 43 · `p4-mail-rework-21-sieve` 46 · `p7-2-1-new-modules` 82 · `p7-fe-toolchain-catchup` 23 · `p7-deps-config-infra` ~30) = **286 Tasks**, davon **42 BLOCKING-Befunde** aus den Reviews. Kein Paket ist im gelieferten Zustand ausführbar.

---

## 1. REIHENFOLGE

### Grundregel: EINE serielle Migrationslinie
Migrationen sind der einzige global serialisierende Faktor. Fünf Pakete schreiben heute in dieselbe Kette (appConfig, GlobalSettings, Survey, calendar, tldrawSyncRoom, publicShares, users). **Es darf nie mehr als ein migrationsschreibendes Paket offen sein.** Serielle Linie, in dieser Reihenfolge und nur so:

`p6-migrations` → `p7-fe-toolchain-B` (GlobalSettings 008) → `p7-calendar-sogo-sharing` (calendar 001 verdrahten) → `p7-surveys-limiter-collection` (surveys 002 Verhalten) → `p4-mail` (appConfig 014)

Daraus folgt die Eigentümer-Zuordnung (siehe §3, D1): Nummern vergibt ausschließlich `p6-migrations`; wer eine Migration mit FE-/Consumer-Kopplung braucht, bekommt einen **reservierten Slot** und baut Migration + Consumer im eigenen Paket.

### Wellen

**Welle 0 — `p6-fundament` (NEU, ~12 Tasks, kein Feature-Code).**
Gemeinsame Vorbedingungen, die heute ≥2 Pakete stillschweigend voraussetzen und die kein Ledger baut:
`apiAuth.decorator.ts` (NEW:14097) · `strictValidationPipe` / `strictTransformValidationPipe` (NEW:18878) · `mailImapFlags`-Konstantenmodul (NEW:24276-24305) · master.key-Util + AES-GCM wrap/unwrap · `generate:swagger` + committete `swagger-spec.json` (oder Streichung, D5) · libs-Spec-Runner (D6) · **Beweis des Jest-Verify-Idioms** (`nx run api:test -- --testPathPattern` narrowt wirklich? sonst `npx jest -c apps/api/jest.config.ts`) · `TERMINAL_SCHEMA_VERSIONS` + statischer Schema-Default-Guard · `APP_VERSION`/Image-Tag-Policy (D4).
Warum zuerst: ohne das sind 5 Ledger nicht kompilierbar und ~40 Verify-Zeilen **falsch-grün**.

**Welle 1 — Sicherheit ohne Schema-Berührung (parallelisierbar außer package.json).**
`p6-auth-hardening` · `p6-onlyoffice-hardening` · `p7-deps-config-infra`.
Warum hier: schließen echte, heute offene Löcher (unsignierte OnlyOffice-Config + ungeprüfter Save-Callback; kein TOTP-Replay-Schutz; kein Logout-Revoke), berühren **keine** Migration, und blockieren nichts außer sich selbst. `p7-deps-config-infra` muss vor Welle 2 fertig sein — beide fassen den Dependency-Baum an.

**Welle 2 — `p7-fe-toolchain-A`** (React 18→19 inkl. Wegfall `react-helmet-async`, ESLint 8→9 Flat-Config, tldraw 3.15.6, Bundle-Diff-Report, 2.1.0-Baselines).
Warum genau hier: jede FE-Zeile aus Welle 4/5 würde sonst **zweimal** geschrieben (einmal gegen ESLint-8/React-18, einmal nachgezogen). Nach Welle 1, weil React 19 auf einem bereits CVE-bereinigten Baum aufsetzt und `check-npm-audit` sonst zwei Ursachen mischt.

**Welle 3 — `p6-migrations-2-1-catchup` ALLEIN, strikt seriell.**
XL, destruktiv, kein zweiter Branch offen. Enthält nach D1 nicht mehr: ciDarkBlue-FE (→ 3B), tldraw-000 (→ 3B), Mail-Key-Renames (→ p4-mail). Endet mit `assert-schema-versions` + Doppel-Boot-Beweis.

**Welle 4 — Contract-Änderungen mit Migration, strikt seriell untereinander.**
4a `p7-fe-toolchain-B` (ciDarkBlue GlobalSettings 008 + FE + Tailwind + i18n; tldraw-Asset-Routen + `WhiteboardAssetAccessGuard` + Disk-Move-Migration).
4b `p7-calendar-sogo-sharing` (verdrahtet die in Welle 3 gebaute, bewusst unverdrahtete `calendar/001`; ID-Wechsel base64url→sha256).
4c `p7-surveys-limiter-collection` (SSE-Broadcast, `selectionCount`-Reconcile — Struktur kam in Welle 3).

**Welle 5 — Neue Module (parallel, außer appConfig-Migration).**
`p4-mail-rework-21-sieve` (XL, hält den Migrations-Slot 014 — muss nach 4c starten) · `p7-contacts` · `p7-lmn-exam-jobs` · `p7-lmn-pdf-fallback`. `p7-ai` **gesperrt** bis D13.

### Muss strikt seriell sein (nicht verhandelbar)
1. Die gesamte Migrationslinie (Welle 3 → 4a → 4b → 4c → p4-mail).
2. `p7-deps-config-infra` → `p7-fe-toolchain-A` (gemeinsamer Dependency-Baum).
3. Innerhalb `p6-auth`: T17 (API-Two-Stage) → T28/T29 (FE) → T30 (Route-Delete). Vorziehen von T30 macht jeden MFA-Login unmöglich.
4. Innerhalb `p6-onlyoffice`: T5–T8 **ein** Commit, T9+T10 **ein** Commit, T15–T18 **ein** Commit.
5. Innerhalb `p7-fe-toolchain-B`: T6→T7→T8→T9→T10→T11.

### Rebase-Pflicht auf die Session-Fixes (bereits im Fork, nicht neu planen)
- **SSE-Namespacing + Doppel-Subscriber-403 + `isNonUserChannel`** → `p6-auth` T23–T27: der QR-Kanal ist ein Nicht-User-Channel; Cookie-Pfad `/edu-api/sse/auth` gegen die **neue** Namespacing-Form prüfen, nicht gegen die Ledger-Annahme. Betrifft direkt Blocker A3.
- **`ValidatePathPipe` auf beiden Whiteboard-Asset-Routen** → `p7-fe-toolchain-B` T7/T9 fügt `WhiteboardAssetAccessGuard` **zusätzlich** hinzu; die Pipe bleibt (Guard ≠ Pipe-Ersatz).
- **Mail-Provider-Config AdminGuard + public route + serverseitige Auflösung** → `p4-mail` T39/T41 darf das nicht zurückdrehen; die Provider-Config-Route ist bereits abgesichert.
- **appconfig-Public-Routen-Allowlist + `accessGroups` nicht mehr exponiert** → `p7-deps-config-infra` T18 (`NON_ADMIN_EXTENDED_OPTION_KEYS`) baut auf der bestehenden `PUBLIC_EXTENDED_OPTION_KEYS`-Allowlist auf, **keine zweite parallele Liste**.
- **IP-Throttle auf `POST /auth` + `GET /auth/totp/:username`** → `p6-auth` T20 erweitert um `byUsername` (Obermenge, `byIp` bleibt); T30 löscht die totp-Route samt ihres Throttles.
- **`RequireAppAccess(LINUXMUSTER)` auf parent-child-pairing** → keine Kollision, nur als erledigt vermerken.

---

### Verify-Regeln, die in dieser Session teuer erkauft wurden

Jede dieser Fallen hat mindestens ein Ledger falsch-grün gemacht. Vor dem Schreiben einer `Verify:`-Zeile lesen:

1. **`.reference/` existiert auf der Box nicht** (`.crabbox.yaml` `sync.exclude`). Ein Bundle-`grep` über
   `iter.sh cmd` schlägt dort fehl — und weil der Fehler meist nur einen Teil einer Pipeline betrifft, endet das
   Kommando trotzdem mit Exit 0, nur mit kleinerem Universum und dadurch **leichterer** Prüfschleife. Bundle-Greps
   laufen **lokal**.
2. **`… || echo OK`** druckt `OK` genau dann, wenn ein Glied **fehlschlägt** — invertiert falsch-grün.
   Stattdessen `…; echo "[rc=$?]"` und auf `[rc=0]` prüfen.
3. **`|| true`** schluckt genau den Guard davor.
4. **`! grep -q <name> <datei>`** kann nie grün werden, wenn der Name berechtigt in der Datei stehenbleibt
   (z. B. als Delegationsziel). Am Zeilenanfang ankern (`^  name(`).
5. **`! grep …` auf eine NEUE Datei** ist vakuum-grün: ohne Datei scheitert `grep`, `!` dreht das in Erfolg.
   Immer `test -f <datei> && ! grep …`.
6. **`grep` ist zeilenbasiert.** Ein Muster, das die Quelle über zwei Zeilen umbricht (`… ??\n  WERT;`), matcht nie.
7. **`npm run check-filenames` liest nur gestagte Dateien** — ohne vorheriges `git add` prüft es nichts und endet mit 0.
8. **Testzahl-Zusagen gegen die reale Baseline messen**, nicht schätzen; eine Untergrenze unterhalb des Ist-Standes
   ist ohne jede Arbeit erfüllt.
9. **`grep -c` über ein Glob** (`docs/adr/*.md`) gibt Pro-Datei-Zählungen aus — ein `≥ n`-Vergleich darauf ist bedeutungslos.
10. **`npm run lint` ist als Abnahme-Gate untauglich — es repariert still.** `apps/api/project.json` (und
    `apps/frontend/project.json`) setzen am Lint-Target `"options": { "fix": true }`. Der Lauf **schreibt also in
    den Arbeitsbaum** und meldet für jede autofixbare Regel (u. a. `import/order`) Erfolg, ohne sie je zu zeigen.
    Genau so ist es am 2026-07-27 passiert: lokal 3 `import/order`-Fehler, remote „All files pass linting".
    **`--skip-nx-cache` hilft dagegen nicht** — `fix` ist eine Target-Option und wirkt weiter.
    Gate deshalb `npx nx run-many -t lint --skip-nx-cache --fix=false` oder direkt `npx eslint <pfade>`.
    Nebenbefund: `npm run lint` ist auf `--projects=frontend,api,libs` festgenagelt, `nx run-many -t lint` nimmt das
    Root-Projekt mit → 4 statt 3 „All files pass"-Zeilen, unabhängig vom Cache.
11. **`nx run api:test -- --testPathPattern=X`** narrowt korrekt (bewiesen), aber: jest 29.7 → **Singular**;
    **nie** eine `|`-Alternation (nx reicht den Wert ungequotet an eine Shell); **nie** `--listTests` als Gate
    (endet bei 0 Treffern mit Exit 0). Frontend: Pfad **relativ zu `apps/frontend`**.

## 2. BLOCKER

42 BLOCKING-Befunde. **Kein Paket startet, bevor seine Blocker im Ledger behoben sind.** Reihenfolge = Fix-Reihenfolge.

### `p6-fundament` (neu anzulegen — löst zugleich A1, C6, D-quer, E3, E6, G3)
| # | Befund | Fix |
|---|---|---|
| F1 | `libs/**/*.spec.ts` wird von **keinem** Runner erfasst (api-Jest rootDir=`apps/api`, vitest include=`apps/frontend/src`); 0 Specs unter `libs/` | Runner festlegen oder Specs nach `apps/api/src/…` (betrifft p6-auth T5, p4-mail T22) |
| F2 | `nx run api:test -- --testPathPattern=X` unbewiesen → ~25 Verifies können **vakuum-grün** laufen | Idiom einmal beweisen (Testzahl-Assertion), sonst `npx jest -c apps/api/jest.config.ts` |
| F3 | `@ApiAuth()` existiert im Fork nicht (0 Treffer) — 3 Ledger fordern ihn, eines begründet ihn fälschlich als Auth-Fix | Decorator aus NEW:14097 portieren (reine Swagger-Doku, **kein** Runtime-Auth) |
| F4 | ~~`strictValidationPipe` existiert nicht~~ | **ERLEDIGT** — `apps/api/src/common/pipes/strictValidationPipe.ts` + `strictTransformValidationPipe.ts` gebaut (`NEW:14694` / `NEW:18878`). p7-2-1 T6 und p4-mail sind auf die Dateien umgebogen; T6s widersprüchliche `transform:true`-Vorgabe ist korrigiert. Offen bleibt nur die Abhängigkeitskante calendar-T9/T14 → contacts-T6. |
| F5 | `npm run generate:swagger` + `swagger-spec.json` existieren nicht — 4 Tasks haben sie als DoD | Portieren oder Zeile streichen (D5) |
| F6 | ~~Kein `mailImapFlags`-Modul~~ | **ERLEDIGT** — `libs/src/mail/constants/mailImapFlags.ts` (`NEW:24276-24322`, alle sechs Konstanten, Laufzeitwerte gegen das Bundle geprüft). Die zwei hartkodierten `'INBOX'` im Fork sind bereits umgestellt. |

### `p6-auth-hardening` (4)
- **A1** `libs/…/compareSecretsConstantTime.spec.ts` läuft nirgends → T5-Verify (einziger Beweis der Constant-Time-Prüfung) ist nichtig. → F1.
- **A2** `apps/api/src/auth/auth.service.spec.ts` **existiert nicht**, wird aber von T13/T15/T16/T17/T18/T24/T27 verifiziert. T13 muss sie anlegen, alle sieben sie unter `Dateien` führen.
- **A3** `QrLoginSessionService` gehört laut Bundle in das `@Global SseModule` (NEW:74093-74102), nicht in `AuthModule`; T26 erzwingt eine Modulkante, die Upstream nicht hat. Bundle folgen (SseModule ist im Fork bereits `@Global`) oder als DEVIATION begründen.
- **A4** T27 ruft `qrLoginSessionService.consume()`, die Injection kommt erst in T24 — `Abhängt von` fehlt, kompiliert nicht.
- *(Nits mit Bissqualität: T10 muss `if (user)` aus NEW:79684 übernehmen; T31 muss die TTL-Konstante importieren statt `3*60*1000`; `POST /auth/logout` ist `@Public()` **ohne** Throttle.)*

### `p6-onlyoffice-hardening` (6)
- **O1** `OnlyOfficeCallBackData` hat kein `token`-Feld (0 Treffer) und es gibt keinen Typ für den verifizierten Payload → T9 kompiliert nicht. Task vor T9 einziehen.
- **O2** T9 macht `handleCallback` zur Instanzmethode, der Aufrufer wird erst in T10 gefixt → T9+T10 ein Commit (oder tsc in T9-Verify).
- **O3** T5–T8 brauchen dieselbe „ein Commit"-Markierung: Zwischenstand = **403 auf jedes Office-Dokument**.
- **O4** T27 ist gegen die von T9 vorgeschriebene Struktur unimplementierbar — der `isClosedWithoutChanges`-Zweig muss **vor** `isAllowedOnlyOfficeDownloadUrl` (NEW:54561-54566), sonst wirft `new URL(undefined)` und Status 4 endet in 403.
- **O5** T18 schreibt einen Controller-Spec-Test, den `filesharing.controller.spec.ts` (`serviceMock = {}`) nicht hergibt → 401-Anker nach `filesharing.service.spec.ts`.
- **O6** T24 fehlt das Return-Mapping `{persistUsername,persistShare}` → `{username,share}` (NEW:54718-54724) → Persist-Pin greift **still** nie. Typ + Spec-Fall ergänzen.

### `p6-migrations-2-1-catchup` (9) — das riskanteste Ledger
- **M1** T19 bricht `getPassword` zur Laufzeit: nach `users/000` ist jeder Key `wrapped:…`, der CryptoJS-Pfad (`users.service.ts:215/234`) liefert dann `''` statt zu werfen. Unwrap in `getPassword`, Wrap im Upsert (`:86`), `EncryptKeyUnwrapFailed`, Spec — **Pflicht im selben Commit**.
- **M2** T16/T17: `SURVEY_PARTICIPATION` fehlt in `sourceTypeToApp.ts` (nicht-exhaustiv → tsc rot) und im Deep-Link-Set; ohne Mapping (NEW:24050/24122) tut die Migration das Gegenteil ihres Namens. T16-Verify hat **gar keinen** tsc-Lauf.
- **M3** T15 (ciLightBlue) trifft 20 Fundstellen, nicht 5: i18n DE+EN+FR, `ThemeSettings.tsx:77`, 5 Tailwind-Klassennutzungen. `i18n: keine` ist falsch, das Endkriterium unerreichbar, der Klassen-Rename **unsichtbar** für tsc+vitest. → nach D1 komplett zu `p7-fe-toolchain-B`.
- **M4** T21 (tldraw/000): `roomData` wird in-place mutiert; Bump ins `finally` zu ziehen persistiert **halb** umgeschriebene Daten. Korrekt: im Fehlerfall nur `{$set:{schemaVersion}}`, Spec muss beweisen dass `roomData` nicht geschrieben wird.
- **M5** T24/T25-Umsortierung erzeugt eine dauerhafte Boot-Oszillation, sobald `publicShares/000` (`$set:{schemaVersion:1}`) nachkommt. Bindende Auflage ins Ledger: 000 nutzt `$max` oder wird umnummeriert.
- **M6** Verify-Idiom (→ F2).
- **M7** T11 kann „keine Magic Strings" nicht erfüllen: `MAIL_SMTP_URL`/`MAIL_SMTP_SECURE`/`MAIL_SMTP_TLS_REJECT_UNAUTHORIZED` fehlen im Fork und werden von T10 nicht angelegt.
- **M8** T13/T14: `EDUI_ORGANIZATION_TYPE` wird bei **Modul-Load** destrukturiert (NEW:8160) — der vorgeschriebene Spec kann nicht grün werden ohne `jest.resetModules()` + dyn. Import.
- **M9** **T42 ist mitten im Token abgeschnitten** — der einzige Voll-Stack-Beweis + die Konsolidierung fehlen. Ledger unvollständig geliefert.

### `p4-mail-rework-21-sieve` (7)
- **P1** T41 löscht `MAIL_IMAP_URL/SECURE/TLS_REJECT_UNAUTHORIZED`, die 4 lebende Consumer haben (`mails.service.ts:115-118`, `mail-idle.service.ts:122-129`, `imapMailFeed.ts:26/34/42/50`) — T15 behauptet gleichzeitig, `MailIdleService` bleibe unangetastet. Zusätzlich fehlt die Settings-UI-Verdrahtung (`appConfigOptions.ts:42,85`, `appConfigSectionsKeys.ts:26`) → neue Felder rendern nie.
- **P2** T15/T20 lesen appconfig-Keys, die erst T41 anlegt → tsc rot. `Abhängt von: T41` nachziehen.
- **P3** `mailImapFlags` fehlt (→ F6).
- **P4** T35 ist gegen 2.0.200 geschnitten: **17 `MailsService`-Methoden** fehlen im Fork und sind keiner Task zugeordnet (`sendMail`, `saveDraft`, `getSharedMailbox*`, `setMailboxDelegates`, `listMailboxFolders`, …); T37/T39 rufen sie auf. Außerdem liegen `getMailcowDomains/-Mailboxes/updateMailboxAcl` im Fork auf `MailcowAdminService`, nicht `MailsService`. ~6 zusätzliche Tasks.
- **P5** **Alle 10 FE-Verifies benutzen `--testPathPattern` (Jest-Flag) gegen Vitest** — nicht ausführbar. → positionaler Filter.
- **P6** Abhängigkeitskanten fehlen: T35→T30 (SharedMailbox-Schema), T36→T30, T31→T35. Drei Tasks kompilieren in der angegebenen Reihenfolge nicht.
- **P7** ADR-Nummernkollision: `docs/adr/0002-mobile-access-hidden.md` existiert → 0003.

### `p7-2-1-new-modules` (6)
- **N1** `CalendarShareRole` hat **5** Member und **SOGo-Wire-Werte** (NEW:44850-44856: `DAndTViewer`, `Viewer`, `Responder`, `Modifier`, `None`), nicht 4 mit Key==Wert. Der T3-Round-Trip-Verify läuft auf der kaputten Fassung **grün** — jeder `saveUserRights`-Body wäre still falsch.
- **N2** `CalendarMetadata.schemaVersion` Default ist **2** (NEW:46157-46159), nicht 1 — sonst re-selektiert `migration001` bei jedem Boot.
- **N3** `@ApiAuth()` (→ F3), inkl. der falschen Sicherheitsbegründung in p7-ai T12.
- **N4** T9 (`shares`-Ausbau) nennt die Konsumenten nicht: `calendarCreateBody.ts` (required!), `buildCalendarCreateBody.ts`, `CalendarManagementDialog.tsx`, `ShareEditor.tsx` (117 Zeilen, wird nirgends zum Löschen eingeplant), 6 Specs. FE-Hälfte in `[?]` T16 geparkt = Verstoß gegen die eigene Contract-Sync-Regel.
- **N5** `strictValidationPipe` (→ F4); T9-Verify („Body mit `shares` → 400") schlägt heute fehl, weil die Pipe kein `forbidNonWhitelisted` hat.
- **N6** Swagger-Regenerierung als DoD in 4 Tasks, existiert nicht (→ F5).
- **Review-Lücke:** exam-jobs T11/T12, alle 10 Tasks pdf-fallback und alle 9 surveys-limiter **wurden nie geprüft** (Ledger-Markdown brach ab). Vor Welle 4c/5 nachreviewen.

### `p7-fe-toolchain-catchup` (4)
- **T1** `assertRoomAccess` existiert im Fork **nicht** (nur `getPermittedUsers` + Inline-Check in `getHistory`); T7 behauptet das Gegenteil → Guard kompiliert nicht. Task NEW:74414-74429 einziehen.
- **T2** T4 (ciLightBlue-Ausbau) ist **ungegatet**, T5 (Migration 008) human-gated auf ein `migration007`, das in einem anderen Paket liegt → Kunden-Brandfarbe geht still verloren, ohne Vorwärtspfad. Nach D1: 007 aus `p6-migrations`, 008 hier, T4+T5 gemeinsam gegatet.
- **T3** T12 (AdminGuard-Wegfall auf `mails/domains`) ist `[ ]` → ein autonomer Agent zieht einen Guard. Muss `[?]`. Nach D1 gehört der Route-Rename ohnehin zu `p4-mail` T39 (Duplikat auflösen).
- **T4** T19 portiert die ESLint-Config ohne `settings` (`import/resolver.typescript`) und ohne `plugins` → `import/no-unresolved` auf jedem `@libs/*`; das genannte Abnahmekriterium (`jq -S '.rules'`-Diff) kann das per Konstruktion nicht sehen.

### `p7-deps-config-infra` (6)
- **D-1** T2: zwei `js-yaml`-Knoten; `xmlbuilder2@4.0.3` räumt nur den einen, der Top-Level-Knoten (GHSA-52cp-r559-cp3m, `@nestjs/swagger`) gehört niemandem → Verify unerfüllbar.
- **D-2** T26: `JAVA_OPTS_APPEND: ${KC_JAVA_OPTS_APPEND:-}` kann nie gesetzt werden (Compose interpoliert nicht aus `env_file`) und **überschreibt** zusätzlich den Wert aus `edulution.env` mit `""` → T28-Verify schlägt fehl.
- **D-3** Niemand setzt die Fork-Version: `package.json` steht auf `1.6.266`, `/health/version` meldet das → Installer-Contract zeigt eine falsche Zahl (D4).
- **D-4** T30 hat kein ableitbares Image-Tag: `container-build.yml:49-67` taggt `:latest` nur für `master`/`v*`, Default-Branch ist `main` → es existiert nur `:main` (D4).
- **D-5** `docker compose -f <template> config -q` kann nicht laufen (`env_file: edulution.env` fehlt zur Prüfzeit) — YAML-Parse als Primär-Verify.
- **D-6** T19-Zählungen falsch (52/42/36 statt 56/44/37) → das `grep -c ≥56`-Kriterium verleitet zum Erfinden von Zeilen.

---

## 3. QUERSCHNITT

Contracts über Paketgrenzen. Für jeden gilt: **Surgical-Regel ausgesetzt, alle Seiten im selben Commit.** Genau ein Eigentümer.

| Contract | Kette | Eigentümer | Auflage |
|---|---|---|---|
| **Migrations-Nummernkreis** (alle 13 Listen) | Schema-Default ↔ `previousSchemaVersion` ↔ `TERMINAL_SCHEMA_VERSIONS` ↔ `assert-schema-versions` | **`p6-migrations`** | Vergibt alle Nummern. Reservierte Slots: GlobalSettings 008 → fe-toolchain-B; appConfig 014 → p4-mail; calendar 000/001 gebaut-aber-**unverdrahtet** → p7-calendar; tldraw 000 → fe-toolchain-B |
| **ciLightBlue → ciDarkBlue** | `themeColors.ts` ↔ `defaultTheme.ts` ↔ Mongoose-Prop ↔ Migration 008 ↔ `tailwind.config.ts:22` ↔ 5 Klassennutzungen ↔ `applyThemeColors:26` ↔ `ThemeSettings.tsx:77` ↔ i18n×3 | **`p7-fe-toolchain-B`** (T4+T5 atomar) | `p6-migrations` T15 **streichen**; 007 bleibt dort (Vorbedingung) |
| **appConfig `ExtendedOptionKeys`** | Keys ↔ `defaultAppConfig` ↔ `initializeCollection` ↔ `appConfigOptions.ts` ↔ `appConfigSectionsKeys.ts` ↔ Migration ↔ i18n ↔ `PUBLIC_EXTENDED_OPTION_KEYS` (bereits gehärtet) ↔ `NON_ADMIN_…` | **`p4-mail`** für alle MAIL_*; `p7-deps-config-infra` für die Allowlisten; `p7-contacts` für CONTACTS_CARDDAV_* | Mail-Key-Renames (`migration012`) wandern aus `p6-migrations` zu `p4-mail`, weil dort die Consumer sitzen |
| **`GET mails/domains`** | Route ↔ AdminGuard ↔ `ADMIN_GUARDED_ROUTES`-Contract-Spec ↔ `useMailsStore` ↔ `MailcowAdminPanel` | **`p4-mail`** T39 | `p7-fe-toolchain` T12 **streichen** (Duplikat); Guard-Entscheidung = D8 |
| **tldraw-Assets** | Route `/assets/:roomId/*` ↔ `WhiteboardAssetAccessGuard` ↔ `assertRoomAccess` (fehlt!) ↔ `ValidatePathPipe` (bereits da) ↔ multer-Destination ↔ `roomData`-URLs ↔ Dateien auf Platte ↔ FE-Uploader | **`p7-fe-toolchain-B`** | `p6-migrations` T21 **streichen** |
| **`calendar.shares` Ausbau** | `CalendarMetadata.shares` ↔ `CreateCalendarBodyDto` (required!) ↔ `calendarCreateBody.ts` ↔ `buildCalendarCreateBody` ↔ `ShareEditor.tsx` ↔ 6 Specs ↔ Migration 000 | **`p7-calendar`**, ein Commit | FE-Hälfte darf **nicht** in `[?]` geparkt werden (N4) |
| **Kalender-ID base64url → sha256** | `deriveCalendarId` ↔ `decodeCalendarId` (entfällt) ↔ `calendar.service.ts:53/386/467` ↔ `resolveCalendarFromList` ↔ Migration 001 | **`p7-calendar`** | Ohne Service-Umbau findet der Kalender nach der Migration keinen Kalender mehr |
| **`Survey.backendLimiters`** | Schema ↔ `survey.dto.ts:28` ↔ `resetSurveyIdFromFormulasBackendLimiters` ↔ `survey-answers.service.ts:98` ↔ Migration 002 ↔ `surveyAnswers/002`-Rewrite | Struktur: `p6-migrations`; Verhalten (SSE, Reconcile): `p7-surveys` | Ordnungsgarantie: `runMigrations` aus `surveys.service.ts` raus, **vor** die Zeile in `survey-answers.service.ts` |
| **`encryptKey` wrap/unwrap** | `users/000` ↔ `users.service.ts:86` (Upsert) ↔ `:215/:234` (`getPassword`) ↔ `UserErrorMessages` ↔ master.key-Util | **`p6-migrations`** (M1) | Verbraucher-Refactor ist **Teil** der Migration, nicht Folgearbeit |
| **`AUTH_PATHS` / `AuthErrorMessages`** | libs-Konstanten ↔ Controller ↔ FE-Store ↔ `check-error-message-translations` | **`p6-auth`** | Neue Enum-Member ohne DE+EN+FR brechen den pre-commit |
| **SSE-Kanal** | Namespacing (bereits gefixt) ↔ QR-Cookie-Pfad `/edu-api/sse/auth` ↔ `EDU_API_ROOT` ↔ Proxy-Prefix | **`p6-auth`** | Muss auf den **neuen** Namespacing-Stand rebasen (A3) |
| **Version / Image-Tag** | `package.json.version` ↔ `APP_VERSION` ↔ `/health/version` ↔ Installer-UI ↔ ghcr-Tag ↔ Compose-Templates | **`p7-deps-config-infra`** | D4, blockiert den Installer-Contract |

---

## 4. TESTSTRATEGIE

**Pro Task (autonom, im Loop):**
- `iter.sh lint` · `iter.sh test:api` bzw. `test:frontend`
- **FE zusätzlich immer**: `iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` — eslint+vitest verdecken fehlende Required-Props ([[fe-verify-needs-isolated-tsc]])
- Bei i18n-/Error-Keys: `iter.sh i18n` (= `check-translations` **+** `check-error-message-translations`)
- Frischer `feature-review` je Commit-Einheit
- **Filter-Syntax**: API = Jest (`--testPathPattern`, Singular, Idiom aus F2), FE = **Vitest, positionaler Filter** — `--testPathPattern` dort ist ein stiller No-Op bzw. Fehler (P5)
- `check-filenames` nur explizit (`npx tsx scripts/checkFilenames.ts <pfade>`); der npm-Task liest `git diff --cached` und ist auf der Box vakuum-grün

**Pro Welle:**
- `iter.sh all` (lint + test:api + test:frontend + i18n + build)
- `check-circular-deps`, `check-spec-coverage`, `check-external-references`
- **`check-npm-audit` nach jeder Dependency-Baum-Änderung** (Welle 1 und Welle 2 je einmal — offene CVE-Schuld, reviewBy 2026-10-15)
- Welle 2 zusätzlich: Bundle-Diff-Report + neu aufgenommene Baselines (siehe „nicht verifizierbar")

**Welle 3 (Migrationen) — eigenes Regime:**
- Statischer Guard: Schema-`@Prop({default})` gegen `TERMINAL_SCHEMA_VERSIONS` (Frühwarner „Migration geschrieben, Default vergessen")
- Alle Migrations-Specs gegen gemockte Models (kein `mongodb-memory-server` im Repo)
- **Doppel-Boot-Beweis** auf der Box: Boot-Logs + zweiter Boot = No-Op (fängt M5-Oszillation und M4-Schleife)
- **Dump-Pflicht vor jedem Lauf gegen echte Daten: `mongodump` + `./data/master.key`.** Destruktiv: `calendar/001` (löscht Quell-Dokumente), `users/000` (Key-Wrap), `surveys/002` (`$unset`), tldraw-Asset-Move
- `strict:true`-Falle: jede backfillende Migration braucht im selben Commit das `@Prop`; `$unset` braucht `{strict:false}`

**Voll-Stack gegen echten LMN (prompt-pflichtig, `iter.sh deploy` + manuelle Runde, NIE autonom):**
- `p6-auth`: MFA-Login gegen echtes Keycloak, Replay-Versuch (zweiter Tab), Logout→401, QR-Login zwischen zwei Geräten. Vorher Keycloak-Brute-Force-Settings prüfen (Two-Stage erzeugt 1–2 zusätzliche fehlgeschlagene Signins je MFA-Fehlversuch)
- `p6-onlyoffice`: echter Dokumentenserver, `.docx`/`.odt`/`.xlsx`, Co-Editing zu zweit, Save bei Status 2/4, `endSession`
- `p7-lmn-exam-jobs`: schaltet echte Schüler-Accounts — nur gegen den echten LMN, ausschließlich human-gated
- `p7-lmn-pdf-fallback`: echte Passwortlisten (Klartext! nie loggen, nie ins Temp)
- `p4-mail`: **Sieve schreibt auf dem Mailserver** (`writeManagedScript` überschreibt/löscht das Skript `edulution`). Nur gegen Testpostfächer

**Nicht verifizierbar ohne etwas, das uns fehlt — ehrlich benennen, nicht wegargumentieren:**
| Fehlt | Blockiert | Konsequenz |
|---|---|---|
| **2.1.0-Baselines** — `.reference/2.1.0/` hat nur `api/`,`ui/`,`PROVENANCE.txt`, keine Baselines; das Deploy-Rezept ist für 2.0.200; das 2.0.200-Image ist laut PROVENANCE nicht mehr ziehbar | Bundle-Diff/Visual-Abnahme (`p7-fe-toolchain-A`), alle FE-Tasks in p4-mail/p7 | Ohne laufende 2.1.0-Instanz gibt es für das gesamte FE **kein visuelles Abnahmekriterium** — alles Fork-Eigendesign gegen den API-Contract. Fallback-Task nötig |
| **SOGo-Instanz** | `p7-calendar-sogo-sharing` komplett, `p7-contacts` CardDAV | linuxmuster liefert kein CalDAV/CardDAV. Ohne SOGo liefert `getSoBaseUrl()` gegen alles andere 503. Kalender-Sharing ist ohne SOGo **funktionslos** |
| **ManageSieve-Server (Port 4190) + Testpostfächer** | `p4-mail` Phase Sieve (21 Routen) | `ManageSieveClient` ist ein **selbstgebauter** RFC-5804-Client — Protokollfehler sind unsere. Fake-Socket-Suite deckt Syntax, nicht Interop |
| **LDAPS-Zertifikate mit SANs** | `p7-deps-config-infra` T26/T28 (Keycloak-Workaround) | Der `JAVA_OPTS_APPEND`-Fix ist ohnehin kaputt (D-2); ohne SAN-Zertifikate ist weder Fix noch Regress beweisbar |
| **Zweiter LMN** | Satellites/Multi-Tenant-Anteile | Außerhalb dieses Plans, aber als Lücke vermerkt |
| **LLM-Provider-Key + AVV** | `p7-ai` vollständig | Nicht technisch lösbar — Rechtsentscheidung (D13) |

---

## 5. AUFWAND

| Paket | Tasks (nach Blocker-Fix) | Größe | Bemerkung |
|---|---|---|---|
| `p6-fundament` (neu) | ~12 | **M** | Reine Vorbedingungen, hohe Hebelwirkung |
| `p6-auth-hardening` | 34 (+1 Spec-Task) | **L** | FE-Hälfte ist Eigendesign |
| `p6-onlyoffice-hardening` | 28 (+2) | **L** | Schließt eine echte 2.0.200-Regression |
| `p7-deps-config-infra` | ~30 (+2) | **M–L** | Viel Installer/Cross-Repo |
| `p7-fe-toolchain-A` (React 19 + ESLint 9 + tldraw) | ~14 | **L** | Breitester Blast-Radius, aber begrenzte Tiefe |
| `p6-migrations-2-1-catchup` | 43 −3 (abgegeben) +4 (M1/M2/M7) ≈ **44** | **XL** | Riskantestes Paket, strikt allein |
| `p7-fe-toolchain-B` (ciDarkBlue + tldraw-Assets) | ~11 (+2 aus M3/T1) | **M** | Zwei atomare Ketten |
| `p7-calendar-sogo-sharing` | 16 (+3 aus N4) | **L** | 3 gleichzeitige Contract-Brüche |
| `p7-surveys-limiter-collection` | 9 | **M** | Ungereviewt |
| `p7-contacts` | 16 | **L** | Neue Außenabhängigkeit + PII |
| `p7-lmn-exam-jobs` | 12 | **M** | Signaturänderung an allen LMN-Aufrufen |
| `p7-lmn-pdf-fallback` | 10 | **S–M** | Ungereviewt; Lizenzfrage |
| `p4-mail-rework-21-sieve` | 46 +6 (P4) ≈ **52** | **XL** | Selbstgebauter Protokoll-Client + 21 Routen |
| `p7-ai` | 20 | **L**, gesperrt | Erst nach D13 |

**Summe: ≈ 300 Tasks** (286 geliefert, netto +14 nach Blocker-Fixes), davon ~20 dauerhaft `[?] human-gate`.
**Ohne `p7-ai`: ≈ 280.**
Ehrlich: bei realistisch 6–10 abgeschlossenen Tasks je Loop-Session sind das **35–50 Sessions** plus die Human-Gate-Runden — und Welle 3 (Migrationen) ist davon der Teil, der sich **nicht** parallelisieren lässt und den ich mit 6–8 Sessions am Stück ansetze. Der Blocker-Fix der sieben Ledger selbst ist **1–2 Sessions** vor Welle 0.

---

## 6. ENTSCHEIDUNGEN

**Vor Welle 0 (blockieren den gesamten Plan):**
- **D1 — Migrations-Eigentum.** Vorschlag: `p6-migrations` vergibt alle Nummern; ciDarkBlue-008 → `p7-fe-toolchain-B`, tldraw-000 → `p7-fe-toolchain-B`, Mail-Key-Renames → `p4-mail` (Slot 014), calendar 000/001 gebaut aber unverdrahtet → `p7-calendar`. Weicht bewusst von „verbatim portieren" ab, hält dafür Migration+Consumer immer im selben Paket. **Empfehlung: annehmen.**
- **D2 — `surveyAnswers/002` in-place ersetzen** (die einzige bewusste forward-only-Ausnahme). Idempotent für alle drei Bestandszustände, repariert nebenbei ein bestehendes Loch. **Empfehlung: ja.**
- **D3 — `webdavShares`-Kollision.** Vorschlag: eigener Zähler `forkSchemaVersion` + `migration9xx.ts`-Band + zweite Liste nach der Upstream-Liste + einmalige Repair-Migration (2 → `{schemaVersion:1, forkSchemaVersion:1}`). Alternativen sind schlechter (Repair bei jedem Import / 1000er-Band bricht künftige Upstream-Migrationen dauerhaft). **Empfehlung: annehmen.**
- **D4 — Versions-/Tag-Politik.** Welche Versionsnummer trägt der Fork (2.1.0-aligned? eigener Zähler?), setzen wir `APP_VERSION` oder `package.json.version`, und wird `container-build.yml:49` von `master` auf `main` korrigiert (dann `:latest`) oder pinnen die Templates `:main`? Ohne das meldet `/health/version` **1.6.266**.
- **D5 — Swagger:** `generate:swagger`/`validate:swagger`/`check-swagger-completeness` aus 2.1.0 portieren + `swagger-spec.json` committen, oder die Zeile aus 4 DoDs streichen? **Empfehlung: portieren** (der Guard-Contract profitiert).
- **D6 — libs-Spec-Runner:** eigener Vitest-/Jest-Lauf für `libs/`, oder Specs grundsätzlich unter `apps/api/src/` (Fork-Präzedenz existiert: `mailcowMailboxValidation.spec.ts`). **Empfehlung: Präzedenz folgen, kein neuer Runner.**

**Vor Welle 1:**
- **D7 — kein `ENABLE_EXPERIMENTAL_AUTH`** (im Ledger bereits so entschieden — bitte bestätigen), **plus** Freigabe, die Keycloak-Brute-Force-Einstellungen des Realms anzupassen: Two-Stage-Login erzeugt zusätzliche fehlgeschlagene Signins und sperrt Accounts sonst früher.
- **D8 — `GET /mails/domains`:** AdminGuard behalten (Fork-Status, **meine Empfehlung** — der einzige Consumer ist das Admin-Panel) oder 2.1.0-treu aufweiten? Bis zur Entscheidung bleibt die Task `[?]`.

**Vor Welle 2:**
- **D16 — React 19 via npm-`overrides`** für die 6 peer-gedeckelten Pakete (`cmdk`, `vaul`, `qrcode.react`, `react-day-picker`, `usehooks-ts`, `react-helmet-async`) statt fünf Major-Bumps. Bundle-Evidenz stützt das (Upstream blieb selbst auf react-day-picker v8). **Empfehlung: overrides.**
- **D17 — Baselines:** Lässt sich eine 2.1.0-Instanz auf der Box hochziehen? Wenn nein: FE bekommt **kein** visuelles Abnahmekriterium — das explizit akzeptieren und die Baseline-Tasks als `[~]` schließen, statt sie ewig offen zu tragen.

**Vor Welle 3:**
- **D9 — Dump-Regime:** Wer fährt `mongodump` + `master.key`-Sicherung vor den destruktiven Läufen, und gegen welche Daten wird überhaupt getestet (leere Box vs. Kopie)?
- **D10 — `encryptKey`-Umbau** (M1) erweitert `users/000` um den Verbraucher-Refactor in `users.service.ts`. Scope-Erweiterung, aber ohne sie liefert die Passwortabfrage nach der Migration still `''`. **Empfehlung: ja, im selben Commit.**
- **D11 — `publicShares/000` bleibt zurückgestellt** (ACL-Stack fehlt) ⇒ **Share-Passwörter bleiben bis dahin im Klartext in Mongo.** Akzeptieren oder ACL-Paket vorziehen?

**Vor Welle 4/5:**
- **D12 — SOGo:** Instanz beschaffen, oder `p7-calendar-sogo-sharing` **und** `p7-contacts` geschlossen auf `[?]` parken? Kalender-Sharing hat ohne SOGo null Produktwert. **Empfehlung: parken, bis eine SOGo-Instanz steht.**
- **D13 — `p7-ai` Go/No-Go.** Prompts einer Minderjährigen-Plattform verlassen die Schule; `AiChatMessage.content` persistiert Volltexte ohne TTL; 5 neue Dependencies gegen 30 offene high/critical CVEs. **Empfehlung: No-Go bis AVV + Rechtsgrundlage + Aufbewahrungsfrist stehen.** Wenn Go: `InAppPermissionGuard` landet zwingend im selben Commit, und es ist zu entscheiden, ob der Fork das fehlende `@RequireAppAccess` am `AiController` ergänzt.
- **D14 — DejaVu-Fonts:** Binärdateien im Repo + `NOTICE`/`docs/third-party-licenses.md` vor dem Public-Gehen (sonst AGPL-Distributionsverstoß). Konvertierungspfad TTF→WOFF benennen.
- **D15 — `ShareEditor.tsx`** (117 Zeilen bestehende Fork-Share-UI) wird durch den SOGo-ACL-Umbau ersatzlos wertlos und muss gelöscht werden — Feature-Verlust bewusst bestätigen.
