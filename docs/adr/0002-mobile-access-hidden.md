<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# ADR 0002 — Mobile-Access & QR-Login verborgen (OF4)

- **Status:** akzeptiert
- **Datum:** 2026-07-15
- **Kontext:** Die native edulution-Mobile-App (und der zugehörige QR-Login + Mobile-Access-Setup)
  gehört zum kommerziellen/kompanion Teil, den dieser Fork zunächst **nicht** ausliefert
  (MobileDevices ist P6 deferred). Die UI-Einstiegspunkte dürfen keine nicht vorhandene App
  bewerben.

## Entscheidung

Die App-bezogenen UI-Einstiegspunkte werden hinter das Flag **`MOBILE_APP_ENABLED`**
(`libs/src/common/constants/productInfo.ts`, Default `false`) gelegt:

- **QR-Login-Toggle** auf der `LoginPage` (`login.loginWithApp` + `QrCodeIcon`) — nur bei
  `MOBILE_APP_ENABLED` sichtbar (`p1-rebrand` T10).
- **Mobile-Access-Route** (`MOBILE_ACCESS_PATH`) + der zugehörige UserSettings-Nav-Eintrag — nur
  bei `MOBILE_APP_ENABLED` registriert/sichtbar (`p1-rebrand` T11).

Die Backend-Endpunkte (`AUTH_QRCODE`, Mobile-Access-API) bleiben **unangetastet**; nur die
UI-Affordances werden verborgen. Bestehende i18n-Keys (QR/Mobile) bleiben erhalten (ungenutzt),
damit ein späteres Aktivieren (Flag `true`) ohne Rückbau möglich ist.

## Folgen

Wird MobileDevices/die native App später geliefert (P6), genügt `MOBILE_APP_ENABLED = true`, um
QR-Login + Mobile-Access wieder einzublenden — kein Code-Rückbau nötig.
