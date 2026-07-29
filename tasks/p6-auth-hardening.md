## p6-auth-hardening [P6] ⭐ — 2.1.0 Auth-Härtung (Two-Stage-Login, TOTP-Replay, Logout/sid-Denylist, Throttle, QR-Kanal)
_Ziel:_ Die gesamte Auth-Härtung aus 2.1.0 nachziehen — der Fork ist ein treuer 2.0.200-Port und hat nichts davon · _Abhängt-von:_ — (nur bereits gelandete SSE-Namespacing- + IP-Throttle-Arbeit dieser Session) · _Status:_ **geplant** · _Tasks:_ 34
Branch: `feat/2.0-backlog` · Spec: `docs/features/p6-auth-hardening.md` (T34) · Soll: `.reference/2.1.0/api/main.js` (94907 Zeilen, un-minifiziert, Original-Namen) — Ankerlinien je Task, alle für dieses Repair nachgezählt. Kein `upstream/*`-Rescue-Branch für 2.1.0 vorhanden; das Bundle ist die einzige Quelle.

> **Entscheidung `ENABLE_EXPERIMENTAL_AUTH`: NEIN — nicht adoptieren.** 2.1.0 stellt drei Dinge unter das Flag
> (`isExperimentalAuthEnabled`, main.js:67826–67856): den TOTP-Replay-Schutz (67508), den `byUsername`-Throttle
> (68094 via `enabledEnv`) und das 404 auf `GET /auth/totp/:username` (68051). Wir portieren **alles unbedingt an**
> und lassen `isExperimentalAuthEnabled.ts` sowie `ThrottleConfig.enabledEnv` weg. Gründe: (1) eine Sicherheits-
> massnahme hinter einem default-aus-Flag läuft in keiner Default-Installation; (2) upstream brauchte das Flag für
> einen gestaffelten Rollout über einen Bestand — der Fork hat auf 2.1.0 keinen Bestand; (3) zwei Auth-Pfade
> verdoppeln die Testfläche und zwingen den FE, beide Flows zu können; (4) jede neue Env ist Installer- +
> `.env.default`-Contract-Arbeit ohne Gegenwert. Konsequenz: `GET /auth/totp/:username` wird **gelöscht** (T30)
> statt konditional 404 zu liefern.
>
> ### Verify-Konventionen (gemessen, nicht geraten — bitte nicht abwandeln)
> `nx run api:test` ist ein vom `@nx/jest/plugin` inferiertes **Command**-Target: es startet `jest <args>` in
> `apps/api`. Auf dieser Codebase gemessen:
> * `npx nx run api:test --testPathPattern=<ein Token>` **narrowt korrekt** und liefert bei 0 Treffern
>   `Pattern: … - 0 matches` mit **Exit 1** (`passWithNoTests` ist nicht gesetzt). Eine nicht angelegte Spec-Datei
>   wird damit rot, nicht falsch-grün. → **Das ist die einzige erlaubte Form.** Immer den vollen Spec-Pfad angeben.
> * `--testPathPatterns=` (Plural, aus dem @nx/jest-22-Schema) narrowt **nicht** — jest 29.7 kennt nur den Singular;
>   der Lauf führt die komplette Suite aus und ist damit als Nachweis wertlos. **Verboten.**
> * `--testFile=` narrowt **nicht** (91 statt 1 Datei). **Verboten.**
> * Ein `|` im Pattern zerlegt nx ungequotet in eine Shell-Pipe und der Lauf bricht ab. **Keine Alternationen** —
>   stattdessen zwei getrennte `iter.sh cmd`-Aufrufe.
> * Frontend: `npx nx test frontend --run <filter>` narrowt und endet bei 0 Treffern mit
>   `No test files found, exiting with code 1`.
> * `npx tsc -p apps/api/tsconfig.app.json --noEmit` **und** `npx tsc -p apps/frontend/tsconfig.app.json --noEmit`
>   sind auf dem Ausgangsstand beide fehlerfrei — jeder neue Fehler gehört also der eigenen Änderung.
> * **Keine Specs unter `libs/`.** `apps/api/jest.config.ts` setzt kein `roots` (rootDir = `apps/api`),
>   `apps/frontend/vite.config.mts` sammelt nur `src/**` — ein Spec unter `libs/` wird von **keinem** Runner
>   ausgeführt und ist ein stiller Totalausfall der Verifikation. Specs für libs-Utils liegen spiegelbildlich
>   unter `apps/api/src/...` und importieren über `@libs/...` (funktioniert, siehe `authThrottle.spec.ts`).
> * Negativ-Assertions als `! grep …` schreiben (Exit 0 bei „nicht gefunden"); `grep -c … == 0` liefert Exit 1
>   und würde von `iter.sh` als FAIL gemeldet.
>
> **Vorab verifiziert (kein Änderungsbedarf):** `AuthService.getTotpInfo` gibt im Fork bereits nur `user?.mfaEnabled ?? false`
> zurück (`apps/api/src/auth/auth.service.ts:200–205`) — identisch zu 2.1.0 (main.js:67543–67547). Die Methode selbst
> ist sauber; das Problem ist ausschliesslich die **öffentliche Route**, die vor jeder Passwortprüfung verrät, ob es
> den User gibt und ob er MFA hat. Die Methode bleibt (der authentifizierte `mobileApp`-Konsument,
> `apps/api/src/mobileAppModule/mobileApp.service.ts:86`, nutzt sie mit dem eigenen Usernamen und ist kein Orakel).
>
> **Bewusste Abweichungen vom Bundle:** `POST /auth` behält `byIp` **und** bekommt `byUsername` (Bundle lässt `byIp`
> weg → Username-Rotation von einer IP wäre ungedrosselt). `POST /auth/qr-session` bekommt `{ byIp: true }` (Bundle
> setzt `Throttle(...)` ohne Optionen, main.js:68193 → `resolvePrincipals` liefert `[]`, der Throttle ist dort
> wirkungslos = Bundle-Bug). `POST /auth/logout` bekommt `{ byIp: true }` (Bundle drosselt gar nicht,
> main.js:68105–68112 → jeder Anonyme kann Keycloaks Revocation-Endpoint hämmern). `AuthErrorMessages` bleibt das
> bestehende `enum` (2.1.0 nutzt ein const-Objekt; die Umstellung wäre ein Dutzend-Datei-Refactor ausserhalb des
> Auftrags). `QrLoginSessionService` folgt dem Bundle und wird im `@Global`-`SseModule` registriert (siehe T23).
>
> **Zu `byIp` und geteilten IPs:** Clients erreichen den LMN-Server aus dem Schul-LAN mit eigenen Adressen, und
> `apps/api/src/main.ts:58` setzt `app.set('trust proxy', true)` — der Zähler ist also pro Client. Nur hinter
> externem NAT/Reverse-Proxy teilen sich viele Nutzer einen Zähler (`AUTH_THROTTLE_LIMIT` = 10 / 5 min). Das gehört
> in die Betriebsdoku (T34), nicht in eine Code-Änderung.
>
> **Frontend (T28–T32) ist NICHT rekonstruierbar** — nur das API-Bundle ist un-minifiziert. Diese fünf Tasks sind
> **Fork-Eigenentwurf** gegen den in T1–T27 gebauten API-Contract und in den Commit-Messages so zu kennzeichnen.
>
> **Reihenfolge-Blocker:** T30 (Route löschen) erst nach T28/T29 (FE-Two-Stage), sonst bricht jeder MFA-Login.
>
> **Gemeinsame Spec-Dateien:** `apps/api/src/auth/auth.service.spec.ts` existiert heute **nicht** und wird in **T13**
> angelegt; T15/T16/T17/T18/T24/T27 erweitern sie nur. Deshalb hängen auch T15/T16 an T13.
>
> **AuthService-Konstruktor über zwei Tasks:** heute `(userModel, sseService, globalSettingsService)`
> (`auth.service.ts:54–58`). T13 hängt `sessionDenylistService` hinten an, T24 schiebt `qrLoginSessionService` an
> Position 3 ein. Endstand = 2.1.0 (`userModel, sseService, qrLoginSessionService, globalSettingsService,
> sessionDenylistService`, main.js:67350).
>
> Neue Dateien tragen den AGPL-SPDX-Header (`SPDX-License-Identifier: AGPL-3.0-or-later`, `Copyright (C) 2026
> Kevin Stenzel`) — **vor** dem Commit setzen, der `addLicenseHeader`-Hook stempelt sonst den Netzint-Header.

---

### T1 — libs: AUTH_PATHS erweitern + AUTH_GRANT_TYPES  [x] OK — AUTH_PATHS +4 Keys, AUTH_GRANT_TYPES (+ abgeleiteter Typ), magic string in auth.service raus
Komponente: libs · Dateien: `libs/src/auth/constants/auth-paths.ts` (ändern), `libs/src/auth/constants/authGrantTypes.ts` (NEU), `apps/api/src/auth/auth.service.ts` (ändern)
Soll: main.js:11188–11202 (`AUTH_ENDPOINT`/`AUTH_LOGOUT` als vorgezogene Konstanten, dann `AUTH_PATHS`) · main.js:67468 (`AUTH_GRANT_TYPES.REFRESH_TOKEN` im `authenticateUser`-Vergleich)
Änderung: In `auth-paths.ts` `AUTH_ENDPOINT = 'auth'` und `AUTH_LOGOUT = 'logout'` als lokale Konstanten vorziehen und ergänzen: `AUTH_OIDC_LOGOUT_PATH: '/protocol/openid-connect/logout'`, `AUTH_LOGOUT`, ``AUTH_LOGOUT_ENDPOINT: `${AUTH_ENDPOINT}/${AUTH_LOGOUT}` ``, `AUTH_QR_SESSION: 'qr-session'`. Bestehende Keys unverändert (`AUTH_OIDC_CONFIG_PATH`, `AUTH_OIDC_TOKEN_PATH`, `AUTH_OIDC_USERINFO_PATH`, `AUTH_QRCODE`, `AUTH_CHECK_TOTP`, `AUTH_VIA_APP`). Neu `authGrantTypes.ts` mit const-Objekt `AUTH_GRANT_TYPES = { PASSWORD: 'password', REFRESH_TOKEN: 'refresh_token' } as const` + abgeleitetem Typ, Default-Export am Dateiende, AGPL-SPDX-Header. In `apps/api/src/auth/auth.service.ts:123` den magic string `'refresh_token'` durch `AUTH_GRANT_TYPES.REFRESH_TOKEN` ersetzen.
Verify: `bash scripts/crabbox/iter.sh lint` sauber · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei · `bash scripts/crabbox/iter.sh cmd '! grep -n "refresh_token." apps/api/src/auth/auth.service.ts | grep -q "=== .refresh_token."'` (kein String-Literal-Vergleich mehr) · `bash scripts/crabbox/iter.sh cmd 'grep -q AUTH_QR_SESSION libs/src/auth/constants/auth-paths.ts && grep -q AUTH_LOGOUT_ENDPOINT libs/src/auth/constants/auth-paths.ts'`
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T2 — libs: AuthErrorMessages TotpAlreadyUsed + LogoutFailed inkl. i18n DE/EN/FR  [x] OK — TotpAlreadyUsed + LogoutFailed, i18n de/en/fr, beide i18n-Gates grün
Komponente: libs, apps/frontend · Dateien: `libs/src/auth/constants/authErrorMessages.ts`, `apps/frontend/src/locales/{de,en,fr}/translation.json`
Soll: main.js:11389–11400 (`AUTH_ERROR_MESSAGES`) — neu gegenüber dem Fork (`libs/src/auth/constants/authErrorMessages.ts:20–29`) sind exakt `TotpAlreadyUsed: 'auth.errors.TotpAlreadyUsed'` (11396) und `LogoutFailed: 'auth.errors.LogoutFailed'` (11397)
Änderung: Zwei Member ins bestehende `enum AuthErrorMessages` aufnehmen (Enum-Form beibehalten, siehe Kopf-Notiz). Übersetzungen unter `auth.errors` in allen drei Locales anlegen (dort existieren bereits `TotpMissing`, `TotpInvalid`, `Forbidden` — Position analog). DE-Vorschlag: `TotpAlreadyUsed: 'Dieser Einmalcode wurde bereits verwendet. Bitte warte auf den nächsten Code.'`, `LogoutFailed: 'Die Abmeldung konnte nicht vollständig durchgeführt werden.'` — EN/FR sinngemäss.
Verify: `bash scripts/crabbox/iter.sh i18n` grün — das Ziel führt `check-translations` **und** `check-error-message-translations` aus; letzteres erzwingt für jeden Enum-Wert einen Key in allen drei Locales (`AuthErrorMessages` ist über `libs/src/error/errorMessage.ts` erreichbar).
i18n: `auth.errors.TotpAlreadyUsed`, `auth.errors.LogoutFailed` (de, en, fr)
Doku: keine (intern)
Abhängt von: —

### T3 — libs: QR-Login-Session-Konfiguration  [x] OK — fünf Konstanten, QR_LOGIN_COOKIE_PATH komponiert (grep auf den harten Pfad == 0)
Komponente: libs · Dateien: `libs/src/auth/constants/qrLoginSessionConfig.ts` (NEU)
Soll: main.js:67785 (Modul 1018) · Konstanten main.js:67813–67821
Änderung: Fünf Konstanten als named exports (Muster: `libs/src/auth/constants/authThrottleConfig.ts` — kein Default-Export nötig), Werte 1:1: `QR_LOGIN_SESSION_TTL_MS = 3 * 60 * 1000` (67813), `QR_LOGIN_SESSION_CACHE_PREFIX = 'qr-login-session:'` (67815), `QR_LOGIN_SUBSCRIBER_TOKEN_BYTES = 32` (67817), `QR_LOGIN_TOKEN_COOKIE_PREFIX = 'qr-login-token-'` (67819), ``QR_LOGIN_COOKIE_PATH = `/${EDU_API_ROOT}/${SSE_EDU_API_ENDPOINTS.SSE}/${AUTH_PATHS.AUTH_ENDPOINT}` `` (67821 — aus `@libs/common/constants/eduApiRoot`, `@libs/sse/constants/sseEndpoints`, `@libs/auth/constants/auth-paths` zusammengesetzt, **nicht** hart schreiben; ergibt `/edu-api/sse/auth` und muss exakt dem `EventSource`-Pfad in `LoginPage.tsx:200–202` entsprechen). AGPL-SPDX-Header.
Verify: `bash scripts/crabbox/iter.sh lint` sauber · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei · `bash scripts/crabbox/iter.sh cmd '! grep -n "edu-api/sse/auth" libs/src/auth/constants/qrLoginSessionConfig.ts'` (Pfad muss komponiert sein)
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T4 — libs: Session-/Header-Konstanten (Denylist-Prefix, MILLISECONDS_PER_SECOND, BEARER_AUTH_SCHEME)  [x] OK — drei Ein-Konstanten-Module
Komponente: libs · Dateien: `libs/src/auth/constants/revokedSessionCacheKeyPrefix.ts` (NEU), `libs/src/common/constants/millisecondsPerSecond.ts` (NEU), `libs/src/auth/constants/bearerAuthScheme.ts` (NEU)
Soll: main.js:67960 (`REVOKED_SESSION_CACHE_KEY_PREFIX = 'revoked-session:'`) · main.js:45553 (`MILLISECONDS_PER_SECOND = 1000` — Zeile nachgezählt, der Review-Nit „45555" ist falsch) · main.js:68440 (`BEARER_AUTH_SCHEME = 'Bearer'`)
Änderung: Drei Ein-Konstanten-Module mit Default-Export am Dateiende und AGPL-SPDX-Header. Werte exakt wie im Bundle. Dateinamen sind so gewählt, dass `scripts/checkFilenames.ts` sie akzeptiert (`normalize()` entfernt `-_.` → `revokedsessioncachekeyprefix` == `REVOKED_SESSION_CACHE_KEY_PREFIX`).
Verify: `bash scripts/crabbox/iter.sh lint` sauber · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T5 — libs: compareSecretsConstantTime  [x] OK — compareSecretsConstantTime + 5 Tests; Spec unter apps/api (libs-Specs laufen nirgends)
Komponente: libs, apps/api · Dateien: `libs/src/common/utils/compareSecretsConstantTime.ts` (NEU), `apps/api/src/common/utils/compareSecretsConstantTime.spec.ts` (NEU)
Soll: main.js:56265–56268 (Modul 857) — `const SECRET_COMPARISON_HMAC_KEY = 'public-share-secret-compare'`; `digestSecret = (value) => createHmac('sha256', KEY).update(value, 'utf8').digest()`; `compareSecretsConstantTime = (left, right) => timingSafeEqual(digestSecret(left), digestSecret(right))`
Änderung: 1:1 portieren (HMAC-Digest vor `timingSafeEqual`, damit unterschiedliche Längen nicht werfen und die Länge nicht leakt). Konstantenwert unverändert übernehmen — es ist ein reiner In-Process-Domain-Separator, kein Geheimnis. Nur Default-Export der Vergleichsfunktion. Der Fork hat **keine** `timingSafeEqual`-Nutzung (`grep -rn "timingSafeEqual" apps libs` == leer, verifiziert), das ist also wirklich neu.
**Spec-Ablage (Reparatur):** Die Spec liegt bewusst unter `apps/api/src/common/utils/` und importiert die Util über `@libs/common/utils/compareSecretsConstantTime`. Unter `libs/` würde sie von **keinem** Runner ausgeführt (siehe Verify-Konventionen im Kopf) und die einzige Absicherung der Konstant-Zeit-Prüfung wäre wirkungslos.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/common/utils/compareSecretsConstantTime.spec.ts'` grün, Ausgabe muss **1 passed** Suite zeigen — Spec-Fälle: gleiche Strings → `true`; unterschiedliche gleicher Länge → `false`; unterschiedliche **verschiedener** Länge → `false` statt Exception; leerer String vs. leerer String → `true`
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T6 — libs: uuidRegexPattern + api: UuidPipe  [x] OK — UUID_REGEX_PATTERN + UuidPipe + 11 Tests; Regex-Anker mutationsgeprüft
Komponente: libs, apps/api · Dateien: `libs/src/common/constants/uuidRegexPattern.ts` (NEU), `apps/api/src/common/pipes/uuid.pipe.ts` (NEU), `apps/api/src/common/pipes/uuid.pipe.spec.ts` (NEU)
Soll: main.js:57677 (`const UuidRegexPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`, Modul 879 — **57656 aus der Vorversion war falsch**) · main.js:68296–68306 (Modul 1024, `transform` 68297–68302)
Änderung: Regex-Konstante exakt übernehmen; Datei `uuidRegexPattern.ts`, Default-Export `UUID_REGEX_PATTERN` (Fork-Namenskonvention für Konstanten; `scripts/checkFilenames.ts` normalisiert beides auf `uuidregexpattern`, der Check greift also). `UuidPipe` als `@Injectable()`-`PipeTransform<string, string>`: wirft `new CustomHttpException(CommonErrorMessages.INVALID_REQUEST_DATA, HttpStatus.BAD_REQUEST)` wenn `!value || !UUID_REGEX_PATTERN.test(value)`, sonst gibt `value` zurück. `CommonErrorMessages.INVALID_REQUEST_DATA` existiert bereits (`libs/src/common/constants/common-error-messages.ts:31`). Dem bestehenden Muster `apps/api/src/common/pipes/safe-path-segment.pipe.ts` (+ dessen Spec) folgen.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/common/pipes/uuid.pipe.spec.ts'` grün — Spec: gültige v4-UUID passiert; Grossschreibung passiert (Flag `i`); `''`, `'abc'`, `'../etc'`, `undefined` werfen 400 mit `CommonErrorMessages.INVALID_REQUEST_DATA`
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T7 — api: whitelistValidationPipe (strictValidationPipe **bereits gebaut**)  [x] OK — whitelistValidationPipe (strictValidationPipe kam schon mit 9e90e90bc)
Komponente: apps/api · Dateien: `apps/api/src/common/pipes/whitelistValidationPipe.ts` (NEU)
**`strictValidationPipe.ts` existiert schon** (`9e90e90bc`, aus `p6-fundament`) und bildet `NEW:14694` exakt ab — nicht neu anlegen, nicht überschreiben. Diese Task legt nur noch `whitelistValidationPipe` an.
Soll: main.js:14694–14699 (Modul 297: `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, disableErrorMessages: process.env.NODE_ENV === 'production' })`) · main.js:43492–43496 (Modul 681: `new ValidationPipe({ whitelist: true, disableErrorMessages: process.env.NODE_ENV === 'production' })`)
Änderung: Zwei Modul-Singletons (keine Klassen) exakt wie im Bundle, Default-Export am Dateiende, AGPL-SPDX-Header. Unterschied bewusst: `strict` verbietet Extra-Felder (400), `whitelist` **strippt** sie nur — Letzteres ist für `POST /auth` nötig, weil oidc-client-ts `client_id`/`scope` mitsendet (`exchangeCredentials` in `node_modules/oidc-client-ts/dist/esm/oidc-client-ts.js:1146`), die kein DTO-Feld sind.
**Mechanik-Beleg (damit das niemand „korrigiert"):** `@nestjs/common/pipes/validation.pipe.js:35` setzt `this.validatorOptions = { forbidUnknownValues: false, ...validatorOptions }`; damit ist `Object.keys(...).length > 1` und `shouldTransformToPlain` (Z. 96) `true` → `transform` gibt `classToPlain(entity)` zurück, aus dem class-validator die nicht dekorierten Properties bereits entfernt hat. `whitelist` strippt also auch bei abgeschaltetem `transform`.
Verify: `bash scripts/crabbox/iter.sh lint` sauber · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei
i18n: keine
Doku: keine (intern)
Abhängt von: —

> **Bewusste Abweichung vom Bundle (T6, beim Bauen gefunden):** `UuidPipe` prüft `typeof value !== 'string'`,
> das Bundle prüft `!value` (main.js:68297). Bei `?id=a&id=b` liefert Express ein **Array**; `!['…']` ist `false`,
> die Bundle-Fassung lässt es also passieren und reicht es als `string` weiter. Unsere Fassung wirft 400.
> Ein Testfall pinnt das. **Nicht auf „Bundle-Treue" zurückkorrigieren.**

### T8 — api: SessionDenylistService  [x] OK — SessionDenylistService + 9 Tests; isSessionDenied fail-open bei Cache-Ausfall
Komponente: apps/api · Dateien: `apps/api/src/auth/session-denylist.service.ts` (NEU), `apps/api/src/auth/session-denylist.service.spec.ts` (NEU)
Soll: main.js:67890–67927 (Modul 1020) — `static getCacheKey(sid)` 67895–67897 · `denySession(sid, exp)` 67898–67914 · `isSessionDenied(sid)` 67915–67926
Änderung: `@Injectable()`-Service mit `@Inject(CACHE_MANAGER) private readonly cacheManager: Cache` (Muster: `apps/api/src/users/users.service.ts:57`, `Cache` aus `'cache-manager'`; `CacheModule` ist global, `app.module.ts:94–95`). ``static getCacheKey(sid: string) => `${REVOKED_SESSION_CACHE_KEY_PREFIX}${sid}` ``. `denySession(sid?: string, exp?: number): Promise<boolean>` — ohne `sid` oder `exp` sofort `true` (nichts zu tun); `remainingLifetimeMs = exp * MILLISECONDS_PER_SECOND - Date.now()`, bei `<= 0` sofort `true`; sonst `cacheManager.set(key, true, remainingLifetimeMs)` → `true`, im catch ``Logger.error(`Failed to deny session ${sid}: ${error.message}`, SessionDenylistService.name)`` → `false`. `isSessionDenied(sid?: string): Promise<boolean>` — ohne `sid` `false`; sonst `(await cacheManager.get(key)) === true`, im catch `Logger.error` → **`false`** (fail-open ist hier Absicht: ein Redis-Ausfall darf nicht jeden angemeldeten User aussperren). Statische Logger-Aufrufe (AGENTS.md), keine Kommentare im Code.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/session-denylist.service.spec.ts'` grün — Spec gegen `apps/api/src/common/cache-manager.mock.ts` (hat `get`/`set`/`del` als `jest.fn()`): `denySession(undefined, 123)`/`denySession('sid', undefined)` → `true` ohne `set`-Aufruf; abgelaufenes `exp` → `true` ohne `set`; gültiges `exp` → `set` mit TTL ≈ `exp*1000-now`; `set` wirft → `false`; `isSessionDenied` mit `true` im Cache → `true`, mit `undefined` → `false`, `get` wirft → `false`
i18n: keine
Doku: keine (intern)
Abhängt von: T4

### T9 — api: AuthModule stellt SessionDenylistService bereit, TLDrawSyncModule importiert AuthModule  [x] OK — AuthModule providers+exports, TLDrawSyncModule importiert AuthModule; madge zyklenfrei
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.module.ts`, `apps/api/src/tldraw-sync/tldraw-sync.module.ts`
Soll: main.js:67262–67279 (AuthModule: `providers: [AuthService, SessionDenylistService]` 67276, `exports: [SessionDenylistService]` 67277) · main.js:74274–74285 (TLDrawSyncModule, `imports: [AuthModule, …]` 74276–74277)
Änderung: `SessionDenylistService` in `AuthModule.providers` **und** `AuthModule.exports`. In `TLDrawSyncModule.imports` `AuthModule` als erstes Element ergänzen. `AppModule` importiert `AuthModule` bereits (`apps/api/src/app/app.module.ts:125`) — damit ist der Service für den global via `APP_GUARD` registrierten `AuthGuard` (`app.module.ts:161–162`) auflösbar; **hier nichts an app.module.ts ändern**. `AuthModule` bleibt nicht-global (Bundle-Parität) — deshalb ist die TLDrawSync-Kante nötig.
Verify: `bash scripts/crabbox/iter.sh test:api` grün (kein Nest-DI-Fehler beim Kompilieren der Test-Module) · `bash scripts/crabbox/iter.sh build` erfolgreich · `bash scripts/crabbox/iter.sh cmd 'npx madge --circular --extensions ts,tsx --ts-config ./tsconfig.base.json apps/api/src/auth/auth.module.ts apps/api/src/tldraw-sync/tldraw-sync.module.ts apps/api/src/auth/auth.guard.ts'` → „No circular dependency found" — **nicht** `npm run check-circular-deps`: das Skript liest `git diff --cached` und meldet ohne vorheriges `git add` „No TypeScript files changed" mit Exit 0, prüft also nichts
i18n: keine
Doku: keine (intern)
Abhängt von: T8

### T10 — api: AuthGuard setzt die sid-Denylist durch  [x] OK — AuthGuard prüft die Denylist; request.user/token nur unter if(user) — mutationsgeprüft
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.guard.ts`, `apps/api/src/auth/auth.guard.spec.ts` (NEU)
Soll: main.js:79653–79691 (Modul 1203) — Konstruktor 79653, `let user` 79663, Denylist-Check **79677–79682**, Schreib-Guard **79683–79686**
Änderung: `SessionDenylistService` als dritten Konstruktor-Parameter injizieren. `canActivate` umbauen: das Verify-Ergebnis zunächst in eine lokale `let user: JWTUser | undefined` schreiben (nicht mehr direkt nach `request.user`, heute `auth.guard.ts:51–55`); danach `if (user && (await this.sessionDenylistService.isSessionDenied(user.sid)))` → auf nicht-`@Public`-Routen `CustomHttpException(AuthErrorMessages.TokenExpired, HttpStatus.UNAUTHORIZED, 'Session revoked', AuthGuard.name)`, auf `@Public`-Routen `user = undefined` (Request läuft anonym weiter). Der Schreibvorgang steht **unter `if (user) { request.user = user; request.token = token; }`** — genau wie im Bundle (79683–79686). Nicht unbedingt schreiben: sonst trüge `request.token` auch bei unverifiziertem oder denylistetem Token einen Wert und die Gleichheitsprüfung aus T12, die die Sicherheitsgrenze von `/auth/logout` ist, würde aufgeweicht. Rest (isPublic/no-JWT-Zweig, `auth.guard.ts:63–72`) unverändert.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.guard.spec.ts'` grün — Spec mit gemocktem `JwtService` + `SessionDenylistService` + `Reflector` und einem `readFileSync`-Mock für `PUBLIC_KEY_FILE_PATH`: gültiger Token + nicht denylisted → `true` und `request.user` gesetzt; gültiger Token + denylisted + geschützte Route → wirft 401; gültiger Token + denylisted + `@Public` → `true`, `request.user` **und** `request.token` bleiben undefined; kein Token + geschützt → 401
i18n: keine
Doku: keine (intern)
Abhängt von: T8, T9

### T11 — api: tldraw-WebSocket-Gateway setzt die sid-Denylist durch  [x] OK — Gateway schliesst den Socket vor dem Destructuring — mutationsgeprüft
Komponente: apps/api · Dateien: `apps/api/src/tldraw-sync/tldraw-sync.gateway.ts`, `apps/api/src/tldraw-sync/tldraw-sync.gateway.spec.ts` (NEU)
Soll: main.js:75070–75092 — Denylist-Check **75083–75086**: nach `jwtService.verifyAsync` und **vor** dem Destructuring von `preferred_username` (75087) `if (await this.sessionDenylistService.isSessionDenied(user.sid)) { client.close(); return {}; }`
Änderung: `SessionDenylistService` als dritten Konstruktor-Parameter (nach `TLDrawSyncService`, `JwtService`; heute `tldraw-sync.gateway.ts:45–48`) injizieren. In `private async authenticate(...)` (`tldraw-sync.gateway.ts:134`) direkt nach dem `verifyAsync`-Ergebnis (Zeilen 154–157) und **vor** dem Destructuring in Zeile 159 den Denylist-Check einfügen: Socket schliessen, leeres Objekt zurückgeben. **Ohne diesen Schritt hat ein abgemeldeter User weiter Live-Zugriff auf Whiteboard-Räume** — die WebSocket-Route läuft nicht über den globalen `AuthGuard`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/tldraw-sync/tldraw-sync.gateway.spec.ts'` grün — Spec: `isSessionDenied` → `true` ⇒ `client.close()` genau einmal aufgerufen und `tldrawSyncService.getPermittedUsers` **nie**; `isSessionDenied` → `false` ⇒ normale Auflösung mit `roomId`/`attendee`
i18n: keine
Doku: keine (intern)
Abhängt von: T8, T9

### T12 — api: Bearer-Token-Extraktion vereinheitlichen + GetBearerSession-Decorator  [x] OK — getBearerTokenFromHeader/-SessionFromRequest + Decorator; Gleichheitsprüfung mutationsgeprüft
Komponente: apps/api · Dateien: `apps/api/src/common/utils/getBearerTokenFromHeader.ts` (NEU), `apps/api/src/common/utils/getBearerSessionFromRequest.ts` (NEU), `apps/api/src/common/utils/getBearerSessionFromRequest.spec.ts` (NEU), `apps/api/src/common/utils/extractToken.spec.ts` (NEU), `apps/api/src/common/decorators/getBearerSession.decorator.ts` (NEU), `apps/api/src/common/utils/extractToken.ts` (ändern)
Soll: main.js:68406–68412 (`getBearerTokenFromHeader`) · main.js:68370–68376 (`getBearerSessionFromRequest`) · main.js:68337–68340 (`GetBearerSession`) · main.js:79725–79735 (`extractToken` nutzt den Header-Helper)
Änderung: `getBearerTokenFromHeader(request): string | undefined` — `const [scheme, token] = request.headers.authorization?.split(' ') ?? []`, bei `scheme !== BEARER_AUTH_SCHEME || !token` → `undefined`. `getBearerSessionFromRequest(request): JWTUser | undefined` — Token aus dem Header holen; wenn `!tokenFromHeader || tokenFromHeader !== request.token` → `undefined`, sonst `request.user`. **Diese Gleichheitsprüfung ist die Sicherheitsgrenze für `/auth/logout`**: nur ein Token, der über den Authorization-Header kam *und* vom AuthGuard verifiziert wurde, darf eine sid denylisten — sonst könnte ein Query-/Cookie-Token fremde Sessions sperren. Nicht vereinfachen. `GetBearerSession = createParamDecorator((_data, ctx) => getBearerSessionFromRequest(ctx.switchToHttp().getRequest()))` (Muster: `apps/api/src/common/decorators/getToken.decorator.ts`). In `extractToken.ts` den inline-`'Bearer'`-Block (**Zeilen 30–36**) durch `getBearerTokenFromHeader(request)` ersetzen; Query-Zweig (25–28) und Cookie-Zweig (38–39) unverändert.
Verify: zwei getrennte Läufe (Alternationen im Pattern sind verboten, siehe Kopf):
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/common/utils/getBearerSessionFromRequest.spec.ts'` grün — Header-Token == `request.token` ⇒ `request.user`; Header-Token != `request.token` ⇒ `undefined`; Token nur als Query-Param bei gesetztem `request.token` ⇒ `undefined`; falsches Schema (`Basic x`) ⇒ `undefined`; kein Authorization-Header ⇒ `undefined`
`bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/common/utils/extractToken.spec.ts'` grün — Regressions-Assertion: Reihenfolge Query > Header > Cookie bleibt erhalten, `Basic`-Header fällt auf den Cookie durch, kein Treffer ⇒ `''`
i18n: keine
Doku: keine (intern)
Abhängt von: T4

### T13 — api: AuthService.revokeSession + logout (legt auth.service.spec.ts an)  [x] OK — revokeSession + logout, auth.service.spec.ts angelegt (11 Tests); invalid_grant und Form-Contract mutationsgeprüft
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.service.spec.ts` (**NEU — existiert heute nicht, wird hier angelegt und von T15–T18/T24/T27 erweitert**)
Soll: main.js:67393–67402 (`logout`) · main.js:67403–67428 (`revokeSession`) · Konstante `KEYCLOAK_INVALID_GRANT_ERROR = 'invalid_grant'` main.js:67342 · Konstruktor main.js:67350
Änderung: `SessionDenylistService` als **letzten** Konstruktor-Parameter anhängen (`auth.service.ts:54–58`; T24 schiebt später `qrLoginSessionService` an Position 3 ein, Endstand = Bundle). `async revokeSession(refreshToken?: string): Promise<boolean>` — ohne Token `true`; sonst `POST` an `AUTH_PATHS.AUTH_OIDC_LOGOUT_PATH` über `this.keycloakApi` mit `new URLSearchParams({ client_id, client_secret, refresh_token }).toString()` und Content-Type `RequestResponseContentType.APPLICATION_X_WWW_FORM_URLENCODED` → `true`; im catch: bei Axios-Error mit Status 400 **und** `error.response.data?.error === KEYCLOAK_INVALID_GRANT_ERROR` → `Logger.debug(...)` + `true` (Token war schon ungültig, die Session ist de facto weg), sonst ``Logger.warn(`Failed to revoke session: ${error.message}`, AuthService.name)`` + `false`. `async logout(refreshToken: string, session?: JWTUser): Promise<void>` — wenn `session && !session.sid`: `Logger.warn('Verified access token carries no sid, its session cannot be denied and stays usable until it expires', AuthService.name)`; dann `denySession(session?.sid, session?.exp)` und `revokeSession(refreshToken)` (beide awaiten); wenn eines `false` liefert → `CustomHttpException(AuthErrorMessages.LogoutFailed, HttpStatus.INTERNAL_SERVER_ERROR, { isDenied, isRevoked }, AuthService.name)`. `'invalid_grant'` als Modul-Konstante.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.service.spec.ts'` grün, Ausgabe zeigt **1 passed** Suite — Spec-Grundgerüst (Testmodul mit `getModelToken(User.name)`, `SseService`, `GlobalSettingsService`, `SessionDenylistService` als Mocks) plus: `revokeSession(undefined)` → `true` ohne HTTP-Call; 400 + `invalid_grant` → `true`; 500 → `false`; `logout` ruft `denySession` **und** `revokeSession`; `denySession` → `false` ⇒ 500 mit `AuthErrorMessages.LogoutFailed`
i18n: keine (Key kommt aus T2)
Doku: keine (intern)
Abhängt von: T1, T2, T8, T9

### T14 — api: POST /auth/logout inkl. LogoutRequestDto  [x] OK — POST /auth/logout mit DTO, Throttle byIp + ThrottleGuard und strictValidationPipe; Guard und Pipe mutationsgeprüft
Komponente: apps/api, libs · Dateien: `libs/src/auth/types/logoutRequest.dto.ts` (NEU), `apps/api/src/auth/auth.controller.ts`
Soll: main.js:68041–68043 (Handler) · main.js:68105–68118 (Decorators) · main.js:68668 ff. (`LogoutRequestDto`, Modul-Bereich 68642–68679)
Änderung: DTO-Klasse mit einem Feld `refresh_token: string`, validiert mit `@IsString()` + `@MinLength(1)` (Muster: `libs/src/auth/types/loginQrSse.dto.ts`), AGPL-SPDX-Header. Controller-Route: `@Public()` + `@Post(AUTH_PATHS.AUTH_LOGOUT)` + `@HttpCode(HttpStatus.NO_CONTENT)` + `@UsePipes(strictValidationPipe)` + **`@Throttle(AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS, { byIp: true })` + `@UseGuards(ThrottleGuard)`**; Signatur `logout(@Body() body: LogoutRequestDto, @GetBearerSession() session: JWTUser | undefined)` → `this.authService.logout(body.refresh_token, session)`.
**`@Public()` ist Absicht** (main.js:68106): ein abgelaufener Access-Token muss die Refresh-Token-Revocation noch erlauben; die Absicherung sitzt im `GetBearerSession`-Decorator aus T12. Nicht in einen geschützten Endpoint umbauen.
**Bewusste Abweichung vom Bundle:** 2.1.0 drosselt diese Route nicht — ein Anonymer kann damit Keycloaks Revocation-Endpoint hämmern. Wir setzen denselben Throttle wie auf `POST /auth`; ein 429 hier ist folgenlos, weil der FE den Fehler schluckt und lokal trotzdem abmeldet (T32).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.controller.spec.ts'` grün · `bash scripts/crabbox/iter.sh cmd 'grep -q "AUTH_PATHS.AUTH_LOGOUT" apps/api/src/auth/auth.controller.ts'` · nach `iter.sh deploy` (ask-first): `curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/edu-api/auth/logout -H 'Content-Type: application/json' -d '{}'` == `400` (DTO greift), mit gültigem `refresh_token` == `204`
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T7, T12, T13

> **Fallstrick beim Bauen von T14 gefunden:** das Body-DTO muss als **Wert** importiert werden
> (`import LogoutRequestDto from …`), nicht als `import type`. Mit `import type` löscht TypeScript den Import,
> `design:paramtypes` steht dann auf `Object`, und die `ValidationPipe` überspringt die Prüfung **stillschweigend** —
> tsc, eslint und jeder Contract-Test bleiben grün. Im kompilierten Bundle nachgeprüft: mit Wert-Import steht dort
> `logoutRequest_dto_1.default`. Gilt für jedes künftige DTO in T21/T22/T27.

### T15 — api: validateTotp (Counter + explizites Fenster) + splitPasswordAndTotp  [x] OK — validateTotp (Counter + Fenster 1) + splitPasswordAndTotp aus AUTH_TOTP_CONFIG.digits; checkTotp delegiert
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.service.spec.ts` (erweitern, angelegt in T13)
Soll: main.js:67340–67341 (`TOTP_VALIDATION_WINDOW = 1`, ``TOTP_SUFFIX_PATTERN = new RegExp(`:(\\d{${AUTH_TOTP_CONFIG.digits}})$`)``) · main.js:67360–67367 (`validateTotp`) · 67368–67370 (`checkTotp` delegiert) · 67371–67377 (`splitPasswordAndTotp`)
Änderung: Zwei Modul-Konstanten anlegen; das Suffix-Pattern **aus `AUTH_TOTP_CONFIG.digits` bauen** (`libs/src/auth/constants/totp-config.ts`, digits=6), nicht hart. `static validateTotp(token, username, secret): number | null` — `new TOTP({ ...AUTH_TOTP_CONFIG, label: username, secret }).validate({ token, window: TOTP_VALIDATION_WINDOW })`; bei `delta === null` → `null`, sonst `Math.floor(Date.now() / 1000 / AUTH_TOTP_CONFIG.period) + delta` (= der Counter, zu dem der Code gehört). `static checkTotp` (heute `auth.service.ts:64–67`) bleibt erhalten, delegiert jetzt auf `validateTotp(...) !== null` (Aufrufer `setupTotp`, `auth.service.ts:186`, unverändert). `static splitPasswordAndTotp(passwordString): { password: string; token: string | null }` — `TOTP_SUFFIX_PATTERN.exec(...)`; ohne Treffer `{ password: passwordString, token: null }`, sonst `{ password: passwordString.slice(0, match.index), token: match[1] }`.
**Ersetzt die `lastIndexOf(':')`-Logik** (`auth.service.ts:145–161`), die für **MFA-User** jedes `:` im Passwort als TOTP-Trenner missdeutet. Nicht-MFA-User sind heute nicht betroffen — die kehren schon vor dem Split zurück (`auth.service.ts:141–143`).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.service.spec.ts'` grün — Spec: `splitPasswordAndTotp('geheim:123456')` → `{password:'geheim', token:'123456'}`; `'pass:wort:123456'` → `{password:'pass:wort', token:'123456'}`; `'pass:wort'` → `{password:'pass:wort', token:null}`; `'geheim:12345'` (5 Ziffern) → `token: null`; `'geheim:1234567'` → `token: null`. Plus: `validateTotp` mit einem via `otpauth` frisch generierten Code liefert eine Zahl, mit `'000000'` (fremd) `null`, und der zurückgegebene Counter == `Math.floor(Date.now()/1000/AUTH_TOTP_CONFIG.period)`
i18n: keine
Doku: keine (intern)
Abhängt von: T13 (gemeinsame Spec-Datei)

### T16 — api: signinOrNull + signinWithSuffixCostParity (Cost-Parity-Dummy-Signins)  [x] OK — signinOrNull + signinWithSuffixCostParity; der verworfene Dummy-Call ist die Cost-Parity, kein toter Code — mutationsgeprüft
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.service.spec.ts` (erweitern)
Soll: main.js:67378–67385 (`signinOrNull`) · main.js:67386–67392 (`signinWithSuffixCostParity`)
Änderung: `private async signinOrNull(body, password?)` — `try { return await this.signin(body, password) } catch { return null }`. `private async signinWithSuffixCostParity(body, passwordString)` — `const { password, token } = AuthService.splitPasswordAndTotp(passwordString)`; **wenn `token !== null`, einen zusätzlichen `await this.signinOrNull(body, password)` fahren, dessen Ergebnis verworfen wird**; danach immer `return this.signin(body, passwordString)` (volles Passwort — ein Nicht-MFA-User darf ein Passwort haben, das auf `:123456` endet). Der verworfene Call ist **kein toter Code**: er gleicht die Anzahl der Keycloak-Roundtrips an den MFA-Pfad an, damit die Antwortzeit nicht verrät, ob ein User MFA hat. Im Commit-Body vermerken, damit es kein Reviewer „aufräumt".
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.service.spec.ts'` grün — Spec mit gespyter `signin`: `signinWithSuffixCostParity(body, 'geheim:123456')` ⇒ `signin` genau **zweimal** aufgerufen (erst mit `'geheim'`, dann mit `'geheim:123456'`); `signinWithSuffixCostParity(body, 'geheim')` ⇒ genau **einmal**; wirft der erste Call, wird trotzdem der zweite gefahren und dessen Ergebnis zurückgegeben
i18n: keine
Doku: keine (intern)
Abhängt von: T13 (gemeinsame Spec-Datei), T15

### T17 — api: authenticateUser auf Two-Stage-Login umbauen  [x] OK — authenticateUser gedreht: Keycloak-Signin VOR jeder TOTP-Aussage, ein Pfad für unbekannt und Nicht-MFA
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.service.spec.ts` (erweitern)
Soll: main.js:67466–67521 (`authenticateUser`) — Projektion **67473**, Nicht-MFA/Unbekannt-Pfad **67475–67477**, `throwTotpMissing` **67481–67484**, Token-fehlt-Pfad **67485–67488**, Passwort-Fallback **67489–67499**, `validateTotp` + `throwTotpInvalid` **67500–67507**
Änderung: Reihenfolge komplett drehen — **Keycloak-Signin passiert VOR jeder Aussage über TOTP**. (1) `grantType === AUTH_GRANT_TYPES.REFRESH_TOKEN` → `this.signin(body)` (unverändert, `auth.service.ts:123–125`). (2) User laden, Projektion auf `'mfaEnabled totpSecret totpLastUsedCounter username email'` (heute `'mfaEnabled totpSecret username email'`, `auth.service.ts:131`). (3) `if (!user || !user.mfaEnabled) return this.signinWithSuffixCostParity(body, passwordString)` — **ein Pfad für unbekannte und für Nicht-MFA-User**, damit die Antwort keinen von beiden verrät; ersetzt die heutigen zwei getrennten Zweige (`auth.service.ts:135–143`). (4) MFA-Pfad: `const { totpSecret = '', username } = user;` + `splitPasswordAndTotp`; lokales `throwTotpMissing = (refreshToken?: string) => { void this.revokeSession(refreshToken); throw new HttpException({ error: AuthErrorMessages.TotpMissing, error_description: AuthErrorMessages.TotpMissing }, HttpStatus.UNAUTHORIZED) }`. (5) `token === null` → erst `await this.signin(body, password)` (Passwort muss stimmen!), dann `throwTotpMissing(tokens.refresh_token)`. (6) sonst `signin(body, password)` in `try`; im `catch (passwordError)` `signinOrNull(body, passwordString)` — liefert das `null`, `throw passwordError`, sonst (das vermeintliche Token war Teil des Passworts) `throwTotpMissing(fullTokens.refresh_token)`. (7) `validateTotp` → bei `null` `throwTotpInvalid()` (ebenfalls mit `void this.revokeSession(tokens.refresh_token)`), sonst `return tokens`. Die `revokeSession`-Aufrufe sind bewusst `void`/nicht-awaited (main.js:67482/67502/67516) — sie dürfen die Fehlerantwort nicht verzögern. **Der Replay-Claim kommt in T18 dazu.**
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.service.spec.ts'` grün — Spec: (a) unbekannter User → `signinWithSuffixCostParity` aufgerufen, **keine** DB-MFA-Aussage im Ergebnis; (b) MFA-User, richtiges Passwort, kein Token → `signin` wurde aufgerufen, `revokeSession` mit dessen `refresh_token`, Antwort 401 `TotpMissing`; (c) MFA-User, **falsches** Passwort, kein Token → Keycloak-401 propagiert, **kein** `TotpMissing` (kein Orakel); (d) MFA-User, Passwort endet auf `:123456`, gestripptes Signin schlägt fehl, volles gelingt → 401 `TotpMissing` + `revokeSession`; (e) falsches TOTP → 401 `TotpInvalid` + `revokeSession`
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T1, T13, T15, T16

### T18 — api: TOTP-Replay-Schutz über atomar geclaimten totpLastUsedCounter  [x] OK — totpLastUsedCounter + atomarer Claim per findOneAndUpdate-Filter; setupTotp/disableTotp unsetzen ihn
Komponente: apps/api · Dateien: `apps/api/src/users/user.schema.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.service.spec.ts` (erweitern)
Soll: main.js:11446 (Feld) + **11492–11495** (`@Prop({ type: Number }) totpLastUsedCounter`) · main.js:**67508–67519** (Claim, im Bundle unter `if (experimentalAuth)`) · main.js:67536 (`$unset` in `setupTotp`) · main.js:67553 (`$unset` in `disableTotp`)
Änderung: (1) `@Prop({ type: Number }) totpLastUsedCounter?: number;` im `User`-Schema zwischen `totpCreatedAt` (`user.schema.ts:57–58`) und `language` (60–61) ergänzen. (2) In `authenticateUser` nach erfolgreicher `validateTotp` den Counter **atomar claimen**: `const claimed = await this.userModel.findOneAndUpdate({ username, $or: [{ totpLastUsedCounter: { $lt: counter } }, { totpLastUsedCounter: { $exists: false } }] }, { $set: { totpLastUsedCounter: counter } }).lean();` — bei `!claimed` `void this.revokeSession(tokens.refresh_token)` und `HttpException({ error: AuthErrorMessages.TotpAlreadyUsed, error_description: AuthErrorMessages.TotpAlreadyUsed }, HttpStatus.UNAUTHORIZED)`. Der Filter selbst ist die Race-Sperre — **kein** vorheriges `findOne` + Vergleich. Das 2.1.0-`if (experimentalAuth)` (67508) entfällt, der Claim läuft unbedingt. (3) `setupTotp` (`auth.service.ts:186–195`): `$unset: { totpLastUsedCounter: 1 }` neben das bestehende `$set`. (4) `disableTotp` (`auth.service.ts:206 ff.`): `totpLastUsedCounter: 1` in das bestehende `$unset` aufnehmen.
**Keine DB-Migration nötig — Beleg korrigiert:** Das Feld ist optional und `{ $exists: false }` ist im Filter abgedeckt. Der Fork-`User` führt **kein** `schemaVersion` (`apps/api/src/users/user.schema.ts` — verifiziert) und die Fork-`UsersService` ruft nirgends `runMigrations` auf (`grep -rn "runMigrations" apps/api/src/users` == leer). 2.1.0 hat beides (`schemaVersion` main.js:11449, `UsersService.userMigrationsList = [migration000]` main.js:10323 mit dem generischen `000-add-db-version-number` aus Modul 129, main.js:5039–5056) — das ist die generische DB-Versionierung und hat mit TOTP nichts zu tun. *(Der frühere Anker „5017–5033, 2.1.0s einzige User-Migration" war falsch: 5039 ff. ist die AppConfig-Migration.)*
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.service.spec.ts'` grün — Spec: erster Login mit Code X ⇒ `findOneAndUpdate` liefert ein Dokument, Tokens kommen zurück; zweiter Login mit demselben X ⇒ `findOneAndUpdate` liefert `null` ⇒ 401 `TotpAlreadyUsed` + `revokeSession`; Filter-Assertion, dass **beide** `$or`-Zweige exakt so gesetzt sind; `setupTotp`/`disableTotp` unsetzen `totpLastUsedCounter`. Zusätzlich `bash scripts/crabbox/iter.sh build` erfolgreich (Schema kompiliert).
i18n: keine (Key kommt aus T2)
Doku: keine (T34 sammelt)
Abhängt von: T2, T17

> **Zusatz über das Ledger hinaus — MFA-Bypass über die Schreibweise, am laufenden Stack gemessen.**
> Keycloak authentifiziert Usernamen **case-insensitiv** (auf der crabbox nachgemessen: `GLOBAL-ADMIN` und
> `Global-admin` liefern beide HTTP 201 + `access_token`), der Mongo-Lookup war ohne Collation case-**sensitiv**
> (kein Index, keine Collation im Schema). Ein MFA-Nutzer, der sich als `Alice` statt `alice` anmeldet, fiel damit
> in den Nicht-MFA-Zweig und bekam Tokens **ohne** TOTP. **Keine Regression von T17** — der alte Code hatte
> denselben Zweig — aber es hebelt aus, wofür T15–T18 gebaut ist.
> Behoben mit `.collation({ locale: 'en', strength: 2 })` an **beiden** Lookups (`authenticateUser` **und**
> `getTotpInfo`; ohne den zweiten liefe ein MFA-Nutzer mit abweichender Schreibweise in eine Sackgasse, weil das
> FE über `getTotpStatus` entscheidet, ob es das TOTP-Feld zeigt). `strength: 2` ignoriert **nur** Groß-/Kleinschreibung,
> nicht Diakritika — `müller` ≠ `muller` bleibt.
> **Fail-closed gegen Duplikate:** ohne Unique-Index liefert ein Collation-`findOne` bei zwei Schreibvarianten ein
> **beliebiges** Dokument, und `POST /users` lässt jeden Eingeloggten eine Variante anlegen. Deshalb `find` statt
> `findOne`: sobald **irgendeine** Variante `mfaEnabled` trägt, gilt MFA, und deren Secret wird benutzt.
> **Offen (eigener Task):** `UserSchema.index({ username: 1 }, { unique: true, collation: … })` — macht Duplikate
> unmöglich und aus dem Collection-Scan einen Index-Seek, braucht aber einen einmaligen Dedupe-Lauf.

> **End-to-end gegen den echten Stack verifiziert (2026-07-28, crabbox, eigene Images aus dem Branch).**
> MFA wurde für den Testadmin per `POST /auth/totp` mit selbst erzeugtem Secret aktiviert und danach per
> `PUT /auth/totp` wieder abgeschaltet — **am LMN-Server wurde nichts geändert**. Acht Prüfungen, alle bestanden:
> 1. Passwort ohne Code → 401 `auth.errors.TotpMissing`
> 2. falsches Passwort → 401 `invalid_grant`
> 3. unbekannter Nutzer → 401 `invalid_grant`, **byte-identisch zu 2** (kein Enumerations-Orakel)
> 4. Passwort + gültiger Code → 201 mit Tokens
> 5. **derselbe Code im selben 30-s-Fenster → 401 `auth.errors.TotpAlreadyUsed`** (das Abnahmekriterium von T18;
>    nur gegen einen echten Mongo zu sehen, weil der Claim im `findOneAndUpdate`-Filter steckt)
> 6. falsches Passwort + plausibler Code → 401 `invalid_grant`
> 7. Login in **Großschreibung** + Code → 201 (die Collation trägt end-to-end)
> 8. `GET /auth/totp/<GROSSSCHREIBUNG>` → `true` (zweite Collation-Stelle)
> Nebenbefund: der Aufräum-Login lief in ein **429** — der `byUsername`-Throttle aus T20 greift am echten Stack
> nach ~10 Versuchen in 5 Minuten. Nach Ablauf des Fensters: Login 201, MFA-Status `false`, Box sauber.

### T19 — api: ThrottleGuard auf Multi-Principal (resolvePrincipals/byUsername)  [x] OK — resolvePrincipals + Multi-Principal-canActivate, byUsername in ThrottleConfig/Decorator; 7 neue Fälle, Normalisierung und Mehr-Key-Prüfung mutationsgeprüft
Komponente: apps/api, libs · Dateien: `apps/api/src/common/throttle/throttle.guard.ts`, `apps/api/src/common/throttle/throttle.decorator.ts`, `libs/src/common/types/throttleConfig.ts`, `apps/api/src/common/throttle/throttle.guard.spec.ts` (existiert, erweitern)
Soll: main.js:67075–67092 (`resolvePrincipals`) · main.js:67098–67147 (`canActivate`) · main.js:66984–66990 (`Throttle` mit `byUsername`)
Änderung: `ThrottleConfig` (`libs/src/common/types/throttleConfig.ts:6–10`) um `byUsername: boolean` erweitern; `ThrottleOptions` im Decorator (`throttle.decorator.ts:10–12`) entsprechend, Default `false`. **`enabledEnv` NICHT portieren** (kein Flag, siehe Kopf-Notiz). Modul-Funktion `resolvePrincipals(request, config): string[]` — bei `request.user?.preferred_username` sofort `[authenticatedUsername]`; sonst Array aufbauen: bei `config.byUsername` und `typeof body?.username === 'string'` den getrimmten, lowercase Usernamen als `` `user:${bodyUsername}` `` (leerer String wird verworfen), bei `config.byIp` `` `ip:${request.ip ?? 'unknown'}` ``. `canActivate` umbauen: `principals.length === 0` → `true`; ``cacheKeys = principals.map(p => `${p}:${routePath}`)``; **erst** prüfen, ob *irgendein* Key schon über dem Limit ist (`find`) → 429 mit `X-RateLimit-*`/`Retry-After` und `{ principal: blocked.cacheKey, routePath }` im Detail; **dann** alle Keys hochzählen bzw. anlegen und `minRemaining` über alle Keys bilden (`Math.max(0, minRemaining)` im Header). Eviction-Logik (`MAX_CACHE_SIZE`, `TARGET_SIZE_AFTER_CLEANUP`, `EVICTION_CHECK_INTERVAL`, `insertionCounter`, `throttle.guard.ts:20–39`) unverändert lassen. Fehlerkonstante bleibt `CommonErrorMessages.RATE_LIMIT_EXCEEDED` (der Fork hat kein separates `throttleErrorMessages`-Modul; der Wert ist identisch zu **main.js:67182**, `'common.errors.rateLimitExceeded'`) — kein Refactor.
**Testfalle:** `throttleCache` und `insertionCounter` sind Modul-State (`throttle.guard.ts:20/24`) und werden von allen Guard-Instanzen **und allen Testfällen** geteilt. Jeder neue Fall muss frische IPs/Usernamen verwenden, sonst ist er reihenfolgeabhängig.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/common/throttle/throttle.guard.spec.ts'` grün — bestehende Fälle müssen weiter grün sein; neu: `byUsername`-only-Config drosselt denselben Usernamen von zwei verschiedenen IPs; `byIp`+`byUsername` drosselt sobald *einer* der beiden Zähler voll ist; Usernamen-Normalisierung (`' Alice '` und `'alice'` teilen einen Zähler); `principals.length === 0` (weder byIp noch byUsername, anonym) → `true`
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T20 — api: Throttle auf POST /auth um byUsername erweitern  [x] OK — POST /auth mit byIp + byUsername; Verhaltenstest: Limit-Versuche von ebenso vielen verschiedenen IPs blocken den nächsten
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/authThrottle.spec.ts`
Soll: main.js:68094 — `Throttle(AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS, { byUsername: true, enabledEnv: ENABLE_EXPERIMENTAL_AUTH })`
Änderung: Die bestehende Decorator-Zeile (`auth.controller.ts:78`) auf `@Throttle(AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS, { byIp: true, byUsername: true })` ändern. **Abweichung vom Bundle bewusst:** 2.1.0 lässt `byIp` weg — damit wäre ein Angreifer, der Usernamen von einer IP rotiert, ungedrosselt. Beides zusammen ist eine echte Obermenge; die IP-Seite ist im LMN-Szenario unkritisch (Clients kommen mit eigenen LAN-IPs, `trust proxy` steht in `main.ts:58`). `enabledEnv` entfällt (kein Flag).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/authThrottle.spec.ts'` grün — neu: `readConfig('authenticate')?.byUsername === true` **und** `?.byIp === true`; Verhaltenstest, dass `AUTH_THROTTLE_LIMIT` Versuche gegen denselben Usernamen von ebenso vielen **verschiedenen** IPs den nächsten blocken (Password-Spraying-Schutz) — dabei einen im File noch unbenutzten Usernamen und unbenutzte IPs verwenden, `throttleCache` ist Modul-State (siehe T19)
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T19

### T21 — api: AuthenticateRequestDto + whitelistValidationPipe auf POST /auth  [x] OK — AuthenticateRequestDto + whitelistValidationPipe; gegen den echten oidc-client-ts-Body getestet, inkl. „unbekanntes Feld bricht den Login nicht"
Komponente: apps/api, libs · Dateien: `libs/src/auth/types/authenticateRequest.dto.ts` (NEU), `apps/api/src/auth/auth.controller.ts`
Soll: main.js:68540–68556 ff. (`AuthenticateRequestDto`, Modul-Bereich 68513–68589) · main.js:68096 (`UsePipes(whitelistValidationPipe)`)
Änderung: DTO mit `grant_type` (`@IsIn(Object.values(AUTH_GRANT_TYPES))`), `username` (`@ValidateIf(dto => dto.grant_type === AUTH_GRANT_TYPES.PASSWORD)` + `@IsString()` + `@MinLength(1)`), `password` (gleiche Bedingung), `refresh_token` (`@ValidateIf(... === REFRESH_TOKEN)` + `@IsString()` + `@MinLength(1)`), `scope` (`@IsOptional()` + `@IsString()`). Route: `@UsePipes(whitelistValidationPipe)` ergänzen. **Bewusst `whitelist`, nicht `strict`:** oidc-client-ts sendet `client_id` (und je nach `client_authentication` weitere Felder) mit; `forbidNonWhitelisted` würde jeden Login mit 400 abweisen. Handler-Signatur auf `@Body() body: AuthenticateRequestDto` umstellen. `AuthService.authenticateUser` nimmt weiterhin `AuthRequestArgs` (= `ProcessResourceOwnerPasswordCredentialsArgs & { grant_type: string }`, also `{ username: string; password: string; skipUserInfo?; extraTokenParams?; grant_type: string }`) — das DTO ist dazu strukturell zuweisbar, **kein `as`-Cast** (AGENTS.md).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.controller.spec.ts'` grün · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei · nach `iter.sh deploy` (ask-first): Login über die UI funktioniert weiterhin (Regression-Gate für die Pipe-Wahl — der Body kommt als `application/x-www-form-urlencoded`); `curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/edu-api/auth -H 'Content-Type: application/json' -d '{"grant_type":"quatsch"}'` == `400`
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T1, T7

### T22 — api: TotpSetupBodyDto + strictValidationPipe auf POST /auth/totp  [x] OK — TotpSetupBodyDto + strictValidationPipe; Pipe-Wahl je Route in einer Contract-Tabelle gepinnt
Komponente: apps/api, libs · Dateien: `libs/src/auth/types/totpSetupBody.dto.ts` (NEU), `apps/api/src/auth/auth.controller.ts`
Soll: main.js:68707 ff. (`TotpSetupBodyDto`, Modul-Bereich 68681–68725) · main.js:68132 (`UsePipes(strictValidationPipe)` auf der Route)
Änderung: DTO mit `totp: string` und `secret: string`, beide `@IsString()` + `@MinLength(1)`. Handler `setupTotp` von `@Body() body: { totp: string; secret: string }` (`auth.controller.ts:90`) auf das DTO umstellen und `@UsePipes(strictValidationPipe)` ergänzen. Hier ist `strict` richtig — die Route hat einen geschlossenen, selbst definierten Body und nur einen Konsumenten (`createTotpSlice.setupTotp`, `apps/frontend/src/store/UserStore/createTotpSlice.ts:41–56`, sendet exakt `{ totp, secret }`).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.controller.spec.ts'` grün · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T7

> **Zu T21, statt des deploy-gebundenen Regressions-Gates:** die Pipe-Wahl ist jetzt **unit-getestet gegen den
> echten Request-Body**, den `oidc-client-ts` baut (`authenticateRequestValidation.spec.ts`). Belegt ist damit:
> `client_id`/`client_secret` werden gestrippt (der Server setzt eigene, `signin()`), ein **unbekanntes Zusatzfeld
> wird nicht abgewiesen** (mit `strict` wäre jeder Login 400 — mutationsgeprüft), der Refresh-Grant kommt ohne
> `username`/`password` durch, und ein unbekannter `grant_type` fällt auf 400. Der UI-Login-Check beim nächsten
> Voll-Stack-Verify bleibt sinnvoll, ist aber nicht mehr der einzige Nachweis.

> **Beim Bauen von T19 gefunden — Cache-Key-Amplifikation:** der `ThrottleGuard` läuft **vor** der
> `ValidationPipe`, `body.username` ist dort also völlig ungeprüft. Ohne Längenbegrenzung wäre jeder Key bis zum
> Express-Body-Limit (100 kB) lang, `MAX_CACHE_SIZE = 10_000` begrenzt nur die **Anzahl** — zusammen ~1 GB Heap,
> auslösbar über gefälschte `X-Forwarded-For` (der Fork hat `trust proxy: true`). Der Username wird deshalb auf
> `MAX_THROTTLE_PRINCIPAL_LENGTH` **gekürzt, nicht verworfen** — Verwerfen wäre eine Umgehung des Zählers.
> Ein Test pinnt das (zwei Usernamen, die sich erst hinter dem Cap unterscheiden, teilen ein Budget).

### T23 — api: QrLoginSessionService (Single-Use-Session + Subscriber-Token)  [x] OK — QrLoginSessionService in SseModule (@Global, keine neue Modulkante), Single-Use consume, konstantzeitiger Token-Vergleich; 10 Tests, madge zyklenfrei
Komponente: apps/api · Dateien: `apps/api/src/sse/qr-login-session.service.ts` (NEU), `apps/api/src/sse/qr-login-session.service.spec.ts` (NEU), `apps/api/src/sse/sse.module.ts`, `libs/src/auth/types/qrLoginSessionState.ts` (NEU)
Soll: main.js:67744–67781 (Modul 1017) — `buildCacheKey` 67749–67751 · `create` 67752–67758 · `verifySubscriber` 67759–67765 · `consume` 67766–67774 · **Modulregistrierung main.js:74091–74103**
Änderung: `@Injectable()`-Service mit `@Inject(CACHE_MANAGER) private readonly cacheManager: Cache`. ``static buildCacheKey(sessionId) => `${QR_LOGIN_SESSION_CACHE_PREFIX}${sessionId}` ``. `create(): Promise<{ sessionId: string; subscriberToken: string }>` — `randomUUID()` aus `node:crypto` für die sessionId, `randomBytes(QR_LOGIN_SUBSCRIBER_TOKEN_BYTES).toString('hex')` für den Token, `cacheManager.set(key, { subscriberToken }, QR_LOGIN_SESSION_TTL_MS)`. `verifySubscriber(sessionId, subscriberToken?): Promise<boolean>` — State laden; ohne State oder ohne nicht-leeren String-Token `false`; sonst `compareSecretsConstantTime(state.subscriberToken, subscriberToken)`. `consume(sessionId): Promise<boolean>` — State laden, ohne State `false`, sonst `cacheManager.del(key)` und `true` (**Single-Use**: ein abgefangener QR-Code lässt sich nicht zweimal einlösen). State-Typ als eigener Typ in `libs/src/auth/types/qrLoginSessionState.ts`.
**Modulplatzierung (Reparatur gegenüber der Vorversion):** Der Service gehört in `SseModule.providers` **und** `SseModule.exports` — genau wie im Bundle (main.js:74100–74101). `SseModule` ist im Fork bereits `@Global` (`apps/api/src/sse/sse.module.ts:26`), damit ist der Provider für `SseController` (T26) **und** `AuthService` (T24) ohne jede neue Modulkante auflösbar. (Beweis, dass `@Global` hier trägt: `AuthService` injiziert heute schon `SseService`, ohne dass `AuthModule` `SseModule` importiert.) Die Datei liegt deshalb unter `apps/api/src/sse/` — das vermeidet zusätzlich jede Verzeichnis-Kreuzkante und damit jedes `check-circular-deps`-Risiko. Die frühere Variante (Registrierung in `AuthModule` + `SseModule` importiert `AuthModule`) wäre eine vom Bundle abweichende, unnötige Modulkante gewesen.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/sse/qr-login-session.service.spec.ts'` grün — Spec gegen `apps/api/src/common/cache-manager.mock.ts`: `create` erzeugt eine UUID (gegen `UUID_REGEX_PATTERN` aus T6 prüfen) und einen 64-Zeichen-Hex-Token, `set` mit TTL `QR_LOGIN_SESSION_TTL_MS`; `verifySubscriber` mit richtigem Token → `true`, mit falschem gleicher Länge → `false`, mit `undefined`/`''` → `false`, ohne State im Cache → `false`; `consume` ruft `del` und liefert `true`, ohne State → `false` · `bash scripts/crabbox/iter.sh cmd 'npm run check-circular-deps'` grün · `bash scripts/crabbox/iter.sh test:api` grün (Nest-DI der Testmodule kompiliert)
i18n: keine
Doku: keine (intern)
Abhängt von: T3, T5, T6

### T24 — api: AuthService.createQrLoginSession  [x] OK — createQrLoginSession durchgereicht, Konstruktor-Reihenfolge = Bundle
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.service.spec.ts` (erweitern)
Soll: main.js:67584–67586 (`createQrLoginSession`) · Konstruktor main.js:67350
Änderung: `QrLoginSessionService` (aus `../sse/qr-login-session.service`) als **dritten** Konstruktor-Parameter einschieben und `createQrLoginSession()` durchreichen (`return this.qrLoginSessionService.create()`). Endstand der Parameterreihenfolge = 2.1.0: `userModel, sseService, qrLoginSessionService, globalSettingsService, sessionDenylistService`. Betrifft ausserdem die Testmodule (Provider ergänzen). **Keine** Änderung an `AuthModule` nötig — `SseModule` ist `@Global` und exportiert den Service seit T23.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.service.spec.ts'` grün · `bash scripts/crabbox/iter.sh test:api` grün · `bash scripts/crabbox/iter.sh build` erfolgreich
i18n: keine
Doku: keine (intern)
Abhängt von: T13, T23

### T25 — api: POST /auth/qr-session mit httpOnly/SameSite=strict/pfad-gebundenem Cookie  [x] OK — POST /auth/qr-session mit httpOnly/SameSite=strict/pfad-gebundenem Cookie; Token verlässt den Server nie im Body — mutationsgeprüft
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.controller.ts`
Soll: main.js:68064–68074 (Handler) · main.js:68190–68209 (Decorators)
Änderung: Route `@Public()` + `@Post(AUTH_PATHS.AUTH_QR_SESSION)` + `@Throttle(AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS, { byIp: true })` + `@UseGuards(ThrottleGuard)`; Signatur `async createQrLoginSession(@Res({ passthrough: true }) res: Response)`. Aus `authService.createQrLoginSession()` `{ sessionId, subscriberToken }` holen, dann ``res.cookie(`${QR_LOGIN_TOKEN_COOKIE_PREFIX}${sessionId}`, subscriberToken, { httpOnly: true, secure: process.env.NODE_ENV !== 'development', sameSite: 'strict', path: QR_LOGIN_COOKIE_PATH, maxAge: QR_LOGIN_SESSION_TTL_MS })`` und **nur `{ sessionId }`** zurückgeben — der Token verlässt den Server nie im Body. **Abweichung vom Bundle:** 2.1.0 setzt hier `Throttle(...)` ohne Optionen (main.js:68193); da `resolvePrincipals` für anonyme Requests dann `[]` liefert, ist der Throttle dort wirkungslos — wir setzen `{ byIp: true }`.
**Deploy-Abhängigkeit:** `secure: true` ausserhalb von `NODE_ENV=development` heisst: über reines HTTP wird das Cookie vom Browser verworfen und der SSE-Kanal antwortet danach mit 403 ohne weitere Diagnose. Gehört in die Betriebsdoku (T34).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.controller.spec.ts'` grün — Spec: `res.cookie` wird mit `httpOnly: true`, `sameSite: 'strict'`, `path === QR_LOGIN_COOKIE_PATH`, `maxAge === QR_LOGIN_SESSION_TTL_MS` aufgerufen; der Rückgabewert enthält **kein** `subscriberToken`; Throttle-Config der Methode hat `byIp === true`. Nach `iter.sh deploy` (ask-first): `curl -i -X POST $BASE/edu-api/auth/qr-session` liefert `201` und `Set-Cookie: qr-login-token-<uuid>=…; Path=/edu-api/sse/auth; HttpOnly; SameSite=Strict`
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T3, T24

### T26 — api: SSE-Login-Kanal verlangt den Subscriber-Token  [x] OK — SSE-Login-Kanal verlangt den Subscriber-Token; ohne Cookie 403 und subscribe wird nie gerufen — mutationsgeprüft
Komponente: apps/api · Dateien: `apps/api/src/sse/sse.controller.ts`, `apps/api/src/sse/sse.controller.spec.ts`
Soll: main.js:74176–74183 (Handler `publicLoginSse`) · main.js:**74208–74221** (Decorators; `@Query('sessionId', UuidPipe)` 74215, `@Req()` 74216) · Konstruktor main.js:74161
Änderung: `QrLoginSessionService` in den `SseController` injizieren (2. Konstruktor-Parameter, wie im Bundle) — **keine Modul-Änderung nötig**, der Service wird seit T23 vom selben `SseModule` bereitgestellt. `publicLoginSse` (`sse.controller.ts:70–74`) auf `async` umstellen und um `@Req() req: Request` erweitern; `sessionId` durch die `UuidPipe` schleusen. Im Handler: ``const token = parse(req.headers.cookie || '')[`${QR_LOGIN_TOKEN_COOKIE_PREFIX}${sessionId}`]`` (`cookie` ist bereits Dependency, `package.json:116`, und wird in `apps/api/src/common/utils/extractToken.ts:20` schon so benutzt), dann `await this.qrLoginSessionService.verifySubscriber(sessionId, token)`; bei `false` `CustomHttpException(AuthErrorMessages.Forbidden, HttpStatus.FORBIDDEN, { sessionId }, SseController.name)`. Erst danach ``this.sseService.subscribe(`${LOGIN_SESSION_SSE_CHANNEL_PREFIX}${sessionId}`, res)``. **Ohne diesen Schritt kann jeder, der eine sessionId errät oder mitliest, den Login-Kanal abhören und die durchgereichten Credentials mitlesen.** Die bereits gelandete Kanal-Namespacing-/Doppel-Subscriber-Logik nicht anfassen.
Spec-Anpassung: die beiden bestehenden Fälle in `sse.controller.spec.ts:83–90` rufen `publicLoginSse('some-session-id', response)` mit zwei Argumenten auf und müssen auf die neue Signatur (`sessionId, req, res`) plus `await` gezogen werden; ausserdem braucht das Testmodul einen `QrLoginSessionService`-Mock.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/sse/sse.controller.spec.ts'` grün — Spec: kein Cookie → 403 und `sseService.subscribe` **nie** aufgerufen; falscher Token → 403; richtiger Token → `subscribe` mit `login-session:<uuid>`; separater Pipe-Test: `new UuidPipe().transform('kein-uuid')` wirft 400
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T6, T23, T25

### T27 — api: loginViaApp konsumiert die Session einmalig + UuidPipe + DTO-Härtung  [x] OK — loginViaApp konsumiert die Session einmalig (nach dem getUserConnection-Check), UuidPipe + strictValidationPipe + DTO gehärtet
Komponente: apps/api, libs · Dateien: `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.service.spec.ts` (erweitern), `apps/api/src/auth/auth.controller.ts`, `libs/src/auth/types/loginQrSse.dto.ts`
Soll: main.js:67587–67597 (`loginViaApp` mit `consume` in 67593–67595) · main.js:68075–68077 + 68210–68227 (Route mit `strictValidationPipe` 68213 und `@Query('sessionId', UuidPipe)` 68223) · main.js:68789 ff. (`LoginViaAppBodyDto`)
Änderung: In `AuthService.loginViaApp` (`auth.service.ts:264–273`) nach dem bestehenden `getUserConnection`-Check ein `const isSessionConsumed = await this.qrLoginSessionService.consume(sessionId)` einziehen; bei `false` `CustomHttpException(UserErrorMessages.NotFoundError, HttpStatus.NOT_FOUND)`. Erst danach `sendEventToUser`. Methode wird `async`. Controller: `@UsePipes(strictValidationPipe)` ergänzen und `@Query('sessionId', UuidPipe) sessionId: string` — damit entfällt der handgeschriebene `if (!sessionId) throw ...`-Block (`auth.controller.ts:121–122`); die Pipe deckt das ab. `LoginQrSseDto` **wiederverwenden** statt ein `LoginViaAppBodyDto` neu anzulegen (AGENTS.md: erst suchen) und um `@MinLength(1)` auf beiden Feldern ergänzen, damit es dem Bundle-DTO entspricht.
**Risiko (bewusst, Bundle-Parität):** `POST /auth/edu-app` ist die vom QR-Code adressierte Route (`LoginPage.tsx:327` baut genau diese URL) und wird von der **externen Mobile-App** aufgerufen. `strictValidationPipe` weist jedes Zusatzfeld mit 400 ab. Muss am Human-Gate mit einem echten Gerät geprüft werden.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.service.spec.ts'` grün — Spec: erster `loginViaApp`-Aufruf sendet das SSE-Event, zweiter mit derselben sessionId (Cache leer) → 404 und **kein** zweites Event; `consume` wird **nach** dem `getUserConnection`-Check gerufen · `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=apps/api/src/auth/auth.controller.spec.ts'` grün — leerer `username` im Body → 400 durch das DTO
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T6, T7, T23, T24

### T28 — FE: Two-Stage-Login — TOTP-Feld aus der 401-Antwort statt aus der Vorab-Abfrage  [x] OK — Vorab-Abfrage raus, TOTP-Feld öffnet aus der 401-Antwort; Entscheidung in die reine Funktion `resolveAuthErrorAction` gezogen (10 Tests) + Verdrahtungs-Spec (4 Tests), beides mutationsgeprüft
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/LoginPage/LoginPage.tsx`, `apps/frontend/src/pages/LoginPage/useAuthErrorHandler.ts`, `apps/frontend/src/pages/LoginPage/useAuthErrorHandler.spec.ts` (NEU)
Soll: **Nicht aus dem Bundle rekonstruierbar** — nur die API ist un-minifiziert. Fork-Eigenentwurf gegen den in T17 gebauten Contract (401 `auth.errors.TotpMissing` nach erfolgreicher Passwortprüfung, 401 `auth.errors.TotpInvalid`/`auth.errors.TotpAlreadyUsed` danach).
Änderung: `handleCheckMfaStatus` (`LoginPage.tsx:256–263`) ersatzlos streichen; das Formular submittet direkt `onSubmit` (Zeile 386: `form.handleSubmit(onSubmit)` statt der Verzweigung). Im QR-Pfad (`LoginPage.tsx:222–224`) den `getTotpStatus`-Aufruf durch ein direktes `form.handleSubmit(onSubmit)()` ersetzen (die lokale `handleEnterMfa`-Funktion, Zeilen 217–220, entfällt damit ebenfalls). In `useAuthErrorHandler` **vor** dem generischen `form.setError`-Zweig (`useAuthErrorHandler.ts:51`): enthält `authError.message` den Key `AuthErrorMessages.TotpMissing`, dann kein Form-Fehler, sondern ein neuer Callback-Parameter `onTotpRequired?: () => void` — LoginPage setzt daraufhin `setIsEnterTotpVisible(true)` und `setShowQrCode(false)`. Die Fehlerkeys `TotpInvalid`/`TotpAlreadyUsed` laufen weiter in den normalen Fehlerpfad (sichtbar im TOTP-Schritt). `onSubmit` selbst bleibt unverändert — es hängt `:${totpValue}` schon heute an, sobald `isEnterTotpVisible || totpValue` (Zeile 109). Keine Kommentare im Code, `cn()` für classNames, Hooks oben importieren.
*(Dass die Fehlerkeys im `authError.message` ankommen, ist im Fork bereits belegt: der bestehende MFA-Flow zeigt `auth.errors.TotpInvalid` genau über diesen Pfad.)*
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` fehlerfrei (**Pflicht** — eslint+vitest verdecken fehlende Required-Props) · `bash scripts/crabbox/iter.sh cmd 'npx nx test frontend --run src/pages/LoginPage/resolveAuthErrorAction.spec.ts'` **und** `… --run src/pages/LoginPage/useAuthErrorHandler.spec.tsx` grün (beide narrowen; eine fehlende Datei ergibt „No test files found", Exit 1) — Fehler mit `auth.errors.TotpMissing` ⇒ `onTotpRequired` gerufen und **kein** `form.setError('password', ...)`; Fehler mit `auth.errors.TotpInvalid` ⇒ `form.setError` gerufen und `onTotpRequired` **nicht** · `bash scripts/crabbox/iter.sh test:frontend` grün
i18n: keine (Keys existieren bzw. kommen aus T2)
Doku: keine (T34 sammelt)
Abhängt von: T17

### T29 — FE: getTotpStatus aus dem Store entfernen  [x] OK — getTotpStatus aus Store, Slice-Typ und LoginPage; repo-weit 0 Treffer
Komponente: apps/frontend, libs · Dateien: `apps/frontend/src/store/UserStore/createTotpSlice.ts`, `libs/src/user/types/store/totpSlice.ts`, `apps/frontend/src/pages/LoginPage/LoginPage.tsx`
Soll: Fork-Eigenentwurf (Folge der T30-Entscheidung, kein Bundle-Anker — 2.1.0 lässt die Route unter dem Flag nur 404 laufen, wir löschen sie)
Änderung: Die Store-Methode `getTotpStatus` (`createTotpSlice.ts:58–77`) löschen **und** die Typdeklaration `getTotpStatus: (username: string) => Promise<boolean>;` in `libs/src/user/types/store/totpSlice.ts:22` entfernen; den Destructuring-Eintrag in `LoginPage.tsx:73` entfernen. Nach T28 hat sie keinen Aufrufer mehr. `apps/api/src/mobileAppModule` bleibt unangetastet (eigener, authentifizierter Endpoint).
Verify: `bash scripts/crabbox/iter.sh cmd '! grep -rn "getTotpStatus" apps/frontend/src libs/src'` (Exit 0 heisst: keine Treffer mehr) · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` fehlerfrei · `bash scripts/crabbox/iter.sh test:frontend` grün
i18n: keine
Doku: keine
Abhängt von: T28

### T30 — api: GET /auth/totp/:username löschen (Enumerations-Orakel)  [x] OK — Route gelöscht; Contract-Specs nachgezogen — die erschöpfende Assertion aus T33 hat den Wechsel erzwungen
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.controller.spec.ts`, `apps/api/src/auth/authThrottle.spec.ts`
Soll: main.js:68050–68055 + 68146–68156 — 2.1.0 lässt die Route bestehen und wirft unter aktivem Flag `NotFoundError`. Da wir kein Flag führen (Kopf-Notiz), ist eine Route, die immer 404 liefert, toter Code → **löschen**.
Änderung: Handler `getTotpInfo` (`auth.controller.ts:94–100`) samt `@Public()`, `@Throttle`, `@UseGuards(ThrottleGuard)` entfernen. `AuthService.getTotpInfo` (`auth.service.ts:200–205`) **bleibt** (authentifizierter `mobileApp`-Konsument, `apps/api/src/mobileAppModule/mobileApp.service.ts:86`). In `auth.controller.spec.ts` `'getTotpInfo'` aus `PUBLIC_ROUTES` (Zeile 23) und aus dem `mockAuthService` (Zeilen 14–21) entfernen; in `authThrottle.spec.ts` die `getTotpInfo`-Fälle (Zeilen 30 und 42) streichen. **Reihenfolge zwingend nach T28/T29** — davor bricht jeder MFA-Login.
Verify: `bash scripts/crabbox/iter.sh test:api` grün · `bash scripts/crabbox/iter.sh cmd 'test $(grep -c "AUTH_CHECK_TOTP}/:username" apps/api/src/auth/auth.controller.ts) -eq 1'` (nur noch das `@Put` für `disableTotpForUser`, heute sind es zwei Treffer) · nach `iter.sh deploy` (ask-first): `curl -s -o /dev/null -w '%{http_code}' $BASE/edu-api/auth/totp/irgendwer` == `404`
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T28, T29

> **Zwei bewusste Abweichungen beim Bauen von T28–T30:**
> 1. **Keine Hook-Spec, sondern eine reine Funktion.** T28 verlangte eine Spec für `useAuthErrorHandler`. Im Repo
>    gibt es kein `@testing-library/react` (nur `@testing-library/jest-dom`), und das Muster der bestehenden
>    FE-Specs (`renderToStaticMarkup`) führt `useEffect` gar nicht aus. Statt eine Dependency aufzunehmen ist die
>    Entscheidungslogik in `resolveAuthErrorAction.ts` gezogen (Muster: `resolveOfficeEditorPreviewType`) und dort
>    getestet. Die **Verdrahtung** deckt zusätzlich `useAuthErrorHandler.spec.tsx` ab — mit `createRoot` + `act`
>    aus `react-dom/test-utils`, was ohne neue Dependency geht, weil vitest ohnehin in `jsdom` läuft
>    (`apps/frontend/vite.config.mts:58`). Mutationsgeprüft: fällt `onTotpRequired?.()` weg, bricht der MFA-Login
>    stumm — zwei Tests werden rot.
> 2. **`AuthService.getTotpInfo` ist gelöscht, nicht behalten.** T30 begründete das Behalten mit einem
>    `mobileApp`-Konsumenten. Das ist **falsch**: `mobileApp.service.ts:86` hat eine **eigene** `getTotpInfo` über
>    `userService.findOne` mit anderer Rückgabeform (`{secret, createdAt}` statt `boolean`), und
>    `grep -rn "authService" apps/api/src/mobileAppModule/` ist leer — das Modul injiziert `AuthService` gar nicht.
>    Nach dem Löschen der Route hatte die Methode null Aufrufer. Unabhängig im Review bestätigt.
>    Nebeneffekt: die Collation, die T15–T18 in `getTotpInfo` brauchte (damit ein MFA-Nutzer mit abweichender
>    Schreibweise nicht in eine Sackgasse läuft), ist damit gegenstandslos — in `authenticateUser` bleibt sie.
>
> **Aus dem Review notiert, außerhalb des Scopes:** bei geöffnetem TOTP-Feld ist der Submit-Button auch bei leerem
> Code aktiv; ein Klick liefert dann `invalid_grant` („falsche Zugangsdaten"), obwohl das Passwort nachweislich
> stimmt — vorher genauso irreführend, jetzt nachweislich falsch. Fix wäre ein `disabled`, sobald der Code nicht
> `AUTH_TOTP_CONFIG.digits` Stellen hat.

> **Abnahme nach T28–T30 am deployten Stack (2026-07-28), sieben Prüfungen, alle bestanden:**
> Passwort ohne Code → 401 `TotpMissing` · falsches Passwort → 401 `invalid_grant` · unbekannter Nutzer →
> **byte-identisch dazu** · Passwort + Code → 201 · **derselbe Code nochmal → 401 `TotpAlreadyUsed`** ·
> Großschreibung + Code → 201 · `GET /auth/totp/<name>` → **404**. Zusätzlich: das UI-Bundle enthält den String
> `auth/totp/` nicht mehr (mit Positivkontrolle geprüft, damit das kein Falsch-Grün ist), und
> `GET /mobile-app/totp-info` antwortet weiterhin 401 — die eigene Route des Mobile-Moduls ist unberührt.
>
> **Ein sporadischer Fehlschlag beim Testen — Ursache liegt NICHT im Produktcode.** In zwei von rund sechs Läufen
> wurde ein frisch berechneter Code als `TotpInvalid` abgelehnt, der nächste ging. Geklärt mit
> `apps/api/src/auth/totpWindow.spec.ts` (Fake-Timer): `validateTotp` akzeptiert einen korrekt erzeugten Code an
> **jeder Sekunde** seines Fensters sowie ein Fenster davor und danach, und lehnt ihn erst zwei Fenster später ab.
> Ein korrekt berechneter Code kann also nicht abgelehnt werden — die Ursache lag im Wegwerf-Python der
> Prüfmatrix. Der Test bleibt als Regressionsnetz: verengt jemand `TOTP_VALIDATION_WINDOW` auf 0, wird er rot.

### T31 — FE: QR-Login-Session vom Server beziehen  [x] OK — Session kommt vom Server statt aus getRandomUUID; Toggle-Entscheidung als reine Funktion getestet; 3*60*1000 durch QR_LOGIN_SESSION_TTL_MS ersetzt
Komponente: apps/frontend, libs · Dateien: `apps/frontend/src/store/UserStore/createQrCodeSlice.ts`, `libs/src/user/types/store/qrCodeSlice.ts`, `apps/frontend/src/pages/LoginPage/LoginPage.tsx`
Soll: **Nicht rekonstruierbar** (kein FE-Bundle) — Fork-Eigenentwurf gegen `POST /auth/qr-session` aus T25.
Änderung: Im Store (nicht in der Komponente, AGENTS.md) eine Methode `createQrLoginSession: () => Promise<string | undefined>` ergänzen — **auch im Slice-Typ `libs/src/user/types/store/qrCodeSlice.ts`** —, die per ``eduApi.post<{ sessionId: string }>(`${AUTH_PATHS.AUTH_ENDPOINT}/${AUTH_PATHS.AUTH_QR_SESSION}`)`` die Session anlegt und `data.sessionId` liefert; Fehler über `handleApiError`. In `handleCancelOrToggleQrCode` (`LoginPage.tsx:271–279`) `getRandomUUID()` durch den Store-Aufruf ersetzen (`async`), `setSessionID` erst mit der Server-Antwort setzen und `setShowQrCode(true)` nur bei Erfolg. Der `EventSource`-Aufruf (Zeilen 200–202) und der QR-Value (Zeile 327) bleiben unverändert — sie benutzen nur die neue sessionId. Der Import `getRandomUUID` in LoginPage entfällt, sofern kein weiterer Nutzer in der Datei (die Util selbst bleibt, andere Seiten nutzen sie).
**Zusätzlich (Contract-Duplikat auflösen):** Das hartkodierte `3 * 60 * 1000` im QR-Timeout (`LoginPage.tsx:241–248`) durch den Import von `QR_LOGIN_SESSION_TTL_MS` (T3) ersetzen — sonst driftet der Client-Timeout still gegen die serverseitige Session-TTL (und es ist eine AGENTS.md-Magic-Number-Verletzung).
Same-Origin: das `Set-Cookie` wird vom Browser gespeichert und vom `EventSource` auf `/edu-api/sse/auth` automatisch mitgeschickt — **kein** `withCredentials` nötig (der Cookie-Path aus T3 ist exakt der EventSource-Pfad), aber im Voll-Stack-Verify gegen den echten Stack prüfen.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` fehlerfrei · `bash scripts/crabbox/iter.sh test:frontend` grün — Spec: Toggle ruft `createQrLoginSession` und setzt die zurückgegebene sessionId; bei Fehler bleibt `showQrCode` false · `bash scripts/crabbox/iter.sh cmd '! grep -n "3 \* 60 \* 1000" apps/frontend/src/pages/LoginPage/LoginPage.tsx'` · Voll-Stack (ask-first, `iter.sh deploy`): QR-Login zwischen zwei Geräten läuft durch; ein zweiter Browser, der dieselbe sessionId am SSE-Endpoint abonniert, bekommt 403
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T25, T26, T27

### T32 — FE: Logout ruft POST /auth/logout  [x] OK — Logout ruft POST /auth/logout vor removeUser (sonst fehlt der Bearer für GetBearerSession); lokaler Logout bleibt bei Serverfehler garantiert — mutationsgeprüft
Komponente: apps/frontend, libs · Dateien: `apps/frontend/src/store/UserStore/createUserSlice.ts`, `libs/src/user/types/store/userSlice.ts`, `apps/frontend/src/hooks/useLogout.tsx`
Soll: **Nicht rekonstruierbar** (kein FE-Bundle) — Fork-Eigenentwurf gegen `POST /auth/logout` aus T14.
Änderung: In `createUserSlice.logout` (`createUserSlice.ts:47–51`) **vor** dem `set({ isAuthenticated: false })` den Refresh-Token an die API schicken: `eduApi.post(AUTH_PATHS.AUTH_LOGOUT_ENDPOINT, { refresh_token: refreshToken })`, Fehler mit `handleApiError` schlucken (ein fehlgeschlagener Server-Logout darf den lokalen Logout **nicht** blockieren — der User muss immer rauskommen; das deckt auch ein 429 aus T14 ab). Der Refresh-Token kommt aus dem oidc-Kontext; da der Store keinen `useAuth`-Zugriff hat, den Token als Parameter durchreichen: Signatur in `libs/src/user/types/store/userSlice.ts:34` auf `logout: (refreshToken?: string) => Promise<void>` ändern und in `useLogout.tsx:49` `await logout(auth.user?.refresh_token)`. Der bestehende `silentLogout()`-Aufruf (`useLogout.tsx:65`, Keycloak-Formular-Logout) bleibt — er beendet die Browser-SSO-Session, der neue Call widerruft Refresh-Token + sid serverseitig; beides ist nötig.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` fehlerfrei · `bash scripts/crabbox/iter.sh test:frontend` grün — Spec: `logout(token)` postet auf `auth/logout`; wirft der Post, wird trotzdem `isAuthenticated: false` gesetzt · Voll-Stack (ask-first): nach Logout liefert ein zuvor kopierter Access-Token auf einer geschützten Route `401` (statt bis zum `exp` weiter zu funktionieren) — das ist der eigentliche Beweis für T10
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T14

> **Beim Bauen von T23–T27/T31/T32 gefunden:**
> 1. **Der `import type`-Fallstrick aus T14 hat wieder zugeschlagen** — diesmal bei `LoginQrSseDto` in
>    `auth.controller.ts`. Der type-only Import stand dort schon **vorher**, war aber folgenlos, weil an der Route
>    keine Pipe hing; erst das `@UsePipes(strictValidationPipe)` aus T27 machte ihn scharf. **Präzisierung der
>    Wirkung** (am kompilierten Bundle gemessen, nicht angenommen): der Emit ist `design:paramtypes: [Object, …]`,
>    und bei `Object` **überspringt** die `ValidationPipe` die Prüfung stillschweigend — die Härtung wäre also
>    wirkungslos gewesen, nicht (wie ein Review vermutete) die Route tot. Beides ist schlecht, aber nur eines davon
>    fällt im Betrieb auf. Behoben durch Wert-Import; ein Test liest den Metatype jetzt **aus der Reflection** und
>    fährt die echte Pipe damit — er wird rot, sobald jemand den Import zurückdreht.
> 2. **Sieben weitere Controller** haben ebenfalls type-only `@Body()`-DTOs (`parent-child-pairing`, `license`,
>    `docker`, `global-settings`, `appconfig`, `veyon`, `lmnApi`). Heute folgenlos, weil dort keine Pipe hängt —
>    aber wer eine ergänzt, tappt in dieselbe Falle. Gehört als eigener Task in den Backlog.
> 3. **`MOBILE_APP_ENABLED = false`** (ADR 0002): `createQrLoginSession` ist aus der ausgelieferten UI derzeit
>    **unerreichbar**, der Toggle rendert nur während der TOTP-Eingabe und verzweigt dort sofort. Das entschärft
>    das T27-Risiko (externe Mobile-App gegen `strictValidationPipe`) stark — heisst aber auch: **kein Gate fährt
>    diesen Pfad**, weder das Human-Gate noch die Voll-Stack-Schritte von T31. Wer das Flag umlegt, muss den
>    QR-Login zuerst manuell durchspielen.
> 4. **Restverhalten, bundle-identisch, kein Code-Fix hier:** wer den QR-Code lesen kann, kann dem Opfer-Browser
>    **einmal** eigene Zugangsdaten unterschieben (Forced Login) — `getUserConnection` trägt, `consume` gelingt,
>    die Seite submittet. Gehört in die Security-Doku (T34).

### T33 — api: Auth-Contract-Specs auf den neuen Routenstand ziehen  [~] TEILWEISE — der wertvollste Teil ist gebaut: **erschöpfende** Bypass-Assertion (Menge der @Public-Routen == PUBLIC_ROUTES) plus Vollständigkeitsnetz (beide Listen zusammen decken jeden Handler). Beide mutationsgeprüft: eine eingeschmuggelte @Public-Route und eine umgedrehte geschützte Route werden erkannt — vorher war beides für die Handlisten unsichtbar. **T30 ist inzwischen gebaut** und hat `getTotpInfo` aus den Listen gezogen — die erschöpfende Assertion hat das erzwungen, genau wie vorgesehen. **T25 ist gebaut** und hat `createQrLoginSession` in `PUBLIC_ROUTES` gezogen — die erschöpfende Assertion hat es erzwungen (zwei Tests wurden rot). Damit ist T33 inhaltlich vollständig.
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.controller.spec.ts`, `apps/api/src/auth/authThrottle.spec.ts`
Soll: Ergebnis von T14/T20/T25/T30 — die Spec ist das Bypass-Regressionsnetz (siehe `p1-port-api-specs-ci`, `check-spec-coverage` im `.husky/pre-commit` + CI)
Änderung: `PUBLIC_ROUTES` (Zeile 23) auf den Endstand setzen: `['authconfig', 'authenticate', 'logout', 'createQrLoginSession', 'loginViaApp']`; `PROTECTED_ROUTES` (Zeile 24) bleibt `['getQrCode', 'setupTotp', 'disableTotp', 'disableTotpForUser']`. `mockAuthService` um `logout` und `createQrLoginSession` ergänzen, `getTotpInfo` entfernen. **Keine** zusätzlichen Provider mocken — der `AuthController` injiziert ausschliesslich `AuthService` (`auth.controller.ts:60`); `QrLoginSessionService`/`SessionDenylistService` gehören ins Testmodul von `auth.service.spec.ts`, nicht hierher. In `authThrottle.spec.ts` die Route-Liste auf `['authenticate', 'createQrLoginSession', 'logout']` ziehen und für alle drei `limit`/`ttl` sowie `byIp` prüfen, für `authenticate` zusätzlich `byUsername`. Explizite Negativ-Assertion ergänzen (Auth-Bypass-Gate), konkret:
`const allRoutes = Object.getOwnPropertyNames(AuthController.prototype).filter((m) => m !== 'constructor');`
`expect(allRoutes.filter((m) => controllerContractReflection.isRoutePublic(AuthController, m)).sort()).toEqual([...PUBLIC_ROUTES].sort());`
Verify: `bash scripts/crabbox/iter.sh test:api` grün · `bash scripts/crabbox/iter.sh cmd 'npm run check-spec-coverage'` grün
i18n: keine
Doku: keine
Abhängt von: T14, T20, T25, T30

### T34 — Doku: Spec, ADR zur Flag-Entscheidung, Security-Doku  [~] TEILWEISE — **ADR 0003 geschrieben** (`docs/adr/0003-no-experimental-auth-flag.md`, alle sechs Bundle-Anker einzeln nachgeschlagen; zwei erste Fassungen waren daneben und sind korrigiert). Spec und Betriebsdoku **bewusst offen**: beide beschreiben zum grossen Teil Ungebautes (Two-Stage-Login, QR-Kanal, das `secure`-Cookie-Verhalten aus T25) — geschrieben würden sie Behauptungen über Code enthalten, den es nicht gibt.
Komponente: docs · Dateien: `docs/features/p6-auth-hardening.md` (NEU), `docs/adr/0003-no-experimental-auth-flag.md` (NEU), `docs/security/auth-hardening.md` (NEU)
Soll: Die in diesem Paket getroffenen Entscheidungen + die Bundle-Anker aus T1–T33
Änderung: (1) **Spec** `docs/features/p6-auth-hardening.md`: Ausgangslage (Fork = 2.0.200-treu), die fünf Angriffsflächen (Enumeration/TOTP-Orakel vor Passwortprüfung, TOTP-Replay, kein Server-Logout, Single-Principal-Throttle, ungeschützter QR-Kanal), die gebaute Lösung je Fläche mit `main.js`-Ankern, und die Kennzeichnung von T28–T32 als Fork-Eigenentwurf. (2) **ADR 0003**: „Kein `ENABLE_EXPERIMENTAL_AUTH`" — Kontext (2.1.0 stellt Replay-Schutz, `byUsername`-Throttle und das TOTP-Route-404 unter ein default-aus-Flag), Entscheidung, Begründung (siehe Kopf-Notiz), Konsequenzen (Route gelöscht statt 404; `isExperimentalAuthEnabled`/`enabledEnv` nicht portiert; keine neue Env im Installer). Nummerierung passt: `docs/adr/` enthält aktuell `0001-active-mail-client-selector.md`, `0001-naming-registry.md`, `0002-mobile-access-hidden.md` → `0003` ist frei. (3) **Betriebsdoku** `docs/security/auth-hardening.md` (DE): der neue Login-Flow als Ablauf; was Admins am Support-Desk sehen werden (`TotpAlreadyUsed` beim Doppel-Login im 30s-Fenster); die Redis-Abhängigkeit von sid-Denylist und QR-Session (fällt Redis aus, ist die Denylist **fail-open** — bewusst, damit kein Ausfall alle User aussperrt, aber ein Logout wirkt dann nur bis zum `exp`); die **`secure`-Cookie-Abhängigkeit** aus T25 (über reines HTTP verschwindet das Cookie und der SSE-Kanal 403t ohne Diagnose); der **`byIp`-Zähler bei geteilter Quell-IP** (hinter externem NAT/Reverse-Proxy teilen sich alle Nutzer `AUTH_THROTTLE_LIMIT` = 10 pro 5 min); und die bewussten Abweichungen vom Bundle inkl. des `qr-session`-Throttle-Bugs und des neu gedrosselten Logouts.
Verify: `bash scripts/crabbox/iter.sh cmd 'test -f docs/features/p6-auth-hardening.md && test -f docs/adr/0003-no-experimental-auth-flag.md && test -f docs/security/auth-hardening.md'` · `bash scripts/crabbox/iter.sh cmd 'test $(grep -c "main.js:" docs/features/p6-auth-hardening.md) -ge 15'` (jeder Baustein hat seinen Anker) · `bash scripts/crabbox/iter.sh cmd 'grep -q "fail-open" docs/security/auth-hardening.md && grep -q "secure" docs/security/auth-hardening.md'` · Review: die ADR nennt Kontext, Entscheidung, Begründung und Konsequenzen
*(Das frühere `npm run check-external-references` als Verify ist entfallen: `scripts/checkExternalReferences.ts` scannt nur `SCAN_ROOTS = ['apps','libs']` und sucht edulution.io-Hosts/Sentry-DSNs — es sieht `docs/` nie an und prüft keine Links; der Check wäre unabhängig vom Doku-Inhalt grün gewesen.)*
i18n: keine (Betriebsdoku folgt dem `docs/observability.md`-Muster: DE reicht, kein Locale-Fächer)
Doku: —
Abhängt von: T33

---

**Phasenende — nicht autonom fahren:**
- `[?] human-gate: Voll-Stack-Auth-Verifikation` — `iter.sh deploy` gegen den echten LMN + manuelle Runde: (a) Login ohne MFA, (b) Login mit MFA über beide Stufen, (c) denselben TOTP-Code sofort erneut einlösen ⇒ `TotpAlreadyUsed`, (d) falsches Passwort bei MFA-User ⇒ **kein** `TotpMissing`, (e) Logout, danach kopierter Access-Token ⇒ 401 auf `/edu-api/users/...` **und** Whiteboard-WebSocket schliesst, (f) QR-Login zwischen zwei Geräten, (g) zweiter Browser auf derselben sessionId ⇒ 403. Ohne (c)/(e) ist das Paket nicht abgenommen.
- `[?] human-gate: Mobile-App gegen POST /auth/edu-app` — T27 setzt `strictValidationPipe` auf die vom QR-Code adressierte Route. Sendet die App mehr als `username`/`password`, antwortet sie ab sofort mit 400. Mit einem echten Gerät prüfen, bevor das Paket rausgeht.
- `[?] human-gate: Keycloak-Brute-Force-Settings prüfen` — T17 erzeugt pro fehlgeschlagenem MFA-Login 1–2 zusätzliche Keycloak-Roundtrips, T16 einen zusätzlichen pro Nicht-MFA-Login mit `:NNNNNN`-Suffix. Realm-Einstellung `bruteForceProtected`/`failureFactor` gegen die neue Aufrufzahl abgleichen, sonst sperrt Keycloak Accounts früher als bisher.
- `[?] human-gate: Draft-PR` — `git push` + `gh pr create` (nur `linuxmuster-ui`, kein Installer-Anteil; es kommt **keine** neue Env dazu).