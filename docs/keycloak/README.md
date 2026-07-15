<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# Keycloak-Realm-Diff — Werkzeuge & Referenzen

Werkzeugkasten für den Realm-Drift-Vergleich **Installer-Template ↔ laufende Instanz** (P0
`p0-realm-diff-baseline`). Kein Laufzeit-Feature — Referenz-Baseline + Diff-Werkzeug + Provisioning-Doku.

## Dateien

| Datei | Rolle |
|---|---|
| `realm-template.reference.json` | **On-Box-Referenzkopie** des Installer-Templates (Soll-/Template-Seite des Diffs) |
| `realm-2.0.200.baseline.json` | Gescrubbte Ist-Baseline der laufenden 2.0.200-Instanz (T4, live-gated) |
| `realm-provisioning.md` | Provisioning-Referenz (Clients · LDAP-Mapper · Rollen · Boot-Reihenfolge · Secrets · Findings) |
| `realm-diff-2.0.200.md` | Menschenlesbarer Diff Template↔Baseline mit Ursachen-Zuordnung (T6, live-gated) |
| `../../scripts/keycloak-realm-diff/export-realm.sh` | Realm-Export der laufenden Instanz (admin-cli ROPC) |
| `../../scripts/keycloak-realm-diff/normalize-realm.mjs` | Deterministisches Sortieren + Scrubben (Secrets → `REDACTED`) |
| `../../scripts/keycloak-realm-diff/diff-realm.mjs` | Normalisierter, feldgenauer Diff (Clients/Components/Roles) |

## Herkunft & Sync-Pflicht (T1)

`realm-template.reference.json` ist eine **1:1-Kopie** von
`edulution-installer/apps/public-page/public/download/realm-edulution.json.template` — **Single
Source of Truth bleibt das Installer-Repo.** Ändert sich das Installer-Template, ist diese Kopie
**nachzuziehen** (sonst driftet die Diff-Referenz). Die Kopie ist unverändert; **Secrets sind
bereits `**********`-maskiert** (kein Klartext committet).

## Re-Export & Diff für künftige Releases (T8)

Beim Nachziehen eines neuen edulution-Releases:
1. **Instanz hochziehen** (Voll-Stack, `/test`-Skill) und `export-realm.sh` gegen sie laufen lassen
   (`KEYCLOAK_API`/`KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD` gesetzt). Das Skript mergt den
   partial-export **und** die `/components`-Antwort (LDAP-Federation + KeyProvider) zu
   `scratchpad/realm-combined.raw.json`. Rohdateien landen in `scratchpad/` — **nie committen**
   (enthalten Klartext-Secrets/Schlüsselmaterial; per `.gitignore` blockiert). **Shape-Hinweis:**
   `/components` liefert LDAP-Mapper als parentId-verkettete Flach-Components, das Template nutzt
   geschachtelte `subComponents` — die Angleichung für den feldgenauen Component-Diff gehört zur
   Baseline-Erstellung (T4/T6).
2. **Scrubben:** `node scripts/keycloak-realm-diff/normalize-realm.mjs scratchpad/realm-combined.raw.json
   > docs/keycloak/realm-<version>.baseline.json`, dann
   `node scripts/keycloak-realm-diff/normalize-realm.mjs --assert-scrubbed docs/keycloak/realm-<version>.baseline.json`
   (muss Exit 0 sein — kein Secret unredigiert). Erst dann committen (Herkunft/Image-Tag im Commit).
3. **Diffen:** `npm run realm:diff` (vergleicht Template-Referenz ↔ committete Baseline) und das
   Delta in `realm-diff-<version>.md` nach Ursache dokumentieren (Installer-Substitution /
   6 Boot-Skripte / KC-Auto-Gen).

## Kein CI-Gate hier

Dieses Paket liefert **Werkzeug + Baseline**, **kein** CI-Gate. Die automatisierte Release-Drift-
Erkennung (skopeo-Trigger + Realm-Diff im Cron) ist Aufgabe von **`p1b-tracking-pipeline`**
(Repo `linuxmuster-tracking`), das `diff-realm.mjs` als Pipeline-Schritt wiederverwendet
(PLAN §7f/§8).
