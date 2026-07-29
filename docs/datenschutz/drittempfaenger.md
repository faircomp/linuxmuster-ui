<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# Drittempfänger personenbezogener Daten

An welche externen Empfänger fließen (potenziell) personenbezogene Daten. Belege:
`main.js:43707/43800` (License), `54486-54490`+`59762-59780` (Sentry), `expo-server-sdk`
(`registeredPushTokens`), [Supply-Chain-Inventar §5.3](../supply-chain/edulution-io-external-references.md).

| Empfänger | Übermittelte PII | Default An/Aus | Rechts-/Ersetzungsstatus |
|---|---|:--:|---|
| **license.edulution.io** | **nur `licenseKey`** (keine Schüler-/Nutzer-PII) | An (Lizenzprüfung) | Fremd-Dienst → im Fork stubben/deaktivieren (`p1-installer-repoint`) |
| **Sentry** (BE `enableSentryForNest`, FE) | `sendDefaultPii:true` → potenziell Nutzer-/Request-PII **wenn aktiv** | **Aus** (`ENABLE_SENTRY=false`, gehärtet in `p0-supply-chain-inventory`) | eigener DSN nur opt-in; nie Fremd-DSN erben |
| **Mailcow / SOGo** | Mail-Inhalte, Adressen (self-hosted Companion) | An (Mail-Feature) | self-hosted → kein externer Empfänger; AVV entfällt (s. [AVV](./avv-bedarf.md)) |
| **Expo / FCM / APNs** | `registeredPushTokens` (Geräte-Identifier) + Push-Payload | An bei Push-Nutzung | Push-Provider → **AVV-Bedarf**; Token-Minimierung prüfen |
| **Relution (MDM)** | Geräte-/Nutzerdaten | **inaktiv** (MobileDevices P6 deferred) | kommerziell; bei Aktivierung AVV nötig |
| **3× GitHub-Fetch** (SOGo-Theme, Plugins, cookie-test) | **keine PII** (Assets/Config) | An | nur Verfügbarkeits-/Egress-Thema, kein Datenschutz-Empfänger |

**Explizit festgehalten:** Der **License-Server erhält keine Schüler-PII** — ausschließlich den
`licenseKey`. Der einzige aktive PII-Drittempfänger im Default-Betrieb ist der **Push-Pfad
(Expo/FCM/APNs)**; Sentry ist per Default **aus**. Mail/Collabora/Guacamole u. a. sind self-hosted
(keine Drittübermittlung).
