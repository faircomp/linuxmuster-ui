## p7-deps-config-infra [P7] — Dependencies, Konfiguration & Infrastruktur (Soll: 2.1.0)

_Ziel:_ Dependency-Set, Env-Contract, Runtime-Assets und Deploy-Infrastruktur auf 2.1.0 ziehen; CVE-Baseline durch die 2.1.0-Bumps abbauen; LDAPS gegen einen **Standard**-linuxmuster-Server ab Werk im Installer · _Abhängt-von:_ — · _Status:_ geplant (0/30) · _Tasks:_ 30
Branch: `feat/2.0-backlog` · Spec: `docs/features/p7-deps-config-infra.md` · Soll: `.reference/2.1.0/api/main.js` (Zeilenanker je Task) · **Cross-Repo:** `linuxmuster-ui` (T1–T22, T27–T29) + `linuxmuster-ui-installer` (T23–T26, T30)

> **Faktenlage (lokal verifiziert, 2026-07-27):**
> - Das API-Image-`package.json` ist nur die getrimmte Runtime-Liste. Die **maßgebliche** Quelle ist das ins Bundle inlinede Root-`package.json`: `2.0.200` → `main.js:59729`, `2.1.0` → `main.js:79274` (`"version":"2.1.0"`, `engines.node ^22.23.1`, `engines.npm ^10.9.8`).
> - `npm audit --omit=dev` im Fork: **33 HIGH/CRITICAL**, Allowlist kennt 30. `npm run check-npm-audit` ist **rot** (`brace-expansion`, `js-yaml`, `postcss`, `sharp` un-allowlistet); `linkify-it` steht als Karteileiche in der Allowlist.
> - Neu in 2.1.0-Root-Deps: `@ai-sdk/{anthropic,google,openai,openai-compatible}`, `ai`, `pdfkit`, `streamdown`. Entfernt: `docx`, `exceljs`, `pptxgenjs`, `react-helmet-async` (Fork hat alle vier noch).
> - Neue Env in 2.1.0: `AI_*` (8), `DOCKER_SOCKET_PATH`, `SENTRY_{TRACES,PROFILES}_SAMPLE_RATE`, `SENTRY_SEND_DEFAULT_PII`, `EDUI_MAIL_SIEVE_TIMEOUT`, `EDUI_ENABLE_USER_KEY_ENDPOINT`, `ENABLE_EXPERIMENTAL_AUTH`.
> - Neue extendedOption-Keys in 2.1.0 (main.js:2363-2419): `IN_APP_PERMISSION_{CREATE,PARTICIPATE,AI_CHAT}`, `EURO_OFFICE_{URL,JWT_SECRET}`, `CONTACTS_CARDDAV_{BASE_URL,AUTH_MODE,REJECT_UNAUTHORIZED}`, `MAIL_MANAGESIEVE_{HOST,PORT}`.
> - Einziges neues Runtime-Asset: `./data/public/assets/fonts/DejaVuSans{,-Bold}.woff` (main.js:17621-17624).
> - LDAPS-Rezept ist im Repo bereits **empirisch bewiesen** (`scripts/crabbox/deploy.sh:60-81`, Verify-Welle gegen `10.10.40.10`): CA in Keycloaks Truststore + Hostname-Verification aus. Der Installer kann es noch nicht.

---

### T1 — npm-audit-Gate wieder grün: nicht-major Transitiv-Fixes + Karteileiche  [ ]
Komponente: repo-root · Dateien: `package.json`, `package-lock.json`, `scripts/security/npmAuditAllowlist.ts`
Soll: **Kein Bundle-Bezug** — Fork-eigene Gate-Hygiene. Belegt durch `npm audit --omit=dev`: `brace-expansion` (prod 2.0.2, `fixAvailable:true`, non-major), `postcss` (prod 8.5.6 via `tailwindcss` in `dependencies`, `fixAvailable:true`, non-major) sind un-allowlistet HIGH; `linkify-it` steht in der Allowlist, taucht im Audit aber nicht mehr auf.
Änderung: `npm install postcss@^8.5.18` (prod-relevanter Range in `devDependencies` **und** transitiv über `tailwindcss`) und `npm audit fix --omit=dev` gezielt für `brace-expansion` (bzw. `overrides`-Eintrag, falls kein Parent den Fix zieht). Danach den Eintrag `{ package: 'linkify-it', ... }` (npmAuditAllowlist.ts:35) **löschen**. Keine Allowlist-Erweiterung in dieser Task.
Verify: `bash scripts/crabbox/iter.sh cmd 'npm ci && npm run check-npm-audit'` → Ausgabe enthält weder `brace-expansion` noch `postcss`; Restfindings nur noch `js-yaml` + `sharp` (T2/T3). Zusätzlich `bash scripts/crabbox/iter.sh cmd 'npm run test:scripts'` (deckt `checkNpmAudit.spec.ts` ab) grün.
i18n: keine
Doku: `docs/security/accepted-cves.md` — Zeile „30 Pakete" noch NICHT anfassen (Sammel-Resync in T10).
Abhängt von: —

### T2 — `xmlbuilder2` 3 → ^4.0.3 (räumt `js-yaml`-HIGH aus dem Prod-Baum)  [ ]
Komponente: repo-root + apps/frontend · Dateien: `package.json`, `package-lock.json`, `apps/frontend/src/pages/FileSharing/utilities/generateFile.ts`
Soll: **Kein Bundle-Bezug** (2.1.0 hat `xmlbuilder2 ^3.1.1` unverändert) — reiner Security-Fix. Audit: `js-yaml` HIGH, `fixAvailable: {"name":"xmlbuilder2","version":"4.0.3","isSemVerMajor":true}`; Prod-Pfad `node_modules/xmlbuilder2/node_modules/js-yaml 3.14.1`.
Änderung: `xmlbuilder2` auf `^4.0.3`. Einziger Consumer ist `generateFile.ts:24` (`import { create } from 'xmlbuilder2'`) — API-Signatur `create()` prüfen und, falls nötig, minimal anpassen. Kein Refactor des Dokument-Generators.
Verify: `bash scripts/crabbox/iter.sh cmd 'npm ci && npm run check-npm-audit'` → `js-yaml` verschwunden. `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean. `bash scripts/crabbox/iter.sh test:frontend` grün. Ein neuer vitest-Fall in `generateFile.spec.ts` (falls nicht vorhanden: anlegen) assertet, dass die erzeugte XML-Wurzel + Namespace unverändert sind.
i18n: keine
Doku: keine (Sammel-Resync T10)
Abhängt von: T1

### T3 — `sharp` ^0.34.5 → ^0.35.3 (bewusste Divergenz von 2.1.0)  [ ]
Komponente: repo-root · Dateien: `package.json`, `package-lock.json`, `docs/security/accepted-cves.md`
Soll: **Divergenz, nicht Rekonstruktion** — 2.1.0 liefert weiterhin `sharp ^0.34.5` (main.js:79274) und lässt damit die geerbten libvips-CVEs offen. Audit: `sharp <0.35.0` HIGH (CVE-2026-33327 / -33328 / -35590 / -35591), `fixAvailable: 0.35.3, isSemVerMajor:true`.
Änderung: `sharp` auf `^0.35.3`. Consumer im Fork suchen (`grep -rn "from 'sharp'" apps libs`) und Signaturen gegenprüfen (0.35 ändert v. a. Plattform-/Node-Anforderungen, nicht die Bild-API). **Native Binaries:** der Fix zeigt sich erst beim Install/Build, nicht in `tsc`.
Verify: `bash scripts/crabbox/iter.sh cmd 'npm ci && node -e "const s=require(\"sharp\");console.log(s.versions)"'` gibt eine libvips ≥ der gefixten Version aus; `bash scripts/crabbox/iter.sh cmd 'npm run check-npm-audit'` → `sharp` verschwunden; `bash scripts/crabbox/iter.sh build` grün; `bash scripts/crabbox/iter.sh cmd 'docker build -t lmn-api-probe:t3 -f apps/api/Dockerfile .'` läuft durch.
i18n: keine
Doku: In `docs/security/accepted-cves.md` einen Absatz „Bewusste Divergenzen vom 2.1.0-Referenzstand" anlegen und `sharp` als ersten Eintrag führen (Grund: 2.1.0 lässt die libvips-CVEs offen, wir nicht).
Abhängt von: T1

### T4 — `axios` → `^1.16.0` mit Lock ≥ 1.18.1 (räumt den axios-Baseline-Eintrag)  [ ]
Komponente: repo-root · Dateien: `package.json`, `package-lock.json`
Soll: `main.js:79274` (2.1.0-Root: `"axios":"^1.16.0"`); das gebaute 2.1.0-Image löst auf `1.18.1` auf (`.reference/2.1.0/api/package.json:33`). Fork: Range `^1.7.4`, Lock `1.13.5`.
Änderung: Range exakt auf `^1.16.0` (referenztreu) setzen und den Lock per `npm install axios@1.18.1` auf die vom Image ausgelieferte Version ziehen. `^1.16.0` deckt 1.18.1 ab — Referenztreue und CVE-Fix widersprechen sich hier **nicht**.
Verify: `bash scripts/crabbox/iter.sh cmd 'npm ci && node -p "require(\"axios/package.json\").version"'` → `1.18.1`; `bash scripts/crabbox/iter.sh cmd 'npm run check-npm-audit'` → `axios` nicht mehr gemeldet; `bash scripts/crabbox/iter.sh test:api` grün (eduApi/HttpService-Nutzer).
i18n: keine
Doku: keine (Sammel-Resync T10)
Abhängt von: T1

### T5 — NestJS-Familie auf den 2.1.0-Stand (atomar)  [ ]
Komponente: repo-root · Dateien: `package.json`, `package-lock.json`
Soll: `.reference/2.1.0/api/package.json:11-27` (Image-aufgelöste Versionen) gegen `.reference/2.0.200/api/package.json:10-26`: `@nestjs/common|core|platform-express|platform-ws|websockets` 11.1.17/18/21/14 → **11.1.27**, `@nestjs/swagger` 11.2.7 → **11.4.5**, `@nestjs/cache-manager` 3.1.0 → **3.1.3**, `@nestjs/event-emitter` 3.0.1 → **3.1.0**, `@nestjs/jwt` 11.0.1 → **11.0.2**, `@nestjs/config` 4.0.4 (unverändert), `@nestjs/serve-static` 5.0.5 (unverändert). Fork-Locks liegen darunter (core 11.1.9, swagger 11.2.6, config 4.0.3, serve-static 5.0.4).
Änderung: Alle genannten Pakete **in einem `npm install`-Aufruf** auf die 2.1.0-Werte ziehen (Peer-Konsistenz). Ranges bleiben in Fork-Schreibweise (`^11.0.15` etc.), der Lock trägt die Zielversion. Erwartete Wirkung auf die CVE-Baseline: `@nestjs/core`, `@nestjs/config`, `@nestjs/platform-express`, `@nestjs/serve-static`, `@nestjs/swagger` fallen raus; `path-to-regexp` fällt raus, **falls** `express` dabei auf ≥5.2.1 (p-t-r ≥8.4.0) hochgeht — das entscheidet der Gate-Lauf, nicht die Annahme.
Verify: `bash scripts/crabbox/iter.sh cmd 'npm ci && npm ls @nestjs/core @nestjs/swagger @nestjs/config @nestjs/serve-static express path-to-regexp'` (Versionen protokollieren); `bash scripts/crabbox/iter.sh cmd 'npm run check-npm-audit'` — Ausgabe wörtlich ins Ledger übernehmen (welche Einträge WIRKLICH gefallen sind); `bash scripts/crabbox/iter.sh all` grün.
i18n: keine
Doku: keine (Sammel-Resync T10)
Abhängt von: T1

### T6 — `mongoose` / `multer` / `ws` auf den 2.1.0-Stand  [ ]
Komponente: repo-root · Dateien: `package.json`, `package-lock.json`
Soll: `.reference/2.1.0/api/package.json:58,59,70` — `mongoose 8.24.1` (2.0.200: 8.23.1), `multer 2.2.0` (2.0.200: 2.1.1), `ws 8.21.0` (2.0.200: 8.20.1). Fork-Locks: 8.16.0 / 2.0.2 / 8.18.3 — alle drei in den verwundbaren Bereichen (`mongoose 8.0.0-8.24.0`, `multer <=2.1.1`, `ws 8.0.0-8.20.1`).
Änderung: Ranges auf `^8.24.1` / `^2.2.0` / `^8.21.0`, Lock entsprechend. `multer` betrifft alle Upload-Routen (Linbo-Images, Filesharing, Whiteboard-Assets) — Upload-Tests müssen laufen. `mongoose` 8.24.1 fixt u. a. die `$nor`-`sanitizeFilter`-Lücke; Migrations-Suite gegenprüfen.
Verify: `bash scripts/crabbox/iter.sh cmd 'npm ci && npm run check-npm-audit'` → `mongoose`, `multer`, `ws` nicht mehr gemeldet; `bash scripts/crabbox/iter.sh test:api` grün (86 Suites Referenz aus der letzten Verify-Welle); `bash scripts/crabbox/iter.sh build` grün.
i18n: keine
Doku: keine (Sammel-Resync T10)
Abhängt von: T5

### T7 — Restliche Runtime-Deps auf den 2.1.0-Stand (ohne Advisory-Wirkung)  [ ]
Komponente: repo-root · Dateien: `package.json`, `package-lock.json`
Soll: `.reference/2.1.0/api/package.json` vs `.reference/2.0.200/api/package.json`: `@keyv/redis 4.4.1→4.6.0`, `keyv 5.3.4→5.6.0`, `ioredis 5.6.1→5.11.1`, `bullmq 5.58.2→5.79.2`, `dockerode 4.0.7→4.0.12`, `fs-extra 11.3.0→11.3.6`, `imapflow 1.3.1→1.4.3`, `mailparser 3.9.8→3.9.12`, `ldapts 8.1.7→8.1.8`, `mime-types 3.0.1→3.0.2`, `cookie 1.0.2→1.1.1`, `class-validator 0.14.3→0.14.4`, `dayjs 1.11.19→1.11.21`, `fflate 0.8.2→0.8.3`, `oidc-client-ts 3.3.0→3.5.0`, `otpauth 9.4.0→9.5.1`, `tsdav 2.1.8→2.3.0`, `typeorm 0.3.28→0.3.30`, `undici 6.25.0→6.27.0`, `yaml 2.8.3→2.9.0`, `zod 3.25.67→3.25.76`, `@tldraw/sync-core 3.15.4→3.15.6`, `@sentry/nestjs`+`@sentry/profiling-node` 10.41.0→**10.63.0** (Root-`package.json` main.js:79274 sagt `^10.60.0`; Root-Range `^10.60.0`, Lock 10.63.0).
Änderung: In **einem** Commit, Ranges in Fork-Schreibweise, Locks auf die 2.1.0-Werte. `imapflow`/`mailparser` betreffen den Mail-Stack — die p4-mail-Suite muss grün bleiben. `class-validator` 0.14.4 kann Validierungsmeldungen ändern → DTO-Specs prüfen.
Verify: `bash scripts/crabbox/iter.sh cmd 'npm ci'` sauber; `bash scripts/crabbox/iter.sh all` grün (lint + jest + vitest + build:all + i18n); `bash scripts/crabbox/iter.sh cmd 'npm run check-npm-audit'` zeigt keinen NEUEN Eintrag.
i18n: keine
Doku: keine (Sammel-Resync T10)
Abhängt von: T6

### T8 — `fast-xml-parser` + `nodemailer`: Major-Entscheidung  [?]
Komponente: repo-root · Dateien: `package.json`, `docs/security/accepted-cves.md`, `scripts/security/npmAuditAllowlist.ts`
Soll: 2.1.0 **räumt diese beiden nicht ab** — `.reference/2.1.0/api/package.json:44` `fast-xml-parser 4.5.6` (verwundbar `<=5.6.0`, Fix `5.10.1` = semver-major, CRITICAL: Entity-Encoding-Bypass) und `:60` `nodemailer 8.0.11` (verwundbar `<=9.0.0`, Fix `9.0.3` = semver-major, HIGH: `raw`-Option umgeht `disableFileAccess`/`disableUrlAccess` → arbitrary file read / SSRF).
Änderung: **Keine automatische Umsetzung.** Diese Task legt Kevin die Weiche vor: (a) beide auf Major heben (Divergenz zu 2.1.0, Aufwand: XML-Parser-Aufrufe in `apps/api/src/**` + Nodemailer-Transport im Mail-Stack gegenprüfen), oder (b) bis zur Deadline `2026-10-15` in der Allowlist belassen. Belegmaterial in der Task-Notiz: Fork-Locks `fast-xml-parser 4.5.3`, `nodemailer 8.0.11`; Consumer per `grep -rn "fast-xml-parser\|nodemailer" apps libs --include=*.ts` auflisten und die Trefferzahl im Ledger festhalten.
Verify: `bash scripts/crabbox/iter.sh cmd 'grep -rn "fast-xml-parser\|nodemailer" apps libs --include=*.ts | wc -l'` — Zahl im Ledger dokumentiert; keine Code-Änderung, keine Gate-Änderung ohne Kevins Entscheid.
i18n: keine
Doku: Entscheidungs-Vorlage als Abschnitt in `docs/security/cve-track.md` („Offene Majors").
Abhängt von: T7

### T9 — `engines` + Docker-Base auf Node 22.23.1  [ ]
Komponente: repo-root + apps/api + apps/frontend · Dateien: `package.json`, `apps/api/Dockerfile`, `apps/frontend/Dockerfile`, `.github/workflows/build-and-test.yml`, `.github/workflows/container-build.yml`
Soll: `main.js:79274` → `"engines":{"node":"^22.23.1","npm":"^10.9.8"}` (2.0.200: `^22.22.3`/`^10.9.8`). Fork: `^22.21.1`/`^10.9.4`; `apps/api/Dockerfile:1` pinnt `node:22.21.1-alpine3.22@sha256:ef30b8...`.
Änderung: `engines` auf die 2.1.0-Werte. Beide Dockerfile-`FROM` auf `node:22.23.1-alpine3.22@sha256:<digest>` — **Digest auf der Box auflösen, nicht raten**. Workflows nutzen `node-version: 22.x` → bleibt gültig; nur prüfen, dass `Cache Node.js modules` nicht auf einen alten Key zeigt. Dependabot-Docker-Updater braucht weiterhin die `tag@sha256:`-Form (siehe `docs/security/cve-track.md` §1).
Verify: `bash scripts/crabbox/iter.sh cmd 'docker pull node:22.23.1-alpine3.22 && docker inspect --format "{{index .RepoDigests 0}}" node:22.23.1-alpine3.22'` liefert den einzusetzenden Digest; danach `bash scripts/crabbox/iter.sh cmd 'docker build -t lmn-api-probe:t9 -f apps/api/Dockerfile . && docker build -t lmn-ui-probe:t9 -f apps/frontend/Dockerfile .'` beide grün; `bash scripts/crabbox/iter.sh cmd 'npm ci'` ohne `EBADENGINE`.
i18n: keine
Doku: `docs/ci-release.md` — Node-/Base-Image-Stand aktualisieren.
Abhängt von: T7

### T10 — Allowlist + CVE-Register nach der Bump-Welle resyncen  [ ]
Komponente: repo-root · Dateien: `scripts/security/npmAuditAllowlist.ts`, `docs/security/accepted-cves.md`, `docs/security/cve-track.md`
Soll: **Kein Bundle-Bezug** — Bestandsaufnahme nach T1–T7. Ausgangslage war „30 Pakete (26 high, 4 critical), review-by 2026-10-15" (npmAuditAllowlist.ts:17-48, accepted-cves.md).
Änderung: Ein frischer `npm audit --omit=dev --json`-Lauf ist die Wahrheit. Für jedes Paket, das nicht mehr auftaucht, den Allowlist-Eintrag **löschen** (Remediations-Kanal-Regel aus `cve-track.md` §1). Register-Tabelle in `accepted-cves.md` auf die neue Anzahl korrigieren und je entferntem Paket die Ursache benennen (welche Task/welcher Bump). Erwartet — aber der Lauf entscheidet: `axios`, `@nestjs/{core,config,platform-express,serve-static,swagger}`, `mongoose`, `multer`, `ws`, `linkify-it`, ggf. `path-to-regexp`. Erwartet **nicht** geräumt: `fast-xml-parser`, `nodemailer` (T8) sowie die FE-transitive Gruppe (`jspdf`/`survey-pdf`, `immutable`, `js-cookie`, `hono`/`@hono/node-server`, `@grpc/grpc-js`, `protobufjs`, `tmp`, `editorconfig`, `minimatch`, `picomatch`, `lodash`, `lodash-es`, `form-data`, `fast-uri`, `express-rate-limit`).
Verify: `bash scripts/crabbox/iter.sh cmd 'npm run check-npm-audit'` → `npm audit: no un-allowlisted high/critical advisories.`; `bash scripts/crabbox/iter.sh cmd 'npm run test:scripts'` grün; die im Register genannte Paketzahl stimmt exakt mit `NPM_AUDIT_ALLOWLIST.length` überein (Assertion im Verify-Kommando: `node -e "..."`).
i18n: keine
Doku: `docs/security/accepted-cves.md` (Zahlen + Begründungen), `docs/security/cve-track.md` (Abschnitt „Was die 2.1.0-Angleichung geräumt hat").
Abhängt von: T1, T2, T3, T4, T5, T6, T7

### T11 — `pdfkit` + `@types/pdfkit` als Root-Dependency  [ ]
Komponente: repo-root · Dateien: `package.json`, `package-lock.json`
Soll: `main.js:79274` (2.1.0-Root: `"pdfkit":"^0.15.2"`, devDep `"@types/pdfkit":"^0.17.6"`), Consumer `LmnPdfService` (main.js:17187-17475, `module.exports = require("pdfkit")` bei 17475). In 2.0.200 **nicht vorhanden**, im Fork **nicht vorhanden** (`grep LmnPdfService|pdfkit` → 0 Treffer).
Änderung: `pdfkit` in `dependencies` (`^0.15.2`), `@types/pdfkit` in `devDependencies` (`^0.17.6`). **Noch kein Consumer** — Muster wie `p5-calendar` T4 (Deps vor der BE-Kette). Der eigentliche `LmnPdfService`-Port (Passwortlisten-/Klassenlisten-PDF) gehört in ein eigenes LMN-Paket; diese Task entblockt ihn nur.
Verify: `bash scripts/crabbox/iter.sh cmd 'npm ci && node -e "const P=require(\"pdfkit\"); const d=new P(); d.end(); console.log(\"pdfkit ok\", require(\"pdfkit/package.json\").version)"'` → `pdfkit ok 0.15.x`; `bash scripts/crabbox/iter.sh cmd 'npm run check-npm-audit'` meldet `pdfkit` nicht.
i18n: keine
Doku: In `tasks/backlog.md` beim künftigen LMN-PDF-Paket vermerken, dass die Dependency schon steht.
Abhängt von: T7

### T12 — DejaVu-Fonts als Runtime-Asset ausliefern + NOTICE  [ ]
Komponente: apps/api (Assets) · Dateien: `data/public/assets/fonts/DejaVuSans.woff`, `data/public/assets/fonts/DejaVuSans-Bold.woff`, `NOTICE`
Soll: `main.js:17621-17624` — `LMN_PDF_FONT_PATHS = { regular: './data/public/assets/fonts/DejaVuSans.woff', bold: './data/public/assets/fonts/DejaVuSans-Bold.woff' }`; Ladepfad `main.js:17196-17213` (`readFileSync`, bei Fehler `Logger.warn('Unicode PDF font unavailable, falling back to Helvetica')` + Fallback `LMN_PDF_FALLBACK_FONTS`). Es ist das **einzige** neue `./data/...`-Asset in 2.1.0 (Diff der `'./data/*'`-Literale 2.0.200 ↔ 2.1.0: nur die zwei Font-Pfade kommen hinzu).
Änderung: Beide WOFF-Dateien unter `data/public/assets/fonts/` ablegen (Quelle: DejaVu-Fonts-Release, `DejaVuSans.ttf`/`DejaVuSans-Bold.ttf` → WOFF, ODER direkt die WOFF-Distribution). `apps/api/Dockerfile:30` (`COPY ./data/public/assets → /opt/edulution/api/assets`) und der `CMD`-Copy-Schritt greifen automatisch — **nicht ändern**, nur verifizieren. `NOTICE` um einen Abschnitt „Third-party assets" mit der DejaVu-/Bitstream-Vera-Lizenz ergänzen.
Verify: `bash scripts/crabbox/iter.sh cmd 'ls -l data/public/assets/fonts/ && node -e "const fs=require(\"fs\");const P=require(\"pdfkit\");const d=new P();d.registerFont(\"LmnBody\",fs.readFileSync(\"./data/public/assets/fonts/DejaVuSans.woff\"));d.font(\"LmnBody\").text(\"Grüße äöü ß\");d.end();console.log(\"font ok\")"'` → `font ok` (beweist, dass pdfkit/fontkit das WOFF frisst); `bash scripts/crabbox/iter.sh cmd 'docker build -t lmn-api-probe:t12 -f apps/api/Dockerfile . && docker run --rm --entrypoint sh lmn-api-probe:t12 -c "ls /opt/edulution/api/assets/fonts"'` listet beide Dateien.
i18n: keine
Doku: `NOTICE` (Font-Lizenz + Herkunft).
Abhängt von: T11

### T13 — AI-SDK-Dependencies: DSGVO-Entscheidungsgate  [?]
Komponente: — (kein Code) · Dateien: `docs/features/p7-deps-config-infra.md` (Abschnitt „AI-Modul"), `tasks/backlog.md`
Soll: 2.1.0 führt das `AiModule` ein. Dependencies (main.js:79274): `@ai-sdk/anthropic ^4.0.11`, `@ai-sdk/google ^4.0.11`, `@ai-sdk/openai ^4.0.11`, `@ai-sdk/openai-compatible ^3.0.7`, `ai ^7.0.19` (Image löst `4.0.14/4.0.14/4.0.13/3.0.9/7.0.26` auf). Konfigurations-Oberfläche vollständig aus dem Bundle belegt: `AI_PROVIDER` (main.js:89741, Default `openai`), `AI_PROVIDERS`-const (89866-89872: `openai|anthropic|google|ollama|openai-compatible`), `AI_MODEL`/`AI_MODELS` (89751-89754, 89975-89981; CSV via `parseCsvList` 89901-89908), `AI_OLLAMA_BASE_URL` (89787), `AI_BASE_URL`+`AI_API_KEY` (89793-89794), `AI_REASONING_TAGS` (89806), `AI_SYSTEM_PROMPT` (90064), `AI_INFO_API_KEY`+`AI_BASE_URL` für den LiteLLM-Context-Window-Resolver (91215-91216). Dazu der extendedOption-Key `IN_APP_PERMISSION_AI_CHAT` (main.js:2366).
Änderung: **Keine.** Diese Task legt Kevin die Entscheidung vor: Schülerdaten fließen bei allen Providern außer `ollama`/`openai-compatible` (self-hosted) an Dritte — das berührt `docs/datenschutz/drittempfaenger.md` und `docs/datenschutz/avv-bedarf.md`. Vorlage schreiben mit drei Optionen: (a) AI-Modul gar nicht bauen, (b) nur self-hosted (`ollama` + `openai-compatible`, kein Provider-Key im Default), (c) voll. Erst nach Entscheid entsteht ein eigenes Paket; **bis dahin keine `@ai-sdk`-Dependency installieren.**
Verify: `grep -c "@ai-sdk" package.json` → `0` (Nachweis, dass nichts vorab gezogen wurde); Entscheidungsvorlage im Doku-Pfad vorhanden.
i18n: keine
Doku: `docs/features/p7-deps-config-infra.md` + Eintrag in `tasks/backlog.md` unter „Weiter offen für Kevin".
Abhängt von: —

### T14 — Env-Inventar 2.1.0 ↔ Fork ↔ `.env.default` ↔ Installer (Doku)  [ ]
Komponente: docs · Dateien: `docs/analysis/env-inventory-2.1.0.md` (neu, SPDX-Header)
Soll: 42 `process.env.*`-Namen in `.reference/2.1.0/api/main.js` gegen 30 in `.reference/2.0.200/api/main.js`; zusätzlich per `configService.get('…')` gelesen: `EDUI_ENABLE_USER_KEY_ENDPOINT` (main.js:14276), `EDUI_MAIL_IDLE_MAX_CONNECTIONS`, `EDUI_MAIL_SIEVE_TIMEOUT` (main.js:36227-36228, Default 10000 ms), `SENTRY_*`. Fork liest 34 Namen (`grep -rhoE "process\.env\.[A-Z_0-9]+" apps libs`).
Änderung: Eine Tabelle je Env-Var mit den Spalten: Name · 2.0.200 · 2.1.0 (Zeilenanker) · Fork-Consumer (Datei:Zeile oder „—") · in `apps/api/.env.default`? · vom Installer geschrieben? (`webinstaller-api/app/main.py:779-838`) · vom crabbox-Harness geschrieben? (`scripts/crabbox/generate_env.py:206-256`) · besitzendes Paket. Vier Befunde MÜSSEN explizit auftauchen: (1) `EDUI_ORGANIZATION_TYPE` wird von Installer **und** Harness geschrieben, vom Fork aber **nirgends gelesen** (2.1.0: main.js:8160); (2) `MASTER_ENCRYPT_KEY` wird geschrieben, vom Fork nicht gelesen (API-Port ist eigenes Paket, siehe `p1-master-key-provisioning`); (3) `KEYCLOAK_REQUEST_TIMEOUT_MS` wird vom Fork gelesen, steht aber nicht in `.env.default`; (4) `DEPLOYMENT_TARGET` vs `EDUI_DEPLOYMENT_TARGET` (T17).
Verify: `bash scripts/crabbox/iter.sh cmd 'grep -c "^| " docs/analysis/env-inventory-2.1.0.md'` ≥ 45; Stichprobe: jede Zeile mit „2.1.0"-Anker referenziert eine reale Zeilennummer (`grep -n` gegenprüfen).
i18n: keine
Doku: das Dokument selbst; Querverweis aus `docs/analysis/base-drift-2.0.200.md`.
Abhängt von: —

### T15 — `.env.default`: real konsumierte, aber undokumentierte Env nachziehen  [ ]
Komponente: apps/api · Dateien: `apps/api/.env.default`
Soll: Gegenüberstellung aus T14. Fehlend, obwohl vom Fork gelesen bzw. vom Installer geschrieben: `EDULUTION_BASE_DOMAIN` (Sentry-`environment`, main.js:79326; Installer `main.py:779`), `KEYCLOAK_REQUEST_TIMEOUT_MS`, `SENTRY_TRACES_SAMPLE_RATE` / `SENTRY_PROFILES_SAMPLE_RATE` / `SENTRY_SEND_DEFAULT_PII` (2.1.0: main.js:79322-79328; Defaults `SENTRY_DEFAULTS` main.js:73813-73817 = `false/0.1/0.1` — der Fork hat die **identischen** Werte in `libs/src/common/constants/sentryTelemetry.ts`), `MASTER_ENCRYPT_KEY` (Installer schreibt, API-Port folgt), sowie ein Kommentarblock für die build-injizierten `APP_VERSION` / `COMMIT_SHA` / `BUILD_DATE` / `BUILD_NUMBER` (`apps/api/Dockerfile:3-11`, `configuration.ts:24-28`).
Änderung: Die genannten Schlüssel mit erklärendem Kommentar und **leerem** Wert ergänzen (Stil wie bestehende Blöcke: Kommentarzeile + `KEY=`). Für die Sentry-Trias die Defaults im Kommentar nennen. Für die Build-Metadaten einen Block „# Build metadata — injected by the Dockerfile ARGs, do not set here". Keine Werte erfinden, keine Sortierung umbauen.
Verify: `bash scripts/crabbox/iter.sh cmd 'for k in EDULUTION_BASE_DOMAIN KEYCLOAK_REQUEST_TIMEOUT_MS SENTRY_TRACES_SAMPLE_RATE SENTRY_PROFILES_SAMPLE_RATE SENTRY_SEND_DEFAULT_PII MASTER_ENCRYPT_KEY; do grep -q "^#*$k" apps/api/.env.default || { echo "MISSING $k"; exit 1; }; done; echo ENV_DEFAULT_OK'` → `ENV_DEFAULT_OK`.
i18n: keine
Doku: keine (T14 ist das Inventar)
Abhängt von: T14

### T16 — Gate `check-env-defaults`: jede gelesene Env muss dokumentiert sein  [ ]
Komponente: repo-root (scripts) · Dateien: `scripts/security/checkEnvDefaults.ts` (neu, SPDX-Header), `scripts/security/checkEnvDefaults.spec.ts` (neu), `package.json` (Script), `.github/workflows/build-and-test.yml`
Soll: **Fork-eigene Härtung, keine Rekonstruktion.** Motiviert durch die vier Drift-Befunde aus T14 — der Contract `.env.default` ↔ Code driftet heute unbemerkt.
Änderung: Ein `tsx`-Skript, das (a) alle `process.env.X` und `configService.get('X')` in `apps/api/src/**` und `libs/src/**` einsammelt, (b) gegen die Schlüssel in `apps/api/.env.default` prüft (auch auskommentierte `#KEY=`), (c) eine kleine, begründete Ausnahmeliste als `const`-Objekt führt (`NODE_ENV`, `APP_VERSION`, `COMMIT_SHA`, `BUILD_DATE`, `BUILD_NUMBER`), (d) bei Fehlern die Datei:Zeile des Lesers ausgibt und mit `1` endet. Stil: `checkNpmAudit.ts` (const-Objekte statt enums, Default-Export am Ende, keine Kommentare im Code, `export { evaluate }` für den Test). npm-Script `check-env-defaults`; Einhängen in `.github/workflows/build-and-test.yml` im Step „Run Checks" (nach `check-npm-audit`).
Verify: `bash scripts/crabbox/iter.sh cmd 'npm run check-env-defaults'` grün; `bash scripts/crabbox/iter.sh cmd 'npm run test:scripts'` grün (Spec deckt: dokumentiert / undokumentiert / auskommentiert / Ausnahmeliste); Negativprobe: `bash scripts/crabbox/iter.sh cmd 'sed -i "/^LMN_API_BASE_URL/d" apps/api/.env.default && npm run check-env-defaults; git checkout -- apps/api/.env.default'` → Exit ≠ 0 mit Nennung von `LMN_API_BASE_URL`.
i18n: keine
Doku: `docs/security/cve-track.md` §2 um das neue Gate ergänzen (die Liste der CI-Gates ist dort die Wahrheit).
Abhängt von: T15

### T17 — `DEPLOYMENT_TARGET` vs `EDUI_DEPLOYMENT_TARGET` auflösen  [ ]
Komponente: apps/api · Dateien: `apps/api/src/surveys/migrations/surveyTemplatesMigration001LoadDefaultTemplates.ts`, `apps/api/.env.default`
Soll: 2.1.0 liest an zwei Stellen **verschiedene** Namen: `main.js:8126` (`EDUI_DEPLOYMENT_TARGET`, Default `linuxmuster`, der kanonische Weg) und `main.js:64782` (`process.env.DEPLOYMENT_TARGET || 'linuxmuster'` in der Survey-Template-Migration). Der Fork hat die zweite Variante 1:1 (`surveyTemplatesMigration001LoadDefaultTemplates.ts:41`), Installer und Harness schreiben aber nur `EDUI_DEPLOYMENT_TARGET` (`webinstaller-api/app/main.py:783`, `generate_env.py:210`) → bei `EDUI_DEPLOYMENT_TARGET=generic` zieht die Migration trotzdem die linuxmuster-Templates.
Änderung: In der Migration `process.env.EDUI_DEPLOYMENT_TARGET ?? process.env.DEPLOYMENT_TARGET ?? DEPLOYMENT_TARGET.LINUXMUSTER` lesen (bestehende Konstante `@libs/common/constants/deployment-target` nutzen, keine Magic-Strings — der heutige Literal `'linuxmuster'` fliegt raus). **Bewusste Divergenz zu 2.1.0** (dort ist der Bug drin). Migration NICHT neu nummerieren, `schemaVersion` NICHT anfassen — es ändert sich nur die Env-Auflösung, nicht das Schema.
Verify: `bash scripts/crabbox/iter.sh test:api` grün; neue jest-Fälle in der zugehörigen Spec: `EDUI_DEPLOYMENT_TARGET=generic` → generic; nur `DEPLOYMENT_TARGET=generic` gesetzt → generic (Rückwärtskompatibilität); beide leer → `linuxmuster`.
i18n: keine
Doku: Zeile im Env-Inventar (T14) auf „aufgelöst" setzen.
Abhängt von: T14

### T18 — `secretExtendedOptionKeys` + `pickSafeExtendedOptions` portieren  [ ]
Komponente: libs + apps/api · Dateien: `libs/src/appconfig/constants/secretExtendedOptionKeys.ts` (neu), `libs/src/appconfig/constants/nonAdminExtendedOptionKeys.ts` (neu), `libs/src/appconfig/utils/pickSafeExtendedOptions.ts` (neu), `apps/api/src/appconfig/appconfig.service.ts`, `apps/api/src/appconfig/appconfig.service.spec.ts`
Soll: `main.js:2733-2741` (`pickSafeExtendedOptions(extendedOptions, allowList = NON_ADMIN_EXTENDED_OPTION_KEYS)` → `Object.fromEntries(... allowedKeys.includes(key) && !secretKeys.includes(key))`), `main.js:2770-2792` (`NON_ADMIN_EXTENDED_OPTION_KEYS`, 17 Keys), `main.js:2841-2873` (`SECRET_EXTENDED_OPTION_KEYS` = alle extendedOptions mit `type === ExtendedOptionField.password`, **plus** `SECRETS_WITHOUT_FIELD_DEFINITION = [EURO_OFFICE_JWT_SECRET]`). Fork heute: `appconfig.service.ts:259-260` löscht hart zwei Keys (`ONLY_OFFICE_JWT_SECRET`, `COLLABORA_WOPI_SECRET`) — jedes künftige Password-Feld wäre ungeschützt.
Änderung: `secretExtendedOptionKeys.ts` aggregiert die 17 Dateien aus `libs/src/appconfig/constants/extendedOptions/` und filtert auf `ExtendedOptionField.password` (Konstante existiert bereits: `extendedOptionField.ts:22`); `nonAdminExtendedOptionKeys.ts` als const-Array nach 2.1.0-Vorlage, **aber gefiltert auf die im Fork existierenden Keys** (`EURO_OFFICE_URL`, `MAIL_SIGNATURE` gibt es im Fork noch nicht → weglassen, im Task-Ergebnis vermerken). `pickSafeExtendedOptions` als Default-Export am Dateiende. In `appconfig.service.ts` den Non-Admin-Zweig auf `extendedOptions: pickSafeExtendedOptions(config.extendedOptions)` umstellen, die beiden `delete`-Zeilen entfernen. **Regressionsrisiko:** vorher Allowlisten-Abgleich fahren — `grep -rn "extendedOptions\[\|extendedOptions?\." apps/frontend/src --include=*.ts*` — und jeden von Nicht-Admins real gelesenen Key in `NON_ADMIN_EXTENDED_OPTION_KEYS` aufnehmen, sonst verschwindet er im FE.
Verify: `bash scripts/crabbox/iter.sh test:api` grün; Specs: (a) Nicht-Admin bekommt weder `ONLY_OFFICE_JWT_SECRET` noch `COLLABORA_WOPI_SECRET`, (b) ein **erfundener** Zukunfts-Key `FUTURE_SECRET_KEY` im Fixture ist per Default NICHT im Ergebnis (Allowlist-Beweis), (c) Admin behält alles, (d) jeder Key aus `NON_ADMIN_EXTENDED_OPTION_KEYS` kommt durch. `bash scripts/crabbox/iter.sh cmd 'npx tsc -p apps/frontend/tsconfig.app.json --noEmit'` clean; `bash scripts/crabbox/iter.sh test:frontend` grün.
i18n: keine
Doku: Kurzabschnitt in `docs/features/p7-deps-config-infra.md`: „Secret-Maskierung ist ab jetzt konstruktiv (jedes `password`-Feld), nicht mehr per Hand gepflegt."
Abhängt von: —

### T19 — extendedOption-Keys 2.1.0: Inventar + Owner-Mapping (Doku)  [ ]
Komponente: docs · Dateien: `docs/analysis/extended-option-keys-2.1.0.md` (neu, SPDX-Header)
Soll: `main.js:2363-2419` (2.1.0, 56 Keys) vs `.reference/2.0.200/api/main.js:2075-2119` (44 Keys) vs `libs/src/appconfig/constants/extendedOptionKeys.ts` (Fork, 37 Keys). **Neu in 2.1.0:** `IN_APP_PERMISSION_CREATE`, `IN_APP_PERMISSION_PARTICIPATE`, `IN_APP_PERMISSION_AI_CHAT`, `EURO_OFFICE_URL`, `EURO_OFFICE_JWT_SECRET`, `CONTACTS_CARDDAV_BASE_URL`, `CONTACTS_CARDDAV_AUTH_MODE`, `CONTACTS_CARDDAV_REJECT_UNAUTHORIZED`, `MAIL_MANAGESIEVE_HOST`, `MAIL_MANAGESIEVE_PORT`. Zusätzlich fehlen dem Fork noch 2.0.200-Keys (`MAIL_SMTP_HOST/PORT`, `MAIL_TLS_REJECT_UNAUTHORIZED`, `WIKI_SHARE_VISIBILITY_TABLE`, `MOBILE_DEVICES_*`, `MAIL_MAILBOX_TABLE`, `MAIL_SIGNATURE`, `MAIL_PROVIDER_CONFIG_TABLE`) bzw. er trägt Fork-eigene (`MAIL_IMAP_URL`, `MAIL_IMAP_SECURE`, `MAIL_IMAP_TLS_REJECT_UNAUTHORIZED`, `ACTIVE_MAIL_CLIENT`).
Änderung: Tabelle Key · 2.0.200 · 2.1.0 (Zeile) · Fork · besitzendes Paket · Anmerkung. **Keine Keys anlegen** — die Contract-Sync-Regel verlangt, dass ein Key mit seinem extendedOption-Feld, seiner i18n und seinem Consumer zusammen landet. Zuordnung: `MAIL_MANAGESIEVE_*` → `p4-mail-rework` (T13b Sieve-Stack), `CONTACTS_CARDDAV_*` → künftiges Contacts-Paket, `EURO_OFFICE_*` → `p4-filesharing-wopi`, `IN_APP_PERMISSION_*` → das im Backlog offene `InAppPermissionGuard`-Paket. Für `EURO_OFFICE_JWT_SECRET` explizit auf T18 verweisen (steht in 2.1.0 in `SECRETS_WITHOUT_FIELD_DEFINITION`, main.js:2866).
Verify: `bash scripts/crabbox/iter.sh cmd 'grep -c "^| " docs/analysis/extended-option-keys-2.1.0.md'` ≥ 56; jeder der 10 neuen Keys taucht wörtlich auf (`for k in IN_APP_PERMISSION_CREATE … ; do grep -q "$k" … ; done`).
i18n: keine
Doku: das Dokument; Querverweis in `tasks/backlog.md` bei den vier genannten Paketen.
Abhängt von: —

### T20 — `GET /health/version` (Endpoint-Konstante + DTO + öffentliche Route)  [ ]
Komponente: libs + apps/api · Dateien: `libs/src/appconfig/constants/appconfig-endpoints.ts`, `libs/src/health/types/versionResponseDto.ts` (neu, SPDX-Header), `apps/api/src/health/health.controller.ts`, `apps/api/src/health/health.service.ts`, `apps/api/src/health/health.controller.spec.ts`, `apps/api/src/health/health.service.spec.ts`
Soll: `main.js:1700-1706` (`APP_CONFIG_ENDPOINTS` mit **`VERSION: 'version'`** zwischen `HEALTH_CHECK` und `FILES`; der Fork hat den Key nicht), `main.js:76290-76292` (`getVersion() { return this.healthService.getVersion(); }`), `main.js:76328-76335` (Decorator-Block: `@ApiOperation({summary:'Get API version (no auth required)'})`, `@ApiResponse({status: HttpStatus.OK, description:'API version', type: VersionResponseDto})`, **`@Public()`**, `@Get(APP_CONFIG_ENDPOINTS.VERSION)`), `main.js:76435` (`const UNKNOWN = 'unknown'`), `main.js:76462-76467` (`getVersionString() { return this.configService.get('version') ?? UNKNOWN; }`, `getVersion() { return { version: this.getVersionString() }; }`), `main.js:76664-76672` (`class VersionResponseDto { version }` mit `@ApiProperty({description:'Application version', example:'2.0.296'})`).
Änderung: `VERSION: 'version'` in `EDU_API_CONFIG_ENDPOINTS`. `VersionResponseDto` als Klasse mit `@ApiProperty`, Default-Export am Dateiende. In `HealthService`: `UNKNOWN`-Konstante + `getVersionString()` + `getVersion()`; **zusätzlich** `onModuleInit` von `?? ''` auf `?? UNKNOWN` ziehen (2.1.0-treu, `health.service.ts:58-62`). In `HealthController` die Route mit **`@Public()`** (Import existiert bereits: `health.controller.ts:24`) — ohne `LocalhostGuard`, das ist der Installer-/Registry-Contract. Reihenfolge der Decorator wie im Bundle. `@Get()`-Basisroute und `@Get('check')` unverändert lassen — Guards nicht anfassen.
Verify: `bash scripts/crabbox/iter.sh test:api` grün; neue Specs: (a) `Reflect.getMetadata(IS_PUBLIC_KEY, HealthController.prototype.getVersion)` ist `true` (Guard-Contract), (b) `getVersion()` liefert `{version: '<configService version>'}`, (c) ohne konfigurierte Version `{version:'unknown'}`. Danach am laufenden Stack: `bash scripts/crabbox/iter.sh cmd 'curl -sk https://$(hostname -I | awk "{print \$1}")/edu-api/health/version'` → `{"version":"…"}` **ohne** Token, und `curl -sk .../edu-api/health/stats` ohne Token → `401` (Beweis, dass nur die eine Route öffentlich ist).
i18n: keine
Doku: `docs/features/p7-deps-config-infra.md` — Abschnitt „Version-Contract für Installer & Registry".
Abhängt von: —

### T21 — Health-Swagger-Parität: `HealthCheckResponseDto`  [ ]
Komponente: libs + apps/api · Dateien: `libs/src/health/types/healthCheckResponseDto.ts` (neu, SPDX-Header), `apps/api/src/health/health.controller.ts`
Soll: `main.js:76580-76656` (`HealthCheckResponseDto` mit `status`, `info`, `error`, `details`, `version`, `commitSha`, `buildDate`, `buildNumber`; `@ApiProperty`-Texte und Beispiele wörtlich im Bundle), `main.js:76297-76316` und `76338-76347` (die `@ApiOperation`/`@ApiResponse`-Blöcke von `check`, `readiness`, `getStats`) sowie `main.js:76322/76333` (`@HealthCheck({ noCache: true, swaggerDocumentation: false })` — der Fork hat nur `@HealthCheck()`).
Änderung: DTO anlegen (Felder + `@ApiProperty` referenztreu). `@ApiTags('health')` auf den Controller, `@ApiOperation`/`@ApiResponse` auf `check`/`readiness`/`getStats`, `@HealthCheck({ noCache: true, swaggerDocumentation: false })` auf `check` und `readiness`. **Keine Verhaltensänderung an den Routen, keine Guard-Änderung.**
Verify: `bash scripts/crabbox/iter.sh test:api` grün; `bash scripts/crabbox/iter.sh cmd 'npm run build:api'` grün; Swagger-Spec-Probe: `bash scripts/crabbox/iter.sh cmd 'grep -q "HealthCheckResponseDto" swagger-spec.json || echo "spec regeneration pending"'` (Ergebnis im Ledger festhalten — die Spec-Generierung ist ein eigener Schritt, kein stiller Nebeneffekt).
i18n: keine
Doku: keine
Abhängt von: T20

### T22 — Installer + Harness konsumieren `GET /health/version`  [ ]
Komponente: installer + apps/api-Harness · Dateien: `edulution-installer/apps/webinstaller-api/app/main.py`, `edulution-installer/apps/webinstaller/src/pages/FinishPage.tsx`, `edulution-installer/apps/webinstaller/src/api/installerApi.ts`, `edulution-installer/apps/webinstaller/src/i18n/locales/{de,en}/translation.json`, `edulution-ui/scripts/crabbox/deploy.sh`
Soll: Route + Antwortform aus T20 (`{ "version": "<string>" }`, `@Public`). Heute prüft nur der Compose-Healthcheck `.../health/check` (`docker-compose.yml.template:52`); es gibt **keinen** Weg, die tatsächlich ausgerollte Version zu erfahren.
Änderung: (a) `webinstaller-api`: Endpoint `GET /check-edulution-version`, der `https://<EDULUTION_BASE_DOMAIN>/edu-api/health/version` mit `verify=False` (Self-Signed im Installer-Kontext, wie die bestehenden Probes) und kurzem Timeout abfragt und `{status, version, message}` zurückgibt — Stil der vorhandenen `check-*`-Endpoints (`main.py:270-310`). (b) `FinishPage.tsx` zeigt die Version an (Anzeige, kein Gate). (c) `deploy.sh`: nach dem Health-Warten die Version abfragen und loggen; Abbruch nur, wenn die Route gar nicht antwortet.
Verify: Installer-Repo: `cd ../edulution-installer && python3 -m py_compile apps/webinstaller-api/app/main.py && npm run lint` grün. UI-Repo: `bash scripts/crabbox/iter.sh cmd 'bash -n scripts/crabbox/deploy.sh'` grün; am laufenden Stack `bash scripts/crabbox/iter.sh deploy` → Log enthält die Zeile mit der ausgelesenen Version.
i18n: Installer-Locales sind **nur `de` + `en`** (`apps/webinstaller/src/i18n/i18n.ts:15`, kein `fr`, kein `check-translations`-Gate) — neue Keys `finish.apiVersion`, `finish.apiVersionUnknown` in beiden Dateien.
Doku: `docs/features/p7-deps-config-infra.md` — Contract-Abschnitt um den Installer-Consumer ergänzen.
Abhängt von: T20

### T23 — Installer-API: LDAPS-Zertifikat inspizieren (SAN + Fingerprint)  [ ]
Komponente: installer · Dateien: `edulution-installer/apps/webinstaller-api/app/main.py`, `edulution-installer/apps/webinstaller-api/requirements.txt`
Soll: **Fork-Original, nicht aus dem Bundle** — Produkterkenntnis der Verify-Welle (in `tasks/backlog.md` festgehalten) und empirisch belegt in `edulution-ui/scripts/crabbox/deploy.sh:60-81`: gegen einen Standard-linuxmuster-Server scheitert LDAPS zweifach — (1) die Schul-CA ist Keycloaks Java-Truststore unbekannt (`PKIX: unable to find valid certification path`), (2) das Serverzertifikat trägt **keine SAN-Extension** (`No subject alternative names present`). Nachweis am realen Fall: die eingesammelte LMN-CA hat `subject=O=Linuxmuster, OU=<Schule>, CN=<REALM>` und führt „subjectAltName" nur als **DN-Attribut**, nicht als X.509-Extension. Den LMN anzupassen ist ausgeschlossen.
Änderung: Endpoint `GET /inspect-ldaps-certificate` (Stil der bestehenden `check-ldap-*`-Endpoints, `main.py:270-310`): TLS-Handshake gegen `DATA_LMN_EXTERNAL_DOMAIN:DATA_LMN_LDAP_PORT` **ohne** Verifikation, dann aus der Peer-Kette zurückgeben: `subject`, `issuer`, `not_before`, `not_after`, `has_san` (bool, echte `subjectAltName`-Extension), `san_entries`, `sha256_fingerprint` (Doppelpunkt-getrennt, Groß), `chain_pem` (Leaf + Issuer), `self_signed` (bool). Implementierung mit `ssl` + `cryptography` (beide bereits in `requirements.txt`). Bei `ldap`-Schema (Port 389) sauber `{"status": false, "message": "…"}` statt Exception.
Verify: `cd ../edulution-installer && python3 -m py_compile apps/webinstaller-api/app/main.py` grün; funktional gegen den echten LMN: `python3 -c "..."` mit `LMN_HOST=10.10.40.10`, Port 636 → Ausgabe zeigt `has_san: false` und einen 64-stelligen SHA-256-Fingerprint; gegen `google.com:443` als Positivprobe → `has_san: true`.
i18n: keine (reiner API-Endpoint)
Doku: keine (T29)
Abhängt von: —

### T24 — Installer-UI: LDAPS als Default + CA-Vertrauensschritt  [ ]
Komponente: installer · Dateien: `edulution-installer/apps/webinstaller/src/pages/ConfigurePage.tsx`, `edulution-installer/apps/webinstaller/src/store/useInstallerStore.ts`, `edulution-installer/apps/webinstaller/src/api/installerApi.ts`, `edulution-installer/apps/webinstaller/src/i18n/locales/{de,en}/translation.json`
Soll: **Fork-Original.** Heute: `useInstallerStore.ts:106-107` und `LmnInstallPage.tsx:138-139` setzen `lmnLdapSchema: 'ldap'`, `lmnLdapPort: 389` — der Installer richtet also per Default **unverschlüsseltes** LDAP gegen den Schulserver ein. `ConfigurePage.tsx:32-39` schaltet den Port bereits automatisch zwischen 389/636 um. Der crabbox-Harness steht dagegen schon auf `ldaps`/636 (`generate_env.py:183-184`) — der Installer hinkt hinterher.
Änderung: Default auf `lmnLdapSchema: 'ldaps'`, `lmnLdapPort: 636` (beide Stellen). Nach erfolgreichem LDAP-Check bei `ldaps` einen Vertrauens-Schritt einziehen: `inspect-ldaps-certificate` (T23) aufrufen, Subject/Issuer/Gültigkeit/**SHA-256-Fingerprint** anzeigen, Bestätigung per Checkbox verlangen (TOFU), und — falls `has_san === false` — einen deutlich sichtbaren Hinweis anzeigen, dass die Hostnamen-Prüfung für diese Verbindung abgeschaltet wird (Verschlüsselung und CA-Bindung bleiben aktiv). Fallback „CA-PEM hochladen" für Aufbauten, in denen der Handshake nicht möglich ist (Muster: die vorhandene `upload-certificate`-Route, `main.py:415-430`). Bestätigten Fingerprint + PEM in den Store legen. `cn()`-Nutzung und Komponenten-Stil der bestehenden Seiten übernehmen.
Verify: `cd ../edulution-installer && npm run lint` grün; `npx tsc -p apps/webinstaller/tsconfig.app.json --noEmit` clean; manuelle Klickprobe im Dev-Server (`npm run dev:webinstaller`) gegen einen Fake-Endpoint: Fingerprint sichtbar, „Weiter" bleibt ohne Bestätigung deaktiviert.
i18n: `de` + `en` (Installer kennt kein `fr`): `configure.ldaps.title`, `configure.ldaps.fingerprint`, `configure.ldaps.issuer`, `configure.ldaps.validUntil`, `configure.ldaps.noSanWarning`, `configure.ldaps.confirmTrust`, `configure.ldaps.uploadCa`.
Doku: keine (T29)
Abhängt von: T23

### T25 — Installer-API: CA persistieren + `edulution.env`-Contract  [ ]
Komponente: installer · Dateien: `edulution-installer/apps/webinstaller-api/app/main.py`
Soll: **Fork-Original**, Vorbild ist das erprobte Harness-Rezept `edulution-ui/scripts/crabbox/deploy.sh:63-79` (CA nach `data/`, Mount in Keycloaks Truststore-Verzeichnis, `KC_TRUSTSTORE_PATHS`). Schreibstelle im Installer ist `createEdulutionEnvFile` (`main.py:709-838`); die Realm-Patch-Schleife setzt `connectionUrl` bereits aus Schema/Host/Port (`main.py:765-771`).
Änderung: (a) Bestätigte CA nach `/edulution-ui/data/keycloak/truststores/lmn-ca.crt` schreiben (Verzeichnis anlegen, Modus `0644` — Keycloak läuft nicht als root), zusätzlich nach `/edulution-ui/data/lmn-ca.crt` für den API-Container (T27). (b) `edulution.env` erhält `LDAP_CA_FILE=/opt/edulution/api/data/lmn-ca.crt` und — **nur wenn `has_san === false`** — `KC_LDAP_DISABLE_ENDPOINT_IDENTIFICATION=true`. (c) `_create_ldap_server` (`main.py:252-268`) validiert bei vorhandener CA gegen sie (`Tls(ca_certs_file=…, validate=ssl.CERT_REQUIRED)`) statt `CERT_NONE`, mit abgeschalteter Hostnamen-Prüfung, wenn keine SAN vorliegt. (d) **Idempotenz** wie bei `MASTER_ENCRYPT_KEY`: existierende CA-Datei bei Re-Run übernehmen, nicht kommentarlos überschreiben (`resolveMasterEncryptKey`-Muster, `main.py:699-707`).
Verify: `cd ../edulution-installer && python3 -m py_compile apps/webinstaller-api/app/main.py` grün; Trockenlauf: `createEdulutionEnvFile` gegen ein temporäres `/tmp`-Wurzelverzeichnis ausführen und assertieren, dass `LDAP_CA_FILE=` in der erzeugten `edulution.env` steht, die CA-Datei existiert und ein zweiter Lauf sie **nicht** verändert (`sha256sum` vorher/nachher gleich).
i18n: keine
Doku: keine (T29)
Abhängt von: T24

### T26 — compose-Template: Keycloak-Truststore + bedingtes `JAVA_OPTS_APPEND`  [ ]
Komponente: installer · Dateien: `edulution-installer/apps/public-page/public/download/docker-compose.yml.template`
Soll: **Fork-Original**, direkt aus dem bewiesenen Harness-Override (`edulution-ui/scripts/crabbox/deploy.sh:70-78`): `volumes: ./data/lmn-ca.crt:/opt/keycloak/conf/truststores/lmn-ca.crt:ro`, `KC_TRUSTSTORE_PATHS: /opt/keycloak/conf/truststores`, `JAVA_OPTS_APPEND: -Dcom.sun.jndi.ldap.object.disableEndpointIdentification=true`. Ziel-Service ist `edu-keycloak` (`docker-compose.yml.template:115-144`, `quay.io/keycloak/keycloak:26.4`).
Änderung: **Verzeichnis** statt Datei mounten — `./data/keycloak/truststores:/opt/keycloak/conf/truststores:ro` (ein leeres Verzeichnis ist ein sauberer No-op; ein fehlender *Datei*-Mount würde von Docker als Verzeichnis angelegt und Keycloak zum Absturz bringen). `KC_TRUSTSTORE_PATHS: /opt/keycloak/conf/truststores` statisch setzen. `JAVA_OPTS_APPEND` **nicht** hart eintragen, sondern aus `edulution.env` speisen: `JAVA_OPTS_APPEND: ${KC_JAVA_OPTS_APPEND:-}` und den Wert in T25 nur bei fehlender SAN schreiben — so bleibt das JVM-globale Flag least-privilege. `data/keycloak/truststores` in der Verzeichnis-Vorbereitung des Installers anlegen. **Erster Schritt der Umsetzung:** Optionsnamen auf der Box gegenprüfen, nicht aus dem Gedächtnis übernehmen.
Verify: `bash scripts/crabbox/iter.sh cmd 'docker run --rm quay.io/keycloak/keycloak:26.4 build --help-all 2>&1 | grep -i -A2 truststore'` → belegt `--truststore-paths` / `KC_TRUSTSTORE_PATHS`; Ergebnis wörtlich ins Ledger. Danach `bash scripts/crabbox/iter.sh cmd 'cd ~/.edulution-templates && docker compose -f docker-compose.yml.template config -q'` (Syntaxprobe) bzw. der volle Lauf in T28.
i18n: keine
Doku: keine (T29)
Abhängt von: T25

### T27 — API: CA-verifiziertes LDAPS im `ldap-keycloak-sync`  [ ]
Komponente: apps/api · Dateien: `apps/api/src/ldap-keycloak-sync/ldap-keycloak-sync.service.ts`, zugehörige Spec, `apps/api/.env.default`
Soll: **Fork-Härtung über 2.1.0 hinaus.** 2.1.0 ist hier identisch zum Fork: `main.js:16136-16157` baut die TLS-Optionen als `{ rejectUnauthorized: false, minVersion: 'TLSv1.2', servername: hostForTls }` — also LDAPS **ohne jede Zertifikatsprüfung** (Fork: `ldap-keycloak-sync.service.ts:450-476`). Mit der in T25 bereitgestellten CA lässt sich das echt verifizieren.
Änderung: Neue Env `LDAP_CA_FILE` (optional). Ist sie gesetzt und die Datei lesbar: `rejectUnauthorized: true` + `ca: readFileSync(LDAP_CA_FILE)` + `checkServerIdentity: () => undefined` (nur die Hostnamen-Bindung fällt weg — genau die Lücke, die das SAN-lose LMN-Zertifikat erzwingt; CA-Vertrauen und Verschlüsselung bleiben). Ist sie nicht gesetzt: heutiges Verhalten unverändert (`rejectUnauthorized: false`) plus **einmalige** `Logger.warn`-Zeile mit Service-Namen (statischer Logger, Konvention). `minVersion: 'TLSv1.2'` und `servername` bleiben. Keine Magic-Strings: Pfad-Env als Konstante.
Verify: `bash scripts/crabbox/iter.sh test:api` grün; neue Specs: (a) ohne `LDAP_CA_FILE` → `tlsOptions.rejectUnauthorized === false` (Rückwärtskompatibilität), (b) mit gültiger CA-Datei → `rejectUnauthorized === true`, `ca` gesetzt, `checkServerIdentity` vorhanden, (c) `LDAP_CA_FILE` zeigt ins Leere → Warnung + Fallback, kein Crash. Laufzeit-Beweis in T28.
i18n: keine
Doku: `apps/api/.env.default` (Kommentar: „PEM der Schul-CA; aktiviert echte LDAPS-Verifikation. Hostnamen-Prüfung bleibt aus, weil linuxmuster-Serverzertifikate keine SAN tragen.")
Abhängt von: T15, T25

### T28 — `deploy.sh` auf den Template-Mechanismus ziehen + Voll-Stack-Verify mit `ldaps://`  [ ]
Komponente: apps/api-Harness · Dateien: `scripts/crabbox/deploy.sh`, `scripts/crabbox/generate_env.py`, `scripts/crabbox/stage-templates.sh`
Soll: Contract-Sync. `deploy.sh:60-81` baut heute eine **eigene** `docker-compose.override.yml` — sobald T26 das im Installer-Template löst, gäbe es zwei Wahrheiten. `stage-templates.sh:15` zieht die Templates ohnehin aus dem Installer-Repo (Single Source of Truth).
Änderung: Den Override-Block aus `deploy.sh` entfernen; stattdessen die CA nach `$WORKDIR/data/keycloak/truststores/lmn-ca.crt` legen und `generate_env.py` `LDAP_CA_FILE` + (bei fehlender SAN) `KC_JAVA_OPTS_APPEND` in `edulution.env` schreiben lassen — spiegelbildlich zu T25. `stage-templates.sh` prüft weiterhin nur die vier Template-Dateien. Die vorhandene Warnung bei fehlender CA (`deploy.sh:81`) erhalten.
Verify: `bash scripts/crabbox/iter.sh cmd 'bash -n scripts/crabbox/deploy.sh && python3 -m py_compile scripts/crabbox/generate_env.py'` grün. Dann der **eigentliche Beweis**: `bash scripts/crabbox/stage-templates.sh && bash scripts/crabbox/iter.sh deploy` mit `LMN_LDAP_SCHEMA=ldaps`, `LMN_LDAP_PORT=636` gegen `10.10.40.10` → (a) 7/7 Services healthy, (b) `docker logs edulution-keycloak 2>&1 | grep -ci "PKIX\|No subject alternative names"` → `0`, (c) `bash scripts/crabbox/iter.sh shots` liefert einen Login als `global-admin` mit echten LDAP-Daten, (d) `curl -sk .../edu-api/health/version` antwortet, (e) `docker logs edulution-api 2>&1 | grep -i "ldap"` zeigt einen erfolgreichen Bind ohne `rejectUnauthorized`-Warnung. **Nur lesende LDAP-Operationen; keine LMN-Konfiguration ändern.**
i18n: keine
Doku: Verify-Ergebnis (inkl. der genauen Log-Zeilen) ins Ledger.
Abhängt von: T26, T27

### T29 — Ops-Doku: LDAPS gegen einen Standard-linuxmuster-Server  [ ]
Komponente: docs (beide Repos) · Dateien: `edulution-ui/docs/ops/ldaps-linuxmuster.md` (neu, SPDX-Header), `edulution-installer/README.md`
Soll: Ergebnisse aus T23–T28. Bestehende Ops-Doku ist deutschsprachig und einsprachig (`docs/ops/dr-runbook.md`, `docs/ops/dr-master-key.md`) — dieses Dokument folgt dem.
Änderung: Beschreiben: die zwei Hürden (unbekannte Schul-CA → PKIX; Serverzertifikat ohne SAN-Extension → `No subject alternative names present`) mit Belegen; warum eine Anpassung des LMN ausscheidet; was der Installer tut (CA-Handshake, Fingerprint-Bestätigung, Truststore-Mount, bedingtes JVM-Flag); welche Sicherheitseigenschaften **bleiben** (TLS-Verschlüsselung, CA-Bindung) und welche **entfallen** (Hostnamen-Bindung) — und was das für ein MITM-Szenario bedeutet (Angreifer braucht ein von der Schul-CA signiertes Zertifikat); wie man CA-Rotation fährt; wie man den Zustand prüft (`openssl s_client -connect <host>:636 -showcerts`, Keycloak-Logs, `health/version`). Abschnitt „Bewusste Restrisiken" mit Verweis auf T27 (API-Seite) und die Alternative stunnel-Sidecar (verworfen: zusätzlicher Container, gleiche Vertrauensgrundlage).
Verify: `bash scripts/crabbox/iter.sh cmd 'test -f docs/ops/ldaps-linuxmuster.md && head -2 docs/ops/ldaps-linuxmuster.md | grep -q "SPDX-License-Identifier: AGPL-3.0-or-later" && echo DOC_OK'` → `DOC_OK`; alle im Dokument genannten Befehle sind mindestens einmal in T28 real gelaufen.
i18n: keine (Ops-Doku, wie `docs/ops/*` deutschsprachig)
Doku: das Dokument selbst
Abhängt von: T28

### T30 — Installer-Templates: Image-Refs + neue optionale Env  [ ]
Komponente: installer · Dateien: `edulution-installer/apps/public-page/public/download/docker-compose.yml.template`
Soll: Contract-Sync „ghcr-Image-Ref ↔ Installer-Templates". Heute stehen dort `ghcr.io/faircomp/linuxmuster-ui:2.0.0` und `ghcr.io/faircomp/linuxmuster-api:2.0.0` (`docker-compose.yml.template:4,18`) — ein Tag, den die eigene CI so nie gebaut hat; der Soll-Stand ist inzwischen 2.1.0-basiert. Der `edu-api`-`environment`-Block (`:22-39`) dokumentiert optionale Env als Kommentare; ihm fehlen die in T15 aufgenommenen Schlüssel.
Änderung: Beide Image-Refs auf den real veröffentlichten Tag ziehen (aus `.github/workflows/container-build.yml` ableiten — Tag-Erzeugung `:49-67`; den gewählten Wert im Ledger begründen, nicht raten). Kommentierte optionale Env ergänzen: `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`, `SENTRY_SEND_DEFAULT_PII`, `KEYCLOAK_REQUEST_TIMEOUT_MS`, `LDAP_CA_FILE` (T27) — jeweils mit dem Default im Kommentar, Stil der bestehenden Zeilen (`:25-32`). Der `edu-api`-Healthcheck (`:52`) bleibt auf `health/check`; `health/version` ist **kein** Healthcheck-Ersatz (es prüft keine Abhängigkeit).
Verify: `cd ../edulution-installer && docker compose -f apps/public-page/public/download/docker-compose.yml.template config -q` (bzw. `python3 -c "import yaml,sys; yaml.safe_load(open(...))"` falls kein Docker) → fehlerfrei; `grep -c "linuxmuster-\(ui\|api\):2\.0\.0" apps/public-page/public/download/docker-compose.yml.template` → `0`; anschließend `bash scripts/crabbox/stage-templates.sh && bash scripts/crabbox/iter.sh deploy` (im UI-Repo) läuft weiterhin durch.
i18n: keine
Doku: `docs/ci-release.md` — Tag-/Template-Kopplung festhalten.
Abhängt von: T15, T26
