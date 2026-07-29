<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# PII-Inventar je Collection/Datenquelle

P0-Inventur (`p0-pii-inventory`) — welche personenbezogenen Daten wo liegen, ob Minderjährige
betroffen sind und ob at-rest verschlüsselt wird. Belege: `.reference/2.0.200/api/main.js` +
`apps/api/src/**/*.schema.ts`. **Schwester-Dokumente:** [Verschlüsselung & master.key](./verschluesselung-master-key.md) ·
[Drittempfänger](./drittempfaenger.md) · [Retention/Löschkonzept](./retention-loeschkonzept.md) ·
[AVV-Bedarf](./avv-bedarf.md).

| Datenquelle / Collection | PII-Felder | Minderjährige | Verschlüsselung at-rest | Speicherort | Aufbewahrung |
|---|---|:--:|---|---|---|
| **LDAP / linuxmuster-api7** | samAccountName, Vor-/Nachname, Mail, Gruppen, sophomorix* | **ja** | LMN-seitig (AD) | externer LMN-Server | LMN-Lebenszyklus |
| **users** | `username`, `email`, `firstName`, `lastName`, `ldapGroups`, `userId`, `language`, `registeredPushTokens`, `password`, `encryptKey` | **ja** | `password` AES-GCM-256; `encryptKey` mit master.key gewrappt | Mongo | unbegrenzt (kein TTL) |
| **useraccounts** | `accountUser`, `accountPassword` | ja | `accountPassword` AES-GCM-256 | Mongo | unbegrenzt |
| **conversations** | `participants` (userIds), Titel | **ja** | nein (Mongo-Klartext) | Mongo | unbegrenzt (kein TTL) |
| **chatmessages** | `sender`, `content` (Freitext), `createdAt` | **ja** | nein | Mongo | unbegrenzt (kein TTL) |
| **parentchildpairings** | Eltern-/Kind-`userId`, Pairing-Code | **ja** (Kind) | nein; Code mit TTL | Mongo | Pairing unbegrenzt, Code kurzlebig |
| **surveyanswers** | `userId` + Antworten (Freitext → potenziell PII) | **ja** | nein | Mongo | unbegrenzt (kein TTL) |
| **notifications** / **usernotifications** | `userId`, Nachricht/Ref | ja | nein | Mongo | **TTL 30 Tage** |
| **publicshares** | Ersteller-`userId`, Datei-Refs, `password` | ja | Share-`password` gewrappt | Mongo | **TTL** (validUntil) |
| **mailproviders** | Mail-Zugangsdaten/Config | ja | Secrets gewrappt | Mongo | unbegrenzt |
| **license** | nur `licenseKey` (**keine** Schüler-PII) | nein | — | Mongo/Env | — |

**Kernbefund:** Nur `password`/`accountPassword`/`encryptKey`/Share-`password` sind at-rest
verschlüsselt (AES-GCM-256 + master.key, s. Schwester-Dok). **Chat-Inhalte, Survey-Antworten und
Pairing-Daten Minderjähriger liegen im Mongo-Klartext und ohne TTL** — das ist der zentrale
DSGVO-Hotspot (Retention/Löschung s. [Retention-Doku](./retention-loeschkonzept.md), offene
Entscheidung). `registeredPushTokens` sind Geräte-Identifier → Drittempfänger Expo/FCM/APNs.

_EN-Übersetzung dieses Inventars ist deferred (Spec-Offene-Frage 3)._
