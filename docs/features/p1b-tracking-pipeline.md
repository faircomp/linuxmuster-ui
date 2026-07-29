<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# p1b-tracking-pipeline — Spec

> Phase **P1b** · Ops-/Tooling-Paket (parallel zu P1). Kein Feature-Nachbau im `edulution-ui`-Produkt,
> sondern der Bau eines **eigenen Repos `linuxmuster-tracking`** (Plan-Arbeitstitel
> `openedulution-tracking`, hier auf die Fork-Namenskonvention gehoben: `faircomp/linuxmuster-tracking`),
> das den toten Upstream `edulution-io` maschinell beobachtet: pro neuem öffentlichen Image ein
> deterministischer Fingerprint-/String-Diff → strukturierter Backlog-Report → `tasks/`-Ledger für
> `feature-plan`/`feature-build`. Umsetzung von Plan **§7 (a–i)** und **§8-P1b**.
>
> Diese Spec + das zugehörige Ledger liegen bewusst im `edulution-ui`-Repo (`docs/features/`, `tasks/`),
> weil hier die Planungsartefakte des Forks zentral geführt werden; das **Ergebnis** ist ein separates
> Repo. Die Baseline-Artefakte (2.0.200) stammen aus `scratchpad/api-img` + `scratchpad/ui-img`.

## Problem / Motivation

„Aktuell bleiben" heißt für einen Fork mit totem Upstream **nicht** `git pull` (das Upstream-Repo
ist eingefroren/verschwindet), sondern: pro neuem öffentlichem Image von `edulution-io` einen
**maschinellen Diff** gegen die zuletzt gesehene Version fahren, daraus einen **Backlog** an
Nachzieh-Tasks erzeugen und diese manuell (via `feature-plan`/`feature-build`) nachbauen (Plan §0
Z.30, §7). Ohne diese Pipeline altert der Fork unbemerkt: neue Module, Migrationen (Upgrade-Pfad!),
Auth-Guards, Route-/i18n-Änderungen, Realm-Scopes und Compose-/Env-Drift bleiben unentdeckt, bis
ein Upgrade oder ein Security-Bump bricht.

Der eingebaute Hebel ist, dass das API-`main.js` **un-minifiziert mit Originalnamen** ausgeliefert
wird (73 240 Zeilen, verifiziert) → deterministisch greppbar. Das Frontend ist nur teil-diffbar
(monolithisches `index-*.js` ohne Sourcemaps) → String-Signal + Abgleich gegen crabbox-Screenshots.
Keycloak-Realm und Infra/Compose sieht die Fingerprint-Extraktion prinzipiell **nicht** (sie zieht
nur `main.js`/`package.json`/`assets/*`) → eigene Diff-Schritte (Plan §7f/§7g). Renovate/Trivy
liefert bei totem Upstream niemand → CVE-Signal wird an denselben Wochen-Cron angedockt (§7h).

## Ziel & Nicht-Ziele (YAGNI)

**Ziel:**
1. Neues Repo `linuxmuster-tracking` mit Layout `bin/` + `lib/` + `versions/<ver>/` + `reports/` +
   `state.json` + `.github/workflows/` (Plan §7 Kopf, §9.7).
2. **Release-Erkennung ohne `docker pull`** (§7a): anonymer ghcr-Token, `skopeo inspect` beider Images
   (`edulution-api`, `edulution-ui`) → `{version, revision, digest}` gegen `state.json`; **Digest
   mittracken** (fängt stille Re-Builds ohne SemVer-Bump).
3. **Extraktion** (§7b): `skopeo copy`/`crane export` → nur `main.js`+`package.json` (API) und
   `assets/index-*.{js,css}`+`index.html` (UI); kein Runtime.
4. **Backend-Fingerprint** (§7c): `js-beautify`-Normalisierung + Grep über den **korrigierten,
   in dieser Spec belegten Anker-Satz** → maschinenlesbares `fingerprint.json` (Module/Controller/
   Schemas/DTOs/Endpoints/Migrationen/Guards/Gateways/Crons/Queues).
5. **Dependency-Diff** (§7d): `__webpack_require__`-Import-Graph **plus** Root-Dep-Liste (nicht nur
   die geprunte `package.json`).
6. **Frontend-String-Signal** (§7e): aus dem `index-*`-Bundle Route-Pfade, i18n-Keys, `APPS.*`-Slugs,
   `appType: NATIVE`-Registrierungen, CSS-Variablen heben; TLDraw-False-Positive filtern.
7. **N-1→N-Diff** je Achse → strukturierte Deltas; **Baseline 2.0.200** eingefroren als Selbsttest-Fixture.
8. **Realm-Export-Diff** (§7f): Realm der laufenden crabbox-Instanz exportieren + gegen Baseline diffen.
9. **Infra-/Compose-/Installer-/Companion-Digest-Diff** (§7g): `docker-compose.yml.template` +
   `.env.default` + Companion-Digests + Installer-Repo.
10. **CVE-/Vulnerability-Signal** (§7h): Trivy/Grype über die gezogenen Images + `npm audit`-Signal,
    an denselben Cron angedockt (Findings in eigene Report-Sektion).
11. **Backlog-Report** (§7i): `report.sh` → `reports/<from>..<to>.md` in festen Sektionen; jeder Task
    mit Quell-Beleg (Datei:Zeile/Anker) → Draft-PR.
12. **Wochen-Cron** (§8-P1b): GitHub-Actions-Schedule, der die Kette fährt.

**Nicht-Ziele (bewusst, YAGNI):**
- **Kein** automatischer Nachbau. Die Pipeline erzeugt **Backlog**, nicht Code (§7 Kopf: „manueller
  Nachzug"). Umsetzung bleibt `feature-plan`/`feature-build`.
- **Kein** vollständiger Frontend-AST-Diff/Sourcemap-Rekonstruktion — nur String-Signal + Screenshot-
  Abgleich (§7-Grenzen: „Frontend nur teil-diffbar / Handarbeit gegen Live-Referenz").
- **Kein** eigener Renovate-/Dependabot-Betrieb hier — das ist Paket `p1-security-cve-track`
  (Repo `edulution-ui`); hier wird nur das **CVE-Scan-Signal an den Cron angedockt** (§7h) und in die
  Report-Pipeline eingehängt. Keine Doppel-Implementierung.
- **Kein** Digest-Pinning/Mirror der Companion-/Infra-Images — nur **Erkennung** von Digest-Drift
  (§7g); das Pinnen macht Paket `p0-supply-chain-inventory` bzw. Installer-/CI-Pakete.
- **Kein** Realm-Provisioning-Nachbau — nur **Diff-Erkennung** (§7f); die Baseline liefert
  `p0-realm-diff-baseline`.
- **Keine** DB-Migration, kein Produkt-Contract, kein Auth-Endpunkt — die Pipeline liest nur
  Artefakte, sie ändert `edulution-ui` nicht.
- **Kein** Multi-Arch/mehrere Tags — nur `:latest` beider Images pollen (§7a). Andere Tags on demand.

## Betroffene Komponenten & Dateien

**Planungsartefakte im `edulution-ui`-Repo (dieses Paket):**
- `docs/features/p1b-tracking-pipeline.md` — diese Spec.
- `tasks/p1b-tracking-pipeline.md` — das Ledger.

**Neues Repo `linuxmuster-tracking` (das Deliverable; alle Dateien neu → SPDX AGPL-3.0-or-later):**
- `lib/common.sh` — anon-ghcr-Token, `skopeo`/`jq`-Helfer, un-minified-Sanity-Guard, Pfad-/Version-Utils.
- `bin/poll.sh` — §7a: `skopeo inspect` beider Images → `state.json`-Vergleich → Trigger.
- `bin/extract.sh` — §7b: `skopeo copy`/`crane export` → `versions/<ver>/api/{main.js,package.json}` + `versions/<ver>/ui/{index-*.js,index-*.css,index.html}`.
- `bin/fingerprint-be.sh` — §7c: `js-beautify` + Anker-Grep → `versions/<ver>/fingerprint-be.json`.
- `bin/dep-diff.sh` — §7d: Import-Graph + Root-Deps → `versions/<ver>/deps.json`.
- `bin/fingerprint-fe.sh` — §7e: String-Signal aus `index-*` → `versions/<ver>/fingerprint-fe.json`.
- `bin/diff.sh` — N-1→N-Delta je Achse → `versions/<ver>/delta-*.json`.
- `bin/realm-diff.sh` — §7f: Realm-Export der crabbox-Instanz vs. Baseline.
- `bin/infra-diff.sh` — §7g: Compose-Template/`.env.default`/Companion-Digests/Installer-Repo.
- `bin/cve-scan.sh` — §7h: Trivy/Grype + `npm audit`-Signal.
- `bin/report.sh` — §7i: `reports/<from>..<to>.md` (Sektionen) + Draft-PR-Erstellung.
- `versions/2.0.200/…` — eingefrorene Baseline (Fingerprints + Deps + Realm-Snapshot + Infra-Snapshot).
- `state.json` — zuletzt gesehen `{api:{version,revision,digest}, ui:{version,revision,digest}}`.
- `.github/workflows/weekly-poll.yml` — Wochen-Cron, ruft die Kette + öffnet Draft-PR/Issue.
- `.github/workflows/self-test.yml` — PR-Gate: Fingerprint-Skripte gegen `versions/2.0.200/` = Soll-Zahlen.
- `README.md` — Runbook (Betrieb, Anker-Kalibrierung, Grenzen).

**Nur gelesen (Baseline-Quellen, nicht geändert):**
- `scratchpad/api-img/opt/edulution/api/main.js` (un-minifiziert, Originalnamen, ZEILEN-ANKER).
- `scratchpad/ui-img/…/usr/share/nginx/html/assets/index-*.js` + `index-*.css` + `index.html`.
- `scratchpad/real/*.png` (Screenshot-Abgleich für FE-Signal).

## Quelle des Solls (main.js-Zeilenanker / upstream / Baseline)

Die Pipeline hat **keinen Produkt-Runtime-Anker** (sie baut kein Feature nach) — ihr „Soll" ist das
Anker-Rezept aus Plan §7c/§7e **und** die an der echten Baseline `main.js` (2.0.200) gemessenen
Ist-Zahlen. Beim Bau des Fingerprint-Skripts sind das die **Verifikations-Fixtures**. Gemessen an
`scratchpad/api-img/opt/edulution/api/main.js` (73 240 Zeilen; `grep -oE … | wc -l`, occurrence-basiert,
zeilen-pack-robust):

| Achse | Anker (korrigiert, verifiziert) | Ist 2.0.200 |
|---|---|---|
| Module | `class [A-Za-z]+Module` | **38** |
| Controller | `class [A-Za-z]+Controller` | **39** |
| Schemas | `SchemaFactory\.createForClass` (NICHT `class *Schema` → nur 3) | **39** |
| DTOs | `class [A-Za-z0-9_]+Dto`, dedup (`… \| awk '{print $2}' \| sort -u`) | roh **242** / unique **241** |
| Endpoints | `[A-Z0-9_]+_ENDPOINT = '` | **41** |
| Migrationen (Namen) | `'[0-9]{3}-[a-z0-9-]+'` | **32** |
| Migrations-Runner | `runMigrations\(` | **12** |
| Guards | `class [A-Za-z]+Guard` | **9** (Plan „7+") |
| Gateways | `class [A-Za-z0-9]+Gateway` | **2** |
| Crons | **`schedule_1\.Cron\)\(`** (webpack-Form; NICHT `@Cron(` → 0) | **4** |
| Queues | **`new bullmq_1\.Queue\(`** (webpack-Form; NICHT `new Queue(` → 0) | **4** (+ `QueueEvents` separat) |

**Wichtige, hier belegte Korrekturen am Plan-§7c-Rezept** (die naiven Anker rauschen/liefern 0, weil
das Bundle webpack-transformiert ist):
- `@Cron(` existiert nicht als solches → die Dekorator-Form ist `(0, schedule_1.Cron)(` (4×; Zeilen
  4592/21158/41926/55386), plus die Handler-Methode `handleCron(`.
- `new Queue(` existiert nicht → `new bullmq_1.Queue(` (4×; Zeilen 10202/14181/21337/40545), daneben
  `new bullmq_1.QueueEvents(` (getrennt zählen).
- `registerAs('…')` (Plan §7c „aktiv schalten") ist in 2.0.200 als naive Form **nicht vorhanden**
  (nur `CacheModule.registerAsync(`) → Anker muss neu hergeleitet/kalibriert werden (Offene Frage),
  nicht blind gezählt.
- `@Public` ist als String zu unspezifisch (`Public` matcht 1136 Zeilen) → über den Metadaten-Key
  (`IS_PUBLIC_KEY` bzw. die `SetMetadata`-Form) kalibrieren (§Auth).

FE-Anker (§7e) gegen `index-*.js`/`index-*.css` der ui-img-Baseline: Route-Pfade (`/<slug>`), i18n-Keys
(eingebettetes en-Locale-JSON), `APPS.*`-Slugs (`apps.ts`: `dashboard`, `chat`, `mail`, … 40+),
`appType`-`native` (`appIntegrationVariant.ts:23`), CSS-Variablen (u. a. die 4 neuen
`--code-keyword/--code-number/--code-string/--code-title`). TLDraw ist **kein** 2.0-Neusignal
(tldraw+@tldraw/sync bereits in 1.6.266) → als False-Positive filtern; sauberes „neue Seite"-Beispiel
= `WikiPage`.

Rescue-Branches (`upstream/*` im `edulution-ui`-Repo) sind hier **nicht** Soll-Quelle (kein Feature-
Nachbau), dienen aber als **Korrelations-Beleg**: erkennt der BE-Diff z. B. ein neues `class ChatModule`,
verlinkt der Report auf `upstream/1683-chat-add-basic-chat-ui` etc. (§7i „Quell-Beleg").

## Datenmodell / API / Migrationen

**Keine** DB-Migration, **kein** Produkt-Contract, **kein** `schemaVersion`-Bump — das Paket fasst
`edulution-ui` nicht an. „Datenmodell" der Pipeline ist rein file-basiert:
- `state.json` (Schema: `{ "<image>": { "version": str, "revision": str, "digest": "sha256:…", "seenAt": ISO8601 } }`).
- `versions/<ver>/fingerprint-be.json` / `fingerprint-fe.json` / `deps.json` (stabile, sortierte Key-Sets
  → deterministischer Diff).
- Delta-/Report-Dateien.

**Contract-Drift** ist hier das **beobachtete Objekt**, nicht ein Risiko der Pipeline selbst: der Report
meldet Contract-Drift (neue DTOs/Endpoints/Migrationen/Realm-Scopes) als Backlog-Items. Der einzige
interne Contract der Pipeline ist die Baseline-Fixture 2.0.200 ↔ die Anker-Zahlen (self-test.yml hält
ihn ehrlich).

## Auth / Guards

Kein neuer Produkt-Endpunkt, also **kein Guard-Nachbau**. Zwei Auth-Bezüge trotzdem relevant:
1. **Beobachtungs-Achse „Auth-Contract"**: `fingerprint-be.sh` muss Guards (`class [A-Za-z]+Guard` → 9)
   **und** `@Public`-Marker mittracken (Plan §3.2/§7c), damit ein neu hinzugekommenes
   `@UseGuards(AdminGuard)` bzw. ein `@Public()` im N-1→N-Diff sichtbar wird — das ist die einzige
   Achse, die Auth-Bypässe fängt, die Route-/Visual-Diff nicht sehen. Der `@Public`-Anker braucht
   Kalibrierung (s. o. `IS_PUBLIC_KEY`).
2. **Repo-eigene Berechtigung**: der Poll nutzt einen **anonymen** ghcr-Token (public read, kein Secret);
   die Draft-PR-/Issue-Erstellung nutzt den Actions-Token bzw. eine fine-grained-App (§Secrets).

## Externe Integrationen

- **ghcr.io** (`ghcr.io/edulution-io/edulution-api:latest`, `…/edulution-ui:latest`): anonymer
  Token-Endpoint + `skopeo inspect`/`copy` (Registry v2 API). Nur Lesezugriff.
- **`edulution-io/edulution-linuxmuster-webinstaller`** (bzw. das Installer-Repo): `git`/GitHub-API-
  Lesezugriff für §7g (Compose-Template/`.env.default`/Companion-Refs). Read-only.
- **Companion-Image-Registries** (die in Compose referenzierten Images): `skopeo inspect` nur für den
  **Digest** (§7g), kein Pull.
- **Laufende crabbox-Instanz**: Realm-Export via Keycloak-Admin-API/`kcadm.sh` (§7f) — nur für den
  Realm-Diff, nur bei aktivem Voll-Stack.
- **Trivy/Grype-DB** (§7h): Vulnerability-DB-Fetch beim Scan.
- **GitHub (faircomp/linuxmuster-tracking)**: Draft-PR/Issue mit dem Report (`gh`).

Alle Egress-Ziele sind read-only bzw. in das eigene Tracking-Repo schreibend; **kein** Egress in
`edulution-ui`-Laufzeit.

## Secrets / Env / master.key

- **Kein `master.key`**, keine Produkt-Secrets. Der ghcr-Poll ist **anonym** (public images) → kein Token
  nötig für §7a–d.
- **Realm-Export (§7f)** braucht Keycloak-Admin-Credentials **der crabbox-Instanz** — diese kommen aus
  der crabbox-/`.env`-Provisionierung und werden **nie** ins Tracking-Repo committet; der Report
  enthält nur den **Struktur-Diff**, keine Secret-Werte (Realm-Export vor dem Commit durch einen
  Redaction-Filter: Client-Secrets/Passwörter/Keys raus — analog `p0-realm-diff-baseline`).
- **Draft-PR/Issue**: bevorzugt eine eigene GitHub-App / fine-grained-PAT (Plan-Empfehlung §0/§9), nicht
  der Default-`GITHUB_TOKEN` mit weitem Scope; als Repo-Secret `TRACKING_PR_TOKEN`.
- `.gitignore` im Tracking-Repo hält `versions/*/api/main.js` (groß) optional aus dem Repo (nur die
  abgeleiteten `*.json` versionieren) — Design-Entscheidung, s. Offene Fragen.

## Trade-offs & Alternativen (mit Empfehlung)

1. **Occurrence-Count (`grep -oE | wc -l`) vs. Line-Count (`grep -c`).** Line-Count bricht, sobald
   `js-beautify` zwei Statements auf eine Zeile packt oder umgekehrt. **Empfehlung: occurrence-basiert
   zählen** (robust gegen `js-beautify`-Versionsdrift), `js-beautify` nur für **stabile Zeilen-Anker im
   Report** (Menschen-Lesbarkeit) verwenden. So ist der Zahl-Diff tool-versions-unabhängig.
2. **`skopeo` vs. `crane` für Extraktion.** Beide können ohne Runtime nur Layer ziehen. **Empfehlung:
   `skopeo copy` → oci-layout + `tar`-Selektion** (kein Docker-Daemon nötig, CI-freundlich); `crane
   export` als Fallback. Beide in `lib/common.sh` kapseln.
3. **Anker fest verdrahtet vs. externe Anker-Config.** Da Plan §7 die Anker als „das Rezept" führt und
   sie sich webpack-formabhängig ändern (s. Cron/Queue/registerAs-Korrektur), **Empfehlung: Anker in
   `lib/anchors.sh` (eine Datei, `const`-artig) auslagern**, damit Kalibrierung ein 1-Zeilen-Diff mit
   Test ist, nicht chirurgische Skript-OP.
4. **Alles-in-einem-Skript vs. Kette kleiner Skripte.** **Empfehlung: kleine Skripte + `poll.sh` als
   Orchestrator** — jedes einzeln testbar (self-test.yml), Report komponiert die JSONs. Deckt sich mit
   der Task-Granularität.
5. **`main.js` im Repo versionieren vs. nur Fingerprints.** Das Roh-`main.js` ist groß (~mehrere MB).
   **Empfehlung: nur die abgeleiteten `*.json` + `package.json` committen**, `main.js`/`index-*.js` als
   CI-Artefakt vorhalten (reproduzierbar via `extract.sh` aus dem gepinnten Digest). Hält das Repo
   schlank und lizenzrechtlich sauber (kein Upstream-Bundle im Fork-Repo). (Offene Frage.)
6. **Realm-Diff im selben Repo vs. bei `p0-realm-diff-baseline`.** Die Baseline gehört zu P0; hier nur
   der **wiederkehrende Diff**. **Empfehlung: `realm-diff.sh` importiert die P0-Baseline** (submodule/
   copy), dupliziert nicht die Provisioning-Logik.

## Risiken & Rollback

- **R-a — Anker-Fäulnis bei un-minifiziert→minifiziert-Wechsel.** Bleibt `main.js` in einem Release
  nicht mehr un-minifiziert (Namen weg), kollabieren die Grep-Anker auf ~0. **Gegenmaßnahme:** harter
  **Sanity-Guard** in `common.sh` (Zeilenzahl > Schwelle **und** `class *Module`-Count in plausibler
  Range) → Pipeline bricht mit klarer Meldung ab, statt still „0 Änderungen" zu melden (Plan §7-Grenzen).
- **R-b — Webpack-Form-Drift** (wie Cron/Queue schon gezeigt): neue Bundler-Version ändert die
  Dekorator-/Import-Form → Anker zählt 0. **Gegenmaßnahme:** self-test.yml gegen 2.0.200-Fixture bricht
  sofort, sobald ein Anker gegen die eingefrorene Zahl abweicht → Signal „Anker neu kalibrieren", nicht
  „nichts passiert".
- **R-c — FE False-Positives** (TLDraw etc.): String-Signal ist grob. **Gegenmaßnahme:** Allowlist
  bekannter False-Positives (`tldraw`, `@tldraw/sync`) + Pflicht-Abgleich gegen `scratchpad/real/*.png`
  im Report (§7e „immer gegen Screenshot-Diff gegenprüfen").
- **R-d — Realm-Export leakt Secrets** ins Repo. **Gegenmaßnahme:** Redaction-Filter (§Secrets) vor
  jedem Commit; self-test prüft, dass keine `secret`/`credential`/`privateKey`-Felder im committeten
  Diff stehen.
- **R-e — Cron rauscht** (jede Woche ein leerer/gleicher Report). **Gegenmaßnahme:** Poll nur bei
  **Digest-Änderung** weiterlaufen lassen (§7a); Report nur bei nicht-leerem Delta committen/PRen.
- **Rollback:** eigenes, isoliertes Repo — Rollback = Revert/Repo-Löschung; **null Wirkung auf
  `edulution-ui` oder die Produktion** (die Pipeline schreibt nur in ihr eigenes Repo).

## Doku-Impact (Augenmaß)

- `linuxmuster-tracking/README.md`: Betriebs-Runbook (Poll manuell auslösen, Anker kalibrieren, Report
  lesen, Grenzen). **Deutsch** (Ops-Zielgruppe = Fork-Maintainer).
- Cross-Ref in `PLAN-openedulution-fork.md` §7/§8-P1b: „umgesetzt in `linuxmuster-tracking`" (1 Zeile,
  wenn das Repo steht).
- Keine Produkt-Doku in `edulution-ui/docs/` betroffen (kein Nutzer-Feature).

## i18n-Impact (DE+EN)

**Keiner am Produkt.** Die Pipeline erzeugt keine UI-Strings, keine `apps/frontend`-Locales → keine
DE/EN/FR-Keys, `check-translations` nicht betroffen. Report-/README-Sprache ist **Deutsch** (Ops-Tool
für den Maintainer). Der DoD-Header „i18n DE+EN gepflegt" ist für dieses Paket durchgängig **N/A
(Ops-Tooling)** — in jeder Task explizit als `i18n: keine` vermerkt.

## Offene Fragen

1. **`registerAs`-Anker (§7c „aktiv schalten"):** Die naive Form fehlt in 2.0.200 (nur
   `registerAsync`). Ist die Config-Factory-Form `(0, config_1.registerAs)(` gemeint, oder nutzt 2.0
   ein anderes Config-Muster? → an der Baseline final herleiten, bevor der Anker aktiv geschaltet wird
   (sonst „0" ohne Aussagekraft). *Design-Entscheidung, gehört nicht in eine Task-Assertion.*
2. **`@Public`-Kalibrierung:** über `IS_PUBLIC_KEY`, `SetMetadata(IS_PUBLIC_KEY`, oder die konkrete
   Dekorator-Fabrik? Welche Form ist stabil greppbar und zählt genau die public-Routen?
3. **Roh-Bundle im Repo (Trade-off 5):** nur `*.json` versionieren (schlank, empfohlen) **oder**
   `main.js`/`index-*.js` mit-committen (voller Offline-Diff, aber MB-schwer + Upstream-Bundle im
   Fork-Repo)? Lizenz-/Größen-Abwägung.
4. **PR- vs. Issue-Ausgabe:** Draft-PR mit `tasks/`-Ledger-Stub (näher an `feature-build`) **oder**
   Issue mit Report-Body (leichter)? Empfehlung Draft-PR, aber abhängig vom Backlog-Workflow.
5. **Cron-Frequenz & -Ort:** wöchentlich reicht (§8-P1b), aber Actions-Cron im Tracking-Repo vs.
   externer Scheduler? Und läuft der Realm-/Voll-Stack-Diff (§7f) im selben Cron (braucht crabbox) oder
   als getrennte, manuell/seltener getriggerte Achse (Plan §7f „eigener Pipeline-Schritt")?
6. **Anker-Satz-Erweiterung:** §7c nennt `class *Gateway`/`@Cron`/`new Queue`/`registerAs` als „aktiv
   schalten". Gateways(2)/Crons(4)/Queues(4) sind belegt; sollen sie ab v1 hart im Fingerprint stehen
   oder erst nach Kalibrierung von registerAs/@Public gemeinsam scharf geschaltet werden?
7. **Repo-Name:** `linuxmuster-tracking` (Fork-Konvention) vs. Plan-Arbeitstitel `openedulution-tracking`
   — festzurren mit dem Rebrand-Paket (`p1-rebrand`).
