<!--
SPDX-License-Identifier: AGPL-3.0-or-later
SPDX-FileCopyrightText: 2026 linuxmuster-ui contributors
-->

# P6 — MobileDevices / MDM (Relution) — Spec (DEFERRED / blockiert)

> Status-Hinweis (Kalibrierung): **Deferred-Stub, Phase P6.** Dieses Modul ist
> im Master-Plan **dauerhaft zurückgestellt** (Fremd-Infra + kommerzielle
> Lizenz). Diese Spec ist bewusst ein **geerdeter Rekonstruktions-Umriss**, kein
> ausführbarer Task-Plan. Die Task-Granularität wird erst geschärft, **wenn** der
> Blocker (Relution-Zugang) aufgelöst und realer Bedarf bestätigt ist. Bis dahin:
> nicht bauen. Referenz: `PLAN-openedulution-fork.md` §149, §368, §400 (Frage 8),
> §385 (R7), §390 (R12), §158/§228 (Aufwands-Abgrenzung „ohne MobileDevices").

## Problem / Motivation
edulution 2.0 CE liefert ein vollständiges **MDM-Frontend/-Backend** aus, das als
Proxy/Orchestrator vor **Relution** (kommerzielle MDM-Plattform, SaaS oder
on-prem) sitzt: Geräte- und App-Inventar, Geräteaktionen (Wipe/Lock/…),
Enrollment-Einladungen (BYOD/Passcode) und ein Audit-Log — jeweils im Kontext des
angemeldeten LDAP-Users bzw. für Admins. Für Fork-Feature-Parität wäre das Modul
nachzubauen; ohne Relution-Tenant ist es aber weder betreibbar noch verifizierbar.

Das Modul verarbeitet **Minderjährigen-/Geräte-PII** und sendet Daten an einen
**Drittempfänger (Relution)** — DSGVO-relevant (Plan R12).

## Ziel & Nicht-Ziele (YAGNI)
**Ziel (dieser Stub):** Umriss + Blocker + Rescue-Hinweis festhalten, damit das
Modul bei realem Bedarf ohne erneute Quell-Archäologie reaktivierbar ist. Sonst
**nichts bauen**.

**Nicht-Ziele:**
- Keine Implementierung (BE/FE), keine DTOs, keine Migration, keine AppConfig-
  Verdrahtung in diesem Paket.
- Keine native Mobile-App (liegt nicht in diesen Repos; Plan §28).
- Keine Relution-Alternative/Eigen-MDM (Neu-Produkt, weit jenseits Fork-Parität).
- Kein Vermischen mit der 1.6-„Mobile Access"-QR-Seite (`UserSettings/MobileAccess`,
  WebDAV-Zugang) — das ist ein **anderes** Feature (Rebrand-Item, Plan §202/§405),
  nicht das MDM-Modul.

## Betroffene Komponenten & Dateien (bei späterem Bau; Zielpfade)
- **BE (neu):** `apps/api/src/mobile-devices/`
  - `mobile-devices.module.ts` · `mobile-devices.controller.ts` · `mobile-devices.service.ts`
  - `relution-user-token.service.ts` · `relution-user-token.schema.ts`
  - `buildRelutionAxios.ts` (Axios-Factory + `extractRelutionOrigin`)
  - DTOs: `relution-device.dto`, `relution-app.dto`, `relution-enrollment-result.dto`,
    `relution-managed-user.dto`, `relution-sync-summary.dto`,
    `relution-device-action-result.dto`, `relution-audit-entry.dto`,
    `create-enrollment.dto`, `trigger-device-action.dto`, `app-icon-response.dto`
  - Konstanten: `mobileDevicesApiEndpoints.ts`, `mobileDevicesErrorMessages.ts`,
    `relutionApiConstants.ts`
- **libs (vorhanden, wiederverwenden):** `libs/src/appconfig/constants/apps.ts:41`
  → `MOBILE_DEVICES: 'mobiledevices'` existiert bereits (1.6). Slug-Contract ist da.
- **FE (neu):** `apps/frontend/src/pages/MobileDevices/` (+ Zustand-Store mit
  `eduApi`, keine Detail-Rekonstruktion in diesem Stub).
- **i18n:** `apps/frontend/src/locales/{de,en}/translation.json` — Namespace
  `mobiledevices` existiert bereits als 1.6-Platzhalter (de:1121/en:1119), muss beim
  MDM-Bau um `mobiledevices.errors.*` u. a. erweitert werden (siehe i18n-Impact).

## Quelle des Solls
**Primär: Rekonstruktion aus `main.js` (un-minifiziert, Originalnamen).** Es gibt
**keinen** brauchbaren Rescue-Branch für das 2.0-MDM-Modul.

Zeilen-Anker (`scratchpad/api-img/opt/edulution/api/main.js`):
- `MobileDevicesModule` — **65239** (imports `RelutionUserToken`-Schema; providers
  `MobileDevicesService` + `RelutionUserTokenService`)
- `MobileDevicesController` — **65306** (Basis-Route `mobile-devices`)
- `MobileDevicesService` (Relution-Proxy: getDevices/getApps/getAppIcon/
  triggerDeviceAction/createEnrollment/listEnrollments/deleteEnrollment/
  getAuditEntries) — ab **~65706**
- `RelutionUserTokenService` (Admin-Client-Init, Org-UUID, Service-Account-Erkennung,
  Per-User-Token-Provisioning, `syncUsers`, `listManagedUsers`) — **65969**;
  `initializeAdminClient` (Config-Quelle) — **66007**
- Endpoint-Konstanten `MOBILE_DEVICES_API_ENDPOINTS` — **65528**
- Fehler-Keys `mobileDevicesErrorMessages` (`mobiledevices.errors.*`) — **65567**
- Schema `RelutionUserToken` (Collection `relutionUserTokens`, Felder inkl.
  `schemaVersion` default 0) — **66663**

**Rescue-Hinweis (schwach, siehe Offene Fragen):** `upstream/1546-add-android-section-to-mobile-access`
(im Repo als `origin/upstream/1546-*` und `upstream-dead/1546-*`) — **datiert
1.6.100 und betrifft die FE-„Mobile Access"-QR-Seite, NICHT das 2.0-MDM-Modul.**
Kein Ersatz für die main.js-Rekonstruktion; höchstens FE-Icon/Namespace-Referenz.

**Baseline-Screenshots:** keine im aktuellen `scratchpad/real/*` (Modul nicht
deploybar ohne Relution).

## Datenmodell / API / Migrationen
**API (Basis-Route `mobile-devices`, alle JWT-geschützt):**
| Methode | Pfad | Guard | Zweck |
|---|---|---|---|
| GET | `devices` | (User-Kontext) | Geräteliste aus Relution |
| GET | `apps` | (User-Kontext) | genehmigte Apps |
| GET | `apps/icon/:resourceUuid` | — | App-Icon streamen (`ParseUUIDPipe`) |
| POST | `devices/actions` | (User-Kontext) | Geräteaktion(en) triggern |
| POST | `devices/enrollments` | **AdminGuard** | Enrollment/Invite anlegen |
| GET | `devices/enrollments` | **AdminGuard** | offene Enrollments |
| DELETE | `devices/enrollments/:uuid` | **AdminGuard** | Enrollment löschen |
| GET | `audit` | **AdminGuard** | Relution-Audit-Log (Query `limit`) |
| GET | `users` | **AdminGuard** | verwaltete Nutzer (Relution+DB-View) |
| DELETE | `users/:username` | **AdminGuard** | Token-Eintrag löschen |
| POST | `users/sync` | **AdminGuard** | Nutzer-Sync anstoßen |

**Datenmodell:** neue Mongoose-Collection `relutionUserTokens`
(`RelutionUserToken`: `username` unique+index, `relutionUserUuid`,
`relutionAccessTokenUuid`, `tokenName`, `encryptedToken`, `expirationDate`,
`schemaVersion` default 0, timestamps).

**Migration:** ja — neue Collection ⇒ **forward-only Migration + `schemaVersion++`**
über alle Modelle (Guardrail). Beim Bau zwingend, hier nur vermerkt. `encryptedToken`
wird server-seitig verschlüsselt (→ `master.key`, s. u.).

**Contract-Drift beim Bau:** API↔DTO↔FE-Store↔appconfig-Options müssen synchron
gezogen werden (AppConfig-`options.url`/`options.apiKey`, s. u.). Slug `mobiledevices`
existiert bereits — kein neuer Slug, aber AppConfig-Options-Schema wächst.

## Auth / Guards (mit-portieren)
- **Global JWT-Auth** ist Default (kein `@Public` an diesem Controller) — Bypass-Risiko,
  darf beim Nachbau **nicht** verloren gehen.
- **`AdminGuard`** auf Enrollments (POST/GET/DELETE), `audit`, `users`, `users/sync`
  — exakt so mit-portieren.
- Nutzer-Kontext via `@GetCurrentUsername` / `@GetCurrentUserGroups`; jeder User
  agiert mit **eigenem** (verschlüsseltem) Relution-Token — Autorisierungsmodell
  nicht auf einen globalen Admin-Token verkürzen.

## Externe Integrationen
**Relution** (kommerzielle MDM-Plattform) über HTTPS-API (`buildRelutionAxios`,
`extractRelutionOrigin`). Admin-Client wird aus **AppConfig-Options**
(`getAppConfigByName('mobiledevices').options.url` + `.apiKey`) initialisiert;
Nutzer bekommen einzeln provisionierte Zugriffs-Tokens. Ohne erreichbaren Relution-
Tenant liefert der Service `SERVICE_UNAVAILABLE`/`BAD_GATEWAY`.

## Secrets / Env / master.key
- **Kein neues `.env`:** URL + API-Key liegen in den **AppConfig-Options** in der DB,
  nicht in `.env.default`. Der `apiKey` ist ein **Secret in der DB** (nicht ins Repo,
  nicht in Fixtures).
- **`master.key`:** `encryptedToken` je Nutzer wird verschlüsselt abgelegt → hängt am
  Krypto-/`master.key`-Pfad. Beim Bau ins Backup-/DR-Set konsistent halten (Plan P0).
- Relution-Zugangsdaten/Service-Account nie ins Repo; crabbox-Verifikation nur mit
  **synthetischen** Daten gegen einen Test-Tenant (den es aktuell nicht gibt).

## Trade-offs & Alternativen (mit Empfehlung)
1. **Dauerhaft zurückstellen (EMPFEHLUNG, = Plan §400/§368).** Kein Relution-Zugang,
   kommerziell, Fremd-Infra-Kosten, DSGVO-Drittempfänger. Kein Fork-Nutzer verlangt es
   heute. Aufwand bei Bau: ~10–14 PT BE + FE, plus Infra-Beschaffung.
2. **Nur BE-Proxy nachbauen, FE später.** Bringt ohne Relution + ohne FE keinen Wert
   und ist nicht verifizierbar → verworfen.
3. **Relution durch Open-Source-MDM ersetzen** (z. B. anderes MDM). Das ist ein
   **eigenes Produkt**, kein Nachbau; sprengt Fork-Parität → verworfen.

→ **Empfehlung: deferred lassen**, bis (a) ein Fork-Betreiber realen MDM-Bedarf
meldet und (b) ein Relution-(Test-)Tenant + API-Key + Service-Account bereitsteht.

## Risiken & Rollback
- **R7 (Fremd-Infra):** ohne Relution nicht verifizierbar; App-Kachel muss bis dahin
  im Fork **verborgen/deaktiviert** bleiben (AppConfig aus), damit keine tote/500er-
  Kachel erscheint.
- **R12 (DSGVO):** Drittempfänger Relution + Minderjährigen-Geräte-PII ⇒ AVV/PII-
  Inventar-Pflicht vor Produktivbetrieb.
- **Rollback:** trivial, da nicht gebaut. Bei späterem Bau: Migration forward-only,
  Feature per AppConfig abschaltbar; `relutionUserTokens`-Collection isoliert.

## Doku-Impact (Augenmaß)
Bis Reaktivierung: nur dieser Stub + Master-Plan-Zeilen (bereits vorhanden). Beim
Bau: Betreiber-Doku „MDM/Relution einrichten" (AppConfig-Options, Service-Account,
AVV), DE+EN.

## i18n-Impact (DE+EN)
Keine neuen Keys in diesem Stub. Beim Bau: Namespace `mobiledevices` (existiert als
1.6-Platzhalter in `de`/`en`) um `mobiledevices.errors.notConfigured`,
`…triggerActionFailed`, `…userNotProvisioned`, `…invalidRelutionResponse`,
`…getDevicesFailed`, `…getAppsFailed` u. a. (main.js:65567) sowie UI-Labels
erweitern — **DE+EN Pflicht**.

## Offene Fragen
1. **P6-Scope (Plan §400, Frage 8):** MobileDevices dauerhaft zurückstellen
   (Empfehlung) vs. bei realem Bedarf anstreben? — offen, Betreiber-Entscheidung.
2. **Relution-Zugang:** Gibt es überhaupt einen (Test-)Tenant + API-Key +
   Service-Account? Ohne den ist dieses Paket **hart blockiert**.
3. **Rescue-Wert von `upstream/1546`:** bestätigt gering (nur 1.6-„Mobile Access"-
   QR-FE, nicht MDM). Als Rescue-Quelle beim Bau **nicht** einplanen.
4. **Multi-School-Verhalten** (Plan §313): MDM-Sichtbarkeit/Autorisierung pro School
   ist ungetestet — bei Bau klären.
5. **1.6-„Mobile Access"-QR-Seite** (`UserSettings/MobileAccess`, Slug teilt sich den
   `mobiledevices`-i18n-Namespace): getrennt behandeln (Rebrand-Item, nicht Teil
   dieses MDM-Pakets).
