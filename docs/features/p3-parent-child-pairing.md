<!--
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# ParentChildPairing — Spec (P3, slug `p3-parent-child-pairing`)

> **Kalibrierungs-Hinweis (P3).** Dies ist ein *geerdetes Rekonstruktions-Ledger*, kein Wochen-genauer
> Ausführungsplan. Die Task-Granularität und die Drift-Details schärfen sich nach der **P0-Basis-Drift-Analyse**
> und dem **P2-Chat-Piloten** (Abhängt-von: `p2-chat`). Alle Zeilenanker und Signaturen sind gegen den echten
> geshippten 2.0-Code (`main.js`) und den Rescue-Branch verifiziert; die Reihenfolge/Schnitt der FE-Tasks kann
> sich nach dem Chat-Piloten (gleiches Store-/Route-/i18n-Muster) verschieben.

## Problem / Motivation

Eltern sollen in edulution eine gesicherte Verbindung zu ihren Kindern (Schüler:innen) herstellen können, um
kindbezogene Funktionen (später: Infoboard, Krankmeldung, Noteneinsicht etc.) legitimiert nutzen zu können.
Das geshippte edulution 2.0 CE enthält dafür das Modul **ParentChildPairing**: ein Schüler oder ein Elternteil
erzeugt einen kurzlebigen **Pairing-Code** (bzw. QR-Code), das jeweilige Gegenüber gibt ihn ein, es entsteht ein
`PENDING`-Pairing. Eine Verwaltungsseite (Schul-Admin, unter Linuxmuster) akzeptiert/lehnt ab; bei **Accept** wird
das Elternteil über `linuxmuster-api7` der LMN-Gruppe `<student>-parents` hinzugefügt, bei **Reject** wieder
entfernt. Der Fork (`linuxmuster-ui`, 2.0-Nachbau auf 1.6.266-Basis) hat dieses Modul noch nicht.

## Ziel & Nicht-Ziele (YAGNI)

**Ziel**
- BE: NestJS-Modul `ParentChildPairing` (Schema + Service + Controller + Modul-Registrierung) 1:1 zur geshippten
  2.0-Semantik: Code-Erzeugung/-Auflösung über Cache (TTL 5 min), Pairing-Erstellung mit Rollenvalidierung,
  Audit-`logs`, Status-Update mit LMN-Gruppenpflege, angereicherte Beziehungsliste.
- LMN-Integration: `LmnApiService.addParentToStudent` / `deleteParentFromStudent` gegen `linuxmuster-api7`.
- FE: UserSettings-Seite (`ParentChildPairingPage`, Code/QR + eigene Beziehungen) und Linuxmuster-Admin-Seite
  (`ParentAssignmentPage`, alle Pairings filtern + Status setzen).
- i18n DE+EN, SPDX-AGPL-Header auf allen neuen Dateien.

**Nicht-Ziele (YAGNI)**
- Keine neue Keycloak-Rolle erfinden: `GroupRoles.PARENT = '/role-parent'` existiert bereits im Fork
  (`libs/src/groups/types/group-roles.enum.ts`). Es wird **nur verifiziert**, dass Eltern-User dieses Gruppen-Claim
  tragen — keine Realm-Template-Erweiterung, solange die Verifikation gegen echten LMN das nicht erzwingt.
- Kein globaler `ApiAuth()`-Decorator-Refactor (2.0-weite Konvention). Der Fork bleibt bei `@ApiBearerAuth()` wie
  1.6; das ist ein separates Vorhaben.
- Keine Push-Benachrichtigung bei Pairing-Statuswechsel (kein Beleg in `main.js`).
- Kein eigener `parent-child-pairing`-Eintrag in `APPS`/appconfig — das Modul hängt an UserSettings + Linuxmuster,
  nicht an einer eigenen App-Kachel.

## Betroffene Komponenten & Dateien (konkrete Pfade)

**Backend (neu)**
- `apps/api/src/parent-child-pairing/parent-child-pairing.module.ts`
- `apps/api/src/parent-child-pairing/parent-child-pairing.schema.ts` (+ `ParentChildPairingLogEntry`-Subdoc)
- `apps/api/src/parent-child-pairing/parent-child-pairing.service.ts` (+ `.service.spec.ts`)
- `apps/api/src/parent-child-pairing/parent-child-pairing.controller.ts`
- `apps/api/src/app/app.module.ts` (Modul-Registrierung, ~Zeile 140)

**Backend (Änderung)**
- `apps/api/src/lmnApi/lmnApi.service.ts` — `addParentToStudent` / `deleteParentFromStudent`
- `libs/src/lmnApi/types/lmnApiErrorMessage.ts` — `AddParentToStudentFailed`, `DeleteParentFromStudentFailed`

**Shared libs (neu)** — `libs/src/parent-child-pairing/…`
- `constants/`: `parentChildPairingApiEndpoints.ts` (inkl. `RELATIONSHIPS`), `parentChildPairingCacheConfig.ts`,
  `parentChildPairingErrorMessages.ts`, `parentChildPairingStatus.ts`, `parentChildPairingLogAction.ts`,
  `parentChildPairingGroupSuffix.ts`, `parentChildPairingQueryParams.ts`, `parentChildPairingStatusFilterAll.ts`,
  `parentChildPairingQrConfig.ts`
- `types/`: `parentChildPairingDto.ts` (**inkl. `logs`**), `parentChildPairingCodeResponseDto.ts`,
  `parentChildPairingStatusType.ts`, `parentChildPairingErrorMessagesType.ts`, `submitParentChildPairingCodeDto.ts`,
  `updateParentChildPairingStatusDto.ts`, `parentChildPairingQrPayload.ts`,
  `enrichedRelationshipResponseDto.ts` (**neu ggü. Rescue**)
- `libs/src/groups/utils/getIsParent.ts` (**neu**)
- `libs/src/…/eduQrType.ts` (o. ä.) — `EDULUTION_QR_TYPE.PARENT_CHILD_PAIRING` (Pfad an bestehende QR-Konstante im
  Fork angleichen; falls nicht vorhanden, im pairing-libs-Ordner)

**Frontend (neu)**
- `apps/frontend/src/pages/UserSettings/ParentChildPairing/ParentChildPairingPage.tsx`
- `apps/frontend/src/pages/UserSettings/ParentChildPairing/ParentChildPairingFloatingButtons.tsx`
- `apps/frontend/src/pages/UserSettings/ParentChildPairing/useParentChildPairingStore.ts`
- `apps/frontend/src/pages/LinuxmusterPage/ParentAssignment/ParentAssignmentPage.tsx`
- `apps/frontend/src/pages/LinuxmusterPage/ParentAssignment/getParentAssignmentColumns.tsx`
- `apps/frontend/src/pages/LinuxmusterPage/ParentAssignment/useParentAssignmentStore.ts`
- `apps/frontend/src/components/shared/ParentChildPairingStatusBadge.tsx`

**Frontend (Änderung)**
- `apps/frontend/src/router/routes/getPrivateRoutes.tsx`
- `apps/frontend/src/router/routes/getLinuxmusterRoutes.tsx`
- `libs/src/…/constants/userManagementPaths.ts` (+ `PARENT_ASSIGNMENT_LOCATION/…_PATH`,
  `USER_SETTINGS_PARENT_CHILD_PAIRING_PATH`)
- `libs/src/…/constants/user-settings-endpoints.ts`
- `libs/src/error/errorMessage.ts` (Union um `ParentChildPairingErrorMessagesType`)
- `apps/frontend/src/locales/{de,en}/translation.json` (+ `fr` best-effort)

## Quelle des Solls

- **Primär (BE, geshippt 2.0):** un-minifiziertes `main.js`
  - Modul `ParentChildPairingModule`: `main.js:60108`
  - Service `ParentChildPairingService`: `main.js:60169` (DI 4-arg: model, cache, **lmnApiService, usersService**),
    `getEnrichedRelationships` ab `:60239`, `updateParentChildPairingStatus` ab `:60358`,
    `generateAndStoreCode`/`resolveCode` ab `:60413`
  - Controller `ParentChildPairingController`: `main.js:60806` (Routen `code`/`relationships`/`all`/`:id/status`)
  - Schema + `ParentChildPairingLogEntry`: `main.js:60700` / Modul 952 (`:60735`)
  - LMN-Methoden: `main.js:12624` (`addParentToStudent`), `:12634` (`deleteParentFromStudent`)
  - Konstanten: `PARENT_CHILD_PAIRING_LOG_ACTION` `:60525`, `…_CACHE_CONFIG` `:60557`, `…_GROUP_SUFFIX` `:60589`
    (`'-parents'`), `getIsParent` `:60619`, `…_ERROR_MESSAGES` `:60489`, `…_API_ENDPOINTS` `:60944`,
    `EDULUTION_QR_TYPE.PARENT_CHILD_PAIRING` `:64074`
- **Primär (FE + libs-Struktur):** Rescue-Branch `upstream/1717-add-pairing-administration-page` (deckungsgleiche
  `ParentChildPairing`-Benennung, letzter Stand: „Renamed all files / Unified endpoints / Add metadata to qrcode").
  Zweitbranch `upstream/1717-add-app-to-manage-parent-and-student-relationship` (ältere `pairing`-Benennung) nur
  historisch, **nicht** verwenden.
- **Kein Baseline-Screenshot**: Modul existiert in 1.6 nicht; GUI-Soll ergibt sich aus Rescue-FE + Voll-Stack-Shot
  auf der crabbox.

### Wesentliche Drift Rescue-Branch → geshipptes 2.0 (muss beim Nachbau überbrückt werden)

| Punkt | Rescue (`1717-…-administration-page`) | Geshipptes 2.0 (`main.js`, SOLL) |
|---|---|---|
| Service-DI | `(model, cache)` | `(model, cache, lmnApiService, usersService)` |
| Beziehungsliste | `getRelationships` (nur DB) an `GET /` | `getEnrichedRelationships` an `GET /relationships` (LDAP-Gruppen-Anreicherung + Namen + `isGroupActive`) |
| Status-Update | `(id, status)`, reines DB-Update | `(id, status, performedBy, lmnApiToken)` → LMN add/delete + `logs`-Eintrag |
| Schema | ohne `logs` | mit `logs: ParentChildPairingLogEntry[]` |
| DTO | ohne `logs` | mit `logs`; zusätzlich `enrichedRelationshipResponseDto` (Namen, `isGroupActive`) |
| Endpoints-Const | `{BASE,CODE,ALL,STATUS}` | zusätzlich `RELATIONSHIPS` |
| Helper | — | `getIsParent`, `-parents`-Suffix, `PARENT_CHILD_PAIRING_LOG_ACTION`, QR-Type |
| FE-Imports | `@edulution-io/ui-kit` (`cn`, `Button`) | Fork-Konventionen: `cn()` aus `@/lib/utils`, SH-Wrapper/`@/components/shared/*` |
| FE-Store `fetchRelationships` | ruft `BASE` | muss `RELATIONSHIPS` rufen (sonst 404 gegen geshipptes BE) |

## Datenmodell / API / Migrationen

**Collection `parentchildpairings`** (`@Schema({ timestamps:true })`):
`parent:string(req)`, `student:string(req)`, `school:string(req)`, `status:string(req, default 'pending')`,
`logs: ParentChildPairingLogEntry[]`, `schemaVersion:number(default 1)`, `createdAt/updatedAt`.
Unique-Index `{parent:1, student:1}`. `toJSON: { virtuals:true }`.
`ParentChildPairingLogEntry` (Subdoc `@Schema()`): `action` (enum `PARENT_CHILD_PAIRING_LOG_ACTION`),
`performedBy:string(req)`, `timestamp:Date(req, default now)`, `details:string`.

**Migration:** **Keine** Migration bestehender Collections nötig — neue Collection, `schemaVersion` startet bei 1
(forward-only-Konvention eingehalten). Sollte die P0-Drift-Analyse ergeben, dass die zentrale Migrations-Runner-Liste
alle Modelle aufzählen muss, ist `ParentChildPairing` dort mit `schemaVersion:1` zu registrieren (dann Runner
`schemaVersion++`-fähig). Kein Rückwärts-Pfad; Rollback = Collection droppen (nur Dev/crabbox).

**API-Routen** (Base `parent-child-pairing`, alle JWT-authentifiziert):
| Methode | Pfad | Handler | Zugriff |
|---|---|---|---|
| GET | `code` | `getCode` | eigener User |
| PUT | `code` | `refreshCode` | eigener User |
| POST | `` (Base) | `createParentChildPairing` | eigener User (Body `{code}`) |
| GET | `relationships` | `getEnrichedRelationships` | eigener User |
| GET | `all` | `getAllParentChildPairings` | `@UseGuards(DynamicAppAccessGuard)` (Query `status`,`school`) |
| PATCH | `:id/status` | `updateParentChildPairingStatus` | `@UseGuards(DynamicAppAccessGuard)`; Header `x-api-key` → LMN-Token |

**Contract-Drift-Checkliste (API↔DTO↔FE):** `RELATIONSHIPS`-Endpoint in libs **und** FE-Store konsistent;
`ParentChildPairingDto.logs` in BE-DTO **und** libs-Type; `enrichedRelationshipResponseDto` treibt Admin-Spalten;
`errorMessage.ts`-Union um `ParentChildPairingErrorMessagesType` erweitern. Kein appconfig-App-Eintrag.

## Auth / Guards (welche mit-portieren)

- **Alle** Routen: Bearer/JWT (globaler Auth-Guard des Forks) — beim Nachbau `@ApiBearerAuth()` am Controller
  setzen (statt des 2.0-`ApiAuth()`). Kein `@Public` in diesem Modul.
- **Admin-Routen** (`all`, `:id/status`): `@UseGuards(DynamicAppAccessGuard)` **mit-portieren**.
  **Sicherheits-Notiz / offene Frage:** `DynamicAppAccessGuard` (siehe `apps/api/src/common/guards/dynamicAppAccess.guard.ts`)
  liest den zu prüfenden App-Namen aus einem Route-Param (`appName`); diese Routen haben **keinen** solchen Param,
  d. h. der Guard fällt auf `return true` zurück und wirkt faktisch **nur** wie „eingeloggt". Die geshippte
  Admin-Beschränkung passiert de facto FE-seitig (Linuxmuster-Seite ist rollen-gegated). Das ist als Härtungspunkt
  in die offenen Fragen gespiegelt.
- `updateParentChildPairingStatus` gibt den `x-api-key` (LMN-API-Token des aufrufenden Admins) an
  `linuxmuster-api7` weiter — Token nie loggen.

## Externe Integrationen

- **linuxmuster-api7:** `POST users/{student}/parents` `{ users:[parent] }` (Accept) und `DELETE users/{student}/parents`
  `{ users:[parent] }` (Reject-von-Accepted). Fehler → `CustomHttpException(BAD_GATEWAY)`.
  Reale Gruppe `<student>-parents` wird von LMN gepflegt; die angereicherte Beziehungsliste liest die Gruppe aus dem
  Fork-Gruppencache (`GROUP_WITH_MEMBERS_CACHE_KEY-/<student>-parents`, existiert in `groups.service`).
- **Keycloak/LDAP:** Eltern tragen `GroupRoles.PARENT` (`/role-parent`); `getIsParent` = PARENT || TEACHER || STAFF.
  Verifikation gegen echten LMN, dass Eltern-Accounts dieses Claim liefern.

## Secrets / Env / master.key

Keine neuen Secrets/Env-Variablen. Kein `master.key`-Bezug. Der LMN-API-Token ist ein Laufzeit-`x-api-key` aus dem
Request (nicht persistiert). Neue Dateien tragen **SPDX `AGPL-3.0-or-later`** (nicht den Netzint-Dual-License-Block,
den die Rescue-/`main.js`-Quellen führen — beim Portieren ersetzen).

## Trade-offs & Alternativen (mit Empfehlung)

1. **Voll-Rekonstruktion inkl. LMN + logs + enriched (geshippt) vs. schlanke Rescue-Variante (nur DB).**
   Empfehlung: **Voll-Rekonstruktion** — die LMN-Gruppenpflege ist der eigentliche Zweck des Moduls; ohne sie ist
   „Accept" folgenlos. Die Rescue-Variante ist nur als Struktur-Vorlage nützlich.
2. **Pairing-Code im Cache (TTL 5 min) vs. persistiert.** Geshippt = Cache. Empfehlung: **Cache übernehmen**
   (kurzlebig, kein PII-Langzeitspeicher, DSGVO-freundlich).
3. **QR + manueller Code vs. nur manueller Code.** Geshippt/Rescue = beides (QR-Payload mit `type`,`role`,`code`).
   Empfehlung: **beides** übernehmen; `QRCodeDisplay` existiert im Fork bereits.
4. **`ApiAuth()` global nachziehen vs. `@ApiBearerAuth()` beibehalten.** Empfehlung: **beibehalten** (YAGNI, kein
   Modul-Blocker), Refactor separat.

## Risiken & Rollback

- **R1 — LMN-Kontrakt:** `users/{student}/parents` muss die reale `linuxmuster-api7`-Version können. Mitigierung:
  Voll-Stack-Verify gegen echten LMN, bevor „Accept" scharf geschaltet gilt.
- **R2 — Multi-School:** `getEnrichedRelationships` nutzt `usersService.findAllCachedUsers(school)` und schul-scoped
  Gruppen; crabbox ist vermutlich Single-Default-School. Multi-School bleibt ungetestete Achse (Plan §7/§313).
- **R3 — Minderjährigen-PII:** Pairing verknüpft Minderjährige ↔ Eltern. Verify **nur** mit synthetischen Fixtures,
  nie echte Schüler-PII (Plan §115/§312).
- **R4 — Guard-No-op** (siehe Auth): Admin-Endpunkte faktisch nur auth-gegated.
- **Rollback:** Modul aus `app.module` entfernen + Routen/Menüeinträge zurücknehmen; Collection auf crabbox droppen.
  Reiner Additiv-Diff, kein Bestandsdaten-Risiko.

## Doku-Impact (Augenmaß)

Kurzer Modul-Abschnitt „ParentChildPairing" (DE+EN) in der Modul-Doku: Zweck, Code/QR-Flow, Accept→LMN-Gruppe,
Admin-Seite. Kein eigenes Handbuch. Ops-Hinweis: Abhängigkeit von `linuxmuster-api7`-Endpoint `users/*/parents`.

## i18n-Impact (DE+EN)

Neuer Namespace-Zweig **`parentChildPairing.*`**: `errors.codeNotFound|codeExpired|cannotPairWithSelf|`
`pairingAlreadyExists|pairingNotFound|invalidRole|incompatibleRoles`, `statusPending|statusAccepted|statusRejected`,
`statusUpdated`. Zweig **`usersettings.parentChildPairing.*`**: `myParents`, `myChildren`, `description`,
`codeRefreshed`, `pairingSuccess`, `codeExpired`. Plus Admin-/Spalten-Labels der `ParentAssignmentPage`.
Pflicht DE+EN in `locales/{de,en}/translation.json`; `fr` best-effort (Fallback vorhanden).

## Offene Fragen

1. **Admin-Härtung:** Soll der Fork die Admin-Endpunkte (`all`, `:id/status`) echt admin-gegaten (z. B. eigener
   Rollen-Guard / `appName`-Param), statt sich auf die faktisch no-op `DynamicAppAccessGuard`-Nutzung des Uplinks zu
   verlassen? (Sicherheitsentscheidung, nicht Task-intern.)
2. **Keycloak-Eltern-Rolle:** Reicht das vorhandene `/role-parent`-Gruppen-Claim aus dem echten LMN, oder braucht der
   Realm ein zusätzliches Eltern-Attribut/Mapper (Plan §180 vermutet „sehr wahrscheinlich")? → per Voll-Stack-Verify
   gegen echten LMN klären, **bevor** die FE-Rollenweichen final sind.
3. **`school` bei Eltern-Erstellern:** Beim Pairing wird `school = callerIsStudent ? callerSchool : target.school`
   gesetzt — verhält sich das in Multi-School korrekt, wenn Eltern keiner Schule zugeordnet sind?
4. **Retention:** Löschkonzept für `PENDING`/`REJECTED`-Pairings (DSGVO, Plan §115) — TTL/Cron oder manuell?
5. **QR-Type-Konstante:** Existiert im Fork bereits ein `EDULUTION_QR_TYPE`-Enum (aus Satellite/Account-Setup/
   QR-Login)? Falls ja, dort ergänzen statt neuer Datei — in P0-Drift prüfen.
