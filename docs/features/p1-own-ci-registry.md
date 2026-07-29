# p1-own-ci-registry — Eigene CI-Pipeline & Container-Registry (Härtung)

Phase P1 · slug `p1-own-ci-registry` · Abhängt von: `p1-rebrand`
Kalibrierung: **P1 = voll ausführbare, konkrete Tasks** (nächste Wochen).

## Problem / Motivation

Die vom Upstream geerbte CI (`.github/workflows/`) ist für den Fork an mehreren Stellen
funktional kaputt oder unsicher — alle Punkte im Audit verifiziert (Master-Plan §2.1–§2.4,
§5.1, §5.5, §6, §8-P1, §9, R6, R10, Findings 7/13/14):

1. **GHCR-Push 403 auf frischer Org (Pflicht).** `container-build.yml`, `api-tag.yml`,
   `frontend-tag.yml` pushen via `secrets.GITHUB_TOKEN` (`container-build.yml:100/104`), haben
   aber **keinen** `permissions:`-Block — anders als `publish-ui-kit.yml:14–16` und der
   Installer-`build-docker.yml:11–13` (`packages: write`). Neue Orgs stehen default auf
   „read-only token" → der erste Release-Push **403t still**.
2. **Release ohne Green-Gate (Pflicht).** `build-and-test.yml` läuft nur `on: pull_request`
   (`push: false`); `container-build.yml` läuft `on: push tags` und baut/pusht **ohne**
   vorgeschaltetes lint/test. Ein Bumper-Tag verschifft Images auch, wenn der Default-Branch
   nie grün war (die Merge-Gates sichern nur den PR).
3. **Build-Metadaten fehlen → Health = „unknown" (Pflicht).** Die Health/Version-Config liest
   `process.env.COMMIT_SHA || 'unknown'` usw. (`main.js:59718–59722`), aber **beide** Dockerfiles
   haben **kein** `ARG`/`LABEL`, und `container-build.yml:109–111/159–161` übergibt **tote**
   `buildId/version`-Build-Args, die die Runtime nie sieht. Kein `docker/metadata-action`. Der
   AGPL-§6-`org.opencontainers.image.source`-Label fehlt ebenfalls.
4. **Version-Bumper auf toter Netzint-GitHub-App (kritisch, R6/§9.4).**
   `bump-patch-version-tag.yml`/`bump-minor-version-tag.yml`/`auto-merge-master-back-in-dev.yml`
   nutzen `vars.VERSION_BUMPER_APPID`/`secrets.VERSION_BUMPER_SECRET` (Netzint-App, für uns tot).
   `bump-minor` pusht den Tag zudem mit `secrets.GITHUB_TOKEN` (Zeile 39) — GitHub unterdrückt
   bewusst Workflow-Trigger für Events aus dem Default-`GITHUB_TOKEN` → der gepushte Tag würde
   `container-build.yml` **nicht** auslösen, die Auto-Tag→Build-Kette stoppt still.
5. **Redundante/veraltete Workflows.** Drei Workflows auf `v*.*.*` (`container-build` +
   `api-tag` + `frontend-tag`) = Race auf `:latest`. `auto-merge-master-back-in-dev.yml` und der
   `refs/heads/master`-Zweig der Tag-Generierung stammen aus dem toten `dev`/`master`-Dual-Modell
   (Fork-Default-Branch ist `main`). `publish-ui-kit.yml` publiziert nach `@edulution-io` — eine
   Registry, die wir nicht besitzen (ui-kit bleibt Source-Alias, keine npm-Dependency).
6. **Keine SHA-gepinnten Actions (Supply-Chain, R10/Finding 13).** Alle `uses:` sind auf
   bewegliche Tags (`@v4.2.2`, `@v3`, …) gepinnt — mutable Refs, klassischer Supply-Chain-Vektor.

## Ziel & Nicht-Ziele (YAGNI)

**Ziel:** Die überlebende `container-build.yml` baut und pusht **beide** Images grün-gegated und
mit `packages: write` nach `ghcr.io/faircomp/…` (finaler Image-Name aus `p1-rebrand`), setzt
korrekte OCI-Labels + Runtime-Build-Metadaten (Health nicht mehr „unknown"), und der
Version-Bumper läuft auf einem **eigenen** contents:write-Token (nicht `GITHUB_TOKEN`), strikt
1 Tag/Push. Alle Actions SHA-gepinnt. Erst-Push-Smoke-Test dokumentiert.

**Nicht-Ziele (bewusst raus):**
- **Registry-/Image-Namen-Strings** (`edulution-io` → `faircomp`, Image-Basename) — gehören zu
  `p1-rebrand` (Dependency). Dieses Paket **härtet** die CI, es benennt sie nicht um.
- **`nx.json defaultBase: dev → main`** und die Branch-Modell-Umstellung — `p1-rebrand`/P0
  (Fork-Default-Branch ist laut Kontext bereits `main`).
- **`addLicenseHeader.ts` → AGPL-SPDX** — `p1-rebrand` (dieses Paket setzt es voraus).
- **§13-Versionsfeature (UI-Anzeige + dediziertes `/version`-Endpoint)** — eigenes P1-Paket.
  Dieses Paket liefert nur die **Datenquelle** (Env/Config), auf der §13 aufbaut.
- **Security-/CVE-Track (Renovate/Dependabot/Trivy/Grype als CI-Gate, R10/§5.1)** — eigenes,
  durchlaufendes Arbeitspaket. Hier nur SHA-Pinning der Actions als Teilaspekt.
- **Infra-Image-Pins** (`mongo:7`, `redis`, `traefik`, `keycloak`, `postgres` in den
  Installer-Compose-Templates) — Installer-/Supply-Chain-Paket.
- SBOM/Provenance/`cosign`-Signaturen, GHCR-Retention-Job — spätere Supply-Chain-Ausbaustufe.

## Betroffene Komponenten & Dateien (konkrete Pfade)

- `.github/workflows/container-build.yml` — überlebender Release-Build (permissions, Green-Gate,
  metadata-action, echte Build-Args, SHA-Pins).
- `.github/workflows/api-tag.yml` · `.github/workflows/frontend-tag.yml` — **löschen** (Duplikate).
- `.github/workflows/auto-merge-master-back-in-dev.yml` — **löschen** (totes dev/master-Modell).
- `.github/workflows/bump-patch-version-tag.yml` · `.github/workflows/bump-minor-version-tag.yml`
  — Bumper-Token + Trigger + Concurrency.
- `.github/workflows/publish-ui-kit.yml` — deaktivieren (nur `workflow_dispatch`) / entfernen.
- `.github/workflows/build-and-test.yml` — SHA-Pins (sonst inhaltlich unverändert; Referenz für
  die Gate-Schritte).
- `apps/api/Dockerfile` · `apps/frontend/Dockerfile` — `ARG`/`ENV`/`LABEL` (Build-Metadaten +
  OCI-Labels).
- `apps/api/src/config/configuration.ts` (+ neue `configuration.spec.ts`) — Config-Factory auf den
  2.0-Contract (`version/commitSha/buildDate/buildNumber`) erweitern.
- Doku: kurzer CI-/Release-Runbook-Abschnitt (Secret-Provisioning, Org-Setting, Erst-Push-Smoke).

**Nicht angefasst (Allowlist / andere Pakete):** hartkodierte Image-Name-Strings (rebrand),
`package.json`-`build:docker:*`-Scripts (rebrand), Keycloak/Realm, DB-Schemas, App-Config-Shapes.

## Quelle des Solls

Dies ist **keine** UI-Rekonstruktion aus einem Rescue-Branch/Screenshot, sondern eine
Vorwärts-Härtung der forkeigenen Infrastruktur. Belege:

- **Health-/Version-Env-Contract (SOLL exakt):** `main.js:59718–59722`
  (`version: process.env.APP_VERSION || rootPackage.version`, `commitSha: process.env.COMMIT_SHA
  || 'unknown'`, `buildDate: … BUILD_DATE …`, `buildNumber: … BUILD_NUMBER …`). Das ist der
  2.0.200-Stand der Config-Factory, die `apps/api/src/config/configuration.ts` (1.6: nur
  `{ version }`) erreichen muss.
- **Tote Build-Args / fehlende ARG/LABEL:** `container-build.yml:109–111` (Frontend) und
  `:159–161` (API) übergeben `buildId`/`version`; die Dockerfiles deklarieren sie nicht → tot.
- **permissions-Lücke:** `container-build.yml:100/104` (Login via `secrets.GITHUB_TOKEN`, kein
  `permissions:`-Block). Positiv-Referenz: `publish-ui-kit.yml:14–16` (`permissions: {contents:
  read, packages: write}`).
- **Bumper-Deadapp:** `bump-patch-version-tag.yml:19–20`/`bump-minor-version-tag.yml:16–17`
  (`VERSION_BUMPER_APPID`/`_SECRET`); `bump-minor…:38–39` (Push via `GITHUB_TOKEN`).
- **Master-Plan:** §2.1 (permissions/Smoke), §2.2 (Bulk-Tag → 1 Tag/Push + concurrency), §2.3/§9.4
  (Bumper auf PAT/App, nicht `GITHUB_TOKEN`), §2.4 (`image.source`-Label, AGPL §6), §5.1/§5.5
  (Green-Gate, metadata-action, Build-Metadaten), §6 (Test-/Release-Strategie), §8-P1-Zeile,
  R6, R10, Anhang-Findings 7/13/14.
- **Kein** `upstream/<rescue-branch>`, **kein** `scratchpad/real/*.png` für dieses Paket.

## Datenmodell / API / Migrationen

- **DB-Migration: nein.** Keine Mongoose-Schema-Änderung, kein `schemaVersion++`.
- **Neue Routen/DTOs: nein.** `configuration.ts` ist eine Config-Factory (kein Controller).
- **Contract-Drift (relevant):**
  1. **Build-Metadaten-Contract:** Dockerfile `ARG`→`ENV` (`COMMIT_SHA/BUILD_DATE/BUILD_NUMBER/
     APP_VERSION`) → Runtime `process.env.*` → `configuration.ts` → (später §13-Endpoint/FE).
     Alle vier Glieder müssen dieselben Env-Namen verwenden (SOLL `main.js:59718–59722`).
  2. **CI↔Image↔Installer-Contract:** `container-build.yml` erzeugt `ghcr.io/faircomp/…:<tag>`;
     der `openedulution-installer` pinnt genau diesen Tag (Master-Plan §5.2 Punkt 1). Image-Name
     kommt aus `p1-rebrand` — dieses Paket ändert ihn **nicht**, referenziert nur den Ist-Wert.

## Auth / Guards

Keine neuen HTTP-Routen → **keine Guards zu portieren**. `configuration.ts` ist nicht
öffentlich erreichbar; die Health-Controller-Guards bleiben unverändert. Die neuen Config-Felder
werden erst durch das §13-Paket über ein Endpoint exponiert — dessen Guard ist §13-Sache.
CI-seitig: das `permissions:`-Prinzip ist Least-Privilege — `contents: read, packages: write`
auf `container-build.yml`; der Bumper braucht `contents: write` (nur dort).

## Externe Integrationen

- **GitHub Container Registry (`ghcr.io`)** — Push-Ziel; Auth via `secrets.GITHUB_TOKEN` +
  `permissions: packages: write` (kein Extra-Secret nötig, solange Org-Setting stimmt).
- **GitHub Actions Marketplace** — `actions/checkout`, `actions/setup-node`, `actions/cache`,
  `docker/login-action`, `docker/build-push-action`, `docker/setup-buildx-action`,
  `docker/metadata-action`, `actions/create-github-app-token` → **alle SHA-pinnen**.
- **GitHub App / fine-grained PAT** — für den Version-Bumper (contents:write).
- **Downstream:** `openedulution-installer` konsumiert den Image-Tag (Contract, s. o.).
- Keine Berührung von linuxmuster-api7 / Keycloak / WebDAV / Mailcow / DockerService.

## Secrets / Env / master.key

- **Neues CI-Secret (Bumper):** empfohlen **fine-grained PAT** `RELEASE_BUMP_TOKEN`
  (`contents: write` auf `faircomp/linuxmuster-ui`) — einfachste Least-Privilege-Variante.
  Alternative: **eigene GitHub App** (`vars.RELEASE_BUMP_APP_ID` + `secrets.RELEASE_BUMP_APP_KEY`
  via `create-github-app-token`) — feiner granular, mehr Setup (offene Frage, s. u.).
  **Nie `GITHUB_TOKEN`** für den Bumper-Push (Trigger-Suppression).
- **Org-/Repo-Setting:** „Actions → Workflow permissions" muss `packages: write` erlauben bzw.
  wird durch den expliziten `permissions:`-Block überschrieben (der Block ist der Fix).
- **Neue Runtime-Env (nicht geheim, ins Image gebacken):** `COMMIT_SHA`, `BUILD_DATE`,
  `BUILD_NUMBER`, `APP_VERSION` — reine Build-Metadaten, keine PII/Secrets.
- **master.key: nicht berührt.** Keine Kopplung an `MASTER_ENCRYPT_KEY`/gewrappte User-Keys.

## Trade-offs & Alternativen (mit Empfehlung)

- **Green-Gate: Inline-Gate-Job vs. reusable `workflow_call` vs. Branch-Protection.**
  - *Inline-Gate-Job in `container-build.yml`* (Gate läuft auf dem getaggten Commit, Build-Jobs
    `needs:` ihn) — **Empfehlung.** Kleinster Blast-Radius (`build-and-test.yml` unangetastet),
    unabhängig verifizierbar, gated genau den Release-Build (Tags sind keine PRs → Branch-
    Protection greift dort nicht).
  - *Reusable Workflow* (`ci-checks.yml`, `on: workflow_call`, von PR-CI **und** Release-CI
    genutzt) — DRY-sauberer, aber größerer Umbau + berührt `build-and-test.yml`. Als Folge-
    Refactor sinnvoll, hier YAGNI.
- **Bumper-Token: fine-grained PAT vs. eigene GitHub App.** PAT = schnell, an eine Person
  gebunden (Bus-Factor/Rotation). App = Least-Privilege, überlebt Personalwechsel, mehr Setup.
  **Empfehlung: PAT als Bootstrap jetzt**, App-Migration im Ops-Runbook als Folgeschritt
  vermerken (Escrow-Thema, Master-Plan §11 „Bus-Factor").
- **OCI-Labels: nur Dockerfile-`LABEL` vs. nur `metadata-action` vs. beide.** **Empfehlung:
  beide, disjunkt** — Dockerfile setzt `ENV` (für Runtime-Health, essenziell) + statische Labels
  (`title/description/licenses/source`); `metadata-action` liefert Tags + die dynamischen
  `revision/created/version`-Labels an `build-push-action` (`labels:`). Kein Doppel-Label-Konflikt,
  wenn die dynamischen Labels nur aus einer Quelle kommen.
- **Auto-Patch-Bump beibehalten?** Unter Single-`main` würde `on: push: branches: [main]` je
  Commit patchen → 1 Release-Build/Commit. Siehe offene Frage.

## Risiken & Rollback

- **CI-only + Config; keine DB-Migration → Rollback = `git revert`** der jeweiligen Commits bzw.
  vorheriger Image-Tag. Irreversibilität: keine.
- **R: Green-Gate blockiert alle Releases**, falls falsch verdrahtet → Mitigation: `workflow_
  dispatch` als Notausgang bleibt erhalten; Gate-Schritte = exakt die aus `build-and-test.yml`.
- **R: Falscher Pin-Digest** → Action failt hart → Mitigation: SHAs aus offiziellen Release-Tags,
  Versions-Kommentar hinter jedem Pin, ein Smoke-Run.
- **R: Bumper-Token fehlt/zu wenig Scope** → Tag-Push 403 oder kein Trigger → Mitigation:
  Erst-Push-Smoke-Test (eigene Task), Fehlerbild im Runbook dokumentiert.
- **R: Contract-Drift zu `p1-rebrand`** (Image-Name doppelt gepflegt) → Mitigation: dieses Paket
  ändert **keine** Image-Name-Strings; referenziert nur den rebrand-Ist-Wert. Reihenfolge:
  rebrand **vor** diesem Paket.
- **R: End-to-End-CI-Verhalten ist auf der crabbox nicht prüfbar** (kein GitHub-Actions-Runner).
  → Per-Task-Verify = Struktur/Parse/Pins/Unit-Test remote; die **einzige** echte E2E-Prüfung ist
  ein realer Tag-Push gegen `faircomp` (Erst-Push-Smoke, letzte Task, manuell/ops).

## Doku-Impact (Augenmaß)

Externe/operator-sichtbare Änderungen → **kurzer** CI-/Release-Runbook-Abschnitt (deutsch):
benötigtes Secret `RELEASE_BUMP_TOKEN` (+ App-Alternative), Org-Setting `packages: write`,
Image-Referenzen, die vier Build-Metadaten-Env-Vars und wo sie im Health auftauchen,
Erst-Push-Smoke-Prozedur. Kein umfangreiches Doku-Set — proportional zum Infra-Umfang. Die
übrigen Tasks sind intern (CI-YAML, Dockerfile, Config) → „Doku: keine (intern)".

## i18n-Impact (DE+EN)

**Keine.** Dieses Paket fügt keine UI-Strings/Übersetzungs-Keys hinzu. `check-translations`
bleibt unberührt.

## Offene Fragen

1. **Bumper-Token-Form:** fine-grained PAT (`RELEASE_BUMP_TOKEN`, Empfehlung/Default in den
   Tasks) **oder** eigene GitHub App? App = Least-Privilege + Bus-Factor-fest, mehr Setup.
2. **Auto-Patch-Bump-Policy unter Single-`main`:** `on: push: branches: [main]` (Patch je Commit,
   Continuous-Delivery-Stil) **oder** nur `workflow_dispatch` (bewusstes Release)? Default in den
   Tasks: Trigger von `dev` → `main` umbiegen und beibehalten; die Policy-Entscheidung hier
   festhalten. Betrifft, wie oft ein Release-Build läuft.
3. **`publish-ui-kit.yml`: löschen oder auf `workflow_dispatch` einfrieren?** ui-kit bleibt
   Source-Alias (Master-Plan §4), publiziert aktuell nach nicht-eigenem `@edulution-io`.
   Überschneidet sich mit `p1-rebrand` (Namespace) → Ownership klären (Empfehlung: hier auf
   `workflow_dispatch` einfrieren, Namespace-Repoint in rebrand).
4. **Zentrale `env: REGISTRY_ORG`/`IMAGE_*` in den Workflows** — führt `p1-rebrand` sie ein
   (dann referenziert die metadata-action-Task sie) oder dieses Paket? Empfehlung: rebrand hebt
   die 12 hartkodierten Strings in eine zentrale `env:`; dieses Paket nutzt sie.
5. **`org.opencontainers.image.licenses`-Wert:** `AGPL-3.0-or-later` (Fork-Lizenz) bestätigen.
