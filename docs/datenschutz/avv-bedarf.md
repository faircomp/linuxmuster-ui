<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# AVV-Bedarf je Companion/Dienst

Auftragsverarbeitungsvertrags-**Bedarf** (Art. 28 DSGVO) je Companion/Dienst — **nur Markierung,
kein Vertragsentwurf** (YAGNI). Quellen: [Supply-Chain §5.3](../supply-chain/edulution-io-external-references.md)
(Companion-Images) + [Drittempfänger](./drittempfaenger.md).

| Companion / Dienst | Hosting | verarbeitet PII? | AVV-Bedarf | Anmerkung |
|---|---|:--:|:--:|---|
| edulution-mail (Mailcow/SOGo) | **self-hosted** | ja (Mail) | **entfällt** | eigener Betrieb, keine Auftragsverarbeitung |
| edulution-onlyoffice / Collabora | self-hosted | ja (Dokumente) | entfällt | — |
| edulution-guacamole | self-hosted | ja (Sessions) | entfällt | — |
| edulution-veyon | self-hosted | ja (Klassenraum) | entfällt | — |
| edulution-wireguard | self-hosted | begrenzt (VPN-Metadaten) | entfällt | — |
| Keycloak / MongoDB / Redis / Traefik | self-hosted | ja (Auth/Daten) | entfällt | Kern-Infra, eigener Betrieb |
| **Sentry** (falls aktiviert) | **extern** | ja (`sendDefaultPii`) | **ja** | Default aus; bei Opt-in AVV mit Sentry nötig |
| **Expo / FCM / APNs** | **extern** | ja (Push-Tokens/Payload) | **ja** | aktiver Push-Pfad → AVV mit Push-Provider |
| license.edulution.io | extern | nein (nur `licenseKey`) | nein | keine personenbezogenen Daten |
| Relution (MDM) | extern | ja | ja (bei Aktivierung) | P6 deferred/inaktiv |

**Kernbefund:** Der gesamte edulution-Companion-Stack ist **self-hosted → AVV entfällt**. AVV-Bedarf
besteht nur bei den **externen** Diensten mit PII: **Push (Expo/FCM/APNs)** im Default und **Sentry**
nur bei Opt-in. license.edulution.io = kein AVV (keine PII).
