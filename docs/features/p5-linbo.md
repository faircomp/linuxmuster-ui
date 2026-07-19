# P5 — Linbo (Imaging) · Feature-Spec

> Kalibrierungs-Notiz (P5): Dies ist ein **geerdetes Rekonstruktions-Ledger**, kein wochengenauer
> Sprint-Plan. Linbo hängt an `p2-chat` (Piloten-Muster für lmn-api-Proxy-Module) und an der
> P0-Basis-Drift-Analyse. Die Task-Granularität unten steht solide auf dem echten `main.js`-Code,
> aber die endgültige Reihenfolge/Bündelung schärft sich nach dem Chat-Piloten. Der Nachbau ist
> **rein Backend** — es gibt in 2.0 (soweit aus dem API-Image + 1.6-Frontend + appconfig sichtbar)
> **keine dedizierte edulution-Frontend-Seite** für Imaging (siehe Offene Fragen).

## Problem / Motivation

edulution 2.0.200 führt ein neues Backend-Modul **Linbo** ein: einen dünnen, aber sorgfältig
gebauten HTTP-Proxy vor der LINBO-Imaging-Schnittstelle von `linuxmuster-api7`. Es kapselt
Systemstatus, Delta-Sync für Clients, Server-Netzinfo, Host-Abfragen per MAC, GRUB-/`start.conf`-
Auslieferung, DHCP-Export (ISC + dnsmasq), das **Image-Manifest** sowie **Upload** und **gestreamten
Download** von Image-Dateien (potenziell viele GB). In der Fork-Basis v1.6.266 existiert **kein**
Linbo-Modul — nur Randspuren (`LINBO_DEVICE_GROUPS_PREFIX = '/d_'` in `groups.service`, LMN-User-
Info-Flags `lm:linbo:*`, Versions-Felder `linuxmuster-linbo7`). Das gesamte Modul ist ein
**Voll-Nachbau aus 2.0**.

Motivation für den Fork: LINBO-Imaging ist Kern-Schulinfrastruktur (Client-Rechner klonen/verteilen);
ohne dieses Modul fehlt der Verwaltungs-Proxy zwischen edulution-Frontend/CLI und `linuxmuster-api7`.

## Ziel & Nicht-Ziele (YAGNI)

**Ziel**
- `LinboController` (11 Routen) + `LinboService` als lmn-api-Proxy, funktionsgleich zu 2.0.200,
  registriert im bestehenden `LmnApiModule`.
- Vollständige DTO-Fläche (17 DTO-Klassen) mit Swagger-Contract.
- Die zwei Guardrail-relevanten Bausteine mit-portieren: **`SafePathSegmentPipe`** (Path-Traversal-
  Schutz auf den Download-Params) und die **JWT-Auth** (globaler Guard, kein `@Public`).
- Die für Fidelity nötige **Request-Queue-Erweiterung**: typisierter Upstream-Fehler
  (`LmnApiQueueUpstreamError`) für 4xx-Weiterreichung über die BullMQ-Grenze **und**
  `paramsSerializer: { indexes: null }` (repeated `?id=` statt `id[0]=` für `startconfs`).
- i18n DE+EN für die 10 neuen `lmnApi.errors.*`-Keys.

**Nicht-Ziele (bewusst weggelassen)**
- **Kein Frontend-Imaging-Client.** Kein appconfig-Eintrag, kein Sidebar-Item, keine Zustand-Store-
  Seite. (Die granularen `LINBO_*`-Endpoint-Konstanten deuten auf einen 2.0-Frontend-Consumer hin,
  der aber weder im 1.6-Frontend noch in `defaultAppConfig` noch als Baseline-Screenshot vorliegt —
  → Offene Frage, FE deferred.)
- Keine DB-Migration, kein neues Mongoose-Schema (Linbo ist zustandslos, reiner Proxy).
- Keine neue npm-Dependency (multer / `@nestjs/platform-express` / node-`fs`/`https`/`crypto` sind
  bereits im Monorepo).
- Kein `ApiAuth`-Composite-Decorator-Rollout (2.0-weit; hier bewusst `@ApiBearerAuth()` wie 1.6 —
  siehe Trade-offs).
- Keine `devices/list`- / `students-list`-Routen (gehören zum separaten Devices-Modul, out of scope).

## Betroffene Komponenten & Dateien (konkrete Pfade)

**Neu (Modul)**
- `apps/api/src/lmnApi/linbo/linbo.controller.ts` (+ `.spec.ts`)
- `apps/api/src/lmnApi/linbo/linbo.service.ts` (+ `.spec.ts`)
- `apps/api/src/lmnApi/linbo/dto/*.dto.ts` — 17 DTOs:
  `linbo-batch-macs.dto`, `linbo-health-response.dto`, `linbo-server-info-response.dto`,
  `linbo-changes-response.dto`, `linbo-grub-configs-response.dto`, `linbo-grub-config.dto`,
  `linbo-start-confs-response.dto`, `linbo-start-conf.dto`, `linbo-images-manifest-response.dto`,
  `linbo-image-manifest-entry.dto`, `linbo-image-info-sidecar.dto`, `linbo-image-file.dto`,
  `linbo-hosts-query-response.dto`, `linbo-host.dto`, `linbo-upload-image-body.dto`,
  `linbo-upload-image-response.dto`, `linbo-dhcp-isc-export-response.dto`

**Neu (geteilte Infrastruktur, Guardrail)**
- `apps/api/src/common/pipes/safe-path-segment.pipe.ts` (+ `.spec.ts`)
- `libs/src/common/constants/safePathSegmentPattern.ts`
- `apps/api/src/lmnApi/queue/lmn-api-queue-upstream.error.ts` (Fehlerklasse + `LMN_QUEUE_UPSTREAM_PREFIX`)

**Geändert (additiv)**
- `apps/api/src/lmnApi/lmnApi.module.ts` — `LinboController`/`LinboService` in `controllers`/`providers`.
- `apps/api/src/lmnApi/queue/lmn-api-request.queue.ts` — `paramsSerializer`, Fehler-Wrapping (4xx →
  `UnrecoverableError(LmnApiQueueUpstreamError.encode)`; 5xx → retrybarer `Error`), `enqueue`-`tryParse`.
- `libs/src/lmnApi/constants/lmnApiEndpoints.ts` — `LINBO_LMN_API_ENDPOINT = 'linbo'`.
- `libs/src/lmnApi/constants/lmnApiEduApiEndpoints.ts` — `LINBO` (Basis, vom Controller genutzt) +
  granulare `LINBO_*`-Keys (Contract-Parität).
- `libs/src/lmnApi/types/lmnApiErrorMessage.ts` — 10 neue Enum-Einträge.
- `libs/src/common/types/http-methods.ts` — `HTTP_HEADERS.ContentRange` ergänzen (fehlt in 1.6).
- `apps/frontend/src/locales/{de,en,fr}/translation.json` — `lmnApi.errors.*` (10 Keys).
- `apps/api/.env.default` — `LMN_API_TIMEOUT_MS`, `LMN_API_BINARY_TIMEOUT_MS`, `LINBO_MAX_UPLOAD_BYTES`.

## Quelle des Solls

Kein `upstream/*`-Rescue-Branch für Linbo vorhanden, keine Baseline-Screenshots (BE-only). Primär-
und einzige Quelle ist das un-minifizierte API-Image `main.js`:

| Baustein | main.js-Zeilenanker |
|---|---|
| `LinboController` (Klasse + 11 Routen-Dekoratoren) | `16922`–`17264` |
| Route-Konstanten (`LINBO_ROUTE`, `SCHOOL_QUERY_PARAM`, `LINBO_MAX_UPLOAD_BYTES`) | `16950`–`16956` |
| `LinboService` (Klasse, `binaryClient`, `withSchool`/`authHeaders`/`mapAxiosError`, alle Methoden) | `17276`–`17516` |
| `FORWARDABLE_CLIENT_STATUSES` | `17274`–`17285` |
| DTOs (Module 304–322) | `17529`–`18557` |
| `SAFE_PATH_SEGMENT_PATTERN` | `18456` |
| `SafePathSegmentPipe` | `18589`–`18603` |
| `LmnApiQueueUpstreamError` + `LMN_QUEUE_UPSTREAM_PREFIX` | `14341`–`14370`, `258`-Modul `14356` |
| Queue-Delta (`paramsSerializer`, `handleJob`-Wrapping, `enqueue`-`tryParse`) | `14172`–`14340` |
| `ApiAuth`-Decorator (Swagger-Composite, referenziert vom Controller) | `11512`–`11513` |
| Endpoint-Konstanten (`LINBO` + granular) | `634`–`671` |
| `LINBO_LMN_API_ENDPOINT = 'linbo'` | `12903` |
| `LmnApiErrorMessage`-Linbo-Keys | `12980`–`12989` |

## Datenmodell / API / Migrationen

**Keine DB-Migration, kein Schema.** Linbo ist zustandslos (reiner Upstream-Proxy). `schemaVersion`
bleibt unberührt.

**Routen (alle unter `/edu-api/lmn-api/linbo`, LMN-Token via Header `x-api-key`):**

| Methode | Pfad | Query/Body | Antwort-DTO | Transport |
|---|---|---|---|---|
| GET | `health` | `?school?` | `LinboHealthResponseDto` | Queue |
| GET | `changes` | `?since=0&school?` | `LinboChangesResponseDto` | Queue |
| GET | `server-info` | — | `LinboServerInfoResponseDto` | Queue |
| POST | `hosts/query` | `LinboBatchMacsDto` (`macs[]`, max 500), `?school?` | `LinboHostsQueryResponseDto` | Queue |
| GET | `grub-configs` | `?school?` | `LinboGrubConfigsResponseDto` | Queue |
| GET | `dhcp/export/isc-dhcp` | `?school?` | `LinboDhcpIscExportResponseDto` | Queue |
| GET | `dhcp/export/dnsmasq-proxy` | `?school?` | `text/plain` (`@Res`) | Queue (responseType text) |
| GET | `startconfs` | `?id=…&id=…&school?` | `LinboStartConfsResponseDto` | Queue (**repeated `id`**) |
| GET | `images/manifest` | — | `LinboImagesManifestResponseDto` | Queue |
| POST | `images/upload` | multipart `file` + `LinboUploadImageBodyDto` | `LinboUploadImageResponseDto` | **binaryClient** (PUT + complete) |
| GET | `images/download/:imageName/:filename` | Params via `SafePathSegmentPipe` | Binär-Stream | **binaryClient** (streamed) |

**Zwei-Transport-Design (wichtig):**
- **JSON-Routen** laufen über die bestehende BullMQ-`LmnApiRequestQueue` (`enqueue`).
- **Upload/Download** umgehen die Queue und nutzen einen dedizierten `axios`-`binaryClient`
  (`LMN_API_BASE_URL`, `rejectUnauthorized:false`, `timeout = LMN_API_BINARY_TIMEOUT_MS ?? 600000`,
  `maxBodyLength/maxContentLength = Infinity`). Grund: mehrere GB können nicht durch Redis/BullMQ
  serialisiert werden. Upload = ein `PUT …/images/upload/:image/:file` (mit `Content-Range`) gefolgt
  von `POST …/images/upload/:image/complete`; danach Byte-Abgleich (`extractUpstreamBytes`).
  Download = `GET …/images/download/:image/:file` als Stream, per `pipeline()` zum Client, mit
  Abbruch-Handling (`AbortController`, `req.on('close')`, `ECONNRESET`/`ERR_STREAM_PREMATURE_CLOSE`).

**Contract-Drift-Prüfungen:**
- API↔DTO↔appconfig: kein appconfig-Eintrag nötig (BE-only). ✔ kein FE-Contract.
- `lmnApiEndpoints.ts` (upstream-Pfad) ↔ `lmnApiEduApiEndpoints.ts` (edu-api-Pfad): beide additiv
  erweitern; Controller nutzt nur `.LINBO` (Basis).
- `LmnApiErrorMessage` ↔ i18n: 10 Enum-Keys ↔ 10 i18n-Keys DE+EN (FR mitgeführt) müssen 1:1 matchen.
- http-methods `HTTP_HEADERS.ContentRange` fehlt in 1.6 → ergänzen (sonst bricht der Upload-Header).

## Auth / Guards (welche mit-portieren)

- **Globaler JWT-Guard** (`APP_GUARD`) schützt alle edu-api-Routen. Der `LinboController` trägt
  **kein** `@Public()` → er erbt den Schutz automatisch. **Das ist die eigentliche Auth** und muss
  beim Nachbau erhalten bleiben (kein `@Public`, kein `@SkipThrottle` o. Ä.).
- Zusätzlich verlangt jede Route den LMN-Token per Header `x-api-key` (`@Headers(HTTP_HEADERS.XApiKey)`),
  der an `linuxmuster-api7` weitergereicht wird — das ist **Upstream-Auth**, nicht der edu-api-Guard.
- In 2.0 dekoriert der Controller zusätzlich mit `@ApiAuth()` (main.js:11512) — ein **reiner Swagger-
  Composite** (`ApiBearerAuth` + `ApiUnauthorizedResponse` + `ApiForbiddenResponse`), **kein** Guard.
  Empfehlung: `@ApiBearerAuth()` (1.6-konsistent) verwenden; `@ApiAuth()` optional (siehe Trade-offs).
- **Guardrail-Spec:** Controller-Spec muss belegen, dass unauthenticated abgewiesen wird und kein
  `@Public` gesetzt ist (Auth-Bypass-Regressionsschutz).

## Externe Integrationen

- **`linuxmuster-api7`** (in crabbox über echten LMN vorhanden): Ziel aller Proxy-Aufrufe unter
  `${LMN_API_BASE_URL}/linbo/*`.
- **LINBO-Subsystem** (`/srv/linbo`, `devices.csv`, `start.conf`, GRUB-Configs, Image-Store): stellt
  `linuxmuster-api7` bereit. Verifizierbarkeit von `images/upload|download` hängt an einem real
  bestückten Image-Store → ggf. **degradiert** verifizieren (siehe Risiken/Verify).

## Secrets / Env / master.key

- **Kein `master.key`-Bezug** (keine gewrappten Passwörter, kein Crypto-State).
- Env (Backend, additiv in `.env.default`, mit Prod-tauglichen Defaults als Kommentar):
  - `LMN_API_BASE_URL` (existiert bereits) — Basis für Queue **und** `binaryClient`.
  - `LMN_API_TIMEOUT_MS` (Default `15000`) — JSON-Queue-Timeout.
  - `LMN_API_BINARY_TIMEOUT_MS` (Default `600000` = 10 min) — Upload/Download-Timeout.
  - `LINBO_MAX_UPLOAD_BYTES` (Default `107374182400` = 100 GiB) — multer-Obergrenze.
- Keine neuen Keycloak-Realm-Änderungen, keine ghcr-Refs, keine Companion-Images.

## Trade-offs & Alternativen (mit Empfehlung)

1. **`@ApiBearerAuth()` vs. `@ApiAuth()`-Composite.** 2.0 nutzt `@ApiAuth()` (Swagger-Doku-Wrapper mit
   `error_response_dto`). *Empfehlung:* für Linbo `@ApiBearerAuth()` (1.6-konsistent, keine
   Cross-Cutting-Abhängigkeit zu `error_response_dto`/globalem Decorator-Rollout). `@ApiAuth()`-Port
   ist ein eigenes, modulübergreifendes Paket. **Sicherheit identisch** (Guard ist global).
2. **DTO-Standort `apps/api/.../linbo/dto` vs. `libs/src/lmnApi/types/linbo`.** 2.0 bündelt die
   Swagger-DTOs beim Controller (API-Bundle). *Empfehlung:* zunächst in `apps/api/.../linbo/dto`
   (BE-only, kein FE-Consumer). Falls später ein FE-Client kommt, die **plain Response-Typen** nach
   `libs` extrahieren. YAGNI: jetzt nicht spekulativ splitten.
3. **Queue-Delta hier vs. eigenes Infra-Paket.** `paramsSerializer` + Upstream-Fehler-Wrapping sind
   **shared** (alle lmn-api-Routen), aber für Linbo-Fidelity **notwendig** (`startconfs`-Array-Param
   und 4xx-Weiterreichung). *Empfehlung:* im Linbo-Paket mitliefern (T5), aber als **eigene, zuerst
   gemergte Task** mit Voll-Stack-Verify wegen Regressions-Radius. Falls ein früheres P-Paket sie
   bereits einführt, wird T5 zum No-op (im Ledger vermerkt).
4. **Upload-Streaming via temp-File vs. Passthrough.** 2.0 speichert per multer `diskStorage` in
   `os.tmpdir()` und streamt dann per `createReadStream` zum Upstream (mit `unlink` im `finally`).
   *Empfehlung:* 1:1 übernehmen (Backpressure + `Content-Range`-Contract des Upstreams). Kein
   In-Memory-Buffering (würde bei 100 GB OOM).

## Risiken & Rollback

- **R-Queue (mittel–hoch):** Das Queue-Delta berührt **alle** lmn-api-Routen. `paramsSerializer:
  { indexes: null }` ändert die Serialisierung von Array-Query-Params global — prüfen, ob eine
  bestehende Route auf Bracket-Serialisierung baut. *Mitigation:* eigene Task + Voll-Stack-Verify +
  Queue-Spec (Fehler-Forwarding 4xx/5xx). *Rollback:* Datei-Revert (kein DB-Zustand).
- **R-Verify-degradiert (mittel):** Ohne real bestückten LINBO-Image-Store lassen sich `upload`/
  `download` nur strukturell testen (Route-Wiring, Pipe, Validierung), nicht end-to-end.
  *Mitigation:* JSON-Routen (`health`/`server-info`/`startconfs`/`grub-configs`/`changes`) gegen
  echtes `linuxmuster-api7` verifizieren; Binär-Routen mit Mock/kleinem Fixture + dokumentierter
  Degradation.
- **R-Path-Traversal (Guardrail):** Download-Params gehen direkt in einen Upstream-Pfad.
  `SafePathSegmentPipe` (Pattern `^(?!\.)(?!.*\.\.)[\p{L}\p{N}\p{M} ._-]{1,200}$/u`) **muss** portiert
  und per Spec belegt sein (`..`, `/`, Control-Chars, leer → 400).
- **R-Kein-Rollback-Problem:** Rein additiv, keine Migration → Rollback = Revert der Commits.

## Doku-Impact (Augenmaß)

- Kurzer Modul-Abschnitt in der internen Modul-Doku: „Linbo = lmn-api-Imaging-Proxy, BE-only, kein
  FE, Zwei-Transport (Queue + binaryClient)". DE+EN nur, falls die Modul-Doku zweisprachig geführt
  wird; sonst intern (DE) genügt.
- `.env.default`-Kommentare für die drei Timeouts/Limits (self-documenting).
- Kein User-facing Doku-Bedarf (kein FE).

## i18n-Impact (DE+EN)

10 neue Keys unter `lmnApi.errors.*` (DE+EN Pflicht, FR mitgeführt):
`GetLinboHealthFailed`, `GetLinboServerInfoFailed`, `GetLinboHostsFailed`, `GetLinboGrubConfigsFailed`,
`GetLinboStartConfsFailed`, `GetLinboImagesManifestFailed`, `GetLinboChangesFailed`,
`UploadLinboImageFailed`, `DownloadLinboImageFailed`, `GetLinboDhcpExportFailed`.

Diese Keys werden vom Backend als `CustomHttpException`-Message zurückgegeben; da kein FE-Consumer
existiert, sind sie primär Contract-/Konsistenz-Keys — trotzdem DE+EN gemäß Guardrail.

## Offene Fragen

1. **Gibt es in 2.0 einen Frontend-Imaging-Client?** Die granularen `LINBO_*`-Endpoint-Konstanten
   (main.js:660–671) haben im API-Bundle **keinen** Consumer und deuten auf einen FE-Client hin, der
   aber weder im 1.6-Frontend noch in `defaultAppConfig` noch als Baseline-Screenshot vorliegt. →
   Vor einem FE-Nachbau am echten 2.0-Frontend-Bundle prüfen (nicht Teil dieses Pakets).
2. **`@ApiAuth()` modulweit portieren?** Wenn ja, als eigenes Infra-Paket (inkl. `error_response_dto`)
   vor P3/P5-Modulen; sonst pro Controller `@ApiBearerAuth()`. Entscheidung außerhalb dieser Task.
3. **DTO-Heimat libs vs. api** — abhängig von Offene Frage 1 (FE-Client ⇒ Response-Typen nach libs).
4. **LINBO-Store in crabbox real bestückt?** Bestimmt, ob `upload`/`download` voll oder degradiert
   verifiziert werden (siehe /test).
5. **Queue-Delta ggf. schon anderweitig eingeführt** (z. B. durch ein Devices-/Pairing-Paket)? Dann
   T5 = No-op; Reihenfolge mit dem tatsächlich zuerst gemergten Paket abstimmen.

## Betrieb & Env-Vars

Linbo ist ein **BE-only lmn-api-Imaging-Proxy** (kein Frontend-Consumer): `LinboController`/
`LinboService` unter `apps/api/src/lmnApi/linbo/`, modulweit in `LmnApiModule` registriert und
über den globalen `AuthGuard` JWT-geschützt. Der Service nutzt **zwei Transporte** — die geteilte
`LmnApiRequestQueue` für JSON-Metadaten (Health, Changes, Manifest, Start-Confs, DHCP-Exports) und
einen eigenen `binaryClient` (axios, Streams) für Image-Upload/-Download.

Konfiguration über `apps/api/.env` (Defaults in `apps/api/.env.default`):

| Env-Var | Default | Wirkung |
|---|---|---|
| `LMN_API_TIMEOUT_MS` | `15000` | Timeout der Queue-JSON-Requests (ms). |
| `LMN_API_BINARY_TIMEOUT_MS` | `600000` | Timeout des `binaryClient` für Upload/Download (ms, 10 min). |
| `LINBO_MAX_UPLOAD_BYTES` | `107374182400` | Obergrenze eines Image-Uploads (Bytes, 100 GiB); darüber `400`. |

Alle drei sind optional — fehlt die Var, greift der jeweilige Default aus dem Code.
