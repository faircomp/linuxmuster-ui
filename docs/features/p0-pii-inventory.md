<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# p0-pii-inventory — DSGVO/PII-Datenfluss-Inventur (Spec)

> **Kalibrierungshinweis (Detailtiefe):** Dieses P0-Paket ist ein **Analyse-/Inventur-Paket**,
> kein Feature-Nachbau. „Soll" ist hier nicht ein 2.0-Verhalten, das nachgebaut wird, sondern
> der **Ist-Datenfluss des Ziel-Images 2.0.200**, wie er aus `main.js` und der 1.6-Source
> belegbar ist. Die Tasks liefern deshalb (a) **Inventar-Dokumente** und (b) **synthetische
> Test-Fixtures** als Ersatz für echte Schüler-PII in der crabbox-Verifikation (§6.6). Es
> entsteht **kein Produktcode, keine Migration, keine neue Route**. Die einzige „Entscheidung
> mit Codefolge" — ein Retention-TTL für Chat — ist bewusst als **Offene Frage** herausgezogen
> und würde ein **eigenes** Folge-Paket (mit forward-only-Migration) auslösen.

## Problem / Motivation

Der Fork verarbeitet reale Schul-PII und **Minderjährigen-Daten** (LDAP-Schüler, Chat,
Eltern-Kind-Pairing, Mail, Surveys). Bisher gibt es **kein Inventar**, welche Daten wo liegen,
wie/ob sie verschlüsselt sind, wie lange sie aufbewahrt werden und an welche **Drittempfänger**
sie fließen. Zugleich läuft die funktionale Verifikation „gegen echten LMN" (§6.6) heute mit
**Echtdaten** — DSGVO-riskant. Master-Plan §2.7 + Risiko **R12** verlangen: PII-Inventar je
Collection, Drittempfänger-Liste, Retention-/Löschkonzept, AVV-Bedarf je Companion und
**synthetische Fixtures statt Echtdaten** auf der crabbox.

## Ziel & Nicht-Ziele (YAGNI)

**Ziel:**
- Belegbares **PII-Inventar je Mongo-Collection + LDAP-Quelle** (Felder, Betroffene inkl.
  Minderjährige, Verschlüsselung-at-rest, Speicherort, Aufbewahrung).
- **Verschlüsselungs-/`master.key`-Datenfluss** dokumentiert (AES-GCM-256, gewrappte
  `encryptKey`), mit Verweis auf die Backup-/DR-Kopplung.
- **Drittempfänger-Liste** (Default An/Aus, PII-Umfang je Empfänger).
- **Retention-/Löschkonzept** (welche Collection hat TTL, welche nicht → Lücken benannt).
- **AVV-Bedarf je Companion/Dienst** (self-hosted vs. Auftragsverarbeiter).
- **Synthetische Persona-Fixtures** + maschineller **„keine-Echt-PII"-Gate** und ein
  **Seed-Helfer** für die API-eigenen PII-Collections → crabbox verifiziert ohne Echtdaten.

**Nicht-Ziele (bewusst raus):**
- Kein Chat-Retention-TTL implementieren (Design-Entscheidung → Offene Frage → Folge-Paket).
- Keine neue UI, keine neue API-Route, kein DSGVO-Auskunfts-/Lösch-Endpoint (YAGNI, später).
- Kein Seeden des **LDAP/linuxmuster-api7** selbst (Provisioning der Test-Schüler liegt auf der
  LMN-/crabbox-Seite, nicht in diesem Repo) — hier nur die **Konvention** + die API-eigenen
  Mongo-Collections.
- Keine juristische AVV-Ausarbeitung (nur **Bedarf** markieren, kein Vertragsentwurf).
- Keine Migration, kein `schemaVersion`-Bump.

## Betroffene Komponenten & Dateien (konkrete Pfade)

**Neue Doku (DE, Betreiber-/DSB-Publikum):**
- `docs/datenschutz/pii-inventar.md`
- `docs/datenschutz/verschluesselung-master-key.md`
- `docs/datenschutz/drittempfaenger.md`
- `docs/datenschutz/retention-loeschkonzept.md`
- `docs/datenschutz/avv-bedarf.md`

**Neue Fixtures/Tooling:**
- `scripts/crabbox/fixtures/synthetic-personas.ts` (typisierte Persona-Daten)
- `scripts/crabbox/fixtures/assert-synthetic.ts` (Gate: nur synthetische Kennungen)
- `scripts/crabbox/fixtures/seed-pii-collections.ts` (Mongo-Seed, test-DB-gated)
- ggf. `package.json` (npm-Skript `check:pii-fixtures` — CI-Gate-Verdrahtung)

**Referenzierte (nur gelesene) Bestands-Quellen:**
- Schemas: `apps/api/src/users/user.schema.ts`, `apps/api/src/users/account.schema.ts`,
  `apps/api/src/mails/mail-provider.schema.ts`, `apps/api/src/surveys/survey-answers.schema.ts`,
  `apps/api/src/notifications/notification.schema.ts`,
  `apps/api/src/filesharing/publicFileShare.schema.ts`, `apps/api/src/license/license.schema.ts`.
- Chat/Pairing (im 1.6-Repo nicht als eigene Schemas vorhanden → aus `main.js`, s. u.).

## Quelle des Solls (Zeilenanker / Rescue / Baseline)

Ist-Datenfluss des Ziel-Images 2.0.200, verifiziert in
`scratchpad/api-img/opt/edulution/api/main.js`:

| Gegenstand | `main.js`-Anker |
|---|---|
| `User`-Schema (username/email/firstName/lastName/password/`encryptKey`/`totpSecret`/`registeredPushTokens`) | `8960–9040` |
| `UserAccounts` (`appName`/`accountUser`/`accountPassword`) | `apps/api/src/users/account.schema.ts` |
| `Conversation` (Gruppen-Chat-Metadaten, **kein TTL**) | `69221–69259` |
| `ChatMessage` (`content`, `createdByUserFirstName/LastName`, **kein TTL**) | `69377–69425` |
| `ParentChildPairing` (`parent`/`student`/`school`/`logs`, **kein TTL**) | `60650–60702` |
| `SurveyAnswer` (`attendee`/`answer`, **kein TTL**) | `44261–44290` |
| `Notification` (**TTL** `expiresAt`, Default 30 Tage) | `21630–21642` |
| `PublicShare` (**TTL** `expires`, Datei-Link-Ablauf) | `39930–39938` |
| `MailProvider` (nur Provider-Config, **keine** Nutzer-PII) | `27364–27401` |
| Krypto: AES-GCM-256, IV 12 B, WebCrypto (`generateEncryptKey`/`encryptWithKey`/`decryptWithKey`) | `8323–8365` |
| `master.key`-Util (`getMasterKey`, Env `MASTER_ENCRYPT_KEY`, `./data/master.key` 0600, `wrap/unwrapEncryptKey`, `wrapped:`-Prefix) | `9190–9265` |
| Migration `000-wrap-encrypt-keys-with-master-key` | `9299–9330` |
| `USER_DB_PROJECTION` (schließt `password`/`totpSecret`/`encryptKey` aus API-Antworten aus) | `8793` |
| License-Server: **sendet nur `{ licenseKey }`** an `POST sign` | `43707`, URL `43800` |
| Sentry BE (`SENTRY_EDU_API_DSN`, Gate `ENABLE_SENTRY`) | `59762–59780` |
| Sentry FE (`SENTRY_EDU_UI_DSN`, `getSentryConfig`) | `54486–54490` |

Rescue-Branches für Chat/Pairing als **Quer-Beleg** (Feld-Detail, falls `main.js` mehrdeutig):
`upstream/1717-add-pairing-administration-page`, `upstream/1683-chat-add-basic-chat-ui`
(`git -C … show`). Baseline-Screenshots `scratchpad/real/*` nur als Verhaltensreferenz.

## Datenmodell / API / Migrationen

- **Keine** neuen Collections, DTOs, Routen. **Keine** Migration, **kein** `schemaVersion`-Bump.
- **Contract-Drift:** keiner — es werden keine API↔DTO↔FE↔appconfig-Shapes berührt. Das
  Seed-Tooling schreibt **direkt** in Mongo (bewusst außerhalb des NestJS-Contracts, nur
  gegen Test-DB, s. Auth/Guards).
- **Retention-Befund (irreversibel-relevant):** `conversations`, `chatmessages`,
  `parentchildpairings`, `surveyanswers` haben **keinen** TTL-Index → wachsen unbegrenzt.
  Ein Chat-Retention-TTL wäre eine **forward-only-Migration über das Chat-Modell** und ist
  hier **Offene Frage**, kein Task.

## Auth / Guards

- Es werden **keine** neuen Routen/Guards gebaut → nichts mit-zu-portieren.
- **Sicherheits-Constraint am Seed-Tooling:** `seed-pii-collections.ts` umgeht bewusst die
  App-Guards (direkter Mongo-Zugriff). Es **muss** deshalb hart gegen die Test-DB gaten
  (Refuse, wenn `MONGODB_DATABASE_NAME` nicht auf einen erlaubten Test-Namen matcht, z. B.
  `edulution_e2e`/`*-test`) und im Default **Dry-Run** laufen. Kein Schreiben ohne
  explizites `--apply`.

## Externe Integrationen

- **license.edulution.io** (`/api/v1`): erhält im Payload **nur** `licenseKey` (belegt
  `main.js:43707`), **keine** Schüler-/Minderjährigen-PII. Antwort trägt `customerId`,
  `numberOfUsers`. Wird in P1 gestubbt/ersetzt → dann Drittempfänger entfällt.
- **Sentry** (BE+FE): opt-in über `ENABLE_SENTRY`, Default **aus**; Fehler-Payloads können
  PII enthalten. Empfehlung: aus lassen bzw. Scrubbing dokumentieren.
- **Mailcow/SOGo**: self-hosted Companion, verarbeitet Mail-Inhalte (PII) → AVV-relevant nur,
  falls extern gehostet.
- **Expo/FCM/APNs** (Push): `registeredPushTokens` + Notification-Inhalte gehen an
  Expo/Google/Apple (`expo-server-sdk`). Drittempfänger, Default abhängig von Push-Feature.
- **Relution** (MobileDevices): dauerhaft zurückgestellt → **kein** aktiver Datenfluss, solange
  Modul aus. Als „inaktiv" führen.
- **3 Laufzeit-GitHub-Fetches** (§5.3): reine ausgehende GETs (Theme-CSS, App-Store-Compose) →
  **keine** PII-Übermittlung.

## Secrets / Env / master.key

- Berührt **`MASTER_ENCRYPT_KEY`** konzeptionell (Dokumentation), nicht im Code. Der Master-Key
  wrapped **jede** `user.encryptKey`, die `user.password` **und** `useraccounts.accountPassword`
  (AES-GCM-256) entschlüsselt. **Kopplung:** `./data/master.key` gehört **zwingend gemeinsam**
  mit `mongodump` ins Backup-/Rollback-Set (§2.6/§5.6-DR) — Restore ohne Key = unlesbare
  Passwörter. Diese Kopplung wird in `verschluesselung-master-key.md` gespiegelt (nicht neu
  erfunden, verweist auf DR-Runbook).
- Fixtures/Seeds enthalten **nur synthetische** Kennungen/Passwörter → nie echte Secrets, nie
  echter `master.key` im Repo.

## Trade-offs & Alternativen (mit Empfehlung)

1. **Doku-Sprache DE vs. DE+EN.** Guardrail verlangt i18n DE+EN — bezieht sich aber auf
   **UI-Keys**. Diese Inventare sind **Betreiber-/DSB-Compliance-Artefakte** für einen
   deutschen Schulträger. **Empfehlung:** DE als maßgeblich, EN-Spiegel **zurückstellen**
   (YAGNI), bis ein nicht-deutschsprachiger Betreiber real existiert. → Offene Frage.
2. **Fixture-Format: `.ts`-Modul vs. `.json`.** **Empfehlung `.ts`**: trägt SPDX-Header
   (JSON kann keine Kommentare), ist typisiert und vom Gate/Seed importierbar.
3. **Seed-Ziel: API-Mongo direkt vs. über REST-API.** REST wäre contract-treu, aber Chat/Survey
   brauchen komplexe Auth-Flows. **Empfehlung: direkter Mongo-Insert**, hart test-DB-gated —
   einfacher, deterministischer, für ein Verifikations-Tool vertretbar.
4. **Verify für Fixtures: jest/vitest vs. `tsx`-Assertion.** Die Fixtures liegen unter
   `scripts/`, wo `nx`-Tests nicht greifen. **Empfehlung: `tsx`-Assertion-Skript** (Repo nutzt
   `tsx` bereits, z. B. `checkTranslations.ts`) → grün/rot ohne nx-Projektbindung.

## Risiken & Rollback

- **Reine Doku/Tooling** → kein Produktionsrisiko, kein DB-Effekt. Rollback = Commit revert.
- **Seed-Tooling gegen falsche DB** wäre destruktiv → Mitigation: Default-Dry-Run + harter
  Test-DB-Gate + `--apply`-Zwang (s. Auth/Guards).
- **Restrisiko Inhalts-Fehler im Inventar** (Collection übersehen) → Gegenmaßnahme: Anker-Liste
  oben ist die Prüfliste; `feature-review` prüft gegen `main.js`-Anker.

## Doku-Impact (Augenmaß)

Dies **ist** das Doku-Paket: fünf neue Betreiber-Dokumente unter `docs/datenschutz/`. Ein kurzer
Verweis aus dem DR-Runbook/`README`-Betriebsteil auf `verschluesselung-master-key.md` ist
sinnvoll (Master-Key-Kopplung), aber optional. Kein `CHANGELOG`-Eintrag nötig (interne
Compliance-Artefakte, kein Nutzer-sichtbares Feature).

## i18n-Impact (DE+EN)

**Keine neuen UI-i18n-Keys** in diesem Paket (keine UI-Änderung). `npm run check-translations`
bleibt unberührt. (Die DE/EN-Frage betrifft nur die Prosa-Dokumente, s. Trade-off 1.)

## Offene Fragen

1. **Chat-Retention:** Soll `chatmessages`/`conversations` ein Aufbewahrungslimit bekommen
   (TTL-Index oder periodischer Cleanup-Job)? Wenn ja → **eigenes Folge-Paket** mit
   forward-only-Migration + `schemaVersion`-Bump über das Chat-Modell. Default-Frist? (Vorschlag
   analog `Notification`: konfigurierbar, Default z. B. 180 Tage.)
2. **Löschung bei Offboarding:** Gibt es beim Entfernen eines LDAP-Users einen Cascade auf
   `users`/`useraccounts`/`chatmessages`/`parentchildpairings`/`surveyanswers`? (Im Inventar zu
   verifizieren; falls nein → Löschkonzept muss einen manuellen/automatischen Pfad benennen.)
3. **EN-Spiegel der Compliance-Doku** jetzt oder deferred? (Empfehlung: deferred.)
4. **Sentry-Default & Scrubbing:** dauerhaft aus, oder an mit PII-Scrubbing-Konfiguration?
   (Koppelt an die Sentry-/Observability-Entscheidung des Plans.)
5. **Push-Drittempfänger:** Bleibt Push (Expo/FCM/APNs) im Fork aktiv? Wenn ja, AVV/Hinweis
   nötig; wenn nein, als „inaktiv" führen.
6. **Namensraum-Konvention** der synthetischen Personas (z. B. Präfix `synth.` bzw. Schule
   `test-schule`) — muss mit der crabbox-/LMN-Provisioning-Seite abgestimmt sein.
