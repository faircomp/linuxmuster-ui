# Master-Plan (final, v2 — integrierte Fassung): openedulution — Eigener 2.0-Fork von edulution.io

Stand: 2026-07-14 · Fork-Basis v1.6.266 (`36050641d`, Branch `dev`, 2026-02-20) · Design-/Verhaltensreferenz Image 2.0.200 (`7356c68`) · Lizenz AGPLv3

> **v2-Hinweis:** Diese Fassung hat die 24 im Vollständigkeits-Audit bestätigten Befunde direkt in die jeweiligen Abschnitte eingearbeitet (früher als „FINALER PLAN-NACHTRAG" angehängt, jetzt entfernt). Änderungsübersicht ganz am Ende (`Änderungslog (v2)`).

## TL;DR / Empfehlung

Der Fork ist **machbar**; das Backend ist aus dem un-minifizierten `main.js` (73.240 Zeilen, alle Originalnamen lesbar) sehr gut rekonstruierbar — alle zitierten Zeilen-Anker und Kernzahlen (38 Module, 39 Controller, 58 Services, 2 Gateways, 241 DTOs, 39 Mongoose-Schemas) sind verifiziert. Der teuerste und riskanteste Teil ist das **Frontend** (Wiki-Editor 1,35 MB TipTap/ProseMirror/KaTeX ohne Sourcemaps, Calendar-Grid + `rrule`, **neu erkannt: voller nativer Mail-Webmail-Client + Mailcow-Admin**): realistisch **~55–90 PT**, nicht 25–40. Drei bisher fehlende **P0-Arbeitspakete** entscheiden über die Prämisse „rein additiv": **(1) DB-Migrations-Parität** (Upgrade-Pfad 1.6-DB → 2.0-DB), **(2) die On-Demand-Container-/App-Store-Engine** (`DockerService`), **(3) die externe Lieferkette** (~13 Companion-Images + **3 Laufzeit-GitHub-Fetches** [2× SOGo-Theme-CSS + `edulution-plugins`-App-Store-Compose] + Netzint-Lizenzserver). **Neu als P0-kritisch hinzugekommen:** **`master.key` gehört ins Backup-/Rollback-/DR-Set** (die bisher dokumentierte Rollback-Prozedur war datenverlust-gefährlich), **Auth-Guards/`@Public` gehören in den Nachbau-Contract** (Auth-Bypass-Risiko), **Mail ist ein voller Webmail-Client**, nicht ein Config-Split (BE 36 statt 10 Routen). **Neue durchlaufende Tracks:** DR-Runbook, Security-/CVE-Track (Renovate/Dependabot/Trivy — Upstream tot = niemand liefert Security-Bumps), CI-Härtung (`permissions:`-Block, Green-Gate). Realistische Zeit bis Feature-Parität (P0–P5, ohne MobileDevices/Satellites) solo: **~35–48 Wochen Vollzeit-äquivalent (~8–11 Monate) bei nativem Mail-Client** (SOGo-Iframe-Beibehaltung spart ~3–6 Wochen → ~30–40); bei Teilzeit-Kapazität streckt sich die Kalenderzeit entsprechend. **Empfehlungen:** eigener Produktname **ohne** die Marke „edulution" (Arbeitstitel `openedulution` nur intern), Single-`main`-Branch, Versionsschema `2.0.x`, Bumper auf eigene GitHub-App/fine-grained-PAT (nicht `GITHUB_TOKEN`), MobileDevices + Satellites dauerhaft zurückstellen. **Erster Schritt:** Backup-Bundle → Basis-Drift-/Migrations-Analyse → Chat-Pilot.

---

## 1. Ziel & Umfang

**Ziel:** Ein eigenständiger, dauerhaft wartbarer Fork der edulution.io Community Edition (AGPLv3), funktional und optisch auf Stand **2.0.200**, in **eigenen Git-Repos**, mit **eigenem Installer**, **eigener Container-Registry** und **eigenem Branding** — als Fundament für Kevins eigene Weiterentwicklung. Verifiziert gegen echten linuxmuster.net (LMN 7.3 + linuxmuster-api7) über die crabbox-VM.

**In Scope:**
1. Fork-Setup auf Basis v1.6.266 (`36050641d`) unter Bewahrung der geretteten History.
2. **Basis-Drift-Analyse:** Messen, ob/wie die 32 Bestandsmodule, Shared-`libs/`, `appconfig`-Shapes, Guards und der SSE-Contract sich 1.6→2.0 verändert haben (die These „additiv" gilt bewiesen nur auf Modul-*Ebene*).
3. **DB-Migrations-Parität** über alle Modelle (Upgrade-Pfad 1.6→2.0), inkl. `010/011/012`.
4. Nachbau der neuen Backend-Module/Controller aus `main.js`.
5. Neu-/Nachbau der neuen Frontend-Seiten (teils aus geretteter Source, überwiegend gegen Live-Referenz).
6. **App-Store-/On-Demand-Container-Engine** (`DockerService`) lauffähig halten + verifizieren; **Lieferketten-Inventar** aller `edulution-io`-Außenreferenzen (inkl. der **3** Laufzeit-Fetches).
7. Eigener Build (eigene ghcr-Org), eigener Installer, eigenes Rebranding, **Ersatz des Netzint-Lizenzservers**.
8. **Keycloak-Realm-Pflege** (Template-Diff + Provisioning-Skripte), **Test-Portierung**, **DB-Rollback-/DR-Konzept**.
9. Wiederkehrende crabbox-Verifikation; automatische Image-Diff-Pipeline für künftige 2.0.x-Releases; **Security-/CVE-Track**.

**Explizit out of Scope (vorerst):** AI-Chat/MCP (kein Backend-Modul im Ziel-Image; `AICHAT`-Slug existiert bereits in 1.6, konsistent mit „AI out of scope"); Enterprise/Non-Community-Features; die native **Mobile-App** (liegt nicht in diesen Repos — App-Store-URL in `urls.ts`); Rolldown-Bundler-Umstieg. **Dauerhaft zurückgestellt** (Fremd-Infra/Kosten): **MobileDevices** (Relution kommerziell) und **Satellites** (Multi-Host/WireGuard-Föderation).

**„Aktuell bleiben"** = kein `git pull` vom toten Upstream, sondern pro neuem öffentlichen Image ein maschineller Fingerprint-Diff → Backlog → manueller Nachzug (Abschnitt 7).

---

## 2. Repo-Architektur

### 2.1 Eigene Repos (4)

| Repo | Rolle | Registry-Namespace | Bauen? |
|---|---|---|---|
| **`openedulution-ui`** | Fork von `edulution-ui` (nx-Monorepo: `apps/api`, `apps/frontend`, `libs`) | `ghcr.io/<org>/openedulution-{ui,api}` | ja |
| **`openedulution-installer`** | Fork von `edulution-installer` | `ghcr.io/<org>/openedulution-installer` | ja (Wizard-Image) |
| **`openedulution-tracking`** | NEU: Image-Diff-Pipeline (Abschnitt 7) | — | nein |
| **`openedulution-archive`** | NEU, read-only: Rescue-Spiegel der toten Upstream-History (584 Tags, 106 Remote-Branches, Rescue-Frontend-/Backend-Source) | — | nein |

`<org>` = eigene GitHub-Org (Entscheidung, Abschnitt 9). GHCR unter eigener Org empfohlen, weil `GITHUB_TOKEN` für den **Image-Push** genügt (Extra-Secrets nur für den Version-Bumper nötig, s. 2.3) — **aber Achtung `permissions:` (verifiziert, s. 5.1):** die Tag-Build-Workflows `container-build.yml`/`api-tag.yml`/`frontend-tag.yml` haben **keinen** `permissions:`-Block, pushen aber via `secrets.GITHUB_TOKEN` (z. B. `container-build.yml:100/104`), während `publish-ui-kit.yml:14–16` und Installer-`build-docker.yml:11–13` explizit `packages: write` deklarieren. Neue Orgs stehen oft auf „read-only default token" → der erste Release-Push **403t still**. **Pflicht:** `permissions: { contents: read, packages: write }` in die überlebende `container-build.yml` ergänzen + Org-Setting „Workflow permissions" bewusst prüfen + Erst-Push-Smoke-Test.

### 2.2 v1.6.266 als sauberer Startpunkt — OHNE History-Rewrite

**Kein `git init`, kein `filter-repo`.** Die lokale `.git` (8.134 Commits, **584 Tags**, **106 Remote-Branches**, Upstream tot) ist die einzige überlebende Kopie und enthält geretteten, un-minifizierten 2.0-Frontend-**und**-Backend-Quellcode neuer Module in `refs/remotes/origin/*`: Chat vollständig **FE+BE** (`origin/1851-add-chat-page`), ein weiterer Chat-Backend-Branch (`origin/1866-…`), ParentChildPairing (`origin/1717-…`), MobileDevices (älter, `origin/1546-…`). **Nicht** vorhanden: Calendar, Wiki, Satellites. Rewrite würde das + die AGPL-Provenienz vernichten. Ablauf in `openedulution-ui`:

```bash
cd /home/kevin/Dev/faircomp/openedulution/edulution-ui
# 0) Backup zuerst (Abschnitt 10, Schritt 1) — Pflicht.
git stash push -m "kevin-wip-notifications"          # die 3 uncommitteten Dateien
git remote rename origin upstream-dead               # nicht löschen: Provenienz bleibt
git checkout -b main 36050641d                       # = v1.6.266 (dev-HEAD)
git tag fork-base/v1.6.266
git remote add origin <eigene-repo-url>
git push -u origin main
git push origin --tags                               # 584 Tags = Attribution
git push origin 'refs/remotes/upstream-dead/*:refs/heads/upstream/*'   # Rescue-Branches sichern
```
Die letzte Zeile hebt die lokal-only Rescue-Branches in gepushte `upstream/*`-Branches — sonst überleben sie nur in `.git/refs/remotes`.

**Hinweis Bulk-Tag-Push (verifiziert, s. §5.1/§6):** `git push origin --tags` schiebt alle **584 Tags** auf einmal — GitHub erzeugt bei **>3 gleichzeitig gepushten Tags bewusst keine** Workflow-Runs, hier also erwünscht (kein 584-facher Build). Der spätere Version-Bumper darf diese Eigenschaft aber **nie** ausnutzen und muss **strikt 1 Tag pro Push** setzen (+`concurrency`-Guard), sonst starten seine Builds nicht.

### 2.3 Branch-/Versionsmodell

- **Default-Branch `main`** (Empfehlung): das aktuelle `dev`/`master`-Dual + Auto-Merge-Rückfluss aufgeben → weniger Workflow-Umbau. **Achtung `nx affected` (verifiziert):** `nx.json:3` hat `defaultBase: "dev"` — bleibt der Wert nach dem Umstieg auf Single-`main` stehen, bricht `nx affected` gegen die **tote Basis**. `defaultBase → main` gehört zwingend in den Rebrand-Pass (§2.5).
- **Feature-Branches** on-top-of `main`, ein Branch je Modul (`feat/chat`, `feat/wiki`, …), Merge über PR mit `feature-review`-Gate.
- **Versionsschema `2.0.x`** (Empfehlung): matcht das Ziel-Image, macht die crabbox-Referenz sauber vergleichbar. Start z. B. `2.0.200-oe.1`. Achtung: `APP_VERSION` = Root-`package.json`-`version`, in `vite.config.mts:50` als `define: APP_VERSION` in den UI-Footer kompiliert — bewusst setzen. Alternative: bei `1.6.267` weiterzählen (dann weicht `APP_VERSION` vom Referenz-Image ab).
- **Bump-Mechanik (kritisch, s. R4):** Die Upstream-`bump-patch-version-tag.yml` nutzt eine tote Netzint-GitHub-App (`VERSION_BUMPER_APPID`/`_SECRET`). Ersatz ist Pflicht — **und zwar mit einem echten fine-grained PAT oder GitHub-App-Token** (`contents:write`), **nicht** `secrets.GITHUB_TOKEN`: GitHub unterdrückt bewusst Workflow-Trigger für Events, die der Default-`GITHUB_TOKEN` erzeugt. Ein damit gepushter Tag würde `container-build.yml` **nicht** auslösen → die Auto-Tag→Build-Kette stoppt still. Der Bumper setzt zudem **genau 1 Tag pro Push** (s. 2.2) und erzeugt künftig ein GitHub-Release mit `generate_release_notes` (s. 5.1).

### 2.4 Upstream-Attribution, Lizenz & AGPL-Pflichten

- **Duale Lizenz (klarstellen):** Der Original-Code ist laut Datei-Headern **AGPL-3.0-or-later ODER kommerzielle Netzint-Lizenz**. Der Fork läuft ausschließlich unter dem **AGPL-Arm** — das explizit dokumentieren, statt „reines AGPLv3".
- **Pre-Commit-Header umstellen (neu, kritisch für JEDEN neuen Code):** `scripts/addLicenseHeader.ts:23–39` stempelt bei **jedem** Commit (via `.husky/pre-commit` → `npm run addLicenseHeader`) den Netzint-Header „Copyright (C) [2025] [Netzint GmbH] / All rights reserved. … A commercial license agreement with Netzint GmbH … info@netzint.de" in jede **neue** Datei (verifiziert; identische Header stehen auch in `checkTranslations.ts`/`checkErrorMessages.ts`). → Kevins neuer Chat-/Wiki-/Calendar-Code trüge sonst automatisch Fremd-Copyright „all rights reserved" **plus** einen Kommerz-Arm, den der AGPL-only-Fork gar nicht anbietet — direkter Widerspruch zur dualen-Lizenz-Klarstellung. **Maßnahme (in den Rebrand-Pass P1, §2.5):** `licenseText` auf einen eigenen `SPDX-License-Identifier: AGPL-3.0-or-later`-Header umstellen (kein „all rights reserved", kein Netzint-Kommerz-Arm); **Netzint-Copyright auf Bestandsdateien unangetastet lassen**.
- **LICENSE (AGPLv3) unverändert lassen**, Original-Copyright-Notizen bleiben.
- **`NOTICE`/README ergänzen:** „Fork von edulution (Community Edition), Netzint GmbH / edulution-io; Fork-Basis v1.6.266 (`36050641d`); Verhaltens-/Design-Referenz Image 2.0.200 (`7356c68`). Lizenz: AGPLv3." + Fork-**CHANGELOG** anlegen.
- **AGPL §6 (Corresponding Source):** Fork-Repo public halten, pro Image-Tag automatisch einen passenden Git-Tag setzen (Mechanismus in CI verdrahten, nicht nur als To-do), `org.opencontainers.image.source`-Label aufs eigene Repo. **(Mechanismus, neu — s. 5.1/5.5):** Der Label **und** die Build-Metadaten `COMMIT_SHA/BUILD_DATE/BUILD_NUMBER` werden über `ARG`/`LABEL` + `docker/metadata-action` gefüllt; sonst zeigen der Health-Endpoint (`main.js:59718–59722`, `… || 'unknown'`) **und** das geplante §13-Versionsfeature „unknown" (die API-`Dockerfile` hat heute **kein** `ARG`/`LABEL`, `container-build.yml:109–111/159–161` übergibt **tote** `buildId/version`-Args).
- **AGPL §13 (Netzwerk-Klausel):** In 1.6.266 existiert **kein** Quellcode-Angebot im UI (Grep findet nur AGPL-Header und Issue-URL-Kommentare; `LicenseOverview.tsx` ist die Lizenz*schlüssel*-UI, kein §13-Angebot). Es muss also ein **neues** §13-Feature hinzugefügt werden: prominenter Link auf Fork-Repo + laufende Version (About/Settings/Footer) — die laufende Version kommt aus den §2.4/§5.5-Build-Metadaten (sonst „unknown"). Das ist ein kleines Feature, **kein** `sed`-Umbiegen. (Die Lücke besteht bereits upstream.)
- **`LICENSE_EXCEPTIONS.md` (Netzint-Markenklausel):** Sauberster Weg = **vollständig rebranden** (Nicht-Nutzung fremder Marken ist immer zulässig); Klausel durch eigenes TRADEMARK-Statement ersetzen, das Netzints Marke anerkennt und klarstellt, dass der Fork „edulution" **nicht** führt.
- **`openedulution-installer` hat KEINE Lizenzdatei** (verifiziert) → AGPLv3 + Attribution ergänzen.

### 2.5 Rebrand-Fläche (verifiziert) — Deny/Allowlist statt naivem `sed`

Die Roh-Trefferzahlen sind **glob-abhängig und vermischen „muss raus" mit „muss bleiben"** — ein naives `git grep | sed` zerstört Auth/Networking. Daher **pro Repo zwei Größen + eine explizite Deny-/Allowlist**:

**`openedulution-ui`** — **319** `edulution`-Treffer in `apps/`+`libs/`+`package.json`, davon **164 `@edulution-io/ui-kit`-Import-Specifier** (tsconfig-Alias → **behalten**) und **23 `edu-*`-Wiring-Tokens** (**behalten**). → Die eigentliche Rebrand-Teilmenge ist eine **Minderheit** (~130 Kandidaten, weiter gefiltert um Realm-/Env-/Klassennamen). Hartkodierte Image-Namen `ghcr.io/edulution-io/edulution-{ui,api}`: **12 Vorkommen** über `.github/workflows/{api-tag,build-and-test,container-build,frontend-tag}.yml` + `README.md` + `package.json` (nicht „6, je 3×").

**`openedulution-installer`** — **274** Roh-Treffer, dominiert von `realm-edulution.json.template` (Realm + `edu-*`-Clients = **behalten**), plus `get.edulution.io` (9×).

**Muss raus (user-sichtbar + veröffentlicht):** Produktname/Logos/Favicon, veröffentlichte Image-/Registry-Namen, Distributions-Domain, OG/Titel. Asset-Tausch minimal (Backgrounds byte-identisch übernehmbar, s. 4.1).

**Weitere In-App-Fremd-URLs (verifiziert, Rebrand-Fläche erweitern):** neben `get.edulution.io`/`license.edulution.io` verlinkt die App live auf `urls.ts:22 EDU_DOCS_URL='https://docs.edulution.io'` (WebDAV-Tutorial-Deeplinks) und `urls.ts:20 EDU_APP_APPSTORE_URL='…apps.apple.com/de/app/edulution-io…'`; dazu ein prominenter **QR-Login** gegen die out-of-scope Mobile-App. → `urls.ts`/`webdavTutorialLinks`/Mobile-Access-UI repointen oder ausblenden; **Scope-Entscheidung (§9):** QR-Login/„Mobile Access"-Kacheln verbergen, solange keine eigene Mobile-App existiert. In Deny/Allowlist aufnehmen (FE-Seite auch §4.1).

**Pre-Commit-Header & Doku-/Config-Dateien in den Rebrand-Pass (neu):** `scripts/addLicenseHeader.ts` (Netzint-Header → eigener AGPL-SPDX-Header, s. §2.4); `AGENTS.md`/`CLAUDE.md` (existieren, steuern `feature-build`, enthalten **kein** Netzint-Copyright — nur wegen „edulution"-Nennungen in die Rebrand-Prüfung, **nicht** wegen Lizenz); `nx.json:3 defaultBase: "dev" → "main"` (sonst bricht `nx affected`, s. §2.3).

**Sicherheits-Härtung der Default-Config (neu — Detail §5.2, Punkt 6):** Die ausgelieferten Prod-Defaults (`EDUI_CORS_URL:'*'`, Realm `redirectUris/webOrigins:["*"]`, ROPC, Query-String-Token) werden im **selben** Rebrand-/Realm-Durchgang gehärtet — sonst re-publiziert Kevin sie unter eigenem Namen.

**Allowlist — NICHT anfassen (Ändern bricht Auth/Networking):** `@edulution-io/ui-kit`-Specifier; Keycloak-Realm `edulution` + Clients `edu-ui`/`edu-api`/`edu-mailcow-sync`; Container-/Service-Namen `edu-ui`/`edu-api`/`edu-db`/`edu-redis`/`edu-traefik`/`edu-keycloak*`; Container-Hostnamen (`@edu-db:27017`); Env-Var-Namen (`EDUI_*`, `KEYCLOAK_EDU_*`, `LMN_API_BASE_URL`); Package-/Klassennamen; **die interne `DOCKER_PROTECTED_CONTAINERS`-Liste und die App→Container-Map** (`edulution-*`, s. Abschnitt 3/5). Standard-Dir `/srv/docker/edulution-ui/`.

**Netzint-Lizenzserver (neu, R3):** `libs/src/license/constants/licenseServerUrl.ts` → `https://license.edulution.io/api/v1`, genutzt als axios-baseURL in `apps/api/src/license/license.service.ts`. Das gesamte Community-Lizenz-Subsystem (`LicenseOverview`, `RegisterLicenseDialog`, `useCommunityLicenseStore`) telefoniert nach Netzint. **Entscheidung Kevin:** Subsystem stubben/entfernen (Empfehlung, da AGPL-Arm) **oder** auf eigenen Endpoint zeigen — sonst validiert der Fork gegen einen fremden, evtl. toten Server.

### 2.6 Secret-Hygiene & Key-Management

- Repo-lokale `.gitignore`-Zeilen `**/settings.local.json` + `.claude/settings.local.json` (die globale ignore-Regel greift auf CI/anderer Maschine nicht; `.claude/settings.local.json` enthält ein echtes Proxmox-Token).
- Vor jedem ersten Push beider Repos `gitleaks detect` über die **volle** History (Rescue-Branches sind fremder Code — Inhalts-Scan gründlicher als der bereits saubere Namens-Scan). **Nicht nur einmalig (neu, R-Qualität):** `gitleaks protect --staged` in `.husky/pre-commit` **+** gitleaks-Action als `build-and-test`-Job verdrahten; GitHub Secret-Scanning/Push-Protection auf beiden Repos aktivieren (spätestens beim Public-Schalten). Grund: das Repo berührt laufend Realm-Templates, `.env`-Ableitungen, Companion- und KC-Client-Secrets (auch bei den 106 Rescue-Branch-Merges).
- **Master-Key (kritisch — Provisioning *und* Backup-Kopplung):** Migration `000-wrap-encrypt-keys-with-master-key` zeigt, dass die App verschlüsselte Keys mit einem Master-Key hält. `getMasterKey()` (`main.js:9214–9235`): ohne Env `MASTER_ENCRYPT_KEY` **und** ohne `./data/master.key` wird ein **neuer** Key generiert (Log „No master key found. Generated new master key and saved to ./data/master.key"). Dieser Key wrapped **jede** `user.encryptKey` (`wrap/unwrapEncryptKey`, `main.js:7814/7950/8119`), die wiederum alle gespeicherten Passwörter verschlüsselt. Der Installer setzt `MASTER_ENCRYPT_KEY` **nirgends** (`edulution-installer`-Grep = 0) → produktiv immer Auto-Gen ins `./data`-Bind-Mount. **Maßnahmen:** (a) Key-Provisioning/-Rotation im eigenen Installer planen; (b) Installer schreibt `MASTER_ENCRYPT_KEY` **deterministisch** in `edulution.env` statt Auto-Gen zu überlassen; (c) `./data/master.key` gehört **zwingend gemeinsam** mit `mongodump` ins Backup-/Rollback-Set (**nie einzeln**) — die Backup-/DR-Kopplung, s. neuer DR-Runbook §5.6 + §6.2; (d) Warnung: „Container-/Host-Neustart ohne persistentes `./data`+Env = Totalverlust aller gespeicherten Passwörter".
- **Vollständiges Env-/Secret-Inventar (erweitert, Baseline-Aufgabe P0):** über die Companion-Secrets hinaus (`EDULUTION_GUACAMOLE_ADMIN_PASSWORD/USER` `main.js:36013`, `COLLABORA_WOPI_SECRET`, Mailcow-API-Keys, Keycloak-Admin-Creds, WireGuard-Keys) auch die im Code verifizierten, im Plan bisher fehlenden Envs: `MASTER_ENCRYPT_KEY`, `ENABLE_SENTRY`, `EDUI_DISK_SPACE_THRESHOLD`, `EDUI_MAIL_IMAP_TIMEOUT`, `EDUI_OIDC_CONFIG_CACHE_TTL`, `EDUI_INITIAL_ADMIN_GROUP`, `REDIS_DB` sowie die **KC-Client-Secrets** (im Installer generiert: `webinstaller-api/app/main.py:687 generateSecret`, `:702–710` `keycloak_eduapi/eduui/edumailcow_sync/…`, im Realm-Template als `"secret":"**********"` maskiert). → Als **Tabelle** führen (Default · Pflicht/optional · Provisioning-Ort `edulution.env` vs. Compose); Client-Secret-Generierungspunkt + Rotationspfad (KC-Secret neu ↔ `edulution.env`-Update ↔ `patchEduUiClient`) ins Ops-Runbook (bündelt mit Master-Key oben, §3.6-Signing-Key, §5.5-Observability).
- Die 3 uncommitteten `notifications`-Dateien: stashen oder in den Fork-Commit übernehmen — nicht liegen lassen.

### 2.7 DSGVO/PII-Datenfluss (neu — Betreiber-Risiko)

Der Fork verarbeitet reale Schul-PII und **Minderjährigen-Daten**; das ist bisher unbehandelt und läuft in der Verifikation „gegen echten LMN" mit realen Daten (§6.6). **Verarbeitete PII:** LDAP-Schüler, Chat (`conversation`/`chatMessage`), ParentChildPairing (Minderjährige ↔ Eltern), Mail, MobileDevices, Surveys. **Drittempfänger:** `license.edulution.io`, Sentry, Relution, Mailcow/SOGo, plus die 3 Laufzeit-GitHub-Fetches (§5.3). **Maßnahmen:** kurzes **PII-Inventar je Collection**; Drittempfänger-Liste (Default-An/Aus, koppelt an Lizenzserver-/Sentry-Entscheidung); **keine echten Schüler-PII in crabbox → synthetische Fixtures**; Retention-/Löschkonzept für Chat; AVV-Bedarf pro Companion. Als bekanntes Betreiber-Risiko in §9 (R12) gespiegelt.

---

## 3. Rekonstruktion Backend

**Grundprinzip:** Jedes neue Modul = `apps/api/src/<modul>/` + Shared-Domäne `libs/src/<domain>/` (Types/Constants/Endpoints/DTOs). Handler-Logik zeilenweise aus dem beautified `main.js`; Routen sind aus den `tslib_1.__decorate([...])`-Blöcken **vollständig** ableitbar (HTTP-Verb + voller Pfad + `ApiOperation`-Summary) — **inkl. der Auth-Guards/`@Public`-Dimension** (s. 3.2).

### 3.0 Basis-Drift-Analyse (VORgelagert, entscheidet die Prämisse)

Die These „rein additiv" ist bewiesen nur auf **Modul-Ebene** (32→38 Verzeichnisse, nichts entfernt) — **nicht**, dass die 32 Bestandsmodule, `libs/`, `appconfig`-Shapes, Guards, DTO-Basisklassen oder der SSE-Contract unverändert sind. Ein Major-Bump refactored fast immer Bestandscode; jedes neue Modul referenziert diese Shared-Strukturen → Integrationsreibung auf **jedem** Modul. **Maßnahme:** dieselbe Fingerprint-Methode (Abschnitt 7) auf die **Bestandsklassen** anwenden (1.6.266-Source ↔ 2.0.200-`main.js` diffen), **bevor** Aufwände fixiert werden. Ergebnis = messbarer Drift statt Annahme; pauschal **+20–30 % Puffer** auf alle Backend-Schätzungen.

**Zusätzlich in die Basis-Drift diffen — `defaultAppConfig`-Seed (neu, Fresh-Install-Fidelity):** `initializeCollection` (`main.js:2335`) legt beim Erststart `defaultAppConfig` (`main.js:2380–2468`) an, wenn die appConfig-Collection leer ist → das **Standard-App-Set** eines Fresh-Installs hängt an diesem Array. Weicht es 1.6↔2.0 ab (neue Default-Einträge Chat/Wiki/Calendar), zeigt ein frischer Fork ein **anderes** Standard-Layout als 2.0.200. Das Array ist un-minifiziert direkt diffbar → als **Fresh-Install-Exit-Kriterium** (nicht nur Upgrade-Pfad) in §6 verankern.

### 3.1 Build-Realität (korrigiert)

- **`generatePackageJson` erfasst nur die *externalisierten* Deps, nicht die von webpack gebundelten Pure-JS-Deps.** Beispiel: `slugify` wird in `main.js` importiert (`__webpack_require__(1083)`, für Wiki-Slugs) und ist in der generierten API-`package.json` **0×** vorhanden. → Neue Backend-Deps müssen in die **Root-`package.json`** (die einzige gepflegte; `apps/api` hat keine eigene). webpack bundelt Pure-JS rein (kein Laufzeit-Miss), externalisierte Deps landen in der geprunten dist-pkg.
- **API-`Dockerfile`:** `COPY package*.json ./` (**Root**) → `npm ci` → dann Overlay der geprunten dist-pkg. → Laufzeit-`node_modules` = **voller Monorepo-Install**. Folge: (a) `MODULE_NOT_FOUND` ist **unwahrscheinlich**, solange die Dep in der Root-pkg steht (R4 daher entschärft); (b) fehlt eine neue Dep in der Root-pkg, schlägt `npm ci` fehl; (c) das Image ist „fett" (größere Angriffsfläche, s. Security-/CVE-Track §5.1) — die geprunte pkg ist zur Laufzeit kosmetisch.
- **Kein Multi-Stage-Build:** Frontend-`Dockerfile` macht `COPY dist/apps/frontend .`; fehlt `dist`, **bricht** der `COPY` (kein „leeres" Image); ist es stale, entsteht ein **stale** Image. → `npm run build:all` vor `docker build` erzwingen.

### 3.2 Modul-Reihenfolge nach aufsteigender externer Abhängigkeit

(PT = Personentage Backend, **reine Coding-Schätzung ohne Verifikations-Overhead**; Basis-Drift-Puffer +20–30 % separat.)

> **Aktualisierung (Basis-Drift-Analyse abgeschlossen, `docs/analysis/base-drift-2.0.200.md`):**
> Der §3.0-Pauschalpuffer +20–30 % ist **bestätigt und modul-scharf aufgelöst**. Die additive-These
> hält auf **jeder** Klassen-Ebene (Module 32→38, Controller 29, Services 41→58, Schemas 29→39 — je
> **0 entfernt/umbenannt**); Gesamt-Drift-Ampel überwiegend 🟢, **kein 🔴**. Verfeinerte Aufschläge:
> **Chat +25 %** (SSE-Rework), **Mail +30 %** (Controller 10→36 + Service-Split), **Filesharing +25 %**,
> **Wiki +20 %**, **Calendar +20 %**, **ParentChildPairing +15 %**, **Linbo +15 %** (ruhige Contracts).
> Gelb/Orange nur bei **additiven** Contract-Erweiterungen (appconfig-Hülle `usesPushNotifications`/
> `isPinned`, SSE-Reconnect/Heartbeat-Schicht, defaultAppConfig-Seed +WIKI). Details + Ampel-Tabelle
> je Schicht: der Report; Fresh-Install-Seed-Gap → §6.2.

| # | Modul/Controller | Routen | Neue Deps / externe Infra | PT | crabbox-verifizierbar |
|---|---|---|---|---|---|
| 0 | **ProfilePicture** (`main.js:18961`, in `UsersModule`) | 4 | keine (`sharp` vorhanden) | ~0,5 | ja |
| 1 | **Wiki** (`main.js:71593`; Services `WikiPage/Tree/Folder/Search`) | 9 (+Share-Visibility) | `slugify` (in Root-pkg!); WebDAV (`.wiki`/`.md`) vorhanden; **+ `WIKI_SHARE_VISIBILITY_TABLE`** (`main.js:2098`, in 1.6 0×) → Freigabe-/Berechtigungs-Routen | ~3–4 (+Share-Visibility) | ja |
| 2 | **ParentChildPairing** (`main.js:60806/60169`) | 6 | Mongo-Schema + LMN (vorhanden); **ggf. Keycloak-Eltern-Attribut/Rolle** | ~3–4 | ja (echter LMN) |
| 3 | **Chat** (`main.js:68438/68779`) | 6 | Mongo (`conversation`/`chatMessage`/`chatReadStatus`) + SSE/Notifications (vorhanden) | ~4–6 | ja |
| 4 | **Mail — voller Webmail-Client + Mailcow-Admin** (`MailsController` `main.js:23140–24941`; Split `MailImap/MailSmtp/Idle/ImapConfig/Recipients`) | **~26 neu (36 total, war 10 in 1.6)** | **`nodemailer 8`, `mailparser 3.9`** (+`imapflow`); appconfig `MAIL_IMAP_HOST/MAIL_SMTP_HOST/MAIL_MAILBOX_TABLE/MAIL_SIGNATURE` (`main.js:2078–2116`); **+ Migration `012-unify-mail-server-config`** (`main.js:4119`) | **~10–15** | teilweise |
| 5 | **Filesharing/WOPI/Collabora** (`PublicFilesharingController:42619`, `WopiController:43199`, `CollaboraService`) | 17 | Collabora-Server + `express` 5 (Raw-Body); appconfig `COLLABORA_URL`/`COLLABORA_WOPI_SECRET`; **+ `ACTIVE_DOCUMENT_EDITOR`-Toggle** (OnlyOffice↔Collabora, s. u.) | ~5–7 | teilweise |
| 6 | **Linbo** (`main.js:16958`, in `LmnApiModule`) | 11 | LINBO-Server; env `LINBO_MAX_UPLOAD_BYTES` | ~4–5 | nur mit LINBO |
| 7 | **Calendar** (`main.js:33235/33515`) | 7 | **`tsdav`, `ical.js`, `undici`** + **SOGo/CalDAV**; appconfig `CALENDAR_CALDAV_*`; **SOGo-Theme-Fetch spiegeln (s. 5)** | ~6–8 | nur mit SOGo |
| — | **MobileDevices** (`main.js:65306/65706/65969`) | 11 | **Relution-MDM (690 `main.js`-Treffer, voller API-Client, kommerziell)** | ~10–14 | nur mit Relution → **zurückgestellt** |
| — | **Satellites** (`main.js:64130/63537` + Gateway `:65115`) | 10 | **WireGuard-Föderation (293 Treffer) + WS-Gateway + `edulution-satellite-appliance`-Image + 2. Host** | **Spike, 15–25** | Multi-Host → **zurückgestellt** |

**Mail (Modul 4) neu klassifiziert (war grob unterschätzt — vorher „0 neu / ~3–4 PT"):** `MailsController` (`main.js:23140–24941`) hat **36** Route-Dekoratoren (16 Get/9 Post/4 Patch/1 Put/6 Delete, **verifiziert**) vs. **10** in 1.6 (`apps/api/src/mails/mails.controller.ts`) → **~26 neue Routen**: kompletter IMAP-Client (`listMailboxes/getMailsByFolder/getMailDetail/moveMails/createFolder/deleteFolder/renameFolder/saveDraft/replaceDraft/downloadAttachment/sendMail/searchRecipients/listMailboxFolders/getSharedMailboxes`) **plus Mailcow-Admin** (`getMailcowDomains/getMailcowMailboxes/create/update/deleteMailcowMailboxes/updateMailboxAcl/get+setMailboxDelegates`). Das ist **kein** reiner Config-Split, sondern ein voller Webmail-Client; die **Mail-FE fehlt komplett** (neue Mail-Zeile §4.3). **Scope-Entscheidung (§9):** nativen 2.0-Client nachbauen (Parität, teuer) **vs.** den 1.6-SOGo-Iframe (`<NativeFrame appName={APPS.MAIL}/>`) beibehalten (billig, weicht von 2.0-Parität ab).

**Modul-5-Detail (`ACTIVE_DOCUMENT_EDITOR`, neu):** Der Editor-Selektor `ACTIVE_DOCUMENT_EDITOR` (`main.js:2114`, Default `ONLY_OFFICE` `:26542`) schaltet zwischen `edulution-onlyoffice`/`edulution-collabora` (`:27149–27150`); `main.js:1726 delete extendedOptions.ONLY_OFFICE_JWT_SECRET` deutet auf eine **Config-Migration** der alten OnlyOffice-Keys. → In Modul 5 den Toggle in der Filesharing-appconfig **+ Settings-UI** mitrekonstruieren und prüfen, ob `ONLY_OFFICE_*` in eine Migration wandern (§3.3, Bestands-Install-Datenpfad).

**Auth-Contract (neu, kritisch — Guards/RBAC/`@Public` gehören in den Nachbau):** Die Autorisierung neuer Controller steckt in **denselben** `__decorate`-Blöcken, aus denen die Routen abgeleitet werden — getragen von 7+ Guard-Klassen: `AdminGuard` (`main.js:11219`), `DynamicAppAccessGuard` (`:56393`), `IsPublicAppGuard` (`:56551`), `LocalhostGuard` (`:56883`), `AuthGuard` (`:59956`), `WebhookGuard` (`:63161`), `ThrottleGuard` (`:64484`) + `@Public`-Metadaten. Ein vergessenes `@UseGuards(AdminGuard)` oder fälschlich gesetztes `@Public()` = **Auth-Bypass**, den weder Visual-Diff noch Route-Fingerprint fangen (die Guard-Erwähnung in §1/§3.0 betraf nur **Basis-Drift** von Bestands-Guards, nicht den Nachbau neuer Controller). → Das Rekonstruktions-Rezept unten bekommt eine **Pflicht-Dimension „Guards/Access-Level/`@Public`"** je Route; Datei-Upload-`limits`/`fileFilter` in denselben Contract; pro Controller ein **Auth-Spec** (401 ohne Token, 403 als Nicht-Admin, `@Public`-Routen bewusst gelistet) als **Exit-Kriterium** in `build-and-test.yml` (§6).

**Backend-Kern P0–P5 (ohne MobileDevices/Satellites): ~36–50 PT** (Mail-Neuklassifizierung +~7–11 PT ggü. der früheren 29–39-Schätzung), + Basis-Drift-Puffer → **~43–65 PT**, + Migrations-Parität + Keycloak-Provisioning + Test-Portierung (s. u.).

**Pro Modul:** (a) Modul-/Controller-/Service-Skelett + `@Module`-Wiring aus `main.js`; (b) DTOs/Schemas — **teuer ist NICHT das mechanische DTO-Ableiten** (241 `*Dto` aus `class`-Blöcken, 39 Schemas aus `SchemaFactory.createForClass`), **teuer ist die Service-Handler-Logik** gegen echten LMN/Mongo/CalDAV; (c) Endpoint-Konstanten (`*_ENDPOINT`, 41); (d) appconfig-Extended-Options + Env-Vars (11 neue `process.env.*`, 8 neue appconfig-Optionen) in Root-pkg/Config; (e) Handler-Logik; **(f) Guards/Access-Level/`@Public` je Route** (Auth-Contract oben) + Datei-Upload-`limits`/`fileFilter`.

### 3.3 DB-Migrations-Parität (eigenes Arbeitspaket, P0-kritisch)

Die API fährt beim Start Schema-Migrationen für **~11 Modelle** über `MigrationService.runMigrations(...)` — `class MigrationService` bei `main.js:2675`, 12 `runMigrations`-Aufrufe (u. a. appConfig `:1601`, webdavShares `:4938`, globalSettings `:5499`, users `:7801`, notifications `:20680`, publicShares `:38245`, surveys `:44391/46418/47807`, bulletinCategory `:51355`, bulletins `:52464`). Der Bundle enthält **32 Migrationsnamen-Literale** (die Migrationen sind **Objekt-Literale, keine Klassen** → für alle `class *`-Anker unsichtbar). Delta appConfig: 1.6 = `000–009`, 2.0 = `000–012` → **3 neue: `010-add-uses-push-notifications`, `011-add-is-pinned`, `012-unify-mail-server-config`** (letzteres korreliert direkt mit dem Mail-Rework, Modul 4). Zusätzlich deutet `main.js:1726 delete extendedOptions.ONLY_OFFICE_JWT_SECRET` auf eine **Config-Migration alter OnlyOffice-Keys** hin (Bestands-Install-Datenpfad, Detail Modul 5, §3.2).

Diese migrieren **bestehende** Daten. Wer von 1.6 forkt und nur Module hinzufügt, dem fehlt der **Upgrade-Pfad 1.6-DB → 2.0-DB**; Fresh-Installs bekommen sonst falsche `schemaVersion`. **Maßnahme:** Alle neuen Migrationen über **alle** Modelle portieren; Verifikation zwingend als **Upgrade einer echten 1.6-DB** auf crabbox, nicht nur Fresh-Install. Migrationen sind **forward-only** (kein `down()`) → Rollback = DB-Dump **+ `./data/master.key`** + vorheriger Image-Tag (der Master-Key gehört **zwingend** dazu — ein Restore der DB ohne den passenden Key macht alle gewrappten Passwörter unlesbar, s. §2.6/§5.6-DR/§9-R4; ein erhöhter `schemaVersion` bricht ohnehin das Downgrade).

### 3.4 On-Demand-Container-/App-Store-Engine (eigenes Arbeitspaket, P0)

edulution deployt Apps **zur Laufzeit selbst** via `DockerService` (dockerode, `main.js:26371ff`): mountet den Host-Docker-Socket, schreibt pro App eine `docker-compose.yml` nach `APPS_FILES_PATH`, pullt Images, create/start/stop/restart, schützt Kern-Container (`DOCKER_PROTECTED_CONTAINERS`, `main.js:26891`). **12 verwaltete Companion-Apps** (`libs/src/docker/constants/dockerApplicationList.ts`): `mail`→`edulution-mail` (SOGo), `classmanagement`→`edulution-veyon`, `desktopdeployment`→`edulution-guacamole`, `learningmanagement`→`edulution-moodle`, `onlyoffice`, `collabora`, `wireguard`, `manager`/`manager-agent`, `eventhandler`, `thumbnails`, `satellite-appliance`; plus `APPSTORE`-Slug. Diese Engine ist das Herz der Plattform — sie bleibt funktional erhalten (Container-Namen sind Allowlist, s. 2.5), aber die **On-Demand-Images** sind eigenständige Pulls (s. Abschnitt 5, Lieferkette). **Docker-Socket-Security** als eigenen Punkt führen.

**Wichtig (3. Laufzeit-Fetch, verifiziert — s. §5.3):** Der **Inhalt** der pro App geschriebenen `docker-compose.yml` kommt **nicht** aus dem Repo, sondern wird **im Browser** live von `edulution-io/edulution-plugins` geladen: `EDU_PLUGINS_GITHUB_URL='https://raw.githubusercontent.com/edulution-io/edulution-plugins/main/apps'` (`urls.ts:21`), konsumiert in `useDockerApplicationStore.ts:153` (`…/docker-compose.yml?ts=…`) und `:183` (`…/<app>.yml`) via `axios.get`. Stirbt `edulution-plugins` (wie `edulution-ui`), lässt sich **keine** Companion-App mehr ausrollen → das bricht die gesamte §6-App-Store-Verifikation (P4). Dieser Fetch gehört ins Lieferketten-Inventar §5.3 und muss auf einen eigenen Endpoint umgebogen werden (Client-erreicht-GitHub-/CSP-Aspekt beachten).

### 3.5 Dependencies

6 echt neue Backend-Libs in die **Root-pkg**: `tsdav 2.1.8`, `ical.js 2.2.1`, `nodemailer 8.0.5`, `mailparser 3.9.8`, `undici 6.25.0`, `express 5.2.1` (+ `slugify`, das webpack bundelt). Rest = Patch-/Minor-Bumps (NestJS 11.0→11.1, mongoose 8.9→8.23, axios 1.7→1.16) ohne erkennbares Breaking-Delta. Die im keepup-Report gelisteten „71 entfernten" Deps sind ein Artefakt (2.0-`package.json` = API-only, 1.6 = Monorepo-Root) — **nicht** wirklich entfernt. **Security-Track (neu, §5.1):** Für diese fette Dep-Fläche (Monorepo-Install im Image) gibt es aktuell **kein** CVE-Management — Renovate/Dependabot + Trivy sind ein eigenes Arbeitspaket, weil der tote Upstream keine Security-Bumps mehr liefert.

### 3.6 Keycloak-Realm-Pflege

Über den Versions-Drift hinaus: `realm-edulution.json.template` (Installer) **plus** Runtime-Provisioning-Skripte in `apps/api/src/scripts/keycloak/` (verifiziert: `addLdapGroupMappers`, `addMailcowSyncRoles`, `addUserAttributeMappers`, `disableLdapConnectionPoolingAndPagination`, `keycloakConfigScripts`, `patchEduUiClient`, `removeRealmRoles`). Diese laufen beim Boot gegen Realm `edulution` und müssen funktionsfähig bleiben. **Maßnahmen:** Realm-Template 1.6↔2.0 diffen (Quelle: **Realm-Export der laufenden crabbox-Instanz**, nicht `main.js`); prüfen, ob neue Module Client-Scopes/Mapper brauchen (ParentChildPairing braucht sehr wahrscheinlich ein Eltern-Attribut/Rolle); Provisioning-Skripte (mailcow-sync-Client, Attribut-Mapper) end-to-end verifizieren. Die im Installer generierten **KC-Client-Secrets** (`webinstaller-api/app/main.py:687/702–710`) und ihr Rotationspfad (KC-Secret neu ↔ `edulution.env` ↔ `patchEduUiClient`) gehören ins Env-/Secret-Inventar (§2.6) und Ops-Runbook.

**Signing-Key-Pinning (neu, R9):** `AuthGuard` verifiziert jedes JWT gegen einen **aus Datei gelesenen** Key (`PUBLIC_KEY_FILE_PATH='./data/edulution.pem'`, `main.js:55805`; Bootstrap `edulution.pem→data/edulution.pem`, `main.js:73177`) — **kein** `jwks_uri`/`openid-connect/certs`/`kid` (Grep 0). Der Installer zieht den Key **einmalig** (`installer:337–356`). Rotiert Keycloak den Signing-Key (KC-Major-Upgrade/Key-Rollover) → **jeder Login schlägt fehl**. **Maßnahmen:** Realm-Key-Provisioning (`installer:337–356`) dokumentieren; als Risiko „Signing-Key-Rotation bricht Auth" führen (R9); Re-Fetch-Skript ins Ops-Runbook **oder** mittelfristig `AuthGuard` auf `jwks_uri`+`kid` umstellen; **Rotations-Testfall in §6**.

### 3.7 Rescue-Vorteil (kalibriert)

Für **Chat** existiert geretteter **FE+BE**-Quellcode in `origin/1851-add-chat-page` (44 Dateien: `chat.controller/module/service` + `conversation`/`chatMessage`-Schemas + FE), `origin/1866` ergänzend. **Aber:** beide Rescue-Branches datieren **vor** dem 1.6→2.0-Merge und sind stark diverged → der geshippte 2.0.200-Chat (6 verifizierte Routen) muss gegen die Gerüste **abgeglichen** werden (echte Arbeit, kein Copy-Paste). **Primärquelle `1851` (FE+BE)**, `1866` nur ergänzend. Für **ParentChildPairing** und **MobileDevices** liegt älteres Rescue-Material vor. Senkt Aufwand real, aber nicht auf „billig".

---

## 4. Rekonstruktion Frontend + Design-System

### 4.1 Design-System: Tokens stabil, App-Shell zu verifizieren

Farbtokens, CSS-Variablen, Fonts, Backgrounds und Icon-Set sind 1.6.266→2.0.200 praktisch identisch (`backgroundDarkMode.webp`/`backgroundLightMode.webp` **MD5-identisch**; Lato via `@fontsource/lato`; FontAwesome v7; shadcn „new-york"). Das 2.0-Bundle (rolldown, keine Sourcemaps) ist **Design-/Verhaltensreferenz**, kein Asset-Steinbruch.

**Design-Token-Übernahme = gering** — aber **nicht null**: Routing, `NativeAppPageManager`, Layout und Stores können über den Major-Bump gedriftet sein (unverifiziert) → im Rahmen der Basis-Drift-Analyse (3.0) prüfen, nicht als Nullaufwand verbuchen. Erkennbare Token-Nachträge: 4 neue CSS-Variablen `--code-keyword/--code-number/--code-string/--code-title` (Syntax-Highlight) + stärkere `bg-glass`/backdrop-blur-Nutzung. 52 shadcn-Primitive in `apps/frontend/src/components/ui/` bleiben produktiv. `libs/ui-kit` bleibt embryonal (`Button`/`cn`) — **als Source-Alias belassen**, nicht als npm-Dependency (spart Registry-Auth, hält Build hermetisch). Beim `@nx/vite:build` (Rollup) bleiben; rolldown-Umstieg optional.

**FE-Framework-Deps stabil (verifiziert):** Die 2.0-Root-`package.json` liegt un-minifiziert in `main.js:59729` — `react ^18.2.0`/`react-dom ^18.2.0`/`react-router-dom ^6.28.2`/`zustand ^4.5.0` sind ablesbar und **identisch zu 1.6** → der befürchtete `react 18→19`/`zustand v4→v5`/`react-router v6→v7`-Sprung ist **nicht** passiert (einziger FE-Toolchain-Wechsel `vite ^5 → rolldown-vite@7.3.1`, oben). Das de-riskt die FE-Rekonstruktion; die App-Shell-/Routing-/Store-**Struktur**-Drift bleibt dennoch der §3.0-Basis-Drift-Analyse zugewiesen (nicht als Nullaufwand verbuchen).

Die 6 neuen Module haben in 1.6 **keine** `libs/`- oder Page-Gerüste (nur Slug-Platzhalter + Icons in `apps.ts`) → Neubau-Annahme bestätigt.

**FE-seitige Fremd-Referenzen (neu, s. §2.5/§9):** QR-Login/„Mobile Access"-Kacheln (gegen die out-of-scope Mobile-App) und `webdavTutorialLinks` (→ `docs.edulution.io`) sind FE-Rebrand-Items — repointen oder verbergen, solange keine eigene Mobile-App/Doku existiert.

### 4.2 Wiring-Rezept je neue native App (server-getrieben)

1. Slug in `libs/src/appconfig/constants/apps.ts`.
2. Eintrag in `apps/frontend/src/components/structure/layout/NativeAppPageManager.tsx` → `nativeAppPages[APPS.X] = <XPage/>`.
3. Seite unter `apps/frontend/src/pages/X/` (+ ggf. `libs/src/x/`).
4. **Locale-Strings** in `apps/frontend/src/locales` — **Realität (neu):** 3 Sprachen (`i18n.ts:44 ['en','de','fr']`, `fallbackLng:'de'`); `checkTranslations.ts:64` **und** `checkErrorMessages.ts:83` **brechen den Commit** (`exit(1)`) bei DE/EN-Divergenz → DE+EN sind **Pflicht** und **Merge-Blocker** (auch für den headless `feature-build`, der über dieselben `.husky/pre-commit`-Gates committet — Gates **erfüllen**, **nicht** `--no-verify`). Das minifizierte 2.0-Bundle enthält **keine** Quell-Strings → Keys gegen die crabbox-Live-Referenz **neu verfassen**, nicht extrahieren. **Offene Entscheidung (§9):** FR mitpflegen vs. aus `supportedLngs` streichen.
5. Backend liefert `AppConfigDto` mit `appType = NATIVE` → Icon/Sidebar/Menü automatisch.

### 4.3 Reihenfolge, Quelle, Aufwand (korrigiert)

| Seite | Frontend-Quelle | Neue Deps | Aufwand (PT) |
|---|---|---|---|
| **Chat** | geretteter Source (`origin/1851`) gegen 2.0.200 abgleichen | keine (SSE + `MarkdownRenderer` vorhanden) | **~4–7** |
| **ParentChildPairing** | teilweise gerettet (`origin/1717`); `QRCodeDisplay` vorhanden | keine | **~3–5** |
| **Mail (Webmail-Client)** | **Neubau** gegen Live-Referenz (1.6 = bloßer SOGo-Iframe): Ordnerbaum/Mailliste/Detail/Compose/Anhänge **+ Mailcow-Admin-Panel** | keine neuen FE-Deps erkennbar | **~15–25** |
| **Calendar** | **Neubau** gegen Live-Referenz: Eigenbau-Grid (Monat/Woche/Tag) + Event-CRUD + Wiederholungen | **`rrule`** (`dayjs` vorhanden) | **~12–20** |
| **Wiki** | **Neubau** gegen Live-Referenz: **TipTap/ProseMirror**-Editor + `WikiPage` + Markdown/KaTeX **+ Share-Visibility/Berechtigungen** | **`@tiptap/*`, `prosemirror-*`, `katex`** | **~20–35** |

**Mail-FE (neu, war im Plan gar nicht budgetiert):** 1.6-`MailPage.tsx` = bloßer `<NativeFrame appName={APPS.MAIL}/>` (SOGo-Iframe); das 2.0-Bundle enthält den vollen nativen Client (`index-C92ywU1P.js`: `mailbox` 125×, `attachment` 99×, `MAIL_MAILBOX_TABLE` 12×). Nativer Webmail-Client (Ordnerbaum/Liste/Compose/Anhänge) **+ Mailcow-Admin-Panel** → **~15–25 PT**. **Scope-Entscheidung (§9):** SOGo-Iframe aus 1.6 beibehalten (billig, weicht von 2.0-Parität ab) **vs.** nativen Client nachbauen.

**Belegte Realität:** 30 JS-Chunks total; der Wiki-Editor ist ein eigener Chunk `wiki-editor-uttP9V64.js` = **1.354.246 Bytes (~1,35 MB) minified** (TipTap/ProseMirror/KaTeX). Toolbar, Math-Input, Code-Highlight, Tabellen, Bild-Upload nach WebDAV, Seitenbaum, Ordner, Suche — ohne Sourcemaps gegen Live-Referenz. **Bewusste Scope-Entscheidung für Wiki:** TipTap-StarterKit + KaTeX-Extension „gut genug" statt pixel-/verhaltensgleicher Nachbau — sonst frisst der Editor allein Monate. Der Wiki-Scope umfasst zusätzlich ein **Freigabe-/Sichtbarkeitssystem** (`WIKI_SHARE_VISIBILITY_TABLE` `main.js:2098`, in 1.6 0× — Admin-Share-Visibility-Tabelle + zugehörige BE-Routen; crabbox-relevant für Multi-User-Test). Wiki **und** Calendar bekommen je **eigene Phase mit eigenem Budget**.

**Locale-Aufwand je Modul einplanen (§4.2):** DE+EN sind pre-commit-erzwungen und gegen die Live-Referenz **neu zu verfassen** (nicht extrahierbar) — je Modul spürbarer Zusatzaufwand, kein „nur Strings kopieren".

**Frontend-Gesamt P0–P5 (Chat, Pairing, Mail, Calendar, Wiki): ~55–90 PT.** (Ggü. den früheren 40–65 PT +15–25 PT durch die neu erkannte Mail-FE; MobileDevices/Satellites-FE zurückgestellt.)

**Übernahme des Aussehens:** referenz-getriebener Rebuild pro Seite gegen die laufende crabbox-2.0.200-Instanz + kompiliertes `index-*.css` — **nie** aus dem minifizierten JS rekonstruieren (außer wo Rescue-Source existiert). 5 der 6 neuen Module liegen im monolithischen `index-C92ywU1P.js` (~6,1 MB) und haben **keinen** eigenen Chunk-Namen (nur Wiki hat welche) — das minifizierte JS taugt für sie nur als grobe Verhaltensreferenz.

---

## 5. Eigener Installer + Build/Distribution + Lieferkette

### 5.1 Eigene Images bauen (`openedulution-ui`)

Reihenfolge ist Pflicht (kein Multi-Stage; fehlt `dist`, bricht `docker build`):
```bash
npm ci
npm run build:all      # dist/apps/frontend + dist/apps/api
docker build -t ghcr.io/<org>/openedulution-ui  -f apps/frontend/Dockerfile .
docker build -t ghcr.io/<org>/openedulution-api -f apps/api/Dockerfile .
docker push ghcr.io/<org>/openedulution-ui && docker push ghcr.io/<org>/openedulution-api
```
Klären, ob `build:ui-kit` fürs Frontend-Image überhaupt nötig ist (das Frontend löst `@edulution-io/ui-kit` als **Source-Alias** auf → der separate `nx build ui-kit`-Output wird vom Image nicht konsumiert; er dient nur dem im Installer publizierten Paket).

**CI-Umstellungen:** `edulution-io`-Strings in eine zentrale Workflow-`env: REGISTRY_ORG` heben (statt 12 Einzelstellen). Betroffen: `.github/workflows/{container-build,frontend-tag,api-tag,build-and-test}.yml` + `package.json`-Scripts + `README.md`. **Aufräumen:** `frontend-tag.yml` + `api-tag.yml` löschen (`container-build.yml` deckt beide Images ab; drei Workflows auf `v*.*.*` = Race auf `:latest`). **`publish-ui-kit.yml` deaktivieren/umbiegen** (4. CI-Baustelle). Bumper auf eigene App/PAT (2.3). **Node/nginx-Pins:** `node@sha256…` (22.21.1-alpine3.22) / `nginx 1.29.2-alpine3.22` — übernehmen vs. neu pinnen (Entscheidung, Abschnitt 9).

**`permissions:`-Block (Pflicht, neu):** `container-build.yml`/`api-tag.yml`/`frontend-tag.yml` haben **keinen** `permissions:`-Block, pushen aber via `secrets.GITHUB_TOKEN` (`container-build.yml:100/104`) — anders als `publish-ui-kit.yml:14–16`/Installer-`build-docker.yml:11–13` (`packages: write`). Auf frischer Org (Default „read-only token") **403t** der erste Release-Push still. → In die überlebende `container-build.yml` `permissions: { contents: read, packages: write }` ergänzen; Org-Setting „Workflow permissions" prüfen; Erst-Push-Smoke-Test (s. §2.1).

**Release-Green-Gate (Pflicht, neu):** `build-and-test.yml` triggert nur `on: pull_request` (`push:false`); `container-build.yml` (`on: push tags`) baut/pusht **ohne** vorgeschaltetes lint/test → ein Bumper-Tag verschifft Images auch, wenn `main` nie grün war (§6 gated nur den **PR-Merge**). → `needs`-Vorlauf `lint && test` vor `container-build` (oder Branch-Protection). Zusätzlich `nx.json:3 defaultBase:"dev" → "main"` (sonst bricht `nx affected`, s. §2.3/§2.5); Bumper strikt **1 Tag/Push** + `concurrency`-Guard (Bulk-Tag-Push §2.2 erzeugt bewusst keine Builds).

**Build-Metadaten (Pflicht, neu — s. §5.5):** `COMMIT_SHA/BUILD_DATE/BUILD_NUMBER` als `ARG`/`LABEL` in **beide** Dockerfiles + `docker/metadata-action` in `container-build.yml` verdrahten — füllt zugleich den §2.4-`image.source`-Label **und** das §13-Versionsfeature; die **toten** `buildId/version`-Build-Args (`container-build.yml:109–111/159–161`) anschließen/entfernen (sonst Health + §13 = „unknown").

**Supply-Chain-Härtung des Release-Builds (neu):** kein `sbom|provenance|cosign` (Grep 0), kein `setup-buildx-action` → keine Attestation möglich; Third-Party-Actions nur tag-gepinnt. → `setup-buildx` + `provenance/sbom` auf dem Release-Build; **pushende Actions auf Full-SHA** pinnen; beim Tag ein GitHub-Release mit `generate_release_notes`; Multi-Arch (heute amd64-only) bewusst entscheiden (§9/Punkt 9). Infra-Image-Pins s. §5.2.

**Security-/CVE-Maintenance-Track (neu, eigenes Arbeitspaket):** Es gibt **keine** `renovate.json`/`.github/dependabot.yml` und **keinen** `npm audit`/`trivy`/`codeql`/`grype`-Lauf (Grep 0); das fette API-Image = voller Monorepo-`node_modules` mit `got@11.8.6`, `xml2js`, `axios`, `dockerode` (Docker-Socket). Bei totem Upstream liefert **niemand** Security-Bumps. → `dependabot.yml`/Renovate (npm + Docker-Base-Digests + GitHub-Actions) **plus** Trivy/Grype-Scan der gebauten Images als **CI-Gate**; CVE-Scan an den §7-Wochen-Cron andocken, Backlog in dieselbe `reports/`-Pipeline; gepinnte/gruppierte PRs durch die Test-Gates (R10).

### 5.2 Installer rebranden/umbiegen (`openedulution-installer`)

Installer und UI-Monorepo hängen **nur** über Image-Name + Tag in `docker-compose.yml.template:4/18` zusammen.

1. **Image-Referenzen + Tag-Pinning:** `apps/public-page/public/download/docker-compose.yml.template:4,18` von `ghcr.io/edulution-io/edulution-{ui,api}` (implizit `:latest`) auf `ghcr.io/<org>/openedulution-{ui,api}:${EDU_APP_VERSION}` + `EDU_APP_VERSION` in `edulution.env` (`webinstaller-api/app/main.py::createEdulutionEnvFile`, ~Z.767). Ebenso die Wizard-Image-Pulls (`apps/public-page/public/installer:213,216`).
2. **Privater `@edulution-io/ui-kit`-Dependency (größter Installer-Build-Blocker):** `package.json:15` (`^0.0.1`) + `.npmrc` (`${GITHUB_TOKEN}`) — ohne Read-Token baut der Installer nicht. Empfehlung: genutzte Teile (`Button`, `cn`, tailwind-base) in `libs/shared-ui` **inlinen** und Dependency streichen → volle Autarkie.
3. **Laufzeit-Raw-Downloads aus fremdem Repo:** `edulution-lmninstaller/bootstrap.sh:14` (`GITHUB_REPO`), `webinstaller-api/app/main.py:462` (`BOOTSTRAP_URL`) auf eigenes Repo. Distributions-Domain `get.edulution.io` (9 Vorkommen: `installer:190`, `App.tsx:5`, `index.html` OG/canonical) auf eigene Pages-Custom-Domain. **Public-Page ist eine vollständige Marketing/Doku-Site → komplett ersetzen** (nicht nur Links). Netzint-`acme-dns` (`main.py:386,830`) selbst hosten oder LE-DNS-Pfad entfernen. Branding-Assets, ASCII-Banner (`installer:3-6`).
4. **`openedulution-installer` LICENSE fehlt** (verifiziert) → AGPLv3 + Attribution ergänzen.
5. **Keycloak-Versionsdrift** (Bootstrap **25.0** `installer:280,306` vs. Prod **26.4** `docker-compose.yml.template:116`): **niedrige Priorität** — KC importiert einen 25.x-Realm-Export problemlos in 26.4. Angleichen ist nice-to-have, **kein Blocker**.
6. **Sicherheits-Härtung der ausgelieferten Default-Config (neu, R11):** Prod-Default `EDUI_CORS_URL:'*'` (`docker-compose.yml.template:24`; `cors:{origin:process.env.EDUI_CORS_URL}` `main.js:73157`); Realm-Client (`realm-edulution.json.template:681ff`) `redirectUris:["*"]`/`webOrigins:["*"]` (+ Rest-Leftover `https://example.com/*`), 4× `directAccessGrantsEnabled:true` (ROPC); `extractToken` liest JWT **zuerst** aus `request.query.token` (`main.js:60024`) → Token landet in Access-Logs/Referer. Kevin re-publiziert diese Defaults sonst unter eigenem Namen. → `EDUI_CORS_URL` = Instanz-Domain statt `*`; `redirectUris`/`webOrigins` im eigenen Realm-Template auf echte URL einschränken (Leftover raus); Query-String-Token-Pfad prüfen/entfernen; `SameSite`/CSRF-Posture verifizieren.
7. **Infra-Image-Pins + Retention (neu, ergänzt Punkt 1):** Compose-Infra-Images sind **floating** (`mongo:7`, `redis:8.2`, `traefik:v3.1`, `quay.io/keycloak/keycloak:26.4`, `postgres:16`, `docker-compose.yml.template:60/75/94/116/147`) — Punkt 1 pinnt nur die App-Images. → auf Digest/Patch-Tag pinnen und in Renovate mitführen (§5.1-Security-Track); Installer-`build-docker.yml`-Trigger (`branches:["**"]`) einschränken + GHCR-Retention-Job. (Provisioning-Ort jeder Env/jedes Secrets — `edulution.env` vs. Compose — im §2.6-Inventar dokumentieren.)

### 5.3 Externe Lieferkette (eigenes Arbeitspaket, P0)

Der Fork hängt an **~13 Companion-Images** (`edulution-{mail, moodle, onlyoffice, collabora, guacamole, veyon, wireguard, manager, manager-agent, eventhandler, thumbnails, satellite-appliance}` — alle im `main.js` referenziert) **plus drei harten Laufzeit-Fetches** auf `edulution-io`-Repos:
- **SOGo-Theme-CSS (2 Dateien):** `raw.githubusercontent.com/edulution-io/edulution-mail/refs/heads/main/build/templates/sogo/{light,custom}-theme.css` (`main.js:25091-25092`) — SOGo-Theming für Mail/**Calendar**, **zur Laufzeit** geladen → **spiegeln**, sonst bricht das Theming an dem Tag, an dem auch `edulution-mail` verschwindet (wie `edulution-ui`).
- **App-Store-Compose (neu, 3. Fetch):** `EDU_PLUGINS_GITHUB_URL='https://raw.githubusercontent.com/edulution-io/edulution-plugins/main/apps'` (`urls.ts:21`), **im Browser** konsumiert (`useDockerApplicationStore.ts:153/183`, `axios.get …/docker-compose.yml?ts=…` bzw. `…/<app>.yml`) → der **compose-Inhalt** jeder Companion-App kommt live von GitHub (s. §3.4). Stirbt `edulution-plugins`, lässt sich **keine** App mehr ausrollen → bricht die §6-App-Store-Verifikation (P4). Umbiegen auf eigenen Endpoint; CSP-/Client-erreicht-GitHub-Aspekt.
- **`edulution-thumbnails`** (Filesharing-Vorschauen, `thumbnailService` `main.js:37322`) und **`edulution-eventhandler`** brauchen eine Rebuild-oder-Repoint-Entscheidung.

**Sentry (neu):** `getSentryConfig` (`main.js:54486`), `enableSentryForNest` (`:59762`), `ENABLE_SENTRY` — opt-in/admin-DSN, gehört ins Inventar mit **Default-Entscheidung** (deaktiviert / eigener DSN, **nie** Fremd-DSN erben; s. §5.5/§9).

**Maßnahme:** Vollständiges Inventar aller `edulution-io`-Außenreferenzen; **Policy pro Companion-Image** (selbst bauen unter eigener Org / auf Upstream-Digest pinnen / mirrorn). Empfehlung: mindestens `edulution-mail`-SOGo-Assets + `edulution-plugins`-Compose + die für Verifikation nötigen Images (Collabora/OnlyOffice) spiegeln; Rest per Digest pinnen bis Bedarf.

### 5.4 LMN-Seite (linuxmuster-api7)

`edulution-lmninstaller/` bootstrappt per SSH (FastAPI + ansible-runner, Playbook `linuxmuster.yml`), installiert LMN 7.3, `edulutionui-binduser`, `linuxmuster-api7`. Bleibt funktional unverändert — nur `GITHUB_REPO`/`BOOTSTRAP_URL` auf eigenes Repo. Der echte LMN in crabbox stellt `linuxmuster-api7` bereits bereit (Basis für ParentChildPairing/Linbo-Verifikation).

### 5.5 Observability & Build-Metadaten (neu)

Der Fork erbt „unknown"-Werte, wenn die Build-Metadaten nicht verdrahtet werden: Health liefert `commitSha/buildDate/buildNumber` aus `process.env.* || 'unknown'` (`main.js:59718–59722`), aber die API-`Dockerfile` hat **kein `ARG`/`LABEL`** und `container-build.yml:109–111/159–161` übergibt **tote** `buildId/version`-Build-Args; kein `docker/metadata-action` (nur der Installer hat es). **Maßnahmen:** (1) `COMMIT_SHA/BUILD_DATE/BUILD_NUMBER` als `ARG`/`LABEL` in beide Dockerfiles + `docker/metadata-action` in `container-build.yml` — füllt zugleich den §2.4-`image.source`-Label **und** das §13-Versionsfeature (Detail §5.1). (2) Health-Endpoints als **Monitoring-Contract** dokumentieren. (3) **Sentry** (`getSentryConfig` `main.js:54486`, `enableSentryForNest` `:59762`, `ENABLE_SENTRY`) ins Lieferketten-Inventar (§5.3) + Default-Entscheidung (deaktiviert / eigener DSN, **nie** Fremd-DSN erben). (4) `EDUI_LOG_LEVEL` (`main.js:948`) mit **Prod-Default** setzen.

### 5.6 Betriebs-/DR-Runbook (neu — Datenintegrität)

**DR-Runbook (P0, hängt an §2.6-Master-Key):** Die in §3.3/§6.2 dokumentierte Rollback-Prozedur war ohne `master.key` **datenverlust-gefährlich** (ein Restore der DB ohne den passenden Master-Key macht alle gewrappten Passwörter unlesbar). **Pflicht:** (a) Installer schreibt `MASTER_ENCRYPT_KEY` **deterministisch** in `edulution.env` (kein Auto-Gen); (b) Backup/Rollback immer `./data/master.key` **+** `mongodump` **gemeinsam** (nie einzeln); (c) DR-Skript: `mongodump` + `pg_dump` (Keycloak-Postgres) + Tar von `./data` inkl. `master.key`/`apps`/SSL, **DB-Dump vor `./data`-Tar**, offsite, als wiederkehrender **crabbox-Restore-Drill**; (d) Warnung „Neustart ohne persistentes `./data`+Env = Totalverlust aller gespeicherten Passwörter".

**Runtime-Runbook (Redis/BullMQ/Disk, P3):** `edu-redis` läuft `--save "" --appendonly no` (`docker-compose.yml.template:88–89`) → **flüchtig**; darauf produktive BullMQ-Queues (`KEYCLOAK/LMN_API/PUSH_NOTIFICATION_QUEUE`, `main.js:8854–8856`, `new Queue(` `:10202/14181` + Filesharing-Consumer). `DiskHealthIndicator`/`EDUI_DISK_SPACE_THRESHOLD` (`main.js:56932/57024`, Default 0.95) prüft `/`; alles wächst auf **einem** `./data`-Volume; Gegensteuerung nur per Cleanup-Crons. **Maßnahmen:** Redis-Config **1:1** übernehmen (**nicht** versehentlich Persistenz nachrüsten) + „Queue-Jobs nicht durable" dokumentieren; `./data`-Wachstum monitoren, `EDUI_DISK_SPACE_THRESHOLD` bewusst setzen; die 4 Cleanup-Crons (`ClearTempFiles`, `CleanupThumbnailCache`, `CleanupOrphanedUserNotifications`, `TLDraw…cleanupAllRoomLogs`) als **Pflicht-Nachbau-Items**; die §7c-Fingerprint-Anker `new Queue(`/`@Cron(` aktiv schalten.

### 5.7 Lokaler Dev-Stack & innerer Dev-Loop (neu)

Aktuell startet die lokale `docker-compose.yml` **nur** `mongoEdu`+`redisEdu` (kein Keycloak/LMN), und `apps/api/.env.default` (95 Zeilen, 24 `KEYCLOAK_*/LMN_API/MAILCOW/GUACAMOLE/LDAP_`-Refs) verlangt viele externe Envs zum Boot → jeder Bugfix-Zyklus wäre sonst ein voller crabbox-Deploy. **Arbeitspaket „Dev-Umgebung":** erweiterte lokale Compose (Mongo+Redis+**Keycloak** mit Realm-Import + LMN-API-Stub oder Point-to-crabbox), `.env.development`-Vorlage, `docs/adr/` für die offenen §9-Entscheidungen. (`AGENTS.md`/`CLAUDE.md` existieren und steuern `feature-build` — enthalten **kein** Netzint-Copyright, gehören nur wegen „edulution"-Nennungen in die Rebrand-Prüfung §2.5.)

---

## 6. Verifikation: crabbox gegen echten LMN + Tests + Rollback

Bewiesenes Verfahren, als **wiederkehrender** Test etabliert:

1. **Deploy:** `scratchpad/edudeploy/deploy.sh` → `docker compose pull` + `up -d` auf crabbox (gebunden an echten LMN + linuxmuster-api7). Eigene Images aus `ghcr.io/<org>/openedulution-*` mit gepinntem Tag.
2. **Migrations-Upgrade-Test (Pflicht):** vor jedem crabbox-Upgrade `mongodump` **+ `./data/master.key` sichern**; dann echte **1.6-DB → eigenes Image** hochfahren und die 2.0-Migrationen laufen lassen — nicht nur Fresh-Install. Migrationen sind **irreversibel** → Rollback = DB-Dump **+ `master.key`** zurückspielen + vorheriger Image-Tag (ein erhöhter `schemaVersion` bricht das Downgrade; ohne den Master-Key sind gewrappte Passwörter nach Restore unlesbar — s. §5.6-DR). Als **Exit-Kriterium** je Phase. **Zusätzlich Fresh-Install-Fidelity (neu):** `defaultAppConfig` (`main.js:2380–2468`) 1.6↔2.0 gegenprüfen — ein frischer Fork muss dasselbe Standard-App-Layout wie 2.0.200 zeigen (**eigenes** Exit-Kriterium, nicht nur Upgrade-Pfad).
3. **App-Store-Verifikation:** OnlyOffice/Collabora/Moodle/Guacamole über die UI auf crabbox ausrollen (testet die `DockerService`-Engine end-to-end) — setzt den umgebogenen `edulution-plugins`-Compose-Fetch voraus (§3.4/§5.3).
4. **Keycloak-Realm-Export-Diff:** Realm der laufenden Instanz exportieren und gegen Soll diffen (die Fingerprint-Pipeline sieht Keycloak nicht).
5. **Screenshot-Baselines:** bestehende 2.0.200-Referenz-Shots (`scratchpad/real/` + `scratchpad/clean/`) als Soll; `shots.py`/`shots2.py` schießen die Ist-Shots → **Visual-Diff je Modul**.
6. **Funktionale Verifikation gegen echten LMN** (menschliches Urteil): Kernflows je Modul; für Backend-nahe Module (Pairing: LMN-Gruppen; Linbo: Imaging) am echten `linuxmuster-api7`. **DSGVO:** dabei **keine echten Schüler-PII** — synthetische Fixtures (§2.7).
7. **Multi-School-Achse:** crabbox ist vermutlich Single-Default-School; der Code hat echte Multi-School-Logik (`cacheGroupsBySchoolName` `main.js:9468`, `SPECIAL_SCHOOLS` `:8821`, `getSchools`). Module wie Pairing/Groups/MobileDevices verhalten sich multi-school anders → **Scope-Entscheidung** (Abschnitt 9); mindestens als bekannte ungetestete Achse dokumentieren.
8. **Auth-/Rotations-Testfälle (neu):** je Controller ein **Auth-Spec** (401 ohne Token, 403 als Nicht-Admin, `@Public`-Routen bewusst gelistet, s. §3.2-Auth-Contract) als CI-Exit-Kriterium; **Signing-Key-Rotations-Test** (KC rotiert Key → `./data/edulution.pem` neu ziehen → Login muss wieder gehen, s. §3.6/R9).
9. Integriert über den **`test`-Skill** (crabbox: Docker/GUI/Multi-Host) — läuft **nach** menschlicher Backlog-Freigabe.

**Test-/CI-Strategie (neu, R-Qualität):** 1.6 hat **28 API-`*.spec.ts`**, **0 Frontend-Tests**, **kein e2e**. Bei hand-rekonstruiertem Bundle-Code sind Unit-Tests der Hauptschutz gegen stillen Logik-Drift. **Maßnahmen:** die 28 vorhandenen Specs sofort übernehmen (liegen in 1.6-Source, kostenlos); pro rekonstruiertem Modul Specs verlangen **inkl. Auth-Spec** (§3.2); minimalen Contract-/Smoke-Test je neuem Controller in `build-and-test.yml` verdrahten. **Release-Green-Gate (neu):** die Merge-Gates sichern nur den PR — der Release-Build (`container-build.yml on: push tags`) läuft **ohne** vorgeschaltetes lint/test → `needs: [lint, test]` davorhängen (oder Branch-Protection), sonst verschifft ein Bumper-Tag Images auch bei rotem `main` (Detail §5.1). Jedes Modul-PR wird so end-to-end verifiziert, bevor es auf `main` merged.

---

## 7. Aktuell bleiben: Image-Diff-Pipeline

Eigenes Repo **`openedulution-tracking/`** (`bin/` + `versions/<ver>/` + `reports/` + `state.json`), Wochen-Cron.

**a) Release-Erkennung (ohne `docker pull`):** anonymer ghcr-Token, `skopeo inspect docker://ghcr.io/edulution-io/edulution-{api,ui}:latest` → `{version, revision, digest}` gegen `state.json`. **Digest mittracken** (fängt stille Re-Builds ohne SemVer-Bump). **Beide** Images pollen.

**b) Extraktion:** `crane export`/`skopeo copy` → nur `main.js` + `package.json` (API) und `assets/*` (UI); kein Runtime nötig.

**c) Backend-Fingerprint (deterministisch) — `main.js` erst `js-beautify`-normalisieren, dann greppen. Verifizierte Anker:**
- `class [A-Za-z]+Module` → 38 ✓ · `class [A-Za-z]+Controller` → 39 · `[A-Z0-9_]+_ENDPOINT = '…'` → 41 ✓
- `class [A-Za-z0-9_]+Dto` → **242 roh / 241 unique** (Anker exakt definieren: dedup, abstract/Basisklassen bewusst ein-/ausschließen, sonst rauscht der N-1→N-Diff) ✓
- `SchemaFactory\.createForClass` → 39 ✓ **(nicht `class *Schema` — liefert nur 3)**
- **NEU, Migrationen:** `'[0-9]{3}-[a-z0-9-]+'` (32 Namen) + `runMigrations\(` (12) — Migrationen sind **Objekt-Literale** und für alle `class *`-Anker unsichtbar. Kritisch, weil Migrationen den Upgrade-Pfad tragen.
- **NEU, Guards/Auth:** `class [A-Za-z]+Guard` (7+) + `@Public`-Marker — trägt den Auth-Contract (§3.2), den Route-Diffs sonst nicht sehen.
- **Aktiv schalten (nicht nur „ergänzbar" — tragen die ops-kritischen Queues/Crons, s. §5.6):** `class *Gateway` (2), `@Cron(`, `new Queue(`, `registerAs('…')`.

**d) Dependency-Diff (korrigiert):** **nicht** die geprunte `package.json` diffen (übersieht gebundelte Pure-JS-Deps wie `slugify`), sondern den `__webpack_require__`-Import-Graphen in `main.js` scannen **und** die Root-Dep-Liste vergleichen. **CVE-Signal andocken (s. h).**

**e) Frontend-Signal (korrigiert):** Chunk-Namen erkennen nur Wiki (5 der 6 Module liegen im monolithischen `index-*.js` ohne eigenen Chunk). Daher **auf String-Ebene im index-Bundle** heben: Route-Pfade, i18n-Keys, `APPS.*`-Slugs, `appType: NATIVE`-Registrierungen, CSS-Variablen-Diff. `TLDrawWithSync` ist **kein** neues 2.0-Signal (tldraw + @tldraw/sync bereits in 1.6.266 `package.json:88-89,170`) → als False-Positive behandeln; sauberes Beispiel für „neue Seite" = `WikiPage`. Immer gegen crabbox-Screenshot-Diff gegenprüfen.

**f) Keycloak-Realm-Export-Diff** (aus der laufenden crabbox-Instanz, nicht `main.js`) als eigener Pipeline-Schritt.

**g) Infra-/Compose-/Installer-/Companion-Digest-Diff (neu):** §7b extrahiert bewusst nur `main.js`+`package.json` (API) und `assets/*` (UI) — Dockerfiles, `docker-compose.yml.template`, Entrypoints, `nginx.conf`, `.env.default`, Companion-Image-**Digests** und das **Installer**-Repo bleiben blind. Ein 2.0.x-Release kann Compose-Topologie/Env/ein neues Companion ändern, ohne dass die Pipeline es sieht (§7f deckt nur Realm ab). → leichter Diff auf `docker-compose.yml.template`+`.env.default`+Companion-Digests+Installer-Repo als eigener Schritt (oder explizit als manuelle Achse).

**h) CVE-/Vulnerability-Scan (neu, s. §5.1-Security-Track):** Trivy/Grype über die gebauten Images + `npm audit`/Renovate-Signal an denselben Wochen-Cron andocken; Findings in dieselbe `reports/`-Pipeline (eigene Backlog-Sektion „Security").

**i) Backlog:** `report.sh` → `reports/<from>..<to>.md` in Sektionen (Backend voll-nachbaubar / Migrationen / Auth-Contract / Full-Stack-Korrelation / Frontend-only-Signal / Realm-Diff / Infra-Diff / Security) — jeder Task mit Quell-Beleg → `tasks/`-Ledger für `feature-plan`/`feature-build`. Draft-PR.

**Grenzen (ehrlich):** Frontend nur teil-diffbar (Handarbeit gegen Live-Referenz). Backend-Grep so gut wie die Namenskonvention — pro Release Sanity-Check, dass `main.js` **un-minifiziert** bleibt (Zeilenzahl/Klassennamen). Seed-Semantik nur über Migrationsnamen **und** das direkt diffbare `defaultAppConfig`-Array sichtbar (§3.0). **Infra-Blindheit (neu):** Compose-/Env-/Installer-/Companion-Digest-Drift sieht die Pipeline nur, wenn Schritt g aktiv ist (sonst manuelle Achse).

---

## 8. Phasenplan mit Meilensteinen

Annahme: 1 Entwickler (Kevin) + Assistent. PT-Zahlen sind Rekonstruktions-Schätzungen **inkl. ~30–50 % Verifikations-Overhead** (crabbox-Deploy, Visual-Diff, LMN-Test, PR-Review, Bugfix-Runden) und Basis-Drift-Puffer.

**Kapazitäts-Annahme (neu, explizit):** Kevin arbeitet **nebenbei** (er betreibt die Live-Instanz + Schul-IT) → Wochen-PT ≠ Kalenderwochen. Realistisch **~2–3 PT/Woche** effektiv (Teilzeit); die Wochen-Angaben unten sind **Vollzeit-äquivalent** und mit dem Teilzeit-Faktor auf Kalenderzeit hochzurechnen. Als Planungsprämisse festhalten.

| Phase | Inhalt | Dauer | Abhängigkeit | Meilenstein |
|---|---|---|---|---|
| **P0 — Rettung, Fork-Setup & Basis-Analyse** | Backup-Bundle (offsite), `gitleaks` volle History, `.gitignore`-Härtung, `origin→upstream-dead`, `main`@`36050641d`, Rescue-Branches pushen, `tracking`+`archive`-Repos, Bumper→PAT/App; **Basis-Drift-Analyse (32 Bestandsklassen)**, **Migrations-Inventar**, **Lieferketten-Inventar (inkl. `edulution-plugins`, 3. Fetch)**, **Realm-Template-Diff-Baseline**, **Env-/Secret-Inventar (Tabelle)**, **`defaultAppConfig`-Diff**, **DR-Runbook + Restore-Drill-Baseline**, **DSGVO/PII-Inventar** | **2–4 Wochen** | — | Repos live + **messbarer Drift/Backlog** (nicht nur Repos) |
| **P1 — Pipeline-Bootstrap** | Rebrand-Pass (Deny/Allowlist), CI→eigene ghcr-Org, **ProfilePicture**, Installer-Umbiegung (Registry+Tag-Pin, ui-kit inlinen, Lieferkette repointen), Lizenzserver stubben, **§13-Feature**, erster Image-Build + Deploy, **28 Specs in CI**, **Migrations-Upgrade-Test 1.6-DB → eigenes Image**; **CI-`permissions:`-Block + Green-Gate + `defaultBase→main`**, **`addLicenseHeader`→AGPL-SPDX**, **`MASTER_ENCRYPT_KEY` deterministisch**, **Default-Config-Härtung (CORS/Realm)**, **gitleaks als CI-Gate + Pre-Commit**, **Build-Metadaten/`metadata-action`** | **~2–3 Wochen** | P0 | **Eigene Images laufen auf crabbox gegen echten LMN; Upgrade-Pfad grün; Härtung/CI-Gates aktiv** |
| **P1b — Tracking- & Security-Pipeline** (parallel) | `openedulution-tracking`, 2.0.200-Baseline, korrigierte Anker (inkl. Migrationen, Guards/Auth, index-String-FE-Signal, Realm-Diff, **Infra-/Compose-Diff §7g**), Wochen-Cron; **+ CVE-/Trivy-Scan am Cron (§7h)** | **~1 Woche** | P0 | Automatischer Release-Poll + Security-Scan aktiv |
| **P2 — PILOT: Chat end-to-end** | 1 Modul durch ALLE Schritte: BE aus `main.js` + Rescue `1851` (primär), FE aus `1851`, Locales (DE+EN Pflicht), ggf. Keycloak, Specs **inkl. Auth-Spec**, crabbox-Deploy + Visual-Diff, `feature-review`, Merge | **~2,5–3 Wochen** | P1 | **Vollständiges Toolchain-/„neue native App"-Rezept validiert** |
| **P3 — Self-contained-Module** | **ParentChildPairing** (BE ~3–4 + Keycloak-Eltern-Rolle, FE ~3–5, echter LMN); **Wiki** (BE ~3–4 **+ Share-Visibility**, **FE 20–35** TipTap/KaTeX — eigenes Budget) | **~6–9 Wochen** | P2 | Wiki + Pairing live & verifiziert |
| **P4 — Mail + Standard-Server-Module** | **Mail** — nativer Webmail-Client + Mailcow-Admin (BE ~10–15 + **FE ~15–25**, +Migration `012`) **oder** SOGo-Iframe beibehalten (§9); **Filesharing/WOPI/Collabora** (+`ACTIVE_DOCUMENT_EDITOR`-Toggle); **App-Store-Verifikation** (Collabora/OnlyOffice via UI) | **~6–10 Wochen (nativer Mail-Client) bzw. ~3–4 (Iframe)** | P2 | Webmail/Mailcow-Admin **oder** Iframe + Collabora-Editing + IMAP/SMTP-Split + App-Store bewiesen |
| **P5 — Dedizierte Fremd-SW** | **Calendar** (BE ~6–8 + **FE 12–20** `rrule`; SOGo + SOGo-Theme-Mirror); **Linbo** (BE ~4–5; LINBO) | **~5–7 Wochen** | P2; SOGo/LINBO vorhanden | Calendar + Linbo (falls Infra da) |
| **P6 — Zurückgestellt** | **MobileDevices** (Relution kommerziell, BE ~10–14) und **Satellites** (Spike 15–25 + WG-Föderation + WS-Gateway + `satellite-appliance`-Image + 2. Host) | offen | Relution-Zugang / 2. Host | Vollparität (nur bei realem Bedarf) |

**Gesamt bis Feature-Parität (P0–P5, ohne MobileDevices/Satellites): ~35–48 Wochen Vollzeit-äquivalent (~8–11 Monate) bei nativem Mail-Client** — SOGo-Iframe-Beibehaltung spart ~3–6 Wochen (zurück auf ~30–40); bei Teilzeit (~2–3 PT/Woche) streckt sich die Kalenderzeit entsprechend. Sensitivität: v. a. **Wiki-FE** (20–35 PT) + **Mail-FE** (15–25 PT, native vs. Iframe) + Basis-Drift (unbekannt bis P0-Analyse). Die neuen Härtungs-/Ops-Pakete (DR-Runbook, Security-/CVE-Track, CI-`permissions:`/Green-Gate, Env-Inventar, DSGVO, Dev-Loop) sind über P0/P1 + die durchlaufenden Tracks verteilt und tragen modesten Zusatzaufwand; der dominante Swing bleibt Mail-FE + Basis-Drift. P6 nur bei realem Bedarf — dann +Infra-Beschaffung.

**Parallelisierbar:** P1b neben P1; innerhalb P3–P5 Module ohne gemeinsame Deps parallel bei Kapazität.

---

## 9. Risiken & offene Entscheidungen

**Risiken:**
- **R1 — Frontend = größter Kostenblock.** Wiki (TipTap/ProseMirror, 1,35-MB-Editor) + Calendar (Eigenbau-Grid + `rrule`) + **neu: nativer Mail-Webmail-Client + Mailcow-Admin** ohne Source. Wiki + Calendar + Mail-FE übertreffen die frühere FE-Gesamtschätzung deutlich. Gemildert nur für Chat/Pairing (Rescue). Gegenmaßnahme: TipTap-StarterKit „gut genug"; Mail ggf. SOGo-Iframe statt Neubau.
- **R2 — Basis-Drift unbelegt.** „Additiv" gilt nur auf Modul-Ebene; Bestands-`libs`/`appconfig`/SSE-Contract könnten refactored sein → Integrationsreibung auf jedem Modul. Muss in P0 gemessen werden, bevor Aufwände fix sind.
- **R3 — Upstream tot & unersetzlich.** Lokale `.git` = einzige Kopie → Backup-Bundle überlebenswichtig. „Aktuell bleiben" hängt an der Pipeline; bricht, falls Upstream `main.js` künftig minifiziert (Sanity-Check pro Release). Zusätzliche tote Außenreferenzen: `license.edulution.io`, SOGo-Theme-Fetch, **`edulution-plugins`-App-Store-Compose (3. Fetch)**, `docs.edulution.io`, Companion-Images, evtl. geerbte Sentry-DSN (können wie `edulution-ui` verschwinden).
- **R4 — Migrationen/Datenintegrität.** Fehlender Upgrade-Pfad 1.6→2.0; forward-only, kein Rollback → `mongodump`-Disziplin. **Master-Key-Verschlüsselung** (`000-wrap-encrypt-keys-with-master-key`) → Key-Management erstklassiges Thema; der Master-Key gehört **ins Backup-/Rollback-Set** (nicht nur Provisioning) — Restore ohne `./data/master.key` = **unlesbare Passwörter** (s. §5.6-DR, §2.6, §6.2).
- **R5 — AGPL/Marken.** §13-Angebot **neu** hinzufügen (existiert nicht); `LICENSE_EXCEPTIONS.md` → eigenes Trademark-Statement; **Pre-Commit-`addLicenseHeader.ts` stempelt sonst Netzint-Copyright „all rights reserved" + Kommerz-Arm in jede neue Datei** (→ AGPL-SPDX-Header, §2.4); Markenrecht „edulution" gilt unabhängig vom Copyright; dualen Lizenz-Arm klarstellen.
- **R6 — Build-Fallen:** neue Deps müssen in die **Root-`package.json`** (webpack bundelt Pure-JS, `generatePackageJson` erfasst sie nicht); privater `@edulution-io/ui-kit` im Installer (inlinen); `build:all`-Reihenfolge erzwingen; Bumper braucht echten PAT/App-Token (nicht `GITHUB_TOKEN`); **Tag-Build-Workflows ohne `permissions:`-Block → GHCR-Push 403 auf frischer Org** (§5.1); **Release-Build ohne Green-Gate + `nx.json defaultBase:"dev"`** (§5.1). `MODULE_NOT_FOUND` dagegen **unwahrscheinlich** (fettes Root-`node_modules` im API-Image).
- **R7 — Externe Infra pro Modul:** SOGo (Calendar), Collabora (WOPI), LINBO (Linbo), Relution (MobileDevices, kommerziell), 2. Host + `satellite-appliance` (Satellites). Verifizierbarkeit hängt an Verfügbarkeit; App-Store-Companion-Images sind zusätzlich eine Rebuild/Repoint/Mirror-Entscheidung; der `edulution-plugins`-Compose-Fetch muss umgebogen sein, sonst rollt keine App aus (§3.4/§5.3).
- **R8 (niedrig) — Keycloak-Versionsdrift** (25.0 Bootstrap vs. 26.4 Prod): nice-to-have, kein Blocker.
- **R9 (neu) — Signing-Key-Rotation bricht Auth.** `AuthGuard` verifiziert JWTs gegen den statisch gepinnten `./data/edulution.pem` (kein JWKS, `main.js:55805`); KC-Key-Rollover = Total-Auth-Ausfall. Gegenmaßnahme: Re-Fetch-Skript/`jwks_uri`+`kid`-Umstieg + Rotationstest (§3.6/§6).
- **R10 (neu) — Kein Security-/CVE-Track.** Bei totem Upstream liefert niemand Security-Bumps auf die fette Monorepo-Dep-Fläche. Gegenmaßnahme: Renovate/Dependabot + Trivy/Grype als CI-Gate, an den Wochen-Cron gedockt (§5.1/§7h).
- **R11 (neu) — Unsichere Default-Config re-publiziert.** Ausgelieferte Defaults (`EDUI_CORS_URL:'*'`, Wildcard-OAuth `redirectUris/webOrigins:["*"]`, ROPC, Query-String-Token) landen unter Kevins Namen. Gegenmaßnahme: Härtungspass beim Installer-/Realm-Rebrand (§5.2, Punkt 6).
- **R12 (neu) — DSGVO/PII.** Schul-/Minderjährigen-PII + Drittempfänger (License-/Sentry/Relution/Mailcow) ohne Inventar; Verifikation läuft gegen echten LMN. Gegenmaßnahme: PII-Inventar + Drittempfänger-Liste + **synthetische crabbox-Fixtures** + Retention-Konzept (§2.7).

**Offene Entscheidungen (Kevin):**
1. **Naming/Org:** Produktname + GitHub-Org. **Empfehlung:** eigene Org (GHCR darunter, `GITHUB_TOKEN` reicht für Push, aber `permissions:`-Block setzen) **und ein öffentlicher Produktname OHNE „edulution"** (die Marke gilt unabhängig vom Copyright; „openedulution" enthält sie und ist rechtlich grenzwertig). **Empfehlung:** `openedulution` nur als internen Repo-/Arbeitstitel behalten, öffentlich einen distinkten Namen führen. Alternative: schriftliche Netzint-Genehmigung einholen.
2. **Versionsschema:** **`2.0.x`** (empfohlen, matcht Ziel-Image) vs. `1.6.267` weiterzählen.
3. **Branch-Modell:** single **`main`** (empfohlen) vs. `dev`/`master`-Dual (dann auch `nx.json defaultBase` mitziehen).
4. **Bumper:** eigene GitHub-App (empfohlen für Least-Privilege) vs. fine-grained PAT — **beides mit `contents:write`, nie `GITHUB_TOKEN`**, strikt 1 Tag/Push.
5. **Lizenzserver:** Community-Lizenz-Subsystem **stubben/entfernen** (empfohlen, AGPL-Arm) vs. auf eigenen Endpoint zeigen.
6. **Multi-School:** Single-School-MVP (empfohlen für crabbox) vs. Multi-School unterstützen (braucht Multi-School-LMN-Fixture).
7. **Companion-Images:** pro Image selbst bauen / Digest-pinnen / mirrorn — mindestens SOGo-Theme + `edulution-plugins`-Compose + Verifikations-Images spiegeln (empfohlen).
8. **P6-Scope:** MobileDevices/Satellites dauerhaft zurückstellen (empfohlen) vs. anstreben.
9. **Node/nginx-Pins** übernehmen vs. neu pinnen; **Infra-Image-Pins** (Mongo/Redis/Traefik/KC/Postgres) auf Digest; **Multi-Arch (amd64-only heute) + SBOM/Provenance** bewusst entscheiden; **Seed-Assets** `data/public/assets` auf 2.0.200-Änderungen prüfen; `ui-kit` Source-Alias (UI) + inlinen (Installer) vs. eigenes npm-Paket.
10. **Mail-UI (neu, Swing-Faktor §8):** nativen 2.0-Webmail-Client + Mailcow-Admin nachbauen (Parität, ~25–40 PT BE+FE) **vs.** 1.6-SOGo-Iframe beibehalten (billig, weicht von Parität ab).
11. **Sprachen (neu):** FR mitpflegen vs. aus `supportedLngs` streichen (DE+EN sind pre-commit-Pflicht, gegen Live neu verfasst).
12. **Sentry/Telemetrie (neu):** deaktiviert (Empfehlung) vs. eigener DSN — **nie** Fremd-DSN erben.
13. **QR-Login/„Mobile Access" (neu):** Kacheln verbergen (Empfehlung, solange keine eigene Mobile-App) vs. auf eigene App vorbereiten.

**Exit & Longevity (neu):** (a) **Kill-/Feature-Freeze-Kriterien** definieren (z. B. „Upstream 3.0 = Totalumbau/`main.js`-Minifizierung → Pipeline tot → Fork einfrieren/neu bewerten"); (b) **Übergabe-/Bus-Factor-Plan** (Kevin = SPOF): Doku, Zugänge, `master.key`-**Escrow**; (c) kleine **Kosten-/Eigentums-Tabelle** (Domain, DNS/acme-dns, GHCR-Storage, always-on-Companions, Relution, 2. Host).

---

## 10. Nächste konkrete Schritte (Kevin + Assistent, ZUERST)

1. **Backup (unverzüglich, Single Point of Failure):**
   ```bash
   git -C /home/kevin/Dev/faircomp/openedulution/edulution-ui        bundle create ~/backups/edulution-ui-ALL-$(date +%F).bundle --all
   git -C /home/kevin/Dev/faircomp/openedulution/edulution-installer bundle create ~/backups/edulution-installer-ALL-$(date +%F).bundle --all
   ```
   Offsite ablegen. Erst danach irgendetwas an `.git` ändern. **(Getrennt davon:)** Das `git bundle` sichert nur **Code/History** — die **Laufzeit-DR** (Mongo-Dump + `./data/master.key` + `pg_dump` Keycloak, s. §5.6) ist ein **eigenes** Runbook für die laufende Instanz und darf nie mit dem Code-Backup verwechselt werden (Restore ohne `master.key` = unlesbare Passwörter).
2. **Offene Entscheidungen 1–3 klären** (Org-/Produktname ohne Marke, Versionsschema `2.0.x`, Single-`main`) — blockiert Registry-Pfade + Rebrand.
3. **`gitleaks detect`** über die volle History beider Repos; `.gitignore`-Härtung (`**/settings.local.json`); die 3 uncommitteten `notifications`-Dateien stashen/übernehmen. (Später: `gitleaks protect` als Pre-Commit + CI-Gate, §2.6.)
4. **Fork-Setup `openedulution-ui`** (Abschnitt 2.2): `upstream-dead`, `main`@`36050641d`, `fork-base/v1.6.266`, eigene Remote, **alle 584 Tags + `upstream/*`-Rescue-Branches pushen**.
5. **Basis-Analyse (P0-Kern):** Fingerprint der 32 Bestandsklassen 1.6↔2.0, **Migrations-Inventar** (12 `runMigrations`, 32 Namen), **Lieferketten-Inventar** aller `edulution-io`-Außenreferenzen (**inkl. `edulution-plugins`, 3. Fetch**), **Realm-Export-Diff** von crabbox, **`defaultAppConfig`-Diff**, **Env-/Secret-Inventar (Tabelle)**, **DSGVO/PII-Inventar**. Ergebnis fixiert die Aufwände.
6. **Fork-Commit:** NOTICE/Attribution + Fork-CHANGELOG, LICENSE (AGPLv3) behalten, dualen Lizenz-Arm dokumentieren, `LICENSE_EXCEPTIONS.md` → Trademark-Statement, **§13-Feature hinzufügen**, Lizenzserver-Entscheidung umsetzen, Rebrand-Pass mit Deny/Allowlist, **`scripts/addLicenseHeader.ts` → AGPL-SPDX-Header**, **`nx.json defaultBase→main`**, **CI-`permissions:`-Block**, **Default-Config-Härtung (CORS/Realm)**.
7. **`openedulution-tracking` anlegen**, 2.0.200 als Baseline `versions/2.0.200/` (aus `scratchpad/api-img` + `scratchpad/ui-img`), `fingerprint.sh` mit korrigierten Ankern (`SchemaFactory.createForClass`, Migrationsnamen, Guards/Auth, index-String-FE-Signal, Infra-Diff) als Selbsttest; CVE-Scan andocken.
8. **Chat-Pilot anstoßen:** `feature-plan` für **Chat** (BE aus `main.js:68438/68779` + Rescue `origin/1851` **primär**; FE aus `origin/1851`) → Spec + Task-Ledger → `feature-build` → crabbox-Verifikation gegen `scratchpad/real` **inkl. Migrations-Upgrade-Test + Auth-Spec**. Der Pilot validiert das gesamte End-to-End-Rezept, bevor die teuren Module (Wiki/Calendar/Mail) starten.

---

## Änderungslog (v2 — nach Vollständigkeits-Audit)

Die 24 im adversarischen Vollständigkeits-Audit **bestätigten** Befunde (früher im angehängten „FINALER PLAN-NACHTRAG", jetzt entfernt) sind direkt in ihre Zielabschnitte eingearbeitet. Der „VERWORFEN"-Teil wurde nicht übernommen. Übersicht:

**P0**
- **1 · Mail neu klassifiziert** (voller IMAP-Webmail-Client + Mailcow-Admin, `MailsController` `main.js:23140–24941` = **36** Routen vs. 10 in 1.6; FE fehlte ganz) → §3.2 Modul-4-Zeile (0→~26 Routen, BE 3–4 → **10–15 PT**) + Mail-Note + Auth-Contract; §4.3 **neue Mail-FE-Zeile ~15–25 PT** + Note; Backend-Kern 29–39 → **36–50** (43–65 buffered); FE-Kern 40–65 → **55–90**; §8 (P4 „~6–10 bzw. ~3–4 Wochen", Gesamt **~35–48 Wochen**); TL;DR; §9 R1 + neue Entscheidung **10 (Mail-UI: nativ vs. SOGo-Iframe)**.
- **2 · `master.key` im Backup-/Rollback-/DR-Set** → §2.6 (Master-Key-Provisioning **+ Backup-Kopplung**, `getMasterKey` `main.js:9214–9235`); §3.3 + §6.2 (Rollback = Dump **+ `master.key`**); neuer **§5.6-DR-Runbook** (`mongodump`+`pg_dump`+`./data`-Tar, Restore-Drill); §10.1; R4.

**P1**
- **3 · App-Store-Compose-Fetch aus `edulution-plugins`** (`urls.ts:21`, `useDockerApplicationStore.ts:153/183`, 3. Laufzeit-Fetch) → §5.3 (3. Fetch) + §3.4; TL;DR/§1 Fetch-Zahl **2 → 3**; §6.3, §9 R3/R7, §10.5.
- **4 · Pre-Commit `addLicenseHeader.ts`** (Netzint-Copyright/Kommerz-Arm in jede neue Datei, `scripts/addLicenseHeader.ts:23–39`) → §2.4 (neuer Bullet, → AGPL-SPDX) + §2.5 (Rebrand-Pass) + §8 P1 + §9 R5 + §10.6.
- **5 · Kein CVE-/Vulnerability-Management** (keine Renovate/Dependabot/Trivy) → §5.1 **Security-/CVE-Track** + §3.5 + §7d/§7h (Cron) + §8 P1b + **neues R10**.
- **6 · Auth-Guards/RBAC/`@Public` im Nachbau-Contract** (7+ Guards `main.js:11219/56393/56551/56883/59956/63161/64484`) → §3.2 **Auth-Contract** + Rezept-Schritt (f); §6.8 + Test-Strategie (Auth-Spec); §7c (Guard-Anker); §3 Grundprinzip.
- **7 · Tag-Build-Workflows ohne `permissions:`-Block** (`container-build.yml:100/104`) → §5.1 (Pflicht-Bullet) + §2.1; §8 P1; §9 R6.

**P2**
- **8 · Unsichere Default-Config** (CORS `*` `docker-compose.yml.template:24`/`main.js:73157`; Wildcard-OAuth; Query-Token `main.js:60024`) → §5.2 **Punkt 6 (Härtung)** + §2.5; **neues R11**.
- **9 · Signing-Key statisch gepinnt** (`./data/edulution.pem` `main.js:55805`, kein JWKS) → §3.6 (Signing-Key-Pinning) + §6.8 (Rotationstest) + **neues R9**.
- **10 · i18n-Realität** (DE+EN pre-commit-erzwungen `checkTranslations.ts:64`/`checkErrorMessages.ts:83`; FR offen; Keys neu verfassen) → §4.2 Schritt 4 + §4.3 (Locale-Aufwand) + §9 Entscheidung **11 (FR)**.
- **11 · Observability + Build-Metadaten** (Health `… || 'unknown'` `main.js:59718–59722`; tote `buildId/version`-Args; Sentry `main.js:54486/59762`) → **neuer §5.5** + §2.4 (Mechanismus) + §5.1 (Build-Metadaten) + §5.3 (Sentry) + §9 Entscheidung **12**.
- **12 · Env-/Secret-Inventar unvollständig** (`MASTER_ENCRYPT_KEY`/`ENABLE_SENTRY`/`EDUI_DISK_SPACE_THRESHOLD`/… + KC-Client-Secrets `webinstaller-api/app/main.py:687/702–710`) → §2.6 (Inventar-Tabelle) + §3.6 (KC-Secrets) + §5.2 Punkt 7.
- **13 · CI/Supply-Chain-Härtung** (floating Infra-Tags `docker-compose.yml.template:60/75/94/116/147`; keine SBOM/Provenance/buildx; tag-gepinnte Actions; keine Release-Notes/Retention) → §5.1 (Supply-Chain-Bullet) + §5.2 Punkt 7 + §9 Punkt 9.
- **14 · Release-CI ohne Green-Gate + `nx.json defaultBase:"dev"` + Bulk-Tag-Push** → §5.1 (Green-Gate) + §6 (Test-Strategie) + §2.3/§2.5 (`defaultBase`) + §2.2 (Bulk-Tag).
- **15 · Laufender Secret-Scan fehlt** (gitleaks nur einmalig) → §2.6 (`gitleaks protect` Pre-Commit + CI-Gate) + §10.3.
- **16 · Tracking blind für Infra-/Compose-/Installer-/Companion-Drift** → **neuer §7g** + §7-Grenzen (Infra-Blindheit) + §8 P1b.
- **17 · In-App-Fremd-URLs** (`docs.edulution.io` `urls.ts:22`, Apple-App-Store `urls.ts:20`, QR-Login) → §2.5 (Rebrand-Fläche) + §4.1 (FE-Referenzen) + §9 Entscheidung **13**.
- **18 · Wiki-Share-Visibility** (`WIKI_SHARE_VISIBILITY_TABLE` `main.js:2098`) → §3.2 Wiki-Zeile + §4.3 Wiki-Zeile/Scope-Note + §8 P3.
- **19 · Kein lauffähiger lokaler Dev-Stack** → **neuer §5.7 (Dev-Loop)** + §2.5 (`AGENTS.md`/`CLAUDE.md` in Rebrand-Prüfung).
- **20 · Keine DSGVO/PII-Inventur** → **neuer §2.7** + §6.6 (synthetische Fixtures) + §8 P0 + **neues R12**.
- **21 · Kapazitäts- + Exit-/Bus-Factor-/Kosten-Strategie** → §8-Kopf (Kapazitäts-Annahme ~2–3 PT/Woche, Vollzeit-äquivalent) + neuer **§9-Unterpunkt „Exit & Longevity"**.

**P3**
- **22 · Betriebs-Runbook** (Redis flüchtig `docker-compose.yml.template:88–89`; BullMQ-Job-Verlust `main.js:8854–8856`; Disk-Wachstum `EDUI_DISK_SPACE_THRESHOLD` `main.js:56932/57024`; 4 Cleanup-Crons) → **§5.6 Runtime-Runbook** + §7c (Anker `new Queue(`/`@Cron(` aktiv geschaltet).
- **23 · `defaultAppConfig`-Seed-Fidelity** (`initializeCollection` `main.js:2335`, Array `:2380–2468`) → §3.0 (Basis-Drift) + §6.2 (Fresh-Install-Exit-Kriterium) + §7-Grenzen.
- **24 · `ACTIVE_DOCUMENT_EDITOR`-Selektor + OnlyOffice-Key-Migration** (`main.js:2114/26542/27149–27150`; `main.js:1726 delete … ONLY_OFFICE_JWT_SECRET`) → §3.2 Modul-5-Zeile + Modul-5-Note + §3.3 (Config-Migration).



