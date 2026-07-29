<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# Retention- & Löschkonzept (Ist-Stand + Lücken)

Belege: `main.js:21630-21642` (Notification-TTL), `39930-39938` (PublicShare-TTL),
`69221-69425`/`60650-60702`/`44261-44290` (Chat/Pairing/SurveyAnswer — **kein** TTL). **Hier wird
nichts implementiert** — Inventur + offene Entscheidungen.

## Hat automatische Löschung (TTL-Index)

| Collection | Mechanismus | Frist |
|---|---|---|
| **notifications** / usernotifications | Mongo-TTL-Index (`expireAfterSeconds`) | **30 Tage** |
| **publicshares** | TTL / `validUntil` | share-spezifisch |
| parentchildpairing **Code** | kurzlebiger Pairing-Code (TTL) | kurz (Pairing-Datensatz bleibt) |

## Kein TTL / unbegrenzte Aufbewahrung (Lücke)

| Collection | PII Minderjähriger? | Lücke |
|---|:--:|---|
| **conversations** | ja | kein TTL, keine Löschroutine |
| **chatmessages** | ja | kein TTL — Chat-Inhalte bleiben unbegrenzt |
| **parentchildpairings** | ja | Pairing-Datensatz unbegrenzt |
| **surveyanswers** | ja | kein TTL — Freitext-Antworten bleiben unbegrenzt |
| **users** / useraccounts | ja | kein Offboarding-Löschpfad bei LMN-Abgang |

## Offene Entscheidungen (NICHT hier implementiert)

1. **Chat-Retention:** Vorschlag TTL/Archivierung für `chatmessages`/`conversations` — Frist ist
   eine **Produktentscheidung** (Spec-Offene-Frage 1). Owner: `p2-chat` bzw. Betrieb.
2. **Offboarding-Löschpfad:** Wenn ein Nutzer im LMN verschwindet, gibt es keinen kaskadierenden
   Lösch-/Anonymisierungspfad über `users`/`chatmessages`/`surveyanswers`/`parentchildpairings`
   (Spec-Offene-Frage 2). → als DSGVO-Löschpflicht-Track zu planen.

**Kernbefund:** Die einzige gelöschte PII ist `notifications` (30 d) + abgelaufene `publicshares`;
**alle inhaltlichen Minderjährigen-Daten (Chat, Survey, Pairing) haben kein TTL** — die größte
Retention-Lücke.
