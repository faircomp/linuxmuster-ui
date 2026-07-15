# CI- & Release-Runbook (linuxmuster-ui)

Betreiber-Contract für die eigene CI-/Registry-Pipeline (`p1-own-ci-registry`). Der Loop baut und
verifiziert die **Konfiguration**; der erste echte Push gegen die faircomp-Org und das
Public-Schalten der Packages sind **manuelle Ops-Schritte** (Human-Gate).

## 1. Secret bereitstellen: `RELEASE_BUMP_TOKEN`

Die Versions-Bumper (`bump-patch-version-tag.yml` auf Push nach `main`, `bump-minor-version-tag.yml`
manuell) pushen den Bump-Commit + Tag mit einem **eigenen** Token — nie `GITHUB_TOKEN` (der triggert
`container-build.yml` nicht).

- **Repo-Secret** `RELEASE_BUMP_TOKEN` anlegen: ein **fine-grained PAT** mit **Contents: write** auf
  `faircomp/linuxmuster-ui` (und `metadata: read`).
- Alternative (robuster gegen PAT-Ablauf): eine **GitHub App** mit Contents-write, per
  `actions/create-github-app-token` — dann `RELEASE_BUMP_TOKEN` durch den App-Token-Step ersetzen
  (offene Frage in der Spec).

## 2. Org-/Repo-Setting prüfen

- **Settings → Actions → General → Workflow permissions**: „Read and write permissions" **oder** der
  Job-`permissions:`-Block reicht (container-build hat `packages: write`, Bumper `contents: write`).
- **GHCR-Packages** `ghcr.io/faircomp/linuxmuster-ui` + `…/linuxmuster-api` nach dem ersten Push auf
  **public** schalten (Package → Settings → Change visibility) — sonst kann kein Admin ohne Login
  pullen. (Paket-Sichtbarkeit ≠ Repo-Sichtbarkeit.)

## 3. Erst-Push-Smoke (Human-Gate — läuft NICHT auf der crabbox)

1. Einen Release-Tag pushen: `git tag v2.0.0 && git push origin v2.0.0` (Format `v*.*.*`).
2. `container-build.yml` läuft: **Green-Gate** (`checks`-Job: lint + test + `nx test frontend` +
   check-translations) **vor** `build-frontend`/`build-api` — ohne grünen Stand wird **kein** Image
   verschifft.
3. Erwartung: beide Images erscheinen unter `ghcr.io/faircomp/linuxmuster-{ui,api}:v2.0.0` (+ `:latest`).
4. Herkunft/Metadaten prüfen:
   - `docker inspect ghcr.io/faircomp/linuxmuster-api:v2.0.0 --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'`
     → der Commit-SHA (nicht leer).
   - Health-Endpoint der laufenden API liefert `commitSha` / `version` / `buildDate` / `buildNumber`
     **≠ `unknown`** (aus den Build-Args, s. u.).

## 4. Build-Metadaten-Env-Vertrag

`container-build.yml` reicht diese vier als `--build-arg` in beide Dockerfiles; die Dockerfiles setzen
sie als `ENV`, `apps/api/src/config/configuration.ts` liest sie zur Laufzeit (`|| 'unknown'`):

| Env / Build-Arg | Quelle in der CI | Runtime-Feld |
|---|---|---|
| `COMMIT_SHA` | `${{ github.sha }}` | `commitSha` |
| `BUILD_DATE` | `metadata-action` `image.created` | `buildDate` |
| `BUILD_NUMBER` | `${{ github.run_number }}` | `buildNumber` |
| `APP_VERSION` | `${{ github.ref_name }}` (Tag) | `version` (sonst `package.json`) |

## Nicht-Ziele

Kein CI-Actions-Runner auf der crabbox → die E2E-Smoke ist ops/manuell. Actions sind SHA-gepinnt
(T10); Dependency-/CVE-Tracking (Renovate/Trivy) ist ein eigenes Paket (`p1-security-cve-track`).
