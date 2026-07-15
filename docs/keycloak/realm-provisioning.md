<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# Keycloak-Realm `edulution` — Provisioning-Referenz

Soll-Beschreibung des Realms, wie ihn der Installer importiert (`realm-template.reference.json`)
und die 6 Boot-Skripte (`apps/api/src/scripts/keycloak/*`) beim API-Start idempotent nachziehen.
Belege: das vendorte Template + `main.js:57195–57260` (Boot-Reihenfolge) +
`libs/src/ldapKeycloakSync/constants/*` + `apps/api/.env.default`. Diff Template↔Live =
`realm-diff-2.0.200.md` (T6, live-gated).

## Clients

| Client | publicClient | standardFlow | directAccessGrants (ROPC) | serviceAccounts | Zweck |
|---|:--:|:--:|:--:|:--:|---|
| `edu-api` | false | true | **true** | true | Backend (confidential); ROPC für LMN-Login |
| `edu-ui` | false¹ | true | true | false | Frontend |
| `edu-mailcow-sync` | false | true | true | true | Mailcow-Rollen-Sync (Service-Account) |

¹ **Ist-Drift:** Das Template setzt `edu-ui.publicClient=false`; das Boot-Skript **`patchEduUiClient`**
setzt zur Laufzeit `publicClient=true`, `implicitFlowEnabled=false`, Device-Grant=false. Die
**Live-Baseline** zeigt daher `publicClient=true` — dieses Delta ist im Realm-Diff (T6) erwartet.

**Custom Client-Scopes:** `group-membership`, `school` (neben den KC-Standard-Scopes). Diese tragen
die Gruppen-/Schul-Claims in die Tokens, die das Frontend/`DynamicAppAccessGuard` auswerten.

## LDAP-User-Federation (`org.keycloak.storage.UserStorageProvider`)

`vendor=ad` · `editMode=READ_ONLY` · `uuidLDAPAttribute=samaccountname` · `authType=simple` ·
`usernameLDAPAttribute=cn`. Verbindung (`connectionUrl`, `bindDn`, `bindCredential`, `usersDn`,
`groups.dn`) wird vom Installer aus der LMN-Bindung substituiert (Secrets im Template maskiert).

**LDAP-Mapper (Sub-Components):** `username`, `first name`, `last name`, `email`, `proxyAddresses`,
`sophomorixMailQuotaCalculated`, `sophomorixStatus`, `school`, `global-groups`, `school-groups`,
`creation date`, `modify date`.

**Von den Boot-Skripten ergänzt (`addLdapGroupMappers` / `addUserAttributeMappers`):**
- REQUIRED_USER_ATTRIBUTES: `mail`, `sophomorixMailQuotaCalculated`, `sophomorixStatus`,
  `proxyAddresses` (`libs/src/ldapKeycloakSync/constants/requiredUserAttributes.ts`).
- REQUIRED_GROUP_ATTRIBUTES: `mail`, `displayName`, `sophomorixMailList`, `description`,
  `proxyAddresses`, `sophomorixMailAlias`, `sophomorixJoinable`, `sophomorixType`
  (`requiredGroupAttributes.ts`).

## Rollen

**Realm-Rollen:** `default-roles-edulution`, `offline_access`, `uma_authorization`.
`default-roles-edulution`-Composites im Template:
- realm: `offline_access`, `uma_authorization`
- client `realm-management`: `view-users`, `query-users`, `query-groups`
- client `account`: `view-groups`, `view-profile`

**Invariante (`removeRealmRoles`):** Das Boot-Skript **entfernt** `view-users`/`query-users`/
`query-groups` aus `default-roles-edulution` → in der Live-Baseline fehlen diese drei (jeder neue
User soll nicht realm-weit Nutzer/Gruppen sehen). Dieses Delta ist im Realm-Diff (T6) erwartet.

**mailcow-Service-Account (`addMailcowSyncRoles`):** dem Service-Account von `edu-mailcow-sync`
werden die für den Rollen-Sync nötigen `realm-management`-Rollen zugewiesen.

## Boot-Reihenfolge (6 idempotente Skripte, `keycloakConfigScripts.ts`)

Nach dem Realm-Import fährt der API-Start (mit Warte-/Timeout-Logik, ~60 s) **in dieser Reihenfolge**:
1. `removeRealmRoles` — default-roles härten (s. o.)
2. `addMailcowSyncRoles` — Service-Account-Rollen
3. `patchEduUiClient` — `edu-ui` auf publicClient=true / implicitFlow=false / Device-Grant=false
4. `addLdapGroupMappers` — Group-Attribut-Mapper
5. `addUserAttributeMappers` — User-Attribut-Mapper
6. `disableLdapConnectionPoolingAndPagination` — LDAP-Pooling/Pagination aus

Alle idempotent (bei Re-Run No-Op) — dieselbe Eigenschaft wie die DB-Migrationen.

## Secret-Inventar + Rotationspfad

| Env (`edulution.env` ↔ `.env.default`) | Bindet an |
|---|---|
| `KEYCLOAK_EDU_UI_SECRET` | Client-Secret `edu-ui` |
| `KEYCLOAK_EDU_API_CLIENT_SECRET` | Client-Secret `edu-api` |
| `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` | master-admin (Boot-Skripte + Export) |
| LDAP `bindCredential` | Realm-Component (Installer-substituiert) |

**Rotation:** Secret in Keycloak neu erzeugen → korrespondierendes `KEYCLOAK_EDU_*`-Env in
`edulution.env` aktualisieren → `edu-api`/`edu-ui` neu starten (`env_file` wird bei `restart`
**nicht** neu gelesen → `up -d --force-recreate`). Im Template sind alle Secrets `**********`.

## Findings (Fix-Owner P1/Rebrand)

- **Wildcard-`webOrigins`/`redirectUris`:** `edu-api` = `["*"]`/`["*"]`, `edu-ui` webOrigins `["*"]`,
  `edu-mailcow-sync` `["/*"]` → CORS-/Redirect-Härtung nötig (**R11**, Owner `p1-rebrand`; gegen die
  scrubbte Realm-Baseline als Soll).
- **`example.com`-Leftover:** `edu-ui.redirectUris = ["https://example.com/*"]` (Template 4×
  `example.com`) → beim Provisioning durch die echte edu-ui-URL ersetzen.
- **ROPC aktiv** (`directAccessGrantsEnabled=true` auf allen edu-Clients) — nötig für den
  LMN-Login-Flow, aber bewusst als Angriffsfläche dokumentiert.
- **Auth-Anker (R9):** Der RS256-Realm-Signing-Key wird von der API aus einer Datei
  (`data/edulution.pem`) verifiziert — Realm-Key-Rotation muss diese Datei mitziehen (s. Basis-Drift
  T9, AuthGuard).

## Offen für spätere Pakete

- **ParentChildPairing-Eltern-Rolle:** Ist-Zustand hier nur notiert; die genaue Realm-Rollen-/
  Gruppen-Semantik für Eltern ist **in P3 (`p3-parent-child-pairing`) zu klären**.
