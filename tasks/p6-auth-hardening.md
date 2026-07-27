## p6-auth-hardening [P6] ⭐ — 2.1.0 Auth-Härtung (Two-Stage-Login, TOTP-Replay, Logout/sid-Denylist, Throttle, QR-Kanal)
_Ziel:_ Die gesamte Auth-Härtung aus 2.1.0 nachziehen — der Fork ist ein treuer 2.0.200-Port und hat nichts davon · _Abhängt-von:_ — (nur bereits gelandete SSE-Namespacing- + IP-Throttle-Arbeit dieser Session) · _Status:_ **geplant** · _Tasks:_ 34
Branch: `feat/2.0-backlog` · Spec: `docs/features/p6-auth-hardening.md` (T34) · Soll: `.reference/2.1.0/api/main.js` (94907 Zeilen, un-minifiziert, Original-Namen) — Ankerlinien je Task. Kein `upstream/*`-Rescue-Branch für 2.1.0 vorhanden; das Bundle ist die einzige Quelle.

> **Entscheidung `ENABLE_EXPERIMENTAL_AUTH`: NEIN — nicht adoptieren.** 2.1.0 stellt drei Dinge unter das Flag
> (`isExperimentalAuthEnabled`, main.js:67826–67856): den TOTP-Replay-Schutz (67507), den `byUsername`-Throttle
> (68094 via `enabledEnv`) und das 404 auf `GET /auth/totp/:username` (68051). Wir portieren **alles unbedingt an**
> und lassen `isExperimentalAuthEnabled.ts` sowie `ThrottleConfig.enabledEnv` weg. Gründe: (1) eine Sicherheits-
> massnahme hinter einem default-aus-Flag läuft in keiner Default-Installation; (2) upstream brauchte das Flag für
> einen gestaffelten Rollout über einen Bestand — der Fork hat auf 2.1.0 keinen Bestand; (3) zwei Auth-Pfade
> verdoppeln die Testfläche und zwingen den FE, beide Flows zu können; (4) jede neue Env ist Installer- +
> `.env.default`-Contract-Arbeit ohne Gegenwert. Konsequenz: `GET /auth/totp/:username` wird **gelöscht** (T30)
> statt konditional 404 zu liefern.
>
> **Vorab verifiziert (kein Änderungsbedarf):** `AuthService.getTotpInfo` gibt im Fork bereits nur `user?.mfaEnabled ?? false`
> zurück (`apps/api/src/auth/auth.service.ts:200–205`) — identisch zu 2.1.0 (main.js:67543–67547). Die Methode selbst
> ist sauber; das Problem ist ausschliesslich die **öffentliche Route**, die vor jeder Passwortprüfung verrät, ob es
> den User gibt und ob er MFA hat. Die Methode bleibt (der authentifizierte `mobileApp`-Konsument,
> `apps/api/src/mobileAppModule/mobileApp.service.ts:86`, nutzt sie mit dem eigenen Usernamen und ist kein Orakel).
>
> **Bewusste Abweichungen vom Bundle:** `POST /auth` behält `byIp` **und** bekommt `byUsername` (Bundle lässt `byIp`
> weg → Username-Rotation von einer IP wäre ungedrosselt). `POST /auth/qr-session` bekommt `{ byIp: true }` (Bundle
> setzt `Throttle(...)` ohne Optionen → `resolvePrincipals` liefert `[]`, der Throttle ist dort wirkungslos =
> Bundle-Bug). `AuthErrorMessages` bleibt das bestehende `enum` (2.1.0 nutzt ein const-Objekt; die Umstellung wäre
> ein Dutzend-Datei-Refactor ausserhalb des Auftrags, AGENTS.md nimmt bestehende Error-Message-Enums aus).
>
> **Frontend (T28–T32) ist NICHT rekonstruierbar** — nur das API-Bundle ist un-minifiziert. Diese fünf Tasks sind
> **Fork-Eigenentwurf** gegen den in T1–T27 gebauten API-Contract und in den Commit-Messages so zu kennzeichnen.
>
> **Reihenfolge-Blocker:** T30 (Route löschen) erst nach T28/T29 (FE-Two-Stage), sonst bricht jeder MFA-Login.
>
> Neue Dateien tragen den AGPL-SPDX-Header (`SPDX-License-Identifier: AGPL-3.0-or-later`, `Copyright (C) 2026
> Kevin Stenzel`) — **vor** dem Commit setzen, der `addLicenseHeader`-Hook stempelt sonst den Netzint-Header.

---

### T1 — libs: AUTH_PATHS erweitern + AUTH_GRANT_TYPES  [ ]
Komponente: libs · Dateien: `libs/src/auth/constants/auth-paths.ts` (ändern), `libs/src/auth/constants/authGrantTypes.ts` (NEU)
Soll: main.js:11188–11202 (`AUTH_PATHS` mit `AUTH_ENDPOINT`/`AUTH_LOGOUT` als vorgezogene Konstanten) · main.js:67614–67640 (`AUTH_GRANT_TYPES`)
Änderung: In `auth-paths.ts` `AUTH_ENDPOINT = 'auth'` und `AUTH_LOGOUT = 'logout'` als lokale Konstanten vorziehen und ergänzen: `AUTH_OIDC_LOGOUT_PATH: '/protocol/openid-connect/logout'`, `AUTH_LOGOUT`, `AUTH_LOGOUT_ENDPOINT: \`${AUTH_ENDPOINT}/${AUTH_LOGOUT}\``, `AUTH_QR_SESSION: 'qr-session'`. Bestehende Keys unverändert. Neu `authGrantTypes.ts` mit const-Objekt `AUTH_GRANT_TYPES = { PASSWORD: 'password', REFRESH_TOKEN: 'refresh_token' }` + abgeleitetem Typ, Default-Export am Dateiende, AGPL-SPDX-Header. In `apps/api/src/auth/auth.service.ts:123` den magic string `'refresh_token'` durch `AUTH_GRANT_TYPES.REFRESH_TOKEN` ersetzen (main.js:67468).
Verify: `bash scripts/crabbox/iter.sh lint` sauber · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei · `grep -c "'refresh_token'" apps/api/src/auth/auth.service.ts` == 0
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T2 — libs: AuthErrorMessages TotpAlreadyUsed + LogoutFailed inkl. i18n DE/EN/FR  [ ]
Komponente: libs, apps/frontend · Dateien: `libs/src/auth/constants/authErrorMessages.ts`, `apps/frontend/src/locales/{de,en,fr}/translation.json`
Soll: main.js:11389–11400 (`AUTH_ERROR_MESSAGES`) — neu gegenüber dem Fork sind exakt `TotpAlreadyUsed: 'auth.errors.TotpAlreadyUsed'` und `LogoutFailed: 'auth.errors.LogoutFailed'`
Änderung: Zwei Member ins bestehende `enum AuthErrorMessages` aufnehmen (Enum-Form beibehalten, siehe Kopf-Notiz). Übersetzungen unter `auth.errors` in allen drei Locales anlegen. DE-Vorschlag: `TotpAlreadyUsed: 'Dieser Einmalcode wurde bereits verwendet. Bitte warte auf den nächsten Code.'`, `LogoutFailed: 'Die Abmeldung konnte nicht vollständig durchgeführt werden.'` — EN/FR sinngemäss.
Verify: `bash scripts/crabbox/iter.sh i18n` grün (`check-translations` **und** `check-error-message-translations` — letzteres erzwingt für jeden Enum-Wert einen Key in allen drei Locales)
i18n: `auth.errors.TotpAlreadyUsed`, `auth.errors.LogoutFailed` (de, en, fr)
Doku: keine (intern)
Abhängt von: —

### T3 — libs: QR-Login-Session-Konfiguration  [ ]
Komponente: libs · Dateien: `libs/src/auth/constants/qrLoginSessionConfig.ts` (NEU)
Soll: main.js:67785–67823 (Modul 1018)
Änderung: Fünf Konstanten exportieren, Werte 1:1: `QR_LOGIN_SESSION_TTL_MS = 3 * 60 * 1000`, `QR_LOGIN_SESSION_CACHE_PREFIX = 'qr-login-session:'`, `QR_LOGIN_SUBSCRIBER_TOKEN_BYTES = 32`, `QR_LOGIN_TOKEN_COOKIE_PREFIX = 'qr-login-token-'`, `QR_LOGIN_COOKIE_PATH = \`/${EDU_API_ROOT}/${SSE_EDU_API_ENDPOINTS.SSE}/${AUTH_PATHS.AUTH_ENDPOINT}\`` (main.js:67821 — aus `@libs/common/constants/eduApiRoot`, `@libs/sse/constants/sseEndpoints`, `@libs/auth/constants/auth-paths` zusammengesetzt, **nicht** hart schreiben). AGPL-SPDX-Header.
Verify: `bash scripts/crabbox/iter.sh lint` sauber · `bash scripts/crabbox/iter.sh cmd 'node -e "console.log(1)"'` als Platzhalter entfällt — stattdessen: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei und `grep -n "edu-api/sse/auth" libs/src/auth/constants/qrLoginSessionConfig.ts` liefert **keinen** Treffer (Pfad muss komponiert sein)
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T4 — libs: Session-/Header-Konstanten (Denylist-Prefix, MILLISECONDS_PER_SECOND, BEARER_AUTH_SCHEME)  [ ]
Komponente: libs · Dateien: `libs/src/auth/constants/revokedSessionCacheKeyPrefix.ts` (NEU), `libs/src/common/constants/millisecondsPerSecond.ts` (NEU), `libs/src/auth/constants/bearerAuthScheme.ts` (NEU)
Soll: main.js:67960 (`REVOKED_SESSION_CACHE_KEY_PREFIX = 'revoked-session:'`) · main.js:45553 (`MILLISECONDS_PER_SECOND = 1000`) · main.js:68440 (`BEARER_AUTH_SCHEME = 'Bearer'`)
Änderung: Drei Ein-Konstanten-Module mit Default-Export am Dateiende und AGPL-SPDX-Header. Werte exakt wie im Bundle.
Verify: `bash scripts/crabbox/iter.sh lint` sauber · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T5 — libs: compareSecretsConstantTime  [ ]
Komponente: libs · Dateien: `libs/src/common/utils/compareSecretsConstantTime.ts` (NEU)
Soll: main.js:56241–56268 (Modul 857) — `const SECRET_COMPARISON_HMAC_KEY = 'public-share-secret-compare'`; `digestSecret = (value) => createHmac('sha256', KEY).update(value, 'utf8').digest()`; `compareSecretsConstantTime = (left, right) => timingSafeEqual(digestSecret(left), digestSecret(right))`
Änderung: 1:1 portieren (HMAC-Digest vor `timingSafeEqual`, damit unterschiedliche Längen nicht werfen und die Länge nicht leakt). Konstantenwert unverändert übernehmen — es ist ein reiner In-Process-Domain-Separator, kein Geheimnis, und Abweichen brächte nichts. Named exports vermeiden: nur Default-Export der Vergleichsfunktion. Der Fork hat **keine** `timingSafeEqual`-Nutzung (`grep -rn "timingSafeEqual" apps libs` == leer), das ist also wirklich neu.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=compareSecretsConstantTime'` grün — Spec `libs/src/common/utils/compareSecretsConstantTime.spec.ts` mitliefern: gleiche Strings → `true`; unterschiedliche gleicher Länge → `false`; unterschiedliche **verschiedener** Länge → `false` statt Exception; leerer String vs. leerer String → `true`
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T6 — libs: uuidRegexPattern + api: UuidPipe  [ ]
Komponente: libs, apps/api · Dateien: `libs/src/common/constants/uuidRegexPattern.ts` (NEU), `apps/api/src/common/pipes/uuid.pipe.ts` (NEU)
Soll: main.js:57656 (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) · main.js:68268–68308 (Modul 1024, `UuidPipe.transform` 68297–68303)
Änderung: Regex-Konstante exakt übernehmen. `UuidPipe` als `@Injectable()`-`PipeTransform<string, string>`: wirft `new CustomHttpException(CommonErrorMessages.INVALID_REQUEST_DATA, HttpStatus.BAD_REQUEST)` wenn `!value || !UUID_REGEX_PATTERN.test(value)`, sonst gibt `value` zurück. `CommonErrorMessages.INVALID_REQUEST_DATA` existiert bereits (`libs/src/common/constants/common-error-messages.ts:31`). Dateiname == Default-Export-Name beachten (Datei `uuid.pipe.ts`, Export `UuidPipe` — dem bestehenden Muster `apps/api/src/common/pipes/safe-path-segment.pipe.ts` folgen).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=uuid.pipe'` grün — Spec mit: gültige v4-UUID passiert; Grossschreibung passiert (Flag `i`); `''`, `'abc'`, `'../etc'`, `undefined` werfen 400
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T7 — api: strictValidationPipe + whitelistValidationPipe  [ ]
Komponente: apps/api · Dateien: `apps/api/src/common/pipes/strictValidationPipe.ts` (NEU), `apps/api/src/common/pipes/whitelistValidationPipe.ts` (NEU)
Soll: main.js:14694–14699 (Modul 297: `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, disableErrorMessages: process.env.NODE_ENV === 'production' })`) · main.js:43492–43496 (Modul 681: `new ValidationPipe({ whitelist: true, disableErrorMessages: process.env.NODE_ENV === 'production' })`)
Änderung: Zwei Modul-Singletons (keine Klassen) exakt wie im Bundle, Default-Export am Dateiende, AGPL-SPDX-Header. Unterschied bewusst: `strict` verbietet Extra-Felder (400), `whitelist` strippt sie nur — Letzteres ist für `POST /auth` nötig, weil oidc-client-ts Felder wie `client_id`/`scope` mitsendet, die kein DTO-Feld sind.
Verify: `bash scripts/crabbox/iter.sh lint` sauber · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T8 — api: SessionDenylistService  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/session-denylist.service.ts` (NEU), `apps/api/src/auth/session-denylist.service.spec.ts` (NEU)
Soll: main.js:67859–67934 (Modul 1020) — `static getCacheKey(sid)` 67895 · `denySession(sid, exp)` 67898–67914 · `isSessionDenied(sid)` 67915–67926
Änderung: `@Injectable()`-Service mit `@Inject(CACHE_MANAGER) private readonly cacheManager: Cache`. `static getCacheKey(sid: string) => \`${REVOKED_SESSION_CACHE_KEY_PREFIX}${sid}\``. `denySession(sid?: string, exp?: number): Promise<boolean>` — ohne `sid` oder `exp` sofort `true` (nichts zu tun); `remainingLifetimeMs = exp * MILLISECONDS_PER_SECOND - Date.now()`, bei `<= 0` sofort `true`; sonst `cacheManager.set(key, true, remainingLifetimeMs)` → `true`, im catch `Logger.error(\`Failed to deny session ${sid}: ${error.message}\`, SessionDenylistService.name)` → `false`. `isSessionDenied(sid?: string): Promise<boolean>` — ohne `sid` `false`; sonst `(await cacheManager.get(key)) === true`, im catch `Logger.error` → **`false`** (fail-open ist hier Absicht: ein Redis-Ausfall darf nicht jeden angemeldeten User aussperren). Statische Logger-Aufrufe (AGENTS.md), keine Kommentare im Code.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=session-denylist'` grün — Spec gegen `apps/api/src/common/cache-manager.mock.ts`: `denySession(undefined, ...)`/`denySession(sid, undefined)` → `true` ohne `set`-Aufruf; abgelaufenes `exp` → `true` ohne `set`; gültiges `exp` → `set` mit TTL ≈ `exp*1000-now`; `set` wirft → `false`; `isSessionDenied` mit `true` im Cache → `true`, mit `undefined` → `false`, `get` wirft → `false`
i18n: keine
Doku: keine (intern)
Abhängt von: T4

### T9 — api: AuthModule stellt SessionDenylistService bereit, TLDrawSyncModule importiert AuthModule  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.module.ts`, `apps/api/src/tldraw-sync/tldraw-sync.module.ts`
Soll: main.js:67242–67282 (AuthModule: `providers: [AuthService, SessionDenylistService]`, `exports: [SessionDenylistService]`) · main.js:74262–74287 (TLDrawSyncModule mit `imports: [AuthModule, ...]`, 74278)
Änderung: `SessionDenylistService` in `AuthModule.providers` **und** `AuthModule.exports`. In `TLDrawSyncModule.imports` `AuthModule` ergänzen. `AppModule` importiert `AuthModule` bereits (`apps/api/src/app/app.module.ts:124`) — damit ist der Service für den global via `APP_GUARD` registrierten `AuthGuard` (app.module.ts:160) auflösbar; **hier nichts an app.module.ts ändern**.
Verify: `bash scripts/crabbox/iter.sh test:api` grün (kein Nest-DI-Fehler beim Kompilieren der Test-Module) · `bash scripts/crabbox/iter.sh build` erfolgreich
i18n: keine
Doku: keine (intern)
Abhängt von: T8

### T10 — api: AuthGuard setzt die sid-Denylist durch  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.guard.ts`, `apps/api/src/auth/auth.guard.spec.ts` (NEU)
Soll: main.js:79612–79699 (Modul 1203) — Denylist-Check 79677–79683
Änderung: `SessionDenylistService` als dritten Konstruktor-Parameter injizieren. `canActivate` umbauen: verifiziertes Ergebnis zunächst in eine lokale `let user: JWTUser | undefined` schreiben (nicht mehr direkt nach `request.user`); danach `if (user && (await this.sessionDenylistService.isSessionDenied(user.sid)))` → auf nicht-`@Public`-Routen `CustomHttpException(AuthErrorMessages.TokenExpired, HttpStatus.UNAUTHORIZED, 'Session revoked', AuthGuard.name)`, auf `@Public`-Routen `user = undefined` (Request läuft anonym weiter); erst dann `request.user = user; request.token = token;`. Rest (isPublic/no-JWT-Zweig) unverändert.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth.guard'` grün — Spec mit gemocktem `JwtService` + `SessionDenylistService`: gültiger Token + nicht denylisted → `true` und `request.user` gesetzt; gültiger Token + denylisted + geschützte Route → wirft 401; gültiger Token + denylisted + `@Public` → `true`, `request.user` **undefined**; kein Token + geschützt → 401
i18n: keine
Doku: keine (intern)
Abhängt von: T8, T9

### T11 — api: tldraw-WebSocket-Gateway setzt die sid-Denylist durch  [ ]
Komponente: apps/api · Dateien: `apps/api/src/tldraw-sync/tldraw-sync.gateway.ts`, `apps/api/src/tldraw-sync/tldraw-sync.gateway.spec.ts` (NEU)
Soll: main.js:74950–75150 (Modul 1129) — `authenticate` ab 75070, Denylist-Check 75083–75086: nach `jwtService.verifyAsync` und **vor** der Rollen-/Raum-Auflösung `if (await this.sessionDenylistService.isSessionDenied(user.sid)) { client.close(); return {}; }`
Änderung: `SessionDenylistService` als dritten Konstruktor-Parameter (nach `TLDrawSyncService`, `JwtService`) injizieren. In `private async authenticate(...)` (`apps/api/src/tldraw-sync/tldraw-sync.gateway.ts:134`) direkt nach dem `verifyAsync`-Ergebnis (Zeile ~157, vor dem Destructuring von `preferred_username`) den Denylist-Check einfügen: Socket schliessen, leeres Objekt zurückgeben. **Ohne diesen Schritt hat ein abgemeldeter User weiter Live-Zugriff auf Whiteboard-Räume** — die WebSocket-Route läuft nicht über den globalen `AuthGuard`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=tldraw-sync.gateway'` grün — Spec: `isSessionDenied` → `true` ⇒ `client.close()` genau einmal aufgerufen und `tldrawSyncService.getPermittedUsers` **nie**; `isSessionDenied` → `false` ⇒ normale Auflösung
i18n: keine
Doku: keine (intern)
Abhängt von: T8, T9

### T12 — api: Bearer-Token-Extraktion vereinheitlichen + GetBearerSession-Decorator  [ ]
Komponente: apps/api · Dateien: `apps/api/src/common/utils/getBearerTokenFromHeader.ts` (NEU), `apps/api/src/common/utils/getBearerSessionFromRequest.ts` (NEU), `apps/api/src/common/decorators/getBearerSession.decorator.ts` (NEU), `apps/api/src/common/utils/extractToken.ts` (ändern)
Soll: main.js:68406–68413 (`getBearerTokenFromHeader`) · main.js:68370–68377 (`getBearerSessionFromRequest`) · main.js:68337–68341 (`GetBearerSession`) · main.js:79701–79730 (`extractToken` nutzt den Header-Helper)
Änderung: `getBearerTokenFromHeader(request): string | undefined` — `const [scheme, token] = request.headers.authorization?.split(' ') ?? []`, bei `scheme !== BEARER_AUTH_SCHEME || !token` → `undefined`. `getBearerSessionFromRequest(request): JWTUser | undefined` — Token aus dem Header holen; wenn `!tokenFromHeader || tokenFromHeader !== request.token` → `undefined`, sonst `request.user`. **Diese Gleichheitsprüfung ist die Sicherheitsgrenze für `/auth/logout`**: nur ein Token, der über den Authorization-Header kam *und* vom AuthGuard verifiziert wurde, darf eine sid denylisten — sonst könnte ein Query-/Cookie-Token fremde Sessions sperren. Nicht vereinfachen. `GetBearerSession = createParamDecorator((_data, ctx) => getBearerSessionFromRequest(ctx.switchToHttp().getRequest()))`. In `extractToken.ts` den inline-`'Bearer'`-Block (Zeilen ~27–33) durch `getBearerTokenFromHeader(request)` ersetzen; Query- und Cookie-Zweig unverändert.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern="getBearerSessionFromRequest|extractToken"'` grün — Spec: Header-Token == `request.token` ⇒ `request.user`; Header-Token != `request.token` ⇒ `undefined`; Token nur als Query-Param, `request.token` gesetzt ⇒ `undefined`; falsches Schema (`Basic x`) ⇒ `undefined`. Plus Regressions-Assertion, dass `extractToken` Query > Header > Cookie in dieser Reihenfolge weiter bedient.
i18n: keine
Doku: keine (intern)
Abhängt von: T4

### T13 — api: AuthService.revokeSession + logout  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.service.ts`
Soll: main.js:67393–67402 (`logout`) · main.js:67403–67428 (`revokeSession`) · Konstante `KEYCLOAK_INVALID_GRANT_ERROR = 'invalid_grant'` main.js:67342
Änderung: `SessionDenylistService` als fünften Konstruktor-Parameter injizieren (main.js:67350). `async revokeSession(refreshToken?: string): Promise<boolean>` — ohne Token `true`; sonst `POST` an `AUTH_PATHS.AUTH_OIDC_LOGOUT_PATH` über `this.keycloakApi` mit `new URLSearchParams({ client_id, client_secret, refresh_token }).toString()` und Content-Type `APPLICATION_X_WWW_FORM_URLENCODED` → `true`; im catch: bei Axios-Error mit Status 400 **und** `error.response.data?.error === 'invalid_grant'` → `Logger.debug(...)` + `true` (Token war schon ungültig, Session ist de facto weg), sonst `Logger.warn(\`Failed to revoke session: ${error.message}\`, AuthService.name)` + `false`. `async logout(refreshToken: string, session?: JWTUser): Promise<void>` — wenn `session && !session.sid`: `Logger.warn('Verified access token carries no sid, its session cannot be denied and stays usable until it expires', AuthService.name)`; dann `denySession(session?.sid, session?.exp)` und `revokeSession(refreshToken)` (beide awaiten); wenn eines `false` liefert → `CustomHttpException(AuthErrorMessages.LogoutFailed, HttpStatus.INTERNAL_SERVER_ERROR, { isDenied, isRevoked }, AuthService.name)`. Magic string `'invalid_grant'` als Modul-Konstante.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth.service'` grün — Spec mit gemocktem Axios: `revokeSession(undefined)` → `true` ohne HTTP-Call; 400+`invalid_grant` → `true`; 500 → `false`; `logout` ruft `denySession` **und** `revokeSession`; `denySession` → `false` ⇒ 500 mit `AuthErrorMessages.LogoutFailed`
i18n: keine (Key kommt aus T2)
Doku: keine (intern)
Abhängt von: T1, T2, T8, T9

### T14 — api: POST /auth/logout inkl. LogoutRequestDto  [ ]
Komponente: apps/api, libs · Dateien: `libs/src/auth/types/logoutRequest.dto.ts` (NEU), `apps/api/src/auth/auth.controller.ts`
Soll: main.js:68041–68043 (Handler) · main.js:68104–68119 (Decorators) · main.js:68642–68679 (`LogoutRequestDto`)
Änderung: DTO-Klasse mit einem Feld `refresh_token: string`, validiert mit `@IsString()` + `@MinLength(1)` (Muster: `libs/src/auth/types/loginQrSse.dto.ts`), AGPL-SPDX-Header. Controller-Route: `@Public()` + `@Post(AUTH_PATHS.AUTH_LOGOUT)` + `@HttpCode(HttpStatus.NO_CONTENT)` + `@UsePipes(strictValidationPipe)`; Signatur `logout(@Body() body: LogoutRequestDto, @GetBearerSession() session: JWTUser | undefined)` → `this.authService.logout(body.refresh_token, session)`. **`@Public()` ist Absicht** (main.js:68105): ein abgelaufener Access-Token muss die Refresh-Token-Revocation noch erlauben; die Absicherung sitzt im `GetBearerSession`-Decorator aus T12. Nicht in einen geschützten Endpoint umbauen.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth.controller'` grün · `bash scripts/crabbox/iter.sh cmd "grep -n 'AUTH_LOGOUT' apps/api/src/auth/auth.controller.ts"` zeigt die Route · nach `iter.sh deploy` (ask-first): `curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/edu-api/auth/logout -H 'Content-Type: application/json' -d '{}'` == `400` (DTO greift), mit gültigem `refresh_token` == `204`
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T7, T12, T13

### T15 — api: validateTotp (Counter + explizites Fenster) + splitPasswordAndTotp  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.service.ts`
Soll: main.js:67340–67341 (`TOTP_VALIDATION_WINDOW = 1`, `TOTP_SUFFIX_PATTERN = new RegExp(\`:(\\\\d{${AUTH_TOTP_CONFIG.digits}})$\`)`) · main.js:67360–67367 (`validateTotp`) · 67368–67370 (`checkTotp` delegiert) · 67371–67377 (`splitPasswordAndTotp`)
Änderung: Zwei Modul-Konstanten anlegen; das Suffix-Pattern **aus `AUTH_TOTP_CONFIG.digits` bauen** (`libs/src/auth/constants/totp-config.ts`, digits=6), nicht hart. `static validateTotp(token, username, secret): number | null` — `new TOTP({ ...AUTH_TOTP_CONFIG, label: username, secret }).validate({ token, window: TOTP_VALIDATION_WINDOW })`; bei `delta === null` → `null`, sonst `Math.floor(Date.now() / 1000 / AUTH_TOTP_CONFIG.period) + delta` (= der Counter, zu dem der Code gehört). `static checkTotp` bleibt erhalten, delegiert jetzt auf `validateTotp(...) !== null` (Aufrufer `setupTotp` unverändert). `static splitPasswordAndTotp(passwordString): { password: string; token: string | null }` — `TOTP_SUFFIX_PATTERN.exec(...)`; ohne Treffer `{ password: passwordString, token: null }`, sonst `{ password: passwordString.slice(0, match.index), token: match[1] }`. **Ersetzt die `lastIndexOf(':')`-Logik** (auth.service.ts:146–156), die jedes `:` im Passwort als TOTP-Trenner missdeutet hat.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth.service'` grün — Spec: `splitPasswordAndTotp('geheim:123456')` → `{password:'geheim', token:'123456'}`; `'pass:wort:123456'` → `{password:'pass:wort', token:'123456'}`; `'pass:wort'` → `{password:'pass:wort', token:null}`; `'geheim:12345'` (5 Ziffern) → `token: null`; `'geheim:1234567'` → `token: null`. Plus: `validateTotp` mit einem via `otpauth` frisch generierten Code liefert eine Zahl, mit `'000000'` (fremd) `null`, und der zurückgegebene Counter == `Math.floor(now/1000/30)`
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T16 — api: signinOrNull + signinWithSuffixCostParity (Cost-Parity-Dummy-Signins)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.service.ts`
Soll: main.js:67378–67385 (`signinOrNull`) · main.js:67386–67392 (`signinWithSuffixCostParity`)
Änderung: `private async signinOrNull(body, password?)` — `try { return await this.signin(body, password) } catch { return null }`. `private async signinWithSuffixCostParity(body, passwordString)` — `const { password, token } = AuthService.splitPasswordAndTotp(passwordString)`; **wenn `token !== null`, einen zusätzlichen `await this.signinOrNull(body, password)` fahren, dessen Ergebnis verworfen wird**; danach immer `return this.signin(body, passwordString)` (volles Passwort — ein Nicht-MFA-User darf ein Passwort haben, das auf `:123456` endet). Der verworfene Call ist **kein toter Code**: er gleicht die Anzahl der Keycloak-Roundtrips an den MFA-Pfad an, damit die Antwortzeit nicht verrät, ob ein User MFA hat. Im Commit-Body vermerken, damit es kein Reviewer „aufräumt".
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth.service'` grün — Spec mit gespyter `signin`: `signinWithSuffixCostParity(body, 'geheim:123456')` ⇒ `signin` genau **zweimal** aufgerufen (erst `'geheim'`, dann `'geheim:123456'`); `signinWithSuffixCostParity(body, 'geheim')` ⇒ genau **einmal**; wirft der erste Call, wird trotzdem der zweite gefahren und dessen Ergebnis zurückgegeben
i18n: keine
Doku: keine (intern)
Abhängt von: T15

### T17 — api: authenticateUser auf Two-Stage-Login umbauen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.service.ts`
Soll: main.js:67466–67521 (`authenticateUser`) — Projektion 67473, Nicht-MFA/Unbekannt-Pfad 67476–67478, `throwTotpMissing` 67481–67486, Token-fehlt-Pfad 67487–67490, Passwort-Fallback 67491–67499, `throwTotpInvalid` 67500–67506
Änderung: Reihenfolge komplett drehen — **Keycloak-Signin passiert VOR jeder Aussage über TOTP**. (1) `grant_type === AUTH_GRANT_TYPES.REFRESH_TOKEN` → `this.signin(body)` (unverändert). (2) User laden, Projektion auf `'mfaEnabled totpSecret totpLastUsedCounter username email'`. (3) `if (!user || !user.mfaEnabled) return this.signinWithSuffixCostParity(body, passwordString)` — **ein Pfad für unbekannte und für Nicht-MFA-User**, damit die Antwort keinen von beiden verrät. (4) MFA-Pfad: `splitPasswordAndTotp`; lokales `throwTotpMissing = (refreshToken?: string) => { void this.revokeSession(refreshToken); throw new HttpException({ error: AuthErrorMessages.TotpMissing, error_description: AuthErrorMessages.TotpMissing }, HttpStatus.UNAUTHORIZED) }`. (5) `token === null` → erst `await this.signin(body, password)` (Passwort muss stimmen!), dann `throwTotpMissing(tokens.refresh_token)`. (6) sonst `signin(body, password)` in `try`; im `catch (passwordError)` `signinOrNull(body, passwordString)` — greift das, war das vermeintliche Token Teil des Passworts → `throwTotpMissing(fullTokens.refresh_token)`, sonst `throw passwordError`. (7) `validateTotp` → bei `null` `throwTotpInvalid()` (ebenfalls mit `void this.revokeSession(tokens.refresh_token)`), sonst `return tokens`. Die `revokeSession`-Aufrufe sind bewusst `void`/nicht-awaited (main.js:67482/67502/67516) — sie dürfen die Fehlerantwort nicht verzögern. **Der Replay-Claim kommt in T18 dazu.**
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth.service'` grün — Spec: (a) unbekannter User → `signinWithSuffixCostParity`, **keine** DB-MFA-Aussage; (b) MFA-User, richtiges Passwort, kein Token → `signin` wurde aufgerufen, `revokeSession` mit dessen `refresh_token`, Antwort 401 `TotpMissing`; (c) MFA-User, **falsches** Passwort, kein Token → Keycloak-401 propagiert, **kein** `TotpMissing` (kein Orakel); (d) MFA-User, Passwort endet auf `:123456`, gestripptes Signin schlägt fehl, volles gelingt → 401 `TotpMissing` + `revokeSession`; (e) falsches TOTP → 401 `TotpInvalid` + `revokeSession`
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T1, T13, T15, T16

### T18 — api: TOTP-Replay-Schutz über atomar geclaimten totpLastUsedCounter  [ ]
Komponente: apps/api · Dateien: `apps/api/src/users/user.schema.ts`, `apps/api/src/auth/auth.service.ts`
Soll: main.js:11446 + 11493–11496 (`@Prop({ type: Number }) totpLastUsedCounter`) · main.js:67507–67521 (Claim) · main.js:67536 (`$unset` in `setupTotp`) · main.js:67553 (`$unset` in `disableTotp`)
Änderung: (1) `@Prop({ type: Number }) totpLastUsedCounter?: number;` im `User`-Schema zwischen `totpCreatedAt` und `language` ergänzen. (2) In `authenticateUser` nach erfolgreicher `validateTotp` den Counter **atomar claimen**: `const claimed = await this.userModel.findOneAndUpdate({ username, $or: [{ totpLastUsedCounter: { $lt: counter } }, { totpLastUsedCounter: { $exists: false } }] }, { $set: { totpLastUsedCounter: counter } }).lean();` — bei `!claimed` `void this.revokeSession(tokens.refresh_token)` und `HttpException({ error: AuthErrorMessages.TotpAlreadyUsed, error_description: AuthErrorMessages.TotpAlreadyUsed }, HttpStatus.UNAUTHORIZED)`. Der Filter selbst ist die Race-Sperre — **kein** vorheriges `findOne` + Vergleich. Das 2.1.0-`if (experimentalAuth)` (67507) entfällt, der Claim läuft unbedingt. (3) `setupTotp`: `$unset: { totpLastUsedCounter: 1 }` neben das bestehende `$set`. (4) `disableTotp`: `totpLastUsedCounter: 1` in das bestehende `$unset` aufnehmen. **Keine DB-Migration nötig** — das Feld ist optional, `{ $exists: false }` ist im Filter abgedeckt, und der Fork-`User` führt kein `schemaVersion` (2.1.0s einzige User-Migration, main.js:5017–5033, ist das generische `000-add-db-version-number` und hat mit TOTP nichts zu tun).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth.service'` grün — Spec: erster Login mit Code X ⇒ `findOneAndUpdate` liefert ein Dokument, Tokens kommen zurück; zweiter Login mit demselben X ⇒ `findOneAndUpdate` liefert `null` ⇒ 401 `TotpAlreadyUsed` + `revokeSession`; Filter-Assertion, dass **beide** `$or`-Zweige gesetzt sind; `setupTotp`/`disableTotp` unsetzen `totpLastUsedCounter`. Zusätzlich `bash scripts/crabbox/iter.sh build` erfolgreich (Schema kompiliert).
i18n: keine (Key kommt aus T2)
Doku: keine (T34 sammelt)
Abhängt von: T2, T17

### T19 — api: ThrottleGuard auf Multi-Principal (resolvePrincipals/byUsername)  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/common/throttle/throttle.guard.ts`, `apps/api/src/common/throttle/throttle.decorator.ts`, `libs/src/common/types/throttleConfig.ts`, `apps/api/src/common/throttle/throttle.guard.spec.ts`
Soll: main.js:67075–67092 (`resolvePrincipals`) · main.js:67098–67150 (`canActivate`) · main.js:66983–66990 (`Throttle` mit `byUsername`)
Änderung: `ThrottleConfig` um `byUsername: boolean` erweitern; `ThrottleOptions` im Decorator entsprechend, Default `false`. **`enabledEnv` NICHT portieren** (kein Flag, siehe Kopf-Notiz). Modul-Funktion `resolvePrincipals(request, config): string[]` — bei `request.user?.preferred_username` sofort `[authenticatedUsername]`; sonst Array aufbauen: bei `config.byUsername` und `typeof body?.username === 'string'` den getrimmten, lowercase Usernamen als `\`user:${bodyUsername}\`` (leerer String wird verworfen), bei `config.byIp` `\`ip:${request.ip ?? 'unknown'}\``. `canActivate` umbauen: `principals.length === 0` → `true`; `cacheKeys = principals.map(p => \`${p}:${routePath}\`)`; **erst** prüfen, ob *irgendein* Key schon über dem Limit ist (`find`) → 429 mit `X-RateLimit-*`/`Retry-After` und `{ principal: blocked.cacheKey, routePath }` im Detail; **dann** alle Keys hochzählen bzw. anlegen und `minRemaining` über alle Keys bilden (`Math.max(0, minRemaining)` im Header). Eviction-Logik (`MAX_CACHE_SIZE`, `TARGET_SIZE_AFTER_CLEANUP`, `EVICTION_CHECK_INTERVAL`, `insertionCounter`) unverändert lassen. Fehlerkonstante bleibt `CommonErrorMessages.RATE_LIMIT_EXCEEDED` (der Fork hat kein separates `throttleErrorMessages`-Modul; Wert ist identisch zu main.js:67164, `'common.errors.rateLimitExceeded'`) — kein Refactor.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=throttle.guard'` grün — bestehende Specs müssen weiter grün sein; neu: `byUsername`-only-Config drosselt denselben Usernamen von zwei verschiedenen IPs; `byIp`+`byUsername` drosselt sobald *einer* der beiden Zähler voll ist; Usernamen-Normalisierung (`' Alice '` und `'alice'` teilen einen Zähler); `principals.length === 0` (weder byIp noch byUsername, anonym) → `true`
i18n: keine
Doku: keine (intern)
Abhängt von: —

### T20 — api: Throttle auf POST /auth um byUsername erweitern  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/authThrottle.spec.ts`
Soll: main.js:68094 — `Throttle(AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS, { byUsername: true, enabledEnv: ENABLE_EXPERIMENTAL_AUTH })`
Änderung: Die bestehende Decorator-Zeile (auth.controller.ts:78) auf `@Throttle(AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS, { byIp: true, byUsername: true })` ändern. **Abweichung vom Bundle bewusst:** 2.1.0 lässt `byIp` weg — damit wäre ein Angreifer, der Usernamen von einer IP rotiert, ungedrosselt. Beides zusammen ist eine echte Obermenge. `enabledEnv` entfällt (kein Flag). Spec `authThrottle.spec.ts` erweitern.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=authThrottle'` grün — neu: `readConfig('authenticate')?.byUsername === true` **und** `?.byIp === true`; Verhaltenstest, dass 10 Versuche gegen denselben Usernamen von 10 **verschiedenen** IPs den 11. blocken (Password-Spraying-Schutz)
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T19

### T21 — api: AuthenticateRequestDto + whitelistValidationPipe auf POST /auth  [ ]
Komponente: apps/api, libs · Dateien: `libs/src/auth/types/authenticateRequest.dto.ts` (NEU), `apps/api/src/auth/auth.controller.ts`
Soll: main.js:68513–68589 (`AuthenticateRequestDto`)
Änderung: DTO mit `grant_type` (`@IsIn(Object.values(AUTH_GRANT_TYPES))`), `username` (`@ValidateIf(dto => dto.grant_type === AUTH_GRANT_TYPES.PASSWORD)` + `@IsString()` + `@MinLength(1)`), `password` (gleiche Bedingung), `refresh_token` (`@ValidateIf(... === REFRESH_TOKEN)` + `@IsString()` + `@MinLength(1)`), `scope` (`@IsOptional()` + `@IsString()`). Route: `@UsePipes(whitelistValidationPipe)` ergänzen (main.js:68096). **Bewusst `whitelist`, nicht `strict`:** oidc-client-ts sendet `client_id`/`client_secret` etc. mit; `forbidNonWhitelisted` würde jeden Login mit 400 abweisen. Handler-Signatur auf `@Body() body: AuthenticateRequestDto` umstellen; `AuthService.authenticateUser` nimmt weiterhin `AuthRequestArgs` — Typkompatibilität sicherstellen (DTO als strukturell passenden Typ führen, kein `as`-Cast, AGENTS.md: generische Typen statt unsafe casting).
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth.controller'` grün · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei · nach `iter.sh deploy` (ask-first): Login über die UI funktioniert weiterhin (Regression-Gate für die Pipe-Wahl); `curl -X POST $BASE/edu-api/auth -d '{"grant_type":"quatsch"}' -H 'Content-Type: application/json'` == 400
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T1, T7

### T22 — api: TotpSetupBodyDto + strictValidationPipe auf POST /auth/totp  [ ]
Komponente: apps/api, libs · Dateien: `libs/src/auth/types/totpSetupBody.dto.ts` (NEU), `apps/api/src/auth/auth.controller.ts`
Soll: main.js:68681–68725 (`TotpSetupBodyDto`) · main.js:68131–68133 (Route mit `strictValidationPipe`)
Änderung: DTO mit `totp: string` und `secret: string`, beide `@IsString()` + `@MinLength(1)`. Handler `setupTotp` von `@Body() body: { totp: string; secret: string }` (auth.controller.ts:90) auf das DTO umstellen und `@UsePipes(strictValidationPipe)` ergänzen. Hier ist `strict` richtig — die Route hat einen geschlossenen, selbst definierten Body.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth.controller'` grün · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/api/tsconfig.app.json --noEmit'` fehlerfrei
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T7

### T23 — api: QrLoginSessionService (Single-Use-Session + Subscriber-Token)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/qr-login-session.service.ts` (NEU), `apps/api/src/auth/qr-login-session.service.spec.ts` (NEU), `apps/api/src/auth/auth.module.ts`
Soll: main.js:67712–67783 (Modul 1017) — `buildCacheKey` 67749 · `create` 67752–67758 · `verifySubscriber` 67759–67765 · `consume` 67766–67773
Änderung: `@Injectable()`-Service mit `@Inject(CACHE_MANAGER)`. `static buildCacheKey(sessionId) => \`${QR_LOGIN_SESSION_CACHE_PREFIX}${sessionId}\``. `create(): Promise<{ sessionId: string; subscriberToken: string }>` — `randomUUID()` aus `node:crypto` für die sessionId, `randomBytes(QR_LOGIN_SUBSCRIBER_TOKEN_BYTES).toString('hex')` für den Token, `cacheManager.set(key, { subscriberToken }, QR_LOGIN_SESSION_TTL_MS)`. `verifySubscriber(sessionId, subscriberToken?): Promise<boolean>` — State laden; ohne State oder ohne nicht-leeren String-Token `false`; sonst `compareSecretsConstantTime(state.subscriberToken, subscriberToken)`. `consume(sessionId): Promise<boolean>` — State laden, ohne State `false`, sonst `cacheManager.del(key)` und `true` (**Single-Use**: ein abgefangener QR-Code lässt sich nicht zweimal einlösen). Service in `AuthModule.providers` **und** `exports` (das SSE-Modul braucht ihn in T26). Typ für den State als eigenes Interface/Typ in `libs/src/auth/types/`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=qr-login-session'` grün — Spec gegen `cache-manager.mock.ts`: `create` erzeugt eine UUID (Regex aus T6) und einen 64-Zeichen-Hex-Token, `set` mit TTL `QR_LOGIN_SESSION_TTL_MS`; `verifySubscriber` mit richtigem Token → `true`, mit falschem gleicher Länge → `false`, mit `undefined`/`''` → `false`, ohne State im Cache → `false`; `consume` löscht und liefert `true`, zweiter Aufruf → `false`
i18n: keine
Doku: keine (intern)
Abhängt von: T3, T5, T9

### T24 — api: AuthService.createQrLoginSession  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.service.ts`
Soll: main.js:67584–67586 (`createQrLoginSession`) · Konstruktor-Injektion main.js:67350 (`qrLoginSessionService` als dritter Parameter)
Änderung: `QrLoginSessionService` injizieren und `createQrLoginSession()` durchreichen (`return this.qrLoginSessionService.create()`). Parameterreihenfolge des Konstruktors an 2.1.0 angleichen (`userModel, sseService, qrLoginSessionService, globalSettingsService, sessionDenylistService`) — betrifft nur die Testmodule.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth'` grün · `bash scripts/crabbox/iter.sh build` erfolgreich
i18n: keine
Doku: keine (intern)
Abhängt von: T13, T23

### T25 — api: POST /auth/qr-session mit httpOnly/SameSite=strict/pfad-gebundenem Cookie  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.controller.ts`
Soll: main.js:68064–68074 (Handler) · main.js:68188–68210 (Decorators)
Änderung: Route `@Public()` + `@Post(AUTH_PATHS.AUTH_QR_SESSION)` + `@Throttle(AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_TTL_MS, { byIp: true })` + `@UseGuards(ThrottleGuard)`; Signatur `async createQrLoginSession(@Res({ passthrough: true }) res: Response)`. Aus `authService.createQrLoginSession()` `{ sessionId, subscriberToken }` holen, dann `res.cookie(\`${QR_LOGIN_TOKEN_COOKIE_PREFIX}${sessionId}\`, subscriberToken, { httpOnly: true, secure: process.env.NODE_ENV !== 'development', sameSite: 'strict', path: QR_LOGIN_COOKIE_PATH, maxAge: QR_LOGIN_SESSION_TTL_MS })` und **nur `{ sessionId }`** zurückgeben — der Token verlässt den Server nie im Body. **Abweichung vom Bundle:** 2.1.0 setzt hier `Throttle(...)` ohne Optionen (main.js:68191); da `resolvePrincipals` für anonyme Requests dann `[]` liefert, ist der Throttle dort wirkungslos — wir setzen `{ byIp: true }`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth.controller'` grün — Spec: `res.cookie` wird mit `httpOnly: true`, `sameSite: 'strict'`, `path === QR_LOGIN_COOKIE_PATH`, `maxAge === QR_LOGIN_SESSION_TTL_MS` aufgerufen; der Rückgabewert enthält **kein** `subscriberToken`; Throttle-Config der Methode hat `byIp === true`. Nach `iter.sh deploy` (ask-first): `curl -i -X POST $BASE/edu-api/auth/qr-session` zeigt `Set-Cookie: qr-login-token-<uuid>=...; Path=/edu-api/sse/auth; HttpOnly; SameSite=Strict`
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T3, T24

### T26 — api: SSE-Login-Kanal verlangt den Subscriber-Token  [ ]
Komponente: apps/api · Dateien: `apps/api/src/sse/sse.controller.ts`, `apps/api/src/sse/sse.module.ts`, `apps/api/src/sse/sse.controller.spec.ts`
Soll: main.js:74176–74184 (Handler `publicLoginSse`) · main.js:74216–74229 (Decorators, `@Query('sessionId', UuidPipe)` + `@Req()`)
Änderung: `QrLoginSessionService` in den `SseController` injizieren (`SseModule` muss `AuthModule` importieren — das exportiert ihn seit T23). `publicLoginSse` auf `async` umstellen und um `@Req() req: Request` erweitern; `sessionId` durch die `UuidPipe` schleusen. Im Handler: `const token = parse(req.headers.cookie || '')[\`${QR_LOGIN_TOKEN_COOKIE_PREFIX}${sessionId}\`]` (`cookie` ist bereits Dependency, `package.json:116`), dann `await this.qrLoginSessionService.verifySubscriber(sessionId, token)`; bei `false` `CustomHttpException(AuthErrorMessages.Forbidden, HttpStatus.FORBIDDEN, { sessionId }, SseController.name)`. Erst danach `this.sseService.subscribe(\`${LOGIN_SESSION_SSE_CHANNEL_PREFIX}${sessionId}\`, res)`. **Ohne diesen Schritt kann jeder, der eine sessionId errät oder mitliest, den Login-Kanal abhören und die durchgereichten Credentials mitlesen.** Die bereits gelandete Kanal-Namespacing-/Doppel-Subscriber-Logik nicht anfassen.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=sse.controller'` grün — Spec: kein Cookie → 403 und `sseService.subscribe` **nie** aufgerufen; falscher Token → 403; richtiger Token → `subscribe` mit `login-session:<uuid>`; `sessionId` kein UUID → 400 aus der Pipe
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T6, T23, T25

### T27 — api: loginViaApp konsumiert die Session einmalig + UuidPipe + DTO-Härtung  [ ]
Komponente: apps/api, libs · Dateien: `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.controller.ts`, `libs/src/auth/types/loginQrSse.dto.ts`
Soll: main.js:67587–67597 (`loginViaApp` mit `consume`) · main.js:68075–68077 + 68211–68227 (Route mit `strictValidationPipe` und `@Query('sessionId', UuidPipe)`) · main.js:68763–68800 (`LoginViaAppBodyDto`)
Änderung: In `AuthService.loginViaApp` nach dem bestehenden `getUserConnection`-Check ein `const isSessionConsumed = await this.qrLoginSessionService.consume(sessionId)` einziehen; bei `false` `CustomHttpException(UserErrorMessages.NotFoundError, HttpStatus.NOT_FOUND)`. Erst danach `sendEventToUser`. Methode wird `async`. Controller: `@UsePipes(strictValidationPipe)` ergänzen und `@Query('sessionId', UuidPipe) sessionId: string` — damit entfällt der handgeschriebene `if (!sessionId) throw ...`-Block (auth.controller.ts:121–122); die Pipe deckt das ab. `LoginQrSseDto` **wiederverwenden** statt ein `LoginViaAppBodyDto` neu anzulegen (AGENTS.md: erst suchen) und um `@MinLength(1)` auf beiden Feldern ergänzen, damit es dem Bundle-DTO entspricht.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx nx run api:test --testPathPattern=auth'` grün — Spec: erster `loginViaApp`-Aufruf sendet das SSE-Event, zweiter mit derselben sessionId → 404 und **kein** zweites Event; `sessionId` kein UUID → 400; leerer `username` im Body → 400
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T6, T7, T23

### T28 — FE: Two-Stage-Login — TOTP-Feld aus der 401-Antwort statt aus der Vorab-Abfrage  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/pages/LoginPage/LoginPage.tsx`, `apps/frontend/src/pages/LoginPage/useAuthErrorHandler.ts`
Soll: **Nicht aus dem Bundle rekonstruierbar** — nur die API ist un-minifiziert. Fork-Eigenentwurf gegen den in T17 gebauten Contract (401 `auth.errors.TotpMissing` nach erfolgreicher Passwortprüfung, 401 `auth.errors.TotpInvalid`/`auth.errors.TotpAlreadyUsed` danach).
Änderung: `handleCheckMfaStatus` (LoginPage.tsx:256–263) ersatzlos streichen; das Formular submittet direkt `onSubmit` (Zeile 386: `form.handleSubmit(onSubmit)` statt der Verzweigung). Im QR-Pfad (LoginPage.tsx:222–224) den `getTotpStatus`-Aufruf durch ein direktes `form.handleSubmit(onSubmit)()` ersetzen. In `useAuthErrorHandler` **vor** dem generischen `form.setError`-Zweig: enthält `authError.message` den Key `AuthErrorMessages.TotpMissing`, dann kein Form-Fehler, sondern ein Callback `onTotpRequired()` — LoginPage setzt daraufhin `setIsEnterTotpVisible(true)` und `setShowQrCode(false)`. Die Fehlerkeys `TotpInvalid`/`TotpAlreadyUsed` laufen weiter in den normalen Fehlerpfad (sichtbar im TOTP-Schritt). `onSubmit` selbst bleibt unverändert — es hängt `:${totpValue}` schon heute an, sobald `isEnterTotpVisible || totpValue` (Zeile 109). Keine Kommentare im Code, `cn()` für classNames, Hooks oben importieren.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` fehlerfrei (**Pflicht** — eslint+vitest verdecken fehlende Required-Props) · `bash scripts/crabbox/iter.sh test:frontend` grün · neue Vitest-Spec `LoginPage`/`useAuthErrorHandler`: Fehler mit `auth.errors.TotpMissing` ⇒ `onTotpRequired` gerufen und **kein** `form.setError('password', ...)`; Fehler mit `auth.errors.TotpInvalid` ⇒ `form.setError` gerufen
i18n: keine (Keys existieren bzw. kommen aus T2)
Doku: keine (T34 sammelt)
Abhängt von: T17

### T29 — FE: getTotpStatus aus dem Store entfernen  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/store/UserStore/createTotpSlice.ts`, `apps/frontend/src/pages/LoginPage/LoginPage.tsx`
Soll: Fork-Eigenentwurf (Folge der T30-Entscheidung, kein Bundle-Anker — 2.1.0 lässt die Route unter dem Flag nur 404 laufen, wir löschen sie)
Änderung: Die Store-Methode `getTotpStatus` (createTotpSlice.ts:58–76) samt Typdeklaration im Slice-Interface löschen; den Import/Destructuring in LoginPage.tsx:73 entfernen. Nach T28 hat sie keinen Aufrufer mehr — vorher per `grep -rn "getTotpStatus" apps/frontend/src` verifizieren, dass die Trefferliste leer ist. `apps/api/src/mobileAppModule` bleibt unangetastet (eigener, authentifizierter Endpoint).
Verify: `bash scripts/crabbox/iter.sh cmd 'grep -rn "getTotpStatus" apps/frontend/src libs/src'` liefert keine Treffer · `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` fehlerfrei · `bash scripts/crabbox/iter.sh test:frontend` grün
i18n: keine
Doku: keine
Abhängt von: T28

### T30 — api: GET /auth/totp/:username löschen (Enumerations-Orakel)  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.controller.spec.ts`, `apps/api/src/auth/authThrottle.spec.ts`
Soll: main.js:68050–68056 + 68146–68157 — 2.1.0 lässt die Route bestehen und wirft unter aktivem Flag `NotFoundError`. Da wir kein Flag führen (Kopf-Notiz), ist eine Route, die immer 404 liefert, toter Code → **löschen**.
Änderung: Handler `getTotpInfo` (auth.controller.ts:94–100) samt `@Public()`, `@Throttle`, `@UseGuards(ThrottleGuard)` entfernen. `AuthService.getTotpInfo` **bleibt** (authentifizierter `mobileApp`-Konsument, `apps/api/src/mobileAppModule/mobileApp.service.ts:86`). In `auth.controller.spec.ts` `'getTotpInfo'` aus `PUBLIC_ROUTES` (Zeile 23) und aus dem `mockAuthService` entfernen; in `authThrottle.spec.ts` die `getTotpInfo`-Fälle (Zeilen 30, 42) streichen. **Reihenfolge zwingend nach T28/T29** — davor bricht jeder MFA-Login.
Verify: `bash scripts/crabbox/iter.sh test:api` grün · `bash scripts/crabbox/iter.sh cmd "grep -rn 'AUTH_CHECK_TOTP}/:username' apps/api/src/auth/auth.controller.ts"` zeigt nur noch das `@Put` (`disableTotpForUser`) · nach `iter.sh deploy` (ask-first): `curl -o /dev/null -w '%{http_code}' $BASE/edu-api/auth/totp/irgendwer` == `404`
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T28, T29

### T31 — FE: QR-Login-Session vom Server beziehen  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/store/UserStore/createQrCodeSlice.ts`, `apps/frontend/src/pages/LoginPage/LoginPage.tsx`
Soll: **Nicht rekonstruierbar** (kein FE-Bundle) — Fork-Eigenentwurf gegen `POST /auth/qr-session` aus T25.
Änderung: Im Store (nicht in der Komponente, AGENTS.md) eine Methode `createQrLoginSession: () => Promise<string | undefined>` ergänzen, die per `eduApi.post<{ sessionId: string }>(\`${AUTH_PATHS.AUTH_ENDPOINT}/${AUTH_PATHS.AUTH_QR_SESSION}\`)` die Session anlegt und `data.sessionId` liefert; Fehler über `handleApiError`. In `handleCancelOrToggleQrCode` (LoginPage.tsx:271–279) `getRandomUUID()` durch den Store-Aufruf ersetzen (`async`), `setSessionID` erst mit der Server-Antwort setzen und `setShowQrCode(true)` nur bei Erfolg. Der `EventSource`-Aufruf (Zeile 200) und der QR-Value (Zeile 327) bleiben unverändert — sie benutzen nur die neue sessionId. Der Import `getRandomUUID` in LoginPage entfällt, sofern kein weiterer Nutzer in der Datei (die Util selbst bleibt, andere Seiten nutzen sie). Same-Origin: das `Set-Cookie` wird vom Browser gespeichert und vom `EventSource` auf `/edu-api/sse/auth` automatisch mitgeschickt — **kein** `withCredentials` nötig, aber im Verify gegen den echten Stack prüfen.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` fehlerfrei · `bash scripts/crabbox/iter.sh test:frontend` grün — Spec: Toggle ruft `createQrLoginSession` und setzt die zurückgegebene sessionId; bei Fehler bleibt `showQrCode` false. Voll-Stack (ask-first, `iter.sh deploy`): QR-Login zwischen zwei Geräten läuft durch; ein zweiter Browser, der dieselbe sessionId am SSE-Endpoint abonniert, bekommt 403
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T25, T26, T27

### T32 — FE: Logout ruft POST /auth/logout  [ ]
Komponente: apps/frontend · Dateien: `apps/frontend/src/store/UserStore/createUserSlice.ts`, `apps/frontend/src/hooks/useLogout.tsx`
Soll: **Nicht rekonstruierbar** (kein FE-Bundle) — Fork-Eigenentwurf gegen `POST /auth/logout` aus T14.
Änderung: In `createUserSlice.logout` (Zeile 47–51) **vor** dem `set({ isAuthenticated: false })` den Refresh-Token an die API schicken: `eduApi.post(AUTH_PATHS.AUTH_LOGOUT_ENDPOINT, { refresh_token: refreshToken })`, Fehler mit `handleApiError` schlucken (ein fehlgeschlagener Server-Logout darf den lokalen Logout **nicht** blockieren — der User muss immer rauskommen). Der Refresh-Token kommt aus dem oidc-Kontext; da der Store keinen `useAuth`-Zugriff hat, den Token als Parameter durchreichen: `logout: (refreshToken?: string) => Promise<void>` und in `useLogout.tsx:49` `await logout(auth.user?.refresh_token)`. Der bestehende `silentLogout()`-Aufruf (Keycloak-Formular-Logout) bleibt — er beendet die Browser-SSO-Session, der neue Call widerruft Refresh-Token + sid serverseitig; beides ist nötig.
Verify: `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` fehlerfrei · `bash scripts/crabbox/iter.sh test:frontend` grün — Spec: `logout(token)` postet auf `auth/logout`; wirft der Post, wird trotzdem `isAuthenticated: false` gesetzt. Voll-Stack (ask-first): nach Logout liefert ein zuvor kopierter Access-Token auf einer geschützten Route `401` (statt bis zum `exp` weiter zu funktionieren) — das ist der eigentliche Beweis für T10
i18n: keine
Doku: keine (T34 sammelt)
Abhängt von: T14

### T33 — api: Auth-Contract-Specs auf den neuen Routenstand ziehen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/auth/auth.controller.spec.ts`, `apps/api/src/auth/authThrottle.spec.ts`
Soll: Ergebnis von T14/T20/T25/T30 — die Spec ist das Bypass-Regressionsnetz (siehe `p1-port-api-specs-ci`, `check-spec-coverage` im pre-commit + CI)
Änderung: `PUBLIC_ROUTES` auf den Endstand setzen: `['authconfig', 'authenticate', 'logout', 'createQrLoginSession', 'loginViaApp']`; `PROTECTED_ROUTES` auf `['getQrCode', 'setupTotp', 'disableTotp', 'disableTotpForUser']`. `mockAuthService` um `logout` und `createQrLoginSession` ergänzen, `getTotpInfo` entfernen. Provider für `QrLoginSessionService`/`SessionDenylistService` im Testmodul mocken. In `authThrottle.spec.ts` die Route-Liste auf `['authenticate', 'createQrLoginSession']` ziehen und für beide `limit`/`ttl` sowie `byIp` prüfen, für `authenticate` zusätzlich `byUsername`. Eine explizite Negativ-Assertion ergänzen, dass **keine** weitere Controller-Methode `@Public()` trägt (Auth-Bypass-Gate).
Verify: `bash scripts/crabbox/iter.sh test:api` grün · `bash scripts/crabbox/iter.sh cmd 'npm run check-spec-coverage'` grün
i18n: keine
Doku: keine
Abhängt von: T14, T20, T25, T30

### T34 — Doku: Spec, ADR zur Flag-Entscheidung, Security-Doku  [ ]
Komponente: docs · Dateien: `docs/features/p6-auth-hardening.md` (NEU), `docs/adr/0003-no-experimental-auth-flag.md` (NEU), `docs/security/auth-hardening.md` (NEU)
Soll: Die in diesem Paket getroffenen Entscheidungen + die Bundle-Anker aus T1–T33
Änderung: (1) **Spec** `docs/features/p6-auth-hardening.md`: Ausgangslage (Fork = 2.0.200-treu), die fünf Angriffsflächen (Enumeration/TOTP-Orakel vor Passwortprüfung, TOTP-Replay, kein Server-Logout, Single-Principal-Throttle, ungeschützter QR-Kanal), die gebaute Lösung je Fläche mit `main.js`-Ankern, und die Kennzeichnung von T28–T32 als Fork-Eigenentwurf. (2) **ADR 0003**: „Kein `ENABLE_EXPERIMENTAL_AUTH`" — Kontext (2.1.0 stellt Replay-Schutz, `byUsername`-Throttle und das TOTP-Route-404 unter ein default-aus-Flag), Entscheidung, Begründung (siehe Kopf-Notiz), Konsequenzen (Route gelöscht statt 404; `isExperimentalAuthEnabled`/`enabledEnv` nicht portiert; keine neue Env im Installer). Nummerierung prüfen — `docs/adr/` hat aktuell zwei `0001-*` und ein `0002-*`. (3) **Betriebsdoku** `docs/security/auth-hardening.md` (DE): der neue Login-Flow als Ablauf, was Admins am Support-Desk sehen werden (`TotpAlreadyUsed` beim Doppel-Login im 30s-Fenster), die Redis-Abhängigkeit von sid-Denylist und QR-Session (fällt Redis aus, ist die Denylist fail-open — bewusst, damit kein Ausfall alle User aussperrt), und die bewussten Abweichungen vom Bundle inkl. des `qr-session`-Throttle-Bugs.
Verify: `bash scripts/crabbox/iter.sh cmd 'npm run check-external-references'` grün (keine toten Links) · `bash scripts/crabbox/iter.sh cmd "grep -c 'main.js:' docs/features/p6-auth-hardening.md"` ≥ 15 (jeder Baustein hat seinen Anker) · Review: die ADR nennt Kontext, Entscheidung, Begründung und Konsequenzen
i18n: keine (Betriebsdoku folgt dem `docs/observability.md`-Muster: DE reicht, kein Locale-Fächer)
Doku: —
Abhängt von: T33

---

**Phasenende — nicht autonom fahren:**
- `[?] human-gate: Voll-Stack-Auth-Verifikation` — `iter.sh deploy` gegen den echten LMN + manuelle Runde: (a) Login ohne MFA, (b) Login mit MFA über beide Stufen, (c) denselben TOTP-Code sofort erneut einlösen ⇒ `TotpAlreadyUsed`, (d) falsches Passwort bei MFA-User ⇒ **kein** `TotpMissing`, (e) Logout, danach kopierter Access-Token ⇒ 401 auf `/edu-api/users/...` **und** Whiteboard-WebSocket schliesst, (f) QR-Login zwischen zwei Geräten, (g) zweiter Browser auf derselben sessionId ⇒ 403. Ohne (c)/(e) ist das Paket nicht abgenommen.
- `[?] human-gate: Keycloak-Brute-Force-Settings prüfen` — T17 erzeugt pro fehlgeschlagenem MFA-Login 1–2 zusätzliche Keycloak-Roundtrips. Realm-Einstellung `bruteForceProtected`/`failureFactor` gegen die neue Aufrufzahl abgleichen, sonst sperrt Keycloak Accounts früher als bisher.
- `[?] human-gate: Draft-PR` — `git push` + `gh pr create` (nur `linuxmuster-ui`, kein Installer-Anteil; es kommt **keine** neue Env dazu).
