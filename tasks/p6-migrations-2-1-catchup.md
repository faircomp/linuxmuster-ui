## p6-migrations-2.1-catchup [P6] ⭐ — Migrations- & schemaVersion-Nachzug auf 2.1.0 (HÖCHSTES RISIKO — strikt seriell)
_Ziel:_ Alle in `.reference/2.1.0/api/main.js` belegten Mongoose-Migrationen nachziehen, die 8 bestehenden `schemaVersion`-Lücken schließen, die 5 fehlenden `runMigrations`-Wirings + `schemaVersion`-Felder nachrüsten und die drei strukturellen Bruchstellen (webdavShares-Nummernkollision, surveyAnswers/002-No-Op, Surveys-Reihenfolge) auflösen · _Abhängt-von:_ p0-migrations-inventory (Doku-Basis) · _Status:_ offen (0/43) · _Tasks:_ 43 (T1–T42, plus T7b — die AES-GCM-Primitive (T7) wurde vom master.key-Util (T7b) getrennt, damit beide einzeln reviewbar sind)
Branch: `feat/2.0-backlog` (mitwachsend — **kein zweiter Migrations-Branch, nie**) · Spec: `docs/features/p6-migrations-2.1-catchup.md` · Soll: `.reference/2.1.0/api/main.js` (NEW), Engine `NEW:4941-4952`

> **SERIALITÄTS-REGEL (nicht verhandelbar).** Dieses Paket wird **strikt in Dateireihenfolge von T1 nach T42 abgearbeitet** (T7 vor T7b vor T8), ein Commit pro Task,
> auf **einem** Branch. Es darf zu keinem Zeitpunkt ein zweiter Branch offen sein, der eine Migration schreibt oder eine
> `*MigrationsList` anfasst — sonst kollidieren Dateinamen und `schemaVersion`-Bänder unbemerkt und die Merge-Reihenfolge
> entscheidet über Datenverlust. Wer dieses Paket unterbricht, parkt es an einer Task-Grenze, nicht mitten in einem Block.
>
> **DUMP-PFLICHT.** Vor **jedem** Lauf gegen eine Box/Instanz mit echten Daten: `mongodump` **+ Kopie von `./data/master.key`**
> (Rollback ohne master.key = Totalverlust aller gewrappten Schlüssel). Betroffen sind alle Tasks mit `Verify: … iter.sh deploy`,
> zwingend **T23** (löscht Dokumente), **T19/T25** (schreiben verschlüsselte Felder) und **T41** (schreibt `schemaVersion` zurück).
>
> **STRICT-MODE-FALLE (gilt für JEDE Task hier).** Alle betroffenen Schemas sind `@Schema({ strict: true })`. Mongoose
> **verwirft `$set` auf nicht deklarierte Pfade in Update-Operationen still** — die Migration läuft „grün", das Feld
> existiert nachher nicht. Deshalb gilt: **wer ein neues Feld backfillt, legt im selben Commit das `@Prop` an.** Wer einen
> Pfad `$unset`en muss, der nicht (mehr) im Schema steht, braucht explizit `{ strict: false }` (so macht es 2.1.0 in
> `NEW:62727` und `NEW:65706`) oder den Raw-Driver (`model.collection.initializeUnorderedBulkOp()`).
>
> **`version` IST NICHT DER VERTRAG.** Das `version`-Feld der Migrationsobjekte ist in 2.1.0 nachweislich unzuverlässig
> (appConfig `migration007` und `migration008` tragen beide `version: 8`, `NEW:6097`/`NEW:6148`; surveys `000`/`001` beide
> `version: 1`, `NEW:62439`/`NEW:62530`). Maßgeblich sind ausschließlich `previousSchemaVersion`/`newSchemaVersion` im
> `execute`. Keine Task darf auf `version` prüfen.
>
> **Ist/Soll (Beleg: Fork-Schemas vs. `NEW`-Listen):** appConfig 10→14 · globalSettings 8→10 · surveys 1→5 ·
> surveyAnswers 3→5 · surveysTemplate 1→5 · bulletinCategory 1→2 · bulletin 1→2 · notification 1→3 · publicShare —→2 ·
> user —→1 · calendarMetadata —→2 · tldrawSyncRoom —→1 · webdavShares: Fork **2**, Upstream **1** (Kollision, s. T2/T41).
> Wirings: Fork **8** (`grep -rn "runMigrations" apps/api/src | grep -v migration.service` == 8), 2.1.0 **13**
> (`NEW:1806/7271/7832/10328/25086/43570/52411/60213/60214/64624/69321/70477/74412`) → **5 neue Wirings**.
> Summe neuer Migrationsdateien: **26** + **1 Rewrite** (surveyAnswers/002).

---

### T1 — Ist/Soll-Delta + Terminal-Tabelle 2.1.0 dokumentieren  [ ]
Komponente: docs · Dateien: `docs/migrations/2.1-migrations-catchup.md` (NEU, SPDX AGPL), `docs/features/p6-migrations-2.1-catchup.md` (NEU, SPDX AGPL)
Soll: NEW-Listen-Anker `appConfig:4995` · `webdavShares:7701` · `globalSettings:8277` · `users:10323` · `notifications:26338` · `calendarMetadata:46194` · `publicShares:55922` · `surveyAnswers:61602` · `surveys:62406` · `surveyTemplates:64737` · `bulletinCategory:69663` · `bulletins:71090` · `tldrawSyncRoom:74705`; Engine `NEW:4941-4952` (identisch zu `apps/api/src/migration/migration.service.ts`, **kein Engine-Port**)
Änderung: Tabelle je Modell: Fork-`schemaVersion`-Default (aus `@Prop({default: n})`) · Fork-Migrationen · 2.1.0-Migrationen · Terminal-Ziel · NEW-Zeilenanker je Migration. Zweite Tabelle: die 5 fehlenden `runMigrations`-Wirings (users/notifications/publicShares/calendarMetadata/tldrawSyncRoom) mit ihrer Vor-Abhängigkeit. Abschnitt „Nicht aus dem Bundle etablierbar": alle Frontend-Anteile (nur die API ist un-minifiziert) — betrifft T15 (ciDarkBlue in `applyThemeColors.ts`/`tailwind.config.ts`) und T40 (accessGroups in den Template-Konstanten); die dortigen FE-Änderungen sind **Fork-Original-Design**, keine Rekonstruktion. Abschnitt „Drei Bruchstellen": webdavShares-Nummernband (T2/T41) · surveyAnswers/002-No-Op (T3/T34) · Surveys-Reihenfolge (T28). Abschnitt „`version` ist nicht der Vertrag" mit den vier Beleg-Ankern.
Verify: `bash scripts/crabbox/iter.sh cmd "grep -c 'runMigrations' .reference/2.1.0/api/main.js"` == 14 (13 Wirings + 1 Engine-Definition); Tabellenzeilen Modell-Tabelle == 13; `grep -c '^| ' docs/migrations/2.1-migrations-catchup.md` ≥ 39.
i18n: keine
Doku: `docs/migrations/2.1-migrations-catchup.md` (intern, DE) + Spec
Abhängt von: —

### T2 — [?] ENTSCHEIDUNG: Fork-Nummernband für webdavShares (Kollision 001)  [ ]
Komponente: docs · Dateien: `docs/features/p6-migrations-2.1-catchup.md` (Abschnitt „Entscheidung 1"), `docs/adr/` (neuer ADR, SPDX AGPL)
Soll: Upstream hat für webdavShares **nur** `migration000` (`NEW:7701-7702`, `NEW:7732` `'000-add-pathname-to-webdav-shares'`, Terminal `schemaVersion` = 1, Schema-Default `NEW:7574-7576` = `1`). Der Fork hat zusätzlich `apps/api/src/webdav/shares/migrations/migration001.ts` (`'001-add-wiki-visibility-to-webdav-shares'`, fork-original, SPDX-Header) und `webdav-shares.schema.ts:78` `@Prop({ default: 2 })`. **Bemerkenswert:** 2.1.0 hat `wikiAccessGroups`/`wikiDisabled` inzwischen selbst im Schema (`NEW:7553`/`NEW:7557`) — aber **ohne** Migration. Der Fork ist auf diesem Modell also fachlich vor Upstream und numerisch inkompatibel.
Änderung: Entscheidungsvorlage mit Kosten, **Empfehlung = Variante A**:
 **A (empfohlen) — eigener Fork-Zähler + 9xx-Dateiband.** Fork-Migrationen heißen `migration9NN.ts` (`900-…`), laufen in einer **zweiten** Liste `webdavSharesForkMigrationList` über einen **eigenen** Zähler `forkSchemaVersion`; `schemaVersion` bleibt dem Upstream-Band vorbehalten. Kosten: +1 `@Prop` je Modell mit Fork-Migrationen, +1 Listen-Datei, +1 `runMigrations`-Aufruf je Modell, zwei Zähler im Runbook, `assert-schema-versions.ts` prüft beide Bänder, und **einmalig eine Repair-Migration** für Bestandsinstallationen, deren Shares schon auf `schemaVersion: 2` stehen (T41).
 **B (verworfen) — im Upstream-Band bleiben und bei jedem Import umnummerieren.** Kosten: bei jedem Upstream-Bump eine handgeschriebene Repair-Migration (Dokumente stehen auf einer Version, die Upstream nie erwartet), nicht automatisierbar, jedes Mal derselbe Denkfehler-Kandidat.
 **C (verworfen) — Fork-Migrationen in ein hohes `schemaVersion`-Band (z. B. 1000+).** Bricht **jede künftige** Upstream-Migration: deren `find({ schemaVersion: N })` matcht nie wieder.
Halte fest, dass die Regel projektweit gilt (nicht nur webdavShares) und ab sofort für **jede** fork-originale Migration angewandt wird.
Verify: ADR existiert mit SPDX-Header und nennt A/B/C + Empfehlung; `grep -c "forkSchemaVersion" docs/adr/*.md` ≥ 3. Entscheidung als `[?] human-gate` markiert, bis Kevin bestätigt.
i18n: keine
Doku: ADR + Spec-Abschnitt
Abhängt von: T1

### T3 — [?] ENTSCHEIDUNG: surveyAnswers/002 in place umschreiben (Forward-only-Ausnahme)  [ ]
Komponente: docs · Dateien: `docs/features/p6-migrations-2.1-catchup.md` (Abschnitt „Entscheidung 2"), ADR aus T2 erweitern
Soll: Fork `apps/api/src/surveys/migrations/surveyAnswerMigration002UseChoiceTitleInsideOfAnswers.ts:66-73` liest die Limiter über `.populate({ path: 'surveyId', select: 'backendLimiters' })` **aus dem Survey-Dokument**. 2.1.0 schreibt genau diese Migration um (`NEW:61892-61940`): die Limiter kommen jetzt aus dem eigenen Model `SurveysBackendLimiter` (`NEW:58989`), und der Bump läuft über `batchedSchemaVersionMigration` (`NEW:61969`), das **jedes** gematchte Dokument hochzieht — auch wenn `buildSetFields` `null` liefert.
Änderung: Belege und entscheide. **Befund:** sobald `surveysMigration002MoveBackendLimitersToOwnCollection` (T33) gelaufen ist, liefert `populate` kein `backendLimiters` mehr → die Fork-Fassung trifft in **jedem** Durchlauf ihr `continue` (`:70`), aktualisiert **nichts** und bumpt **nichts**. surveyAnswers bleiben dauerhaft auf `schemaVersion: 2`, und T36/T38 (Filter `3` bzw. `4`) feuern nie. Zusätzlich hat die Fork-Fassung **schon heute** ein Loch: übersprungene Dokumente werden nie gebumpt.
 **Empfehlung: in place umschreiben (2.1.0-treu).** Begründung: idempotent für alle drei Bestandszustände — Dokumente auf `3` matcht der neue Filter nicht (No-Op); Dokumente auf `2`, die die alte Fassung hat liegen lassen, werden korrekt gegen die neue Limiter-Collection verarbeitet **und** gebumpt (repariert das bestehende Loch); frische Installationen laufen ohnehin nur den neuen Pfad. Die Transformation (choice-`name` → choice-`title`) ist in beiden Fassungen identisch, es gibt also keine doppelte oder widersprüchliche Umschreibung.
 Halte ausdrücklich fest: dies ist die **einzige** Stelle, an der eine bereits ausgelieferte Migration geändert wird; jede weitere Änderung an ausgelieferten Migrationen braucht wieder eine eigene Entscheidung.
Verify: Abschnitt nennt alle drei Bestandszustände + Idempotenz-Argument je Zustand; `[?] human-gate` bis Kevin bestätigt.
i18n: keine
Doku: Spec + ADR
Abhängt von: T1

### T4 — Terminal-schemaVersion als einzige Wahrheit (`libs`-Konstante)  [ ]
Komponente: libs · Dateien: `libs/src/migration/constants/terminalSchemaVersions.ts` (NEU, SPDX AGPL)
Soll: Fork-Ist aus den `@Prop({ default: n })`-Deklarationen: `appconfig.schema.ts:59` = 10 · `global-settings.schema.ts:46` = 8 · `survey.schema.ts:73` = 1 · `survey-answers.schema.ts:41` = 3 · `surveys-template.schema.ts:43` = 1 · `bulletin.schema.ts:55` = 1 · `bulletin-category.schema.ts:62` = 1 · `notification.schema.ts:86` = 1 · `webdav-shares.schema.ts:77` = 2
Änderung: `const TERMINAL_SCHEMA_VERSIONS = { appconfigs: 10, globalsettings: 8, surveys: 1, surveyanswers: 3, surveytemplates: 1, bulletins: 1, bulletincategories: 1, notifications: 1, webdavshares: 2 } as const;` — Keys = **Mongo-Collection-Namen** (dieselben wie in `scripts/migrations/assert-schema-versions.ts:8-20`), Default-Export am Dateiende, const-Objekt (kein enum). **Startwerte = Ist-Zustand**; jede folgende Task hebt genau ihren Eintrag an. Modelle ohne `schemaVersion` (publicshares/users/calendarmetadata/tldrawsyncrooms) kommen erst mit ihrer Task dazu.
Verify: `bash scripts/crabbox/iter.sh cmd "npx tsc -p apps/api/tsconfig.app.json --noEmit"` clean; `bash scripts/crabbox/iter.sh lint` clean.
i18n: keine
Doku: keine
Abhängt von: T1

### T5 — Statischer Guard: Schema-Default == Terminal-Version + Listen-Konsistenz  [ ]
Komponente: apps/api · Dateien: `apps/api/src/migration/migrationsLists.spec.ts` (NEU, SPDX AGPL)
Soll: Engine-Vertrag `apps/api/src/migration/migration.type.ts` (`{ name, version, execute }`); alle 8 Fork-Listen
Änderung: Jest-Spec, die alle vorhandenen `*MigrationsList`/`*MigrationList` importiert und je Liste prüft: (1) `name` ist eindeutig; (2) das `NNN-`-Präfix von `name` entspricht dem Array-Index (`String(index).padStart(3,'0')`); (3) für jedes Modell: `SchemaFactory`-Pfad-Default von `schemaVersion` (`Schema.path('schemaVersion').defaultValue`) == `TERMINAL_SCHEMA_VERSIONS[<collection>]`. **`version` wird bewusst NICHT geprüft** (Begründung im Spec-Text als `it.todo`-freier Testnamen, nicht als Code-Kommentar — Kommentare sind verboten). Dieser Spec ist der Frühwarner gegen „Migration geschrieben, Schema-Default vergessen" und läuft ab jetzt in jeder Task mit.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern=migrationsLists"` — grün, ≥ 3 Assertions je Liste. Gegenprobe: `terminalSchemaVersions.ts` lokal auf `appconfigs: 11` verfälschen → Spec rot; zurücksetzen.
i18n: keine
Doku: keine
Abhängt von: T4

### T6 — Mock-Helfer für Migrations-Specs  [ ]
Komponente: apps/api · Dateien: `apps/api/src/migration/mocks/createMigrationModelMock.ts` (NEU, SPDX AGPL)
Soll: Der Fork hat **kein** `mongodb-memory-server` (nicht in `package.json`), Bestands-Specs mocken Modelle (`global-settings.controller.spec.ts:61`). Die 2.1.0-Migrationen benutzen genau fünf Model-Zugänge: `find().exec()/.lean()/.cursor()/.sort()`, `updateOne`, `updateMany`, `bulkWrite`, `collection.initializeUnorderedBulkOp()`.
Änderung: Factory `createMigrationModelMock(documents)` → Objekt mit `jest.fn()`-Stubs für die fünf Zugänge, chainable `find()` (`.lean()`, `.exec()`, `.sort()`, `.cursor()` als Async-Iterator über `documents`), `collection.initializeUnorderedBulkOp()` mit `find().updateOne()`-Recorder und `execute()` → `{ modifiedCount }`, plus `db.model(name)` für die Migrationen, die ein Fremdmodell ziehen (`NEW:62625`, `NEW:61897`). Default-Export am Dateiende, generisch typisiert (kein `as unknown as`).
Verify: `bash scripts/crabbox/iter.sh cmd "npx tsc -p apps/api/tsconfig.app.json --noEmit"` clean; `bash scripts/crabbox/iter.sh lint` clean.
i18n: keine
Doku: keine
Abhängt von: T5

### T7 — AES-GCM-Primitive `encryptWithKey`/`decryptWithKey`/`generateEncryptKey` portieren  [ ]
Komponente: apps/api · Dateien: `apps/api/src/common/utils/encryptWithKey.ts` (NEU, SPDX AGPL), `…/encryptWithKey.spec.ts` (NEU, SPDX AGPL), `apps/api/src/common/utils/toArrayBuffer.ts` (NEU, SPDX AGPL)
Soll: `NEW:10846-10890` — `AES_GCM = 'AES-GCM'`, `IV_LENGTH = 12`, `KEY_LENGTH = 256`; `hexToBytes`/`bytesToHex`/`bytesToBase64`/`base64ToBytes`; `importKey` (WebCrypto `crypto.subtle.importKey('raw', …, {name: AES_GCM}, false, ['encrypt','decrypt'])`); `generateEncryptKey` (`NEW:10863`, 32 Zufallsbytes → Hex); `encryptWithKey` (`NEW:10869`, zufälliger 12-Byte-IV wird dem Ciphertext **vorangestellt**, Ergebnis base64); `decryptWithKey` (`NEW:10880`, IV wieder abspalten). Hilfsmodul `toArrayBuffer` (Modul 224).
Änderung: **Vorbedingung, die im Fork komplett fehlt** — `grep -rn "generateEncryptKey\|encryptWithKey\|decryptWithKey" apps libs` == leer; der Fork verschlüsselt heute nur über `CryptoJS.AES` (`users.service.ts:234`, `getDecryptedPassword`). Diese Primitive 1:1 portieren, **ohne** den bestehenden `CryptoJS`-Pfad anzufassen (der bleibt für Benutzer-Passwörter zuständig; hier geht es ausschließlich um das Wrappen von `encryptKey`-Werten). Kein Schlüsselmaterial in Logs.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='encryptWithKey|toArrayBuffer'"` grün (Fälle: Round-Trip `encrypt→decrypt` == Original; zwei Verschlüsselungen desselben Klartexts liefern **verschiedene** Ciphertexte (IV zufällig); `generateEncryptKey()` liefert 64 Hex-Zeichen; Entschlüsselung mit falschem Key wirft).
i18n: keine
Doku: keine
Abhängt von: T1

### T7b — `master.key`-Util portieren (Vorbedingung für users/000 + publicShares/000)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/common/utils/master.key.util.ts` (NEU, SPDX AGPL), `apps/api/src/common/utils/master.key.util.spec.ts` (NEU, SPDX AGPL)
Soll: `NEW:11630-11712` — Exporte `wrapEncryptKey`, `unwrapEncryptKey`, `isEncryptKeyWrapped`, `initializeMasterKey`, `resetCachedMasterKey`, `generateMasterKey`. Konstanten: `MASTER_KEY_ENV = 'MASTER_ENCRYPT_KEY'` (`NEW:11635`), `MASTER_KEY_FILE_PATH = './data/master.key'` (`NEW:11636`), Datei-Mode `0o600` (`NEW:11637`), `WRAPPED_KEY_PREFIX = 'wrapped:'` (`NEW:11639`), `UNWRAP_ERROR_MESSAGE` (`NEW:11640`), Log-Kontext `'MasterKeyUtil'`. Reihenfolge in `getMasterKey` (`NEW:11658`): Cache → `process.env.MASTER_ENCRYPT_KEY` → Datei → neu generieren + mit Mode `0o600` schreiben (`Logger.warn`).
Änderung: 1:1 portieren auf Basis von T7. `Logger`-Aufrufe statisch mit Kontext-String (AGENTS.md). **Nie** Schlüsselmaterial loggen — auch nicht gekürzt. `MASTER_ENCRYPT_KEY` kommt laut `p1-master-key-provisioning` bereits aus der `edulution.env` des Installers; hier nur konsumieren, nichts am Installer ändern.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern=master.key.util"` grün. Fälle: `wrapEncryptKey` idempotent (bereits gewrappte Eingabe unverändert, `NEW:11682`); Round-Trip `wrap→unwrap` == Original; `unwrapEncryptKey` wirft `UNWRAP_ERROR_MESSAGE` bei falschem Master-Key; `isEncryptKeyWrapped` prüft nur das Präfix; ENV schlägt Datei; ohne beides wird eine Datei mit Mode `0o600` erzeugt; `resetCachedMasterKey()` in `afterEach`. `grep -rn "MASTER_ENCRYPT_KEY" apps/api/src` findet **nur** diese Datei. **Sicherheits-Gegenprobe:** `grep -rnE "Logger\.[a-z]+\(.*(plainEncryptKey|masterKey|cachedMasterKey)" apps/api/src` == leer.
i18n: keine
Doku: `docs/migrations/2.1-migrations-catchup.md` — Abschnitt „master.key: Rollback braucht Dump **+** Key"
Abhängt von: T7

---
**Block B — appConfig 10 → 14 (additiv, geringes Risiko)**

### T8 — appConfig/010 `usesPushNotifications`  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/appconfig/migrations/migration010.ts` (NEU, SPDX), `…/migration010.spec.ts` (NEU, SPDX), `apps/api/src/appconfig/migrations/appConfigMigrationsList.ts`, `apps/api/src/appconfig/appconfig.schema.ts`, `libs/src/migration/constants/terminalSchemaVersions.ts`
Soll: `NEW:6258-6285` — `APPS_WITH_PUSH_NOTIFICATIONS = [APPS.BULLETIN_BOARD, APPS.CONFERENCES, APPS.SURVEYS, APPS.MAIL]` (`NEW:6258`); `name: '010-add-uses-push-notifications'`, `previousSchemaVersion = 10`, `newSchemaVersion = 11`; zwei `updateMany` — erst `{schemaVersion: prev, name: {$in: APPS_WITH_PUSH_NOTIFICATIONS}}` → `usesPushNotifications: true`, dann `{schemaVersion: prev}` → `usesPushNotifications: false` (die zweite trifft nur noch den Rest, weil die erste schon gebumpt hat).
Änderung: Migration portieren (Muster der Nachbarn `migration009.ts`, `Logger.log(..., migration010.name)`), `@Prop({ type: Boolean, default: false }) usesPushNotifications: boolean;` im Schema **vor** `schemaVersion` (sonst stiller No-Op, s. Präambel), Schema-Default `schemaVersion` 10 → 11, `appconfigs: 11` in `terminalSchemaVersions.ts`, `migration010` an die Liste anhängen. `APPS_WITH_PUSH_NOTIFICATIONS` als const-Objekt/Array im Migrationsfile (keine Magic Strings, `APPS`-Konstante des Forks wiederverwenden).
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='migration010|migrationsLists'"` grün. Spec-Fälle: 4 Push-Apps → `true`, andere App → `false`, leere Treffermenge → kein `updateMany`, zweiter Lauf → No-Op.
i18n: keine
Doku: Zeile in `docs/migrations/2.1-migrations-catchup.md`
Abhängt von: T5, T6

### T9 — appConfig/011 `isPinned`  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/appconfig/migrations/migration011.ts` (NEU, SPDX), `…/migration011.spec.ts` (NEU, SPDX), `appConfigMigrationsList.ts`, `appconfig.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:6313-6334` — `name: '011-add-is-pinned'`, prev 11 → new 12, ein `updateMany({schemaVersion: 11}, {$set: {isPinned: true, schemaVersion: 12}})`. Bestandsapps werden also **angepinnt** (`true`), nicht abgepinnt.
Änderung: Migration + `@Prop({ type: Boolean, default: true }) isPinned: boolean;` + Schema-Default 11 → 12 + `appconfigs: 12` + Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='migration011|migrationsLists'"` grün; Spec prüft `isPinned === true` (nicht `false`) und leere Treffermenge = No-Op.
i18n: keine
Doku: Zeile in der Delta-Tabelle
Abhängt von: T8

### T10 — libs: `MAIL_DEFAULT_PORTS` + vereinheitlichte Mail-`ExtendedOptionKeys`  [ ]
Komponente: libs · Dateien: `libs/src/mail/constants/mailDefaultPorts.ts` (NEU, SPDX), `libs/src/appconfig/constants/extendedOptionKeys.ts`
Soll: `NEW:4018-4024` — `MAIL_DEFAULT_PORTS = { IMAP_SSL: 993, SMTP_SUBMISSION: 587, SMTPS_IMPLICIT_TLS: 465, MANAGESIEVE: 4190 }`. Ziel-Keys der Vereinheitlichung aus `NEW:6364-6370`: `MAIL_HOST`, `MAIL_TLS_REJECT_UNAUTHORIZED`, `MAIL_SMTP_PORT`, `MAIL_IMAP_PORT`; entfallende Keys: `MAIL_IMAP_URL`, `MAIL_SMTP_URL`, `MAIL_IMAP_TLS_REJECT_UNAUTHORIZED`, `MAIL_SMTP_TLS_REJECT_UNAUTHORIZED`, `MAIL_IMAP_SECURE`, `MAIL_SMTP_SECURE`. Fork-Ist: `libs/src/appconfig/constants/extendedOptionKeys.ts:23-26` kennt `MAIL_IMAP_URL`/`MAIL_IMAP_PORT`/`MAIL_IMAP_SECURE`/`MAIL_IMAP_TLS_REJECT_UNAUTHORIZED`, **kein** `MAIL_HOST`.
Änderung: `MAIL_DEFAULT_PORTS` als const-Objekt + Default-Export am Dateiende neu anlegen. In `extendedOptionKeys.ts` `MAIL_HOST`, `MAIL_TLS_REJECT_UNAUTHORIZED`, `MAIL_SMTP_PORT` **additiv** ergänzen (String == Key-Name, Fork-Muster). Alte Keys hier **noch nicht entfernen** — T11 migriert die Daten, das Entfernen der Keys aus Consumern (`mails.service.ts:115`, `mail-idle.service.ts:122`, `libs/src/appconfig/constants/extendedOptions/imapMailFeed.ts:26`) gehört ins Mail-2.1-Paket und ist hier **außerhalb des Auftrags**.
Verify: `bash scripts/crabbox/iter.sh cmd "npx tsc -p apps/api/tsconfig.app.json --noEmit"` clean; `bash scripts/crabbox/iter.sh lint` clean; `grep -c "MAIL_HOST\|MAIL_TLS_REJECT_UNAUTHORIZED\|MAIL_SMTP_PORT" libs/src/appconfig/constants/extendedOptionKeys.ts` == 3.
i18n: keine
Doku: keine
Abhängt von: T9

### T11 — appConfig/012 Mail-Serverkonfiguration vereinheitlichen  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/appconfig/migrations/migration012.ts` (NEU, SPDX), `…/migration012.spec.ts` (NEU, SPDX), `appConfigMigrationsList.ts`, `appconfig.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:6362-6428` — `KEY_RENAMES = { MAIL_IMAP_URL: 'MAIL_HOST', MAIL_SMTP_URL: 'MAIL_HOST', MAIL_IMAP_TLS_REJECT_UNAUTHORIZED: 'MAIL_TLS_REJECT_UNAUTHORIZED', MAIL_SMTP_TLS_REJECT_UNAUTHORIZED: 'MAIL_TLS_REJECT_UNAUTHORIZED' }` (`NEW:6364`), `KEYS_TO_REMOVE = ['MAIL_IMAP_SECURE','MAIL_SMTP_SECURE']` (`NEW:6370`), `parseHostAndPort` (`NEW:6371`, `new URL()` mit Fallback `{host: rawValue, port: null}` im `catch`). `name: '012-unify-mail-server-config'`, prev 12 → new 13. Ablaufreihenfolge ist wichtig: erst `findOne({schemaVersion: prev, name: APPS.MAIL})`, **dann** `updateMany({schemaVersion: prev}, {$set:{schemaVersion: new}})` für **alle** Docs, dann nur noch der MAIL-Doc-`extendedOptions`-Umbau. Rename-Regel: neuer Key wird nur gesetzt, wenn er noch nicht existiert (`NEW:6404`), der alte wird immer gelöscht. Port-Fallbacks: `MAIL_SMTP_PORT ?? MAIL_DEFAULT_PORTS.SMTP_SUBMISSION`, `MAIL_IMAP_PORT ?? MAIL_DEFAULT_PORTS.IMAP_SSL`, jeweils nur wenn der alte URL-Key vorhanden war. Abweichende Hosts → `Logger.warn`, IMAP gewinnt (`NEW:6398`).
Änderung: 1:1 portieren; `@Prop`-Änderung am Schema **nicht** nötig (`extendedOptions` ist bereits `@Prop({type: Object})`, `strict` greift dort nicht auf Unterschlüssel). Schema-Default 12 → 13, `appconfigs: 13`, Liste. Keine Magic Strings: `ExtendedOptionKeys` und `MAIL_DEFAULT_PORTS` aus libs verwenden.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='migration012|migrationsLists'"` grün. Spec-Fälle: `MAIL_IMAP_URL='imaps://mail.example.org:993'` → `MAIL_HOST='mail.example.org'`, `MAIL_IMAP_PORT=993`; abweichende SMTP-Host → `Logger.warn` aufgerufen, `MAIL_HOST` bleibt IMAP-Host; kein URL-Wert → keine Port-Defaults; kein MAIL-Dokument → nur Bump; existierendes `MAIL_HOST` wird nicht überschrieben; `MAIL_IMAP_SECURE` verschwindet.
i18n: keine
Doku: Delta-Tabelle + Hinweis im Runbook (Mail-Konfiguration ändert Schlüsselnamen — Consumer-Umbau ist Mail-2.1-Paket)
Abhängt von: T10

### T12 — appConfig/013 `shareActions`  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/appconfig/migrations/migration013.ts` (NEU, SPDX), `…/migration013.spec.ts` (NEU, SPDX), `appConfigMigrationsList.ts`, `appconfig.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:6452-6474` — `name: '013-add-share-actions'`, prev 13 → new 14, `updateMany({schemaVersion: 13}, {$set: {shareActions: [], schemaVersion: 14}})`. Der Feldtyp ist aus dem API-Bundle **nur als leeres Array** belegbar (die Migration setzt `[]`); die inhaltliche Form von `shareActions` gehört ins Filesharing-2.1-Paket → hier bewusst `@Prop({ type: Array, default: [] })` ohne engeren Typ, im Doku-Abschnitt als „Form noch nicht etabliert" markieren.
Änderung: Migration + `@Prop({ type: Array, default: [] }) shareActions: unknown[];` (generischer Typ, kein unsicherer Cast) + Schema-Default 13 → 14 + `appconfigs: 14` + Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='migration013|migrationsLists'"` grün; `grep -n "default: 14" apps/api/src/appconfig/appconfig.schema.ts` trifft.
i18n: keine
Doku: Delta-Tabelle + „Form nicht etabliert"-Vermerk
Abhängt von: T11

---
**Block C — globalSettings 8 → 10**

### T13 — libs: `ORGANIZATION_TYPE` + `getOrganizationType` + `GeneralSettings.organizationType`  [ ]
Komponente: libs, apps/api · Dateien: `libs/src/global-settings/constants/organizationType.ts` (NEU, SPDX), `apps/api/src/global-settings/utils/getOrganizationType.ts` (NEU, SPDX), `…/getOrganizationType.spec.ts` (NEU, SPDX), `apps/api/src/global-settings/schemas/global-settings.general.schema.ts`, `apps/api/.env.default`
Soll: `NEW:5637-5642` — `ORGANIZATION_TYPE = { SCHOOL: 'school', BUSINESS: 'business', PUBLIC_ADMINISTRATION: 'public-administration' }`. `NEW:8158-8164` — `getOrganizationType`: `VALID_TYPES = new Set(Object.values(ORGANIZATION_TYPE))`, liest `process.env.EDUI_ORGANIZATION_TYPE` (Default `SCHOOL`), fällt bei ungültigem Wert auf `SCHOOL` zurück. `NEW:5599-5602` — `@Prop({ type: String, enum: ORGANIZATION_TYPE, default: ORGANIZATION_TYPE.SCHOOL }) organizationType`.
Änderung: const-Objekt + abgeleiteter Typ (kein enum), Default-Export am Dateiende. `getOrganizationType` als reine Funktion. `organizationType`-`@Prop` in `GeneralSettings` ergänzen. `EDUI_ORGANIZATION_TYPE=school` in `apps/api/.env.default` dokumentieren. **Contract-Sync:** neue Env → Installer muss sie schreiben können → Notiz in `docs/migrations/2.1-migrations-catchup.md` + Verweis, dass der Installer-Anteil ein eigenes Ticket ist (nicht hier).
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern=getOrganizationType"` grün (3 Fälle: gültig / ungültig → SCHOOL / unset → SCHOOL); `grep -c "EDUI_ORGANIZATION_TYPE" apps/api/.env.default` == 1.
i18n: keine
Doku: Delta-Tabelle + Env-Zeile
Abhängt von: T12

### T14 — globalSettings/007 `general.organizationType`  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/global-settings/migrations/migration007.ts` (NEU, SPDX), `…/migration007.spec.ts` (NEU, SPDX), `globalSettingsMigrationsList.ts`, `global-settings.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:8764-8786` — `name: '007-add-organizationType'`, **prev 8 → new 9** (Achtung: `version: 7`, aber der Vertrag sind prev/new, s. Präambel). `find({schemaVersion: 8})` → IDs sammeln → `updateMany({_id: {$in: ids}}, {$set: {'general.organizationType': getOrganizationType(), schemaVersion: 9}})`.
Änderung: Migration im Stil der Nachbarn (`migration004.ts` nutzt `findOne`, hier bewusst `find`+`$in` wie im Soll). Schema-Default 8 → 9, `globalsettings: 9`, Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='global-settings.*migration007|migrationsLists'"` grün; Spec setzt `EDUI_ORGANIZATION_TYPE='business'` und erwartet `'general.organizationType': 'business'`; leere Treffermenge → kein `updateMany`.
i18n: keine
Doku: Delta-Tabelle
Abhängt von: T13

### T15 — globalSettings/008 `ciLightBlue` → `ciDarkBlue` (Contract-Sync FE)  [ ]
Komponente: apps/api, libs, apps/frontend · Dateien: `apps/api/src/global-settings/migrations/migration008.ts` (NEU, SPDX), `…/migration008.spec.ts` (NEU, SPDX), `globalSettingsMigrationsList.ts`, `global-settings.schema.ts`, `apps/api/src/global-settings/schemas/global-settings.theme.schema.ts`, `libs/src/global-settings/constants/defaultTheme.ts`, `libs/src/global-settings/types/themeColors.ts`, `apps/frontend/src/utils/applyThemeColors.ts`, `apps/frontend/tailwind.config.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:8817-8850` — `OLD_CI_LIGHT_BLUE_DEFAULT = '#67b2e0'`, `NEW_CI_DARK_BLUE_DEFAULT = DEFAULT_THEME.light.ciDarkBlue`, `resolveCiDarkBlue(legacy)` gibt den neuen Default zurück, wenn `legacy` leer ist **oder** (case-insensitiv) dem alten Default entspricht, sonst den Bestandswert. `name: '008-rename-ciLightBlue-to-ciDarkBlue'`, **prev 9 → new 10**, `findOne({schemaVersion: 9}).lean()`, dann ein `updateOne` mit `$set` auf `theme.light.ciDarkBlue`/`theme.dark.ciDarkBlue` + `schemaVersion` **und** `$unset` auf `theme.light.ciLightBlue`/`theme.dark.ciLightBlue`. Neue Defaults `NEW:5980`/`NEW:5986`: `ciDarkBlue: '#0081C6'`; `@Prop`-Umbenennung `NEW:5925-5927`.
Änderung: Migration portieren. Feld im `ThemeColors`-Schema umbenennen (`global-settings.theme.schema.ts:35-36`), in `DEFAULT_THEME` (`defaultTheme.ts:25/31`) und in `ThemeColors`-Typ (`themeColors.ts:24`). **FE-Anteil ist Fork-Original-Design (nicht aus dem Bundle etablierbar — nur die API ist un-minifiziert):** `applyThemeColors.ts:26` liest `theme.ciLightBlue` und schreibt `--ci-dark-blue`; `tailwind.config.ts:22` mappt `ciLightBlue: 'var(--ci-dark-blue)'`. Beides auf `ciDarkBlue` ziehen — die CSS-Variable heißt bereits `--ci-dark-blue`, es ändert sich **kein** gerendertes Ergebnis. **Wichtig, nicht „korrigieren":** der Fork-Default ist `#0081c6`, nicht `#67b2e0`; Bestandsinstallationen behalten deshalb ihren Wert, was hier gewollt und farblich identisch zum neuen Default ist. `$unset` braucht `strict: false` **nicht**, weil `updateOne` ohne Schema-Pfad-Prüfung für `$unset` bereits entfernter Pfade in Mongoose 8 durchgeht — im Spec verifizieren, sonst `{ strict: false }` ergänzen.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='global-settings.*migration008|migrationsLists'"` grün (Fälle: Legacy-Default `#67b2e0` → `#0081C6`; Custom `#123456` → `#123456`; leer → Default; kein Doc → `Logger.debug` + Return). **FE-Pflichtlauf:** `bash scripts/crabbox/iter.sh cmd "npx tsc -p apps/frontend/tsconfig.app.json --noEmit"` clean **und** `bash scripts/crabbox/iter.sh test:frontend` grün. `grep -rn "ciLightBlue" apps libs` == leer.
i18n: keine
Doku: Delta-Tabelle + Runbook-Zeile „Theme-Feld umbenannt"
Abhängt von: T14

---
**Block D — Modelle ohne `schemaVersion` nachrüsten (5 neue Wirings)**

### T16 — Notification: `SURVEY_PARTICIPATION` + `isMongoDuplicateKeyError`  [ ]
Komponente: libs, apps/api · Dateien: `libs/src/notification/constants/notificationSourceType.ts`, `apps/api/src/common/utils/isMongoDuplicateKeyError.ts` (NEU, SPDX), `…/isMongoDuplicateKeyError.spec.ts` (NEU, SPDX)
Soll: `NEW:23947-23955` — `NOTIFICATION_SOURCE_TYPE` mit zusätzlichem `SURVEY_PARTICIPATION: 'survey-participation'` zwischen `SURVEY` und `CONFERENCE`. `NEW:26453-26466` — `isMongoDuplicateKeyError`: `MongoBulkWriteError` → alle `writeErrors` haben `code === 11000`; `MongoServerError` → `code === 11000`; sonst `false`.
Änderung: Key additiv in das const-Objekt einfügen (Fork-Ist `libs/src/notification/constants/notificationSourceType.ts:20-26`). Util neu anlegen, `MONGO_DUPLICATE_KEY_ERROR_CODE = 11000` als Konstante (keine Magic Number). **Wichtig:** `notification.schema.ts:39` bindet `sourceType` an `enum: Object.values(NOTIFICATION_SOURCE_TYPE)` — ohne diesen Key würde der neue Wert an der Schema-Validierung scheitern.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern=isMongoDuplicateKeyError"` grün (3 Fälle); `grep -c "SURVEY_PARTICIPATION" libs/src/notification/constants/notificationSourceType.ts` == 1.
i18n: keine
Doku: keine
Abhängt von: T15

### T17 — Notification/000 + Wiring (`runMigrations` in `NotificationsService`)  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/notifications/migrations/migration000NewSourceTypeSurveyParticipation.ts` (NEU, SPDX), `…/migration000NewSourceTypeSurveyParticipation.spec.ts` (NEU, SPDX), `apps/api/src/notifications/migrations/notificationsMigrationsList.ts` (NEU, SPDX), `apps/api/src/notifications/notifications.service.ts`, `notification.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:26370-26432` — `name = '000-survey-notification-should-link-to-participation-page'`, prev 1 → new 2, `REWRITE_BATCH_SIZE = 500`. Zweistufig: (1) `updateMany({$or:[{schemaVersion:{$exists:false}},{schemaVersion:1}]}, {$set:{schemaVersion:2}})` — bumpt **alle**; (2) Cursor über `{sourceType: SURVEY}` schreibt `sourceType: SURVEY_PARTICIPATION` in 500er-Batches, `bulkWrite(..., {ordered:false})`, Duplicate-Key-Fehler werden über `isMongoDuplicateKeyError` abgefangen, gezählt und als `Logger.warn` gemeldet (nicht geworfen). Wiring `NEW:25086` in `onModuleInit`.
Änderung: Migration + Liste neu anlegen, `NotificationsService` (`notifications.service.ts:47`, `notificationModel` bereits injiziert `:54`) um `implements OnModuleInit` + `onModuleInit()` mit `MigrationService.runMigrations<NotificationDocument>(this.notificationModel, notificationsMigrationsList)` erweitern, Schema-Default `schemaVersion` 1 → 2, `notifications: 2` in `terminalSchemaVersions.ts`. **Achtung git-safety:** `notifications.service.ts` war früher Kevins WIP — vor der Änderung `git status` prüfen; bei uncommittetem WIP Task als `[?] human-gate` parken statt anfassen.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='migration000NewSourceType|migrationsLists'"` grün (Fälle: Bump ohne `schemaVersion`; `survey` → `survey-participation`; >500 Docs → 2 `bulkWrite`-Aufrufe; Duplicate-Key → `Logger.warn`, kein Throw). `grep -c "runMigrations" apps/api/src/notifications/notifications.service.ts` == 1.
i18n: keine
Doku: Delta-Tabelle + Wiring-Tabelle (8 → 9)
Abhängt von: T16

### T18 — Notification/001 Mail-`sourceId` → Message-Route  [?] human-gate (Vorbedingung Mail-Routing fehlt im Fork)
Komponente: apps/api, libs · Dateien: `apps/api/src/notifications/migrations/migration001MailSourceIdToMessageRoute.ts` (NEU, SPDX), Spec, `notificationsMigrationsList.ts`, `notification.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:26502-26580` — `name = '001-mail-notification-sourceid-to-message-route'`, prev 2 → new 3, `LEGACY_PER_MAIL_PUSH_NOTIFICATION_PREFIX = 'Neue E-Mail von '` (`NEW:26504`). `resolveRewrittenSourceId` (`NEW:26505-26522`): nur wenn `sourceId` und `pushNotification` Strings sind **und** `pushNotification` mit dem Legacy-Präfix beginnt **und** `sourceId` den Separator enthält **und** der Teil danach `MAIL_UID_PATTERN` (`/^\d+$/`, `NEW:24377`) erfüllt → `${username}${SEP}${buildMailRoute(MAIL_FOLDER_NAMES.INBOX, Number(uid))}`. Alle Schreibvorgänge mit `{ timestamps: false }` (`NEW:26533`/`NEW:26542`) — Benachrichtigungen dürfen nicht „neu" wirken.
Änderung: **Vorbedingung nicht erfüllt** — der Fork hat weder `buildMailRoute`/`buildMailFolderPath` (`NEW:24189-24197`) noch `MAIL_NOTIFICATION_SOURCE_ID_SEPARATOR` (`NEW:24154`), `MAIL_UID_PATTERN` (`NEW:24377`), `MAIL_PATHS.DELIMITER`, `MAIL_FOLDER_NAMES` oder `mailRouteMessageSegment` (`grep -rn "buildMailRoute\|MAIL_FOLDER_NAMES\|mailUidPattern" apps libs` == leer). Diese Helfer gehören zum **Mail-2.1-Routing-Paket** und dürfen hier nicht nebenbei erfunden werden. Task als `[?] human-gate` parken: entweder das Mail-Paket zieht sie vor, oder diese Migration wird **nach** dem Mail-Paket eingeplant. **`terminalSchemaVersions.notifications` bleibt bis dahin auf 2** — der Fork überspringt Version 3 bewusst und dokumentiert das.
Verify: (blockiert) `grep -rn "buildMailRoute" apps libs` != leer ist die Freigabebedingung. Bis dahin: Doku-Eintrag „notifications terminal = 2 (Upstream 3), Grund: Mail-Routing-Helfer fehlen" in `docs/migrations/2.1-migrations-catchup.md` — **das** ist der prüfbare Teil dieser Task.
i18n: keine
Doku: Delta-Tabelle + expliziter Lücken-Vermerk
Abhängt von: T17

### T19 — User: `schemaVersion`-Feld + Migration/000 (encryptKey wrappen) + Wiring  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/users/migrations/migration000WrapEncryptKeys.ts` (NEU, SPDX), Spec, `apps/api/src/users/migrations/userMigrationsList.ts` (NEU, SPDX), `apps/api/src/users/user.schema.ts`, `apps/api/src/users/users.service.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:11745-11776` — `name: '000-wrap-encrypt-keys-with-master-key'`, `PREVIOUS_SCHEMA_VERSION = 0`, `NEW_SCHEMA_VERSION = 1`. Filter: `{ encryptKey: {$exists:true, $ne:''}, $or:[{schemaVersion:{$exists:false}},{schemaVersion:0}] }`, `.select('encryptKey').lean()`. `wrapSingleUser` (`NEW:11747`): bereits gewrappt oder leer → nur `schemaVersion` setzen und `false` zurückgeben; sonst `wrapEncryptKey` + beides setzen, `true`. Wiring `NEW:10323` (`static userMigrationsList = [migration000]`) + `NEW:10328`.
Änderung: Migration + Liste neu anlegen. `@Prop({ default: 1 }) schemaVersion: number;` in `user.schema.ts`. `UsersService` (`users.service.ts:53`, `userModel` bereits injiziert `:55`) um `implements OnModuleInit` + `runMigrations(this.userModel, userMigrationsList)` erweitern (Liste als eigenes Modul-File, **nicht** als statisches Klassenfeld wie im Bundle — Fork-Muster der 8 Bestandslisten). `users: 1` in `terminalSchemaVersions.ts`. **Sicherheit:** kein Log des Klartext-Keys, `Promise.all` über `wrapSingleUser` wie im Soll.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='migration000WrapEncryptKeys|migrationsLists'"` grün (Fälle: Klartext → `wrapped:`-Präfix + Bump; bereits gewrappt → nur Bump, `wrapEncryptKey` nicht gerufen; leerer Key → nicht im Filter; zweiter Lauf → No-Op). **Sicherheits-Gegenprobe:** Spec assertet, dass keiner der `Logger`-Aufrufe den Klartext-Key enthält.
i18n: keine
Doku: Delta-Tabelle + Runbook: **Dump + `master.key` vor diesem Lauf**, Rotation des Master-Keys = Totalverlust
Abhängt von: T7b, T17

### T20 — TldrawSyncRoom: `schemaVersion`-Feld + `namespaceLegacyTldrawAssetUrl`  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/tldraw-sync/utils/namespaceLegacyTldrawAssetUrl.ts` (NEU, SPDX), `…/namespaceLegacyTldrawAssetUrl.spec.ts` (NEU, SPDX), `apps/api/src/tldraw-sync/tldraw-sync-room.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:74835-74855` — `ASSET_URL_MARKER = '/${TLDrawSyncEndpoints.BASE}/${TLDrawSyncEndpoints.ASSETS}/'`; gibt `null` zurück, wenn der Marker fehlt, wenn der Rest leer ist **oder** wenn der Rest bereits ein `/` enthält (= schon namespaced); sonst `{ newUrl: prefix + encodeURIComponent(roomId) + '/' + rest, encodedFilename: rest }`.
Änderung: Util portieren (Endpoint-Konstanten des Forks wiederverwenden, keine Magic Strings). `@Prop({ default: 1 }) schemaVersion: number;` in `tldraw-sync-room.schema.ts` (Schema ist `strict: true` → ohne `@Prop` bliebe der Bump wirkungslos). `tldrawsyncrooms: 1` in `terminalSchemaVersions.ts`.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern=namespaceLegacyTldrawAssetUrl"` grün (Fälle: Legacy-URL → namespaced; bereits namespaced → `null`; fremde URL → `null`; leerer Rest → `null`; roomId mit Sonderzeichen → `encodeURIComponent`).
i18n: keine
Doku: Delta-Tabelle
Abhängt von: T19

### T21 — TldrawSyncRoom/000 + **Bugfix Endlos-Retry** + Wiring  [ ]
Komponente: apps/api · Dateien: `apps/api/src/tldraw-sync/migrations/migration000NamespaceAssetsByRoom.ts` (NEU, SPDX), Spec, `apps/api/src/tldraw-sync/migrations/tldrawSyncRoomMigrationsList.ts` (NEU, SPDX), `apps/api/src/tldraw-sync/tldraw-sync.service.ts`
Soll: `NEW:74739-74805` — `name = '000-namespace-assets-by-room'`, `schemaVersion = 1`, `ASSET_URL_PROPS = ['src','url']`. `moveLegacyAssetFile` (`NEW:74746`): `sanitizePath(decodeURIComponent(name))`, Abbruch wenn Quelle fehlt oder Ziel existiert, sonst `ensureDir` + `move`. Hauptschleife: `find({$or:[{schemaVersion:{$exists:false}},{schemaVersion:{$lt:1}}]}).lean()`, seriell über `reduce`, je Room über `roomData.documents` → `state.props` → `src`/`url`.
Änderung: Portieren — **mit einer bewussten Abweichung.** Im Soll steht der `schemaVersion`-Bump (`NEW:74799`) **innerhalb** des `try`; wirft ein Room (kaputte `roomData`, Dateisystemfehler in `moveLegacyAssetFile`), springt der Ablauf in den `catch` (`NEW:74801`), loggt und lässt die Version **unverändert** → derselbe Room wird bei **jedem** Boot erneut verarbeitet, endlos, und blockiert `onModuleInit` bei jedem Start. Das ist ein Upstream-Bug und wird **nicht** verbatim portiert: der Bump wandert in einen `finally`-Zweig bzw. hinter den `catch`, so dass ein fehlgeschlagener Room trotzdem als bearbeitet markiert wird und der Fehler **einmal** mit `roomId` protokolliert erscheint (`Logger.error(..., migration000NamespaceAssetsByRoom.name)`). Fachliche Begründung fürs Doku-File: ein fehlgeschlagener Room bleibt inhaltlich exakt im Vorzustand (Legacy-Asset-URLs) — das ist derselbe Zustand wie vor der Migration, nur ohne Boot-Schleife. Liste neu anlegen, `TldrawSyncService` um `OnModuleInit` + `runMigrations(this.roomModel, tldrawSyncRoomMigrationsList)` erweitern (`NEW:74412`; `roomModel` ist bereits injiziert, `tldraw-sync.service.ts:51`).
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='migration000NamespaceAssets|migrationsLists'"` grün. **Regressionsfall ist Pflicht:** Ein Room, dessen `moveLegacyAssetFile` wirft, muss danach `schemaVersion: 1` tragen **und** genau einen `Logger.error` erzeugt haben; ein zweiter Lauf über dieselbe Menge darf diesen Room **nicht** erneut anfassen (`find`-Mock liefert ihn dann nicht mehr — Assertion auf `updateOne`-Aufrufzahl).
i18n: keine
Doku: Delta-Tabelle + Abschnitt „Bewusste Abweichungen vom Upstream" (Bug 1: tldraw-Endlos-Retry)
Abhängt von: T20

### T22 — CalendarMetadata: `schemaVersion`-Feld + Migration/000 + Wiring  [ ]
Komponente: apps/api · Dateien: `apps/api/src/calendar/migrations/migration000DropLegacyShares.ts` (NEU, SPDX), Spec, `apps/api/src/calendar/migrations/calendarMetadataMigrationsList.ts` (NEU, SPDX), `apps/api/src/calendar/calendar-metadata.schema.ts`, `apps/api/src/calendar/calendar.service.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:46223-46240` — `LOG_CONTEXT = 'CalendarMetadataMigration000'`, `TARGET_VERSION = 1`, `name: '000-drop-legacy-shares'`. Ein einziger Raw-Driver-Aufruf: `model.collection.updateMany({$or:[{shares:{$exists:true}},{schemaVersion:{$exists:false}},{schemaVersion:{$lt:1}}]}, {$unset:{shares:''}, $set:{schemaVersion:1}})`. **Der Raw-Driver ist hier wesentlich**, weil `shares` nach dem Feld-Entfernen kein Schema-Pfad mehr ist und `strict: true` das `$unset` sonst still verwirft. Wiring `NEW:43570`.
Änderung: Migration + Liste anlegen; `@Prop({ default: 1 }) schemaVersion: number;` in `calendar-metadata.schema.ts`; das Feld `shares` (`calendar-metadata.schema.ts:21`) und `calendar-share-entry.schema.ts` **erst nach** dieser Migration entfernen — in dieser Task nur `shares` aus dem Schema nehmen, wenn `grep -rn "CalendarShareEntry\|\.shares" apps/api/src/calendar` keine Consumer mehr zeigt; andernfalls das Entfernen dem Calendar-2.1-Paket überlassen und hier nur `$unset` + Bump fahren. `CalendarService.onModuleInit` (existiert bereits, `calendar.service.ts:95`) um den `runMigrations`-Aufruf erweitern. `calendarmetadata: 1` in `terminalSchemaVersions.ts`.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='migration000DropLegacyShares|migrationsLists'"` grün; Spec assertet, dass der **Raw-Collection**-Pfad benutzt wird (`model.collection.updateMany` aufgerufen, `model.updateMany` nicht). `grep -c "runMigrations" apps/api/src/calendar/calendar.service.ts` == 1.
i18n: keine
Doku: Delta-Tabelle + Wiring-Tabelle
Abhängt von: T21

### T23 — CalendarMetadata/001 Re-Key auf URL-Hash-IDs  [?] human-gate — DESTRUKTIV, darf nicht allein landen
Komponente: apps/api · Dateien: `apps/api/src/calendar/migrations/migration001RekeyMetadataToUrlHashIds.ts` (NEU, SPDX), Spec, `calendarMetadataMigrationsList.ts`, `apps/api/src/calendar/utils/deriveCalendarId.ts` (NEU, SPDX), `apps/api/src/calendar/utils/decodeLegacyCalendarId.ts` (NEU, SPDX), `terminalSchemaVersions.ts`
Soll: `NEW:46272-46305` — `TARGET_VERSION = 2`, `name: '001-rekey-metadata-to-url-hash-ids'`. Je Dokument: `decodeLegacyCalendarId(calendarId)` (`NEW:46369`, base64url → URL, nur wenn `^https?://`), dann `deriveCalendarId(url)` (`NEW:46340`, `createHash('sha256').update(url,'utf-8').digest('hex')`). Kein/unveränderter neuer Wert → nur Bump. Existiert bereits ein Dokument mit der neuen Id → **Tags werden vereinigt, `ownerUsername` des Bestands gewinnt, und das Quell-Dokument wird `deleteOne`-gelöscht**. Sonst Re-Key per `updateOne`.
Änderung: **Diese Migration ist der einzige Datenverlust-Kandidat des Pakets** (`deleteOne` + Merge). Zwei Auflagen:
 (1) **Dump-Pflicht.** Vor jedem Lauf gegen Daten: `mongodump` + `./data/master.key`. Im Runbook als eigener, nicht überspringbarer Schritt, mit Kommando und Restore-Weg.
 (2) **Kopplungs-Sperre.** Der Fork leitet Kalender-IDs heute noch per base64url ab und **dekodiert sie zurück**, um die Kalender-URL zu bekommen: `calendar.service.ts:53-54` (`encodeCalendarId`/`decodeCalendarId`), `:386` (Erzeugung), `:467-468` (`findCalendar` dekodiert die Id zur Ziel-URL). Ein sha256-Hash ist **nicht** umkehrbar. 2.1.0 löst das, indem `findCalendar` alle Kalender holt und über `resolveCalendarFromList` per abgeleiteter Id matcht (`NEW:43969-43972`). Wird diese Migration ohne diesen Umbau eingespielt, findet der Kalender-Service **keinen einzigen Kalender mehr**. Deshalb: Migration schreiben, Spec schreiben, aber **nicht in `calendarMetadataMigrationsList` verdrahten** und `calendarmetadata` in `terminalSchemaVersions.ts` auf **1** lassen, bis das Calendar-2.1-Paket `deriveCalendarId` + `resolveCalendarFromList` gelandet hat. Das Verdrahten ist eine Zeile und gehört in **jenes** Paket.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='migration001Rekey|deriveCalendarId|decodeLegacyCalendarId'"` grün (Fälle: Legacy-base64url → sha256-Re-Key; nicht dekodierbare Id → nur Bump; Kollision → Tags vereinigt, Quelle gelöscht, `ownerUsername` des Bestands bleibt; leere Menge → Return ohne Schreiben). **Sperr-Assertion:** `grep -c "migration001Rekey" apps/api/src/calendar/migrations/calendarMetadataMigrationsList.ts` == 0 **und** ein Doku-Eintrag, der sagt warum.
i18n: keine
Doku: Delta-Tabelle + Runbook-Abschnitt „Destruktive Migration: Dump zwingend" + Kopplungs-Sperre
Abhängt von: T22

### T24 — PublicShare: `schemaVersion`/`isDirectory`-Felder + Migration/001 (nicht-destruktiver Teil)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/filesharing/migrations/migration001BackfillIsDirectory.ts` (NEU, SPDX), Spec, `apps/api/src/filesharing/migrations/publicSharesMigrationList.ts` (NEU, SPDX), `apps/api/src/filesharing/publicFileShare.schema.ts`, `apps/api/src/filesharing/filesharing.service.ts` (führt das PublicShare-Model, `:57`), `terminalSchemaVersions.ts`
Soll: `NEW:56066-56110` — `LOG_CONTEXT = 'PublicSharesMigration001'`, `name: '001-backfill-missing-isDirectory-from-filePath'`, Ziel 2. Filter `{$or:[{schemaVersion:{$exists:false}},{schemaVersion:{$lt:2}},{isDirectory:{$exists:false}}]}` mit Projektion `{_id,filePath,isDirectory,publicShareId}`; `derivedIsDirectory = filePath.endsWith('/')`; gesetzt wird nur, wenn `isDirectory === undefined`; Bump immer. Schreibweg: `model.collection.initializeUnorderedBulkOp()`. Wiring `NEW:52411`.
Änderung: **Reihenfolge-Abweichung mit Begründung:** Upstream setzt `000` (ACL-Umbau, s. T25) vor `001`. `001` ist aber unabhängig, nicht-destruktiv und nur von `filePath`/`isDirectory` abhängig — `000` hängt an einem ACL-Stack, den der Fork nicht hat. Deshalb hier zuerst `001` bauen und **als einzigen Eintrag** in die Liste stellen; der `000`-Platz bleibt im Dateinamen reserviert. Damit erreicht `publicshares` terminal **2** ohne den ACL-Umbau, was für `isDirectory`-Konsumenten korrekt ist. `@Prop({ type: Boolean }) isDirectory?: boolean;` + `@Prop({ default: 2 }) schemaVersion: number;` ergänzen. Wiring in `FilesharingService` (`OnModuleInit` + `runMigrations(this.publicShareModel, publicSharesMigrationList)`; das Model ist dort bereits injiziert, `filesharing.service.ts:57`). `publicshares: 2` in `terminalSchemaVersions.ts`. Den Reihenfolge-Bruch in der Doku belegen.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='migration001BackfillIsDirectory|migrationsLists'"` grün (Fälle: `filePath` endet auf `/` → `true`; sonst `false`; bereits gesetzt → unverändert, aber Bump; leere Menge → Return). `grep -c "runMigrations" apps/api/src/filesharing/filesharing.service.ts` == 1.
i18n: keine
Doku: Delta-Tabelle + Vermerk „000 ausgelassen, Reihenfolge bewusst gedreht"
Abhängt von: T23

### T25 — PublicShare/000 ACL-Umbau  [?] human-gate (ACL-Stack fehlt im Fork)
Komponente: apps/api, libs · Dateien: `apps/api/src/filesharing/migrations/migration000MigratePublicSharesAclAndDirectory.ts` (NEU, SPDX), Spec, `publicSharesMigrationList.ts`, `publicFileShare.schema.ts`
Soll: `NEW:55954-56010` — `name: '000-migrate-public-shares-acl-and-directory'`, Ziel 1. Setzt `acl` (aus `invitedAttendees`/`invitedGroups` via `createReadonlyAclSection`, `NEW:56039`), leitet `isPublic` daraus ab (alle Sections ohne Attendees und ohne Groups), wrappt Klartext-Passwörter mit `wrapEncryptKey` und `$unset`et `invitedAttendees`/`invitedGroups`. Schreibweg: Raw-Bulk.
Änderung: **Vorbedingung nicht erfüllt.** Der Fork hat kein `acl`/`isPublic` am `PublicShare` (`publicFileShare.schema.ts:31-66` kennt nur `invitedAttendees`/`invitedGroups`) und weder `createReadonlyAclSection` noch `normalizeAclSection` noch die `Permission`-Konstante (`grep -rn "normalizeAclSection\|AclSection" apps libs` == leer). Das ist der **Filesharing-ACL-Umbau**, ein eigenes Feature-Paket — die Migration ist dort die letzte Zeile, nicht hier die erste. Task als `[?] human-gate` parken. Der `master.key`-Anteil (`wrapEncryptKey` für Klartext-Passwörter) ist mit T7b bereits vorbereitet.
Verify: (blockiert) Freigabebedingung: `grep -rn "createReadonlyAclSection" apps/api/src` != leer **und** `acl` ist ein `@Prop` am `PublicShare`. Prüfbarer Teil hier: Doku-Eintrag „publicshares terminal = 2 erreicht **ohne** `000`; ACL-Backfill offen, Owner = Filesharing-ACL-Paket; Klartext-Passwörter bleiben bis dahin ungewrappt" in `docs/migrations/2.1-migrations-catchup.md` — inklusive der Sicherheitsfolge, dass Share-Passwörter bis dahin im Klartext in Mongo liegen.
i18n: keine
Doku: Delta-Tabelle + Sicherheits-Vermerk
Abhängt von: T24

---
**Block E — Bulletins**

### T26 — bulletinCategory/001 `icon`  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/bulletin-category/migrations/migration001.ts` (NEU, SPDX), Spec, `bulletinCategoryMigrationsList.ts`, `bulletin-category.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:69757-69770` — `name: '001-add-icon-to-bulletin-category'`, prev 1 → new 2, ein `updateMany({schemaVersion:1}, {$set:{icon:'', schemaVersion:2}})`, Log nur wenn `modifiedCount > 0`, Kontext `migration001AddIcon.name`.
Änderung: Migration; Default-Export heißt `migration001AddIcon` — das entspricht dem Namensdrift der Nachbardatei (`migrations/migration000.ts` exportiert `migration000AddPosition`) und wird bewusst beibehalten, damit die Liste konsistent bleibt; der Drift zur AGENTS.md-Regel „Dateiname == Default-Export" ist ein **Bestandsdrift** und wird hier nicht großflächig repariert (surgical). `@Prop({ type: String, default: '' }) icon: string;` ins Schema, Default 1 → 2, `bulletincategories: 2`, Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='bulletin-category.*migration001|migrationsLists'"` grün; `bash scripts/crabbox/iter.sh cmd "npm run check-filenames"` bleibt grün (falls es an diesem Drift anschlägt: Datei `migration001AddIcon.ts` nennen **und** in derselben Task `migration000.ts` NICHT umbenennen — Umbenennung des Bestands ist ein eigenes Ticket).
i18n: keine
Doku: Delta-Tabelle
Abhängt von: T25

### T27 — bulletins/001 Token-Platzhalter aus Inhalten entfernen  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/bulletinboard/migrations/migration001.ts` (NEU, SPDX), Spec, `bulletinsMigrationList.ts`, `bulletin.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:71190-71235` — `TOKEN_PLACEHOLDER_STRIP = /[?&]token=\{\{token}}/g` (benannter Export), `MONGO_FILTER = { content: {$regex: /token=\{\{token}}/} }`, `name: '001-strip-token-placeholder-from-bulletin-content'`, `newSchemaVersion = 2`, Filter `{...MONGO_FILTER, schemaVersion: {$lt: 2}}`, Raw-Bulk, Log-Zweige für „nichts zu tun" / „n aktualisiert".
Änderung: Migration im Stil des Nachbarn `migration000.ts` (gleicher Raw-Bulk-Aufbau). **Zu belegender Nebeneffekt:** `{$lt: 2}` matcht wegen Mongos Typ-Klammerung **keine** Dokumente ohne `schemaVersion`; das ist unkritisch, weil solche Dokumente das `content`-Regex ohnehin nur treffen können, wenn sie einen Token-Platzhalter tragen — dann sind sie aber auch von `migration000` nicht angefasst worden. Im Spec einen Fall dafür führen und das Verhalten in der Doku festhalten, damit es niemand später als Bug „repariert". Schema-Default 1 → 2, `bulletins: 2`, Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='bulletinboard.*migration001|migrationsLists'"` grün (Fälle: `?token={{token}}` entfernt; `&token={{token}}` entfernt; mehrfach im selben Inhalt; kein Treffer → kein Bulk; Dokument ohne `schemaVersion` → nicht im Filter).
i18n: keine
Doku: Delta-Tabelle + Hinweis zur `$lt`-Typklammerung
Abhängt von: T26

---
**Block F — Surveys (schwerster Strang; Reihenfolge zuerst, dann Helfer, dann Migrationen)**

### T28 — Migrations-Reihenfolge surveys → surveyAnswers erzwingen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/surveys.service.ts`, `apps/api/src/surveys/survey-answers.service.ts`, `apps/api/src/surveys/survey-answers.service.spec.ts`
Soll: `NEW:60212-60215` — 2.1.0 führt **beide** Läufe in **einem** `onModuleInit`, hintereinander, surveys zuerst: `runMigrations(this.surveyModel, surveysMigrationsList)` dann `runMigrations(this.surveyAnswerModel, surveyAnswersMigrationsList)`. `SurveysService` hat dort **kein** eigenes `runMigrations` mehr.
Änderung: Fork-Ist: `surveys.service.ts:56-58` und `survey-answers.service.ts:55-57` sind **zwei getrennte** `onModuleInit`-Hooks; NestJS garantiert deren relative Reihenfolge nicht verlässlich über die Abhängigkeitskante hinweg. Ab T34 hängt `surveyAnswers/002` inhaltlich davon ab, dass `surveys/002` die Limiter **vorher** ausgelagert hat — läuft es andersherum, findet `surveyAnswers/002` eine leere Limiter-Collection, schreibt nichts und bumpt trotzdem (`batchedSchemaVersionMigration`), womit die Umschreibung **dauerhaft verloren** ist. Deshalb: `onModuleInit` aus `surveys.service.ts` entfernen (samt `OnModuleInit`-Implements und den dann ungenutzten Imports `MigrationService`/`surveysMigrationsList`) und in `survey-answers.service.ts` **vor** die bestehende Zeile setzen. `surveyModel` ist dort bereits injiziert (`survey-answers.service.ts:49`) — keine Konstruktor-Änderung nötig.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern=survey-answers.service"` grün mit einem neuen Fall, der `MigrationService.runMigrations` mockt und die **Aufrufreihenfolge** assertet (erster Aufruf `surveyModel`, zweiter `surveyAnswerModel`, `mock.invocationCallOrder`). `grep -c "runMigrations" apps/api/src/surveys/surveys.service.ts` == 0 und `… survey-answers.service.ts` == 2. `bash scripts/crabbox/iter.sh cmd "npx tsc -p apps/api/tsconfig.app.json --noEmit"` clean (fängt vergessene Imports).
i18n: keine
Doku: Delta-Tabelle + Abschnitt „Bruchstelle 3: Reihenfolge"
Abhängt von: T27

### T29 — Helfer: `batchedSchemaVersionMigration`  [ ]
Komponente: apps/api · Dateien: `apps/api/src/migration/batchedSchemaVersionMigration.ts` (NEU, SPDX), `…/batchedSchemaVersionMigration.spec.ts` (NEU, SPDX)
Soll: `NEW:61967-62000` — `BATCH_SIZE = 500`; `model.find(filter).lean()` (+ optional `.sort(sort)`) → `.cursor()`; je Dokument `await buildSetFields(doc)`; **immer** eine `updateOne`-Operation, entweder mit `{...setFields, schemaVersion}` oder nur `{schemaVersion}`; `changedCount` zählt nur die mit `setFields`; Flush bei ≥ 500 und am Ende, `bulkWrite(ops, {ordered:false})`; Abschluss-Log nur wenn `changedCount > 0`.
Änderung: 1:1 portieren, generisch typisiert (`<T>` über `Model<T>`, kein `any`), Default-Export am Dateiende. Das „bumpt auch ohne Änderung"-Verhalten ist der Kern der Reparatur aus T3 und muss exakt so bleiben.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern=batchedSchemaVersionMigration"` grün (Fälle: 1200 Dokumente → 3 `bulkWrite`-Aufrufe; `buildSetFields` liefert `null` → Dokument wird trotzdem gebumpt und **nicht** in `changedCount` gezählt; `changedCount === 0` → kein Abschluss-Log; `sort` wird durchgereicht).
i18n: keine
Doku: keine
Abhängt von: T28

### T30 — Helfer: `toRelativeEduApiUrl` + `stripOriginFromSurveyUrls` + `stripOriginFormulaMigration`  [ ]
Komponente: apps/api, libs · Dateien: `libs/src/common/utils/toRelativeEduApiUrl.ts` (NEU, SPDX), `apps/api/src/surveys/migrations/stripOriginFromSurveyUrls.ts` (NEU, SPDX), `apps/api/src/surveys/migrations/stripOriginFormulaMigration.ts` (NEU, SPDX), je ein Spec
Soll: `NEW:62362-62368` — `toRelativeEduApiUrl`: `ABSOLUTE_URL_ORIGIN_REGEX = /^https?:\/\/[^/]+/i`; keine absolute URL → unverändert; sonst Origin abschneiden und **nur** zurückgeben, wenn der Rest mit `/${EDU_API_ROOT}/` beginnt, sonst Original. `NEW:62966` — `stripOriginFromSurveyUrls(formula)` läuft die Formel ab und meldet per Boolean, ob etwas geändert wurde. `NEW:62883-62894` — `stripOriginFormulaMigration(model, {name, filter, newSchemaVersion, formulaSetPath, documentLabel, extractFormula})` delegiert an `batchedSchemaVersionMigration` und liefert `null`, wenn nichts geändert wurde.
Änderung: Alle drei portieren; `EDU_API_ROOT` aus der Fork-Konstante ziehen (keine Magic Strings). `stripOriginFromSurveyUrls` mutiert die Formel in place und gibt `boolean` zurück — Signatur beibehalten, damit `formulaSetPath` (`'formula'` bzw. `'template.formula'`) generisch bleibt.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='toRelativeEduApiUrl|stripOriginFrom|stripOriginFormula'"` grün (Fälle: `https://host/edu-api/x` → `/edu-api/x`; `https://host/other` → unverändert; relative URL → unverändert; Formel ohne URLs → `false` → `buildSetFields` liefert `null`).
i18n: keine
Doku: keine
Abhängt von: T29

### T31 — Helfer: `walkSurveyAnswerTree` + `countChoiceMatchesInAnswer` + `hasUniqueChoiceTitles` + SurveyJS-Comment-Suffix  [ ]
Komponente: libs, apps/api · Dateien: `libs/src/survey/utils/walkSurveyAnswerTree.ts` (NEU, SPDX), `libs/src/survey/utils/countChoiceMatchesInAnswer.ts` (NEU, SPDX), `libs/src/survey/utils/hasUniqueChoiceTitles.ts` (NEU, SPDX), `libs/src/survey/constants/surveyjsCommentSuffix.ts` (NEU, SPDX), Specs unter `apps/api` (libs hat keine eigene Test-Infra — Fork-Präzedenz)
Soll: `NEW:61549` (`walkSurveyAnswerTree`), `NEW:62770-62808` (`objectMatchesChoice` / `countChoiceMatchesInValue` / `matchInAnswer` / `countChoiceMatchesInAnswer` — Treffer zählen über `value`/`name`/`title` eines Objekts oder direkte Strings, in Arrays und verschachtelt), `NEW:63171` (`hasUniqueChoiceTitles = new Set(choices.map(c=>c.title)).size === choices.length`), SurveyJS-Comment-Suffix (Modul 929, verwendet in `NEW:62675`/`NEW:63088`).
Änderung: Portieren. Keiner dieser Helfer existiert im Fork (`grep -rn "walkSurveyAnswerTree\|SURVEYJS_COMMENT_SUFFIX" apps libs` == leer). Generische Typen statt Casts; Default-Export je Datei am Ende.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='countChoiceMatchesInAnswer|hasUniqueChoiceTitles|walkSurveyAnswerTree'"` grün (Fälle: String-Antwort; Array aus Strings; Array aus Objekten mit `value`/`name`/`title`; verschachtelte Antwort; Comment-Key-Variante; doppelte Titel → `false`).
i18n: keine
Doku: keine
Abhängt von: T30

### T32 — `SurveysBackendLimiter`-Collection (Schema + Modul-Registrierung)  [?] human-gate — Owner ist das Surveys-2.1-Paket
Komponente: apps/api, libs · Dateien: `apps/api/src/surveys/surveys-backend-limiter.schema.ts` (NEU, SPDX), `apps/api/src/surveys/surveys.module.ts`
Soll: `NEW:58989-59016` — Felder `surveyId`, `questionName`, `choices`, `schemaVersion`. Konsumiert von `surveys/002` (`NEW:62625`), `surveys/005` (`NEW:63062`) und `surveyAnswers/002` (`NEW:61897`) jeweils über `model.db.model(SurveysBackendLimiter.name)`.
Änderung: Das Schema anlegen und im `SurveysModule` registrieren ist die **Mindest-Vorbedingung** für T33/T34/T38. Der zugehörige Service/Controller/FE-Anteil (Limiter-Verwaltung zur Laufzeit) gehört **nicht** hierher. Entscheidung für Kevin: entweder dieses Paket legt Schema + Registrierung an (kleiner, klar abgegrenzter Vorgriff) oder T33/T34/T38 werden hinter das Surveys-2.1-Paket gehängt und `surveys` bleibt vorerst auf terminal 1. **Empfehlung: Schema hier anlegen** — es ist reine Struktur, ohne Verhalten, und ohne sie ist der gesamte Surveys-Strang blockiert.
Verify: `bash scripts/crabbox/iter.sh cmd "npx tsc -p apps/api/tsconfig.app.json --noEmit"` clean; `grep -c "SurveysBackendLimiter" apps/api/src/surveys/surveys.module.ts` ≥ 1; `bash scripts/crabbox/iter.sh test:api` grün.
i18n: keine
Doku: Delta-Tabelle + Entscheidungsvermerk
Abhängt von: T31

### T33 — surveys/002 Backend-Limiter in eigene Collection auslagern  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/migrations/surveysMigration002MoveBackendLimitersToOwnCollection.ts` (NEU, SPDX), Spec, `surveysMigrationsList.ts`, `survey.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:62618-62740` — `name = '002-move-backend-limiters-to-own-collection'`, prev 1 → new 2. Cursor über `{$or:[{schemaVersion:1},{schemaVersion:{$exists:false}},{backendLimiters:{$exists:true,$type:'array',$not:{$size:0}}}]}`. Ohne Limiter → nur Bump (gesammelt und am Ende per `bulkWrite`). Mit Limitern → je Limiter über **alle** Antworten des Surveys `selectionCount` je Choice zählen (`countChoiceMatchesInAnswer`, für `isCustomUserEntry` gegen `${questionName}${SURVEYJS_COMMENT_SUFFIX}`), dann `upsert` in die Limiter-Collection mit `$setOnInsert` und `schemaVersion: 1`. **Fehlerpfad ist wesentlich:** Bulk-Write-Fehler oder Exception → `Logger.error`, Survey-Id in `failedSurveyIds`, **kein** Bump (`continue`) → wird beim nächsten Boot erneut versucht; Abschluss-Log listet die gescheiterten Ids. Erfolgsfall: `model.updateOne(..., {$unset:{backendLimiters:''}, $max:{schemaVersion:2}}, {strict:false})` — `$max` statt `$set`, `strict:false` wegen des entfernten Pfads.
Änderung: 1:1 portieren, inklusive `$max` und `{strict:false}` (beides bewusst, nicht vereinfachen). `backendLimiters` bleibt vorerst im Fork-Schema (`survey.schema.ts:35`) — das Feld erst entfernen, wenn kein Consumer mehr existiert; das ist Sache des Surveys-2.1-Pakets. Schema-Default 1 → 2, `surveys: 2`, Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='surveysMigration002|migrationsLists'"` grün. Pflichtfälle: Survey ohne Limiter → nur Bump; Survey mit Limitern + 3 passenden Antworten → `selectionCount: 3` im Upsert; `isCustomUserEntry` → Zählung gegen den Comment-Key; **Bulk-Fehler → Survey bleibt auf 1** (Assertion: `updateOne` mit `$unset` **nicht** aufgerufen, `Logger.error` mit der Id aufgerufen).
i18n: keine
Doku: Delta-Tabelle
Abhängt von: T32

### T34 — surveyAnswers/002 umschreiben (Forward-only-Ausnahme aus T3)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/migrations/surveyAnswerMigration002UseChoiceTitleInsideOfAnswers.ts` (**bestehende Datei ersetzen**), `…/surveyAnswerMigration002UseChoiceTitleInsideOfAnswers.spec.ts` (NEU, SPDX), `survey-answers.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:61862-61940` — gleicher `name` (`'002-enforce-the-choice-title-usage-inside-of-survey-answers'`), prev 2 → new 3. Limiter kommen jetzt aus `model.db.model(SurveysBackendLimiter.name)`, mit einem **Cache je `surveyId`** (`limitersBySurveyId`, `NEW:61899-61912`) — pro Survey nur eine Abfrage. Ausführung über `batchedSchemaVersionMigration` mit `filter: {schemaVersion: 2}`, `sort: {_id: 1}`. `buildSetFields` liefert `null` bei fehlender `surveyId` (+ `Logger.warn`), bei leerer Limiter-Map und bei leerer Antwort (+ `Logger.warn`) — das Dokument wird trotzdem gebumpt. `updateSurveyQuestionAnswer` bleibt inhaltlich wie im Fork (choice-`name` → choice-`title`, Arrays elementweise).
Änderung: Datei ersetzen: `populate('surveyId')`-Pfad raus, Limiter-Model + Cache rein, Ausführung auf `batchedSchemaVersionMigration` umstellen. Die vorhandene `updateSurveyQuestionAnswer`/`applyChoiceTitle`-Logik (`:37-64` der Bestandsdatei) bleibt, nur die Eingangsform der Limiter ändert sich. **Header:** Datei behält ihren bestehenden Netzint-Header (Bestandsdatei, kein SPDX-Wechsel); der neue Spec bekommt den SPDX-AGPL-Header. Schema-Default `survey-answers.schema.ts:41` 3 → 3 (unverändert — der Bump geht auf 3, und 3 ist bereits der Default; `surveyanswers` in `terminalSchemaVersions.ts` bleibt 3). Der eigentliche Gewinn: Dokumente, die die alte Fassung stehen gelassen hat, erreichen jetzt die 3.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='surveyAnswerMigration002|migrationsLists'"` grün. Pflichtfälle: Antwort mit Limiter-Choice-`name` → `title` gesetzt **und** Bump; Antwort ohne passenden Limiter → **kein** Set, aber Bump (das ist die Reparatur); fehlende `surveyId` → `Logger.warn` + Bump; zwei Antworten desselben Surveys → Limiter-Model genau **einmal** abgefragt (Cache-Assertion); Dokument auf `schemaVersion: 3` → nicht im Filter.
i18n: keine
Doku: Abschnitt „Bewusste Abweichungen" (Bug 2: bereits ausgelieferte Migration ersetzt, Begründung aus T3)
Abhängt von: T3, T33

### T35 — surveys/003 Origin aus Survey-URLs entfernen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/migrations/surveysMigration003StripOriginFromSurveyUrls.ts` (NEU, SPDX), Spec, `surveysMigrationsList.ts`, `survey.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:62837-62855` — `name = '003-strip-origin-from-survey-urls'`, prev 2 → new 3, delegiert an `stripOriginFormulaMigration` mit `filter: {$or:[{schemaVersion:2},{schemaVersion:{$exists:false}}]}`, `formulaSetPath: 'formula'`, `documentLabel: 'survey'`, `extractFormula: (doc) => doc.formula`.
Änderung: Portieren (dünne Delegation). Schema-Default 2 → 3, `surveys: 3`, Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='surveysMigration003|migrationsLists'"` grün (Fälle: Formel mit absoluter `edu-api`-URL → relativ + Bump; Formel ohne URLs → nur Bump; kein `formula` → nur Bump).
i18n: keine
Doku: Delta-Tabelle
Abhängt von: T34

### T36 — surveyAnswers/003 kaputte verschachtelte Antworten reparieren  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/surveys/migrations/surveyAnswerMigration003FixCorruptedNestedAnswers.ts` (NEU, SPDX), Spec, `libs/src/survey/utils/flattenSurveyElements.ts` (NEU, SPDX), `libs/src/survey/utils/getTopLevelElements.ts` (NEU, SPDX), `surveyAnswersMigrationsList.ts`, `survey-answers.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:62034-62195` — `name = '003-fix-corrupted-nested-answers'`, prev 3 → new 4. Hilfsmittel: `flattenSurveyElements` (`NEW:62223`, rekursiv über `elements` + `templateElements`), `getTopLevelElements` (`NEW:62254`, `formula.elements ?? formula.pages.flatMap(...)`), `buildQuestionsMap`. Erkennung: `isCharObject` (Objekt, dessen Keys nur Ziffern und dessen Werte nur Einzelzeichen sind), `isCorruptedCharArray`, `isEmptyObject`, `reconstructString` (Keys numerisch sortieren, Werte joinen), Matrix-Zeilennamen über `getRowName`. Ausführung: eigener Cursor mit `.populate({path:'surveyId', select:'formula'}).sort({_id:1})`, 500er-Batches, **jedes** Dokument wird geschrieben (auch unverändert) und gebumpt.
Änderung: Portieren. Die beiden libs-Utils braucht sonst nur das Surveys-2.1-Paket — sie entstehen trotzdem hier, weil diese Migration sie zuerst benötigt. `SURVEY_QUESTION_OTHER_TYPES`/`SURVEY_QUESTION_MATRIX_TYPES` im Fork suchen und wiederverwenden; falls nicht vorhanden, aus `NEW` (Module 915/913) mit anlegen und in der Doku als mitgezogene Konstanten vermerken. Schema-Default `survey-answers.schema.ts:41` 3 → 4, `surveyanswers: 4` in `terminalSchemaVersions.ts`, Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='surveyAnswerMigration003|flattenSurveyElements|getTopLevelElements'"` grün (Fälle: `{0:'a',1:'b'}` → `'ab'`; Array solcher Objekte → Array von Strings; leeres Objekt bei Matrix-Frage → Zeilennamen-Behandlung; unverändertes Dokument → trotzdem Bump; Formel über `pages` statt `elements`).
i18n: keine
Doku: Delta-Tabelle
Abhängt von: T35

### T37 — surveys/004 `participatedUsernames` backfillen  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/surveys/migrations/surveysMigration004AddParticipatedUsernames.ts` (NEU, SPDX), Spec, `surveysMigrationsList.ts`, `survey.schema.ts`, `libs/src/survey/types/api/survey.dto.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:63009-63025` — `name = '004-add-participated-usernames'`, prev 3 → new 4, `batchedSchemaVersionMigration` mit `buildSetFields: (survey) => survey.participatedUsernames === undefined ? { participatedUsernames: [] } : null`.
Änderung: Migration + `@Prop({ type: Array, default: [] }) participatedUsernames: string[];` im Survey-Schema (Feld existiert im Fork nicht — `grep -rn "participatedUsernames" apps libs` == leer; ohne `@Prop` stiller No-Op). Feld auch im `SurveyDto` ergänzen (Contract-Sync API ↔ DTO ↔ FE-Consumer; FE-Nutzung ist Sache des Surveys-2.1-Pakets). Schema-Default 3 → 4, `surveys: 4`, Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='surveysMigration004|migrationsLists'"` grün; `bash scripts/crabbox/iter.sh cmd "npx tsc -p apps/frontend/tsconfig.app.json --noEmit"` clean (DTO-Änderung darf keinen FE-Consumer brechen).
i18n: keine
Doku: Delta-Tabelle
Abhängt von: T36

### T38 — surveyAnswers/004 Origin aus Antwort-Anhängen entfernen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/migrations/surveyAnswerMigration004StripOriginFromAnswerAttachments.ts` (NEU, SPDX), Spec, `surveyAnswersMigrationsList.ts`, `survey-answers.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:62283-62350` — `name = '004-strip-origin-from-answer-attachments'`, prev 4 → new 5, `stripOriginDeep` (rekursiv über Strings/Arrays/Objekte, meldet `changed`), `batchedSchemaVersionMigration` mit `filter: {schemaVersion: 4}`, `sort: {_id: 1}`, `buildSetFields` liefert `null` bei fehlender oder unveränderter Antwort.
Änderung: Portieren. Schema-Default `survey-answers.schema.ts:41` 3 → 5 (T36 hebt auf 4, diese Task auf 5 — Default in **dieser** Task auf 5 setzen, in T36 auf 4), `surveyanswers: 5`, Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='surveyAnswerMigration004|migrationsLists'"` grün (Fälle: verschachtelter Anhang mit absoluter `edu-api`-URL → relativ; fremde Domain ohne `edu-api`-Pfad → unverändert + Bump; leere Antwort → nur Bump).
i18n: keine
Doku: Delta-Tabelle
Abhängt von: T37

### T39 — surveys/005 doppelte Limiter-Choice-Titel zusammenführen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/migrations/surveysMigration005DeduplicateBackendLimiterChoices.ts` (NEU, SPDX), Spec, `surveysMigrationsList.ts`, `survey.schema.ts`, `terminalSchemaVersions.ts`
Soll: `NEW:63055-63140` — `name = '005-deduplicate-backend-limiter-choices'`, prev 4 → new 5. `mergeDuplicateChoiceTitles` (benannter Export, `NEW:63062-63092`): nach `title` gruppieren; Einzelgruppe unverändert; sonst `isCustomUserEntry` nur wenn **alle** es sind, Matcher = alle `name`s + der `title`, `selectionCount` = Summe der Treffer über Frage **und** Comment-Key, `limit` = `Math.max` **nur wenn alle** Gruppenmitglieder ein endliches `limit > 0` haben, sonst `0`. Nur Limiter mit `!hasUniqueChoiceTitles` werden angefasst; **jedes** Survey wird per `$max: {schemaVersion: 5}` gebumpt.
Änderung: Portieren (`$max` beibehalten). Schema-Default 4 → 5, `surveys: 5`, Liste.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='surveysMigration005|migrationsLists'"` grün (Fälle: zwei Choices mit gleichem Titel → eine, `selectionCount` summiert; gemischte `isCustomUserEntry` → `false`; ein `limit: 0` in der Gruppe → Ergebnis-`limit: 0`; alle Titel eindeutig → kein `bulkWrite` auf die Limiter, aber Survey-Bump).
i18n: keine
Doku: Delta-Tabelle
Abhängt von: T38

### T40 — surveyTemplates 002–005 (vier Migrationen, ein Commit-Block)  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/surveys/migrations/surveyTemplatesMigration002RenameAccessibleByRoles.ts`, `…003NormalizeAccessGroups.ts`, `…004StripOriginFromTemplateUrls.ts`, `…005NormalizeBackendLimiters.ts` (alle NEU, SPDX), je ein Spec, `surveyTemplatesMigrationsList.ts`, `apps/api/src/surveys/surveys-template.schema.ts`, `libs/src/survey/utils/normalizeBackendLimiters.ts` (NEU, SPDX), `libs/src/survey/constants/templates/*.ts` (5 Dateien), `terminalSchemaVersions.ts`
Soll: `NEW:65675-65707` (`'002-rename-accessibleByRoles-to-accessGroups'`, prev 1 → new 2, `$set: {accessGroups, schemaVersion}` + `$unset: {accessibleByRoles:''}`, `bulkWrite(ops, {strict:false})`) · `NEW:65735-65785` (`'003-normalize-accessGroups-to-objects'`, prev 2 → new 3, `toMultipleSelectorGroup`: String → `{id,name,path:'/'+stripped,label,value}` mit führenden `/` entfernt) · `NEW:65813-65833` (`'004-strip-origin-from-template-urls'`, prev 3 → new 4, `stripOriginFormulaMigration` mit `formulaSetPath: 'template.formula'`, `extractFormula: doc => doc.template?.formula`) · `NEW:65857-65885` (`'005-normalize-template-backend-limiters'`, prev 4 → new 5, `BACKEND_LIMITERS_SET_PATH = 'template.backendLimiters'`, `normalizeBackendLimiters` `NEW:65907`: Array → Record `questionName → choices`, Nicht-Objekt → `{}`, bereits Record → unverändert).
Änderung: Vier Migrationen + Liste. Schema: `accessibleByRoles` (`surveys-template.schema.ts:46-47`) → `accessGroups` umbenennen. **Contract-Sync:** die fünf Template-Konstanten in `libs/src/survey/constants/templates/` (`paperSubject.ts:70`, `parentTeacherConference.ts:276`, `limitedEventParticipation.ts:109`, `traineeShip.ts:71`, `letterToParents.ts:135`) tragen `accessibleByRoles: []` und müssen mit umbenannt werden, sonst schreibt `surveyTemplatesMigration001LoadDefaultTemplates` das alte Feld frisch zurück. `normalizeBackendLimiters` in libs anlegen. Schema-Default 1 → 5 (einmal, am Ende des Blocks), `surveytemplates: 5`. **Ausnahme von der Ein-Task-ein-Commit-Regel bewusst nicht genutzt:** vier Commits, einer je Migration, aber ohne Zwischenstopp — der Schema-Rename und die Template-Konstanten landen im Commit von 002.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='surveyTemplatesMigration00[2345]|normalizeBackendLimiters|migrationsLists'"` grün. Pflichtfälle: 002 → `accessGroups` gesetzt und `accessibleByRoles` weg; 003 → `'/teachers'` → `{id:'teachers',path:'/teachers',…}`, bereits normalisierte Einträge unverändert; 004 → `template.formula`-URL relativiert; 005 → Array → Record, `{}`-Fallback. Zusätzlich `grep -rn "accessibleByRoles" apps libs` == leer und `bash scripts/crabbox/iter.sh cmd "npx tsc -p apps/frontend/tsconfig.app.json --noEmit"` clean.
i18n: keine
Doku: Delta-Tabelle (4 Zeilen) + Contract-Sync-Vermerk zu den Template-Konstanten
Abhängt von: T39

---
**Block G — webdavShares-Band, Verifikation, Runbook**

### T41 — webdavShares: Fork-Band umsetzen + Repair für Bestands-Installationen  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/webdav/shares/migrations/migration900.ts` (NEU, SPDX; ersetzt `migration001.ts`), `…/migration900.spec.ts` (NEU, SPDX), `apps/api/src/webdav/shares/migrations/webdavSharesForkMigrationList.ts` (NEU, SPDX), `apps/api/src/webdav/shares/migrations/webdavSharesMigrationList.ts`, `apps/api/src/webdav/shares/webdav-shares.schema.ts`, `apps/api/src/webdav/shares/webdav-shares.service.ts`, `libs/src/migration/constants/terminalSchemaVersions.ts`, `scripts/migrations/assert-schema-versions.ts`
Soll: Upstream-Terminal für webdavShares ist **1** (`NEW:7701` Liste mit nur `migration000`, `NEW:7574-7576` Schema-Default `1`). Fork-Ist: Terminal **2** durch das fork-originale `migration001` (`'001-add-wiki-visibility-to-webdav-shares'`, `webdav-shares.schema.ts:77` Default `2`, `webdav-shares.service.ts:84` schreibt `schemaVersion: 2` beim Anlegen). Bemerkenswert: 2.1.0 führt `wikiAccessGroups`/`wikiDisabled` selbst (`NEW:7551-7558`), aber ohne Migration.
Änderung: Beschluss aus T2 umsetzen. (1) `migration001.ts` → `migration900.ts`, `name: '900-add-wiki-visibility-to-webdav-shares'`, bumpt `forkSchemaVersion` 0 → 1 statt `schemaVersion`. (2) **Repair zuerst im selben `execute`:** `updateMany({ schemaVersion: 2 }, { $set: { schemaVersion: 1, forkSchemaVersion: 1 } })` — holt Bestands-Installationen aus dem Upstream-Band zurück, ohne das Wiki-Backfill zu wiederholen (die Felder stehen dort bereits). Danach der reguläre Pfad `{$or:[{forkSchemaVersion:{$exists:false}},{forkSchemaVersion:0}]}` → Wiki-Defaults + `forkSchemaVersion: 1`. (3) `@Prop({ default: 1 }) schemaVersion` (zurück auf Upstream-Terminal) + `@Prop({ default: 1 }) forkSchemaVersion`. (4) `webdav-shares.service.ts:84` schreibt beim Anlegen `schemaVersion: 1, forkSchemaVersion: 1`. (5) `webdavSharesMigrationList` enthält wieder **nur** `migration000`; neue `webdavSharesForkMigrationList = [migration900]`; im `onModuleInit` **zwei** `runMigrations`-Aufrufe, Upstream-Liste zuerst. (6) `terminalSchemaVersions.ts` → `webdavshares: 1` plus neuer Eintrag `TERMINAL_FORK_SCHEMA_VERSIONS = { webdavshares: 1 }`; `assert-schema-versions.ts` prüft beide.
Verify: `bash scripts/crabbox/iter.sh cmd "npx nx run api:test -- --testPathPattern='webdav.*migration900|migrationsLists'"` grün. Pflichtfälle: Dokument auf `schemaVersion: 2` → danach `{schemaVersion:1, forkSchemaVersion:1}` und `wikiAccessGroups` **unverändert**; frisches Dokument ohne `forkSchemaVersion` → Wiki-Defaults + `forkSchemaVersion: 1`; zweiter Lauf → No-Op. `grep -c "runMigrations" apps/api/src/webdav/shares/webdav-shares.service.ts` == 2; `grep -c "migration001" apps/api/src/webdav/shares/migrations/webdavSharesMigrationList.ts` == 0.
i18n: keine
Doku: `docs/migrations/2.1-migrations-catchup.md` — Abschnitt „Fork-Band 9xx / `forkSchemaVersion`" (Regel für **alle** künftigen fork-originalen Migrationen) + ADR-Verweis
Abhängt von: T2, T40

### T42 — `assert-schema-versions.ts` auf 2.1.0-Ziele heben + Upgrade-Runbook + Voll-Stack-Lauf  [ ]
Komponente: apps/api, docs · Dateien: `scripts/migrations/assert-schema-versions.ts`, `package.json` (npm-Script), `docs/migrations/2.1-migrations-catchup.md` (Runbook-Abschnitt)
Soll: Bestand `scripts/migrations/assert-schema-versions.ts:8-20` trägt noch die 2.0-Ziele (`appconfigs: 13, globalsettings: 8, surveytemplates: 4, surveyanswers: 4, notifications: 2, publicshares: 2, surveys: 2, users: 1, webdavshares: 2, bulletincategories: 1, bulletins: 1`) und drei Spot-Checks (`assert-schema-versions.ts:51-80`).
Änderung: `TERMINAL_SCHEMA_VERSIONS` aus dem Skript entfernen und stattdessen `libs/src/migration/constants/terminalSchemaVersions.ts` importieren (eine Wahrheit, sonst driftet es wieder). Zusätzlich `TERMINAL_FORK_SCHEMA_VERSIONS` prüfen (`forkSchemaVersion` je Collection). Neue Collections aufnehmen: `calendarmetadata`, `tldrawsyncrooms`. Spot-Checks ergänzen: appConfig `usesPushNotifications`/`isPinned`/`shareActions` existieren auf allen Docs; globalSettings hat `general.organizationType` und **kein** `theme.*.ciLightBlue`; keine Survey trägt noch `backendLimiters`; keine SurveysTemplate trägt noch `accessibleByRoles`. `npm run assert-schema-versions` als Script eintragen. Runbook-Abschnitt: Reihenfolge (Dump + `master.key` → Deploy → Boot-Logs auf `Migration "…" completed` prüfen → `assert-schema-versions`), Liste der bewusst **nicht** erreichten Terminalversionen (`notifications` 2 statt 3 — T18; `publicshares` ohne `000` — T25; `calendarmetadata` 1 statt 2 — T23) mit Owner-Paket, und die Rollback-Regel (forward-only → nur Restore aus Dump **+** `master.key`).
Verify: `bash scripts/crabbox/iter.sh cmd "npm run lint && npx tsc -p apps/api/tsconfig.app.json --noEmit"` clean. **Voll-Stack (`[?]` prompt-pflichtig, Dump-Pflicht):** `bash scripts/crabbox/iter.sh deploy` gegen die Box, dann `bash scripts/crabbox/iter.sh cmd "MONGO_URI=… npx tsx scripts/migrations/assert-schema-versions.ts"` → **alle Zeilen OK**, und in den API-Boot-Logs erscheint jede neue Migration genau einmal mit `completed`, beim **zweiten** Boot keine erneute Verarbeitung (No-Op-Beleg). Abschließend `bash scripts/crabbox/iter.sh all` grün.
i18n: keine
Doku: Runbook-Abschnitt in `docs/migrations/2.1-migrations-catchup.md` + Aktualisierung von `docs/migrations/upgrade-1.6-to-2.0.md` (Verweis auf das 2.1-Dokument)
Abhängt von: T41
