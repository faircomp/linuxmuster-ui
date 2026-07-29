<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# ADR 0001 — Namensgebung & Registry (OF1)

- **Status:** akzeptiert
- **Datum:** 2026-07-15
- **Kontext:** Der Fork muss die edulution-Marke von Netzint GmbH umgehen (R5) und zur
  `faircomp/linuxmuster-*`-Repo-Struktur passen.

## Entscheidung

- **Produktname (Anzeige):** `linuxmuster` (bzw. „linuxmuster UI"). Nicht mehr „edulution"/
  „openedulution".
- **GitHub-Org:** `faircomp`.
- **Container-Images:** `ghcr.io/faircomp/linuxmuster-ui` und `ghcr.io/faircomp/linuxmuster-api`.
- **Repo-URL:** `https://github.com/faircomp/linuxmuster-ui`.
- **Zentralisierung:** Diese Werte leben als Konstanten in
  `libs/src/common/constants/productInfo.ts` (`PRODUCT_NAME`, `PRODUCT_SOURCE_URL`,
  `PRODUCT_DOCS_URL`) — nicht verstreut hartkodieren.

## Allowlist (bewusst NICHT umbenannt)

`@edulution-io/ui-kit` (npm-Dependency), `edu-*`-Slugs/Icon-Pfade, `isEdulutionApp`/
`EDULUTION_APP_AGENT_IDENTIFIER`, `EDULUTION_MANAGER_*`/`edulution-manager`,
`edulution-binduser-*`-Keys, `/opt/edulution/api`, `edulution.pem`, sowie sämtliche
Netzint-Copyright-Header auf Bestandsdateien — alles aus Kompatibilitäts-/Wiring-Gründen erhalten
(s. `TRADEMARK.md`).

## §13-Handoff (AGPL Quellcode-Angebot)

`PRODUCT_SOURCE_URL` + die Version (`package.json`) sind die Grundlage für das noch zu bauende
§13-UI-Feature (sichtbares Quellcode-Angebot). Owner: späteres Observability-/About-Paket.

## Folgen

Rebrand-Sweep (`p1-rebrand` T1–T16) setzt diese Werte um; das Schluss-Audit (T16) hält die
Deny-/Allowlist maschinell durch.
