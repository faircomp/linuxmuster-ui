# p0-realm-diff-baseline — Keycloak-Realm-Diff-Baseline

> ANALYSE-Paket (Phase P0). Ziel ist ein **Soll-Baseline-Artefakt + wiederverwendbares
> Diff-Werkzeug + Provisioning-Doku**, kein Laufzeit-Feature. Kein Produktivcode im Boot-Pfad,
> nur Ops-/Analyse-Werkzeuge unter `scripts/` und Doku unter `docs/keycloak/`.

## Problem / Motivation

Der Keycloak-Realm `edulution` entsteht aus **drei** übereinandergelegten Quellen, die heute
nirgends zusammenhängend dokumentiert oder gegen ein Soll geprüft sind:

1. **Statisches Realm-Template** `realm-edulution.json.template` (Installer, 3027 Zeilen) — der
   Import-Ausgangszustand.
2. **Installer-Substitution** (`webinstaller-api/app/main.py:699–765`) — ersetzt Client-Secrets,
   edu-ui-URLs, die komplette LDAP-Anbindung (`connectionUrl`/`bindDn`/`bindCredential`/`usersDn`,
   `groups.dn` der Gruppen-Mapper) und `attributes.frontendUrl` durch Instanzwerte, **bevor** der
   Realm importiert wird.
3. **Laufzeit-Provisioning** — die `ScriptsService` (`main.js:57195–57217`) führt 60 s nach Boot
   sechs idempotente Skripte (`apps/api/src/scripts/keycloak/*`) gegen den laufenden Realm aus und
   mutiert ihn weiter (Rollen entfernen, mailcow-Service-Account-Rollen, edu-ui-Client patchen,
   LDAP-Mapper ergänzen, Connection-Pooling/Pagination abschalten).

Der **tatsächlich laufende** Realm (das „Soll") weicht damit an mehreren Stellen deterministisch
vom Template ab. Die Fingerprint-/Drift-Pipeline (`PLAN §7`) sieht Keycloak **nicht**
(`main.js` enthält den Realm nicht), deshalb braucht P0 einen **eigenen Realm-Export-Diff-Schritt**
(`PLAN §3.6`, `§6 f`, `§7f`, `§8 P0`). Ohne diese Baseline lässt sich später weder verifizieren, dass
der Fork dieselbe Realm-Struktur provisioniert, noch erkennen, ob ein 2.0.x-Release neue
Client-Scopes/Mapper/Rollen braucht (z. B. ParentChildPairing → Eltern-Attribut/Rolle, `PLAN §3.6`).

## Ziel & Nicht-Ziele (YAGNI)

**Ziel**
- Realm der laufenden **2.0.200**-Instanz reproduzierbar exportieren (Werkzeug + Verfahren).
- Export **scrubben** (alle Secrets/`bindCredential`/Schlüsselmaterial → `REDACTED`, volatile
  IDs/Timestamps/`lastSync` entfernen) und die **scrubbte Soll-Baseline** committen.
- Baseline **gegen das Installer-Realm-Template diffen** (normalisiert, feldgenau) mit
  wiederverwendbarem Werkzeug.
- **Provisioning-relevante Teile dokumentieren**: Clients (`edu-api`, `edu-ui`, `edu-mailcow-sync`),
  LDAP-User-Federation + alle Mapper, Realm-/Client-Rollen — inkl. der 6 Boot-Skript-Deltas, der
  Installer-Substitution und der KC-Auto-Gen-Anteile.
- Die aus dem Audit bekannten **Härtungs-Findings** (Wildcard-`webOrigins`/`redirectUris`, ROPC,
  `example.com`-Leftover) als Findings festhalten (Fix ist P1, `PLAN §5.2 Punkt 6`, R11).

**Nicht-Ziele**
- **Kein** Härten/Ändern des Realm-Templates oder der Boot-Skripte (das ist P1 §5.2 / spätere Pakete).
- **Kein** CI-Gate für den Realm-Diff (Verdrahtung in die Tracking-Pipeline ist **P1b**, `PLAN §8`);
  P0 liefert nur das wiederverwendbare Werkzeug + optionalen npm-Alias.
- **Kein** vollständiger Diff stock-Keycloak-interner Artefakte (Auth-Flows, `account`/`broker`/
  `realm-management`-Standardclients, Signatur-Schlüssel) — nur die edulution-eigenen Teile.
- **Keine** neuen Realm-Objekte für künftige Module (ParentChildPairing-Rolle etc.) — nur als
  offene Frage / Doku-Hinweis vermerken, nicht bauen.

## Betroffene Komponenten & Dateien (konkrete Pfade)

**Neu (Werkzeug, `scripts/keycloak-realm-diff/`)**
- `scripts/keycloak-realm-diff/export-realm.sh` — Admin-Token + `partial-export` + `/components`-Pull.
- `scripts/keycloak-realm-diff/normalize-realm.mjs` — Normalisierung + Scrub (+ `--assert-scrubbed`).
- `scripts/keycloak-realm-diff/diff-realm.mjs` — feldgenauer Diff zweier normalisierter Realms.
- `scripts/keycloak-realm-diff/normalize-realm.test.mjs` (+ `fixtures/`) — `node --test`.

**Neu (Artefakte/Doku, `docs/keycloak/`)**
- `docs/keycloak/realm-template.reference.json` — On-Box-Vergleichskopie des Installer-Templates
  (Secrets bereits als `**********` maskiert).
- `docs/keycloak/realm-2.0.200.baseline.json` — scrubbte Soll-Baseline (committet).
- `docs/keycloak/realm-diff-2.0.200.md` — menschenlesbarer Diff-Report.
- `docs/keycloak/realm-provisioning.md` — Provisioning-Referenz (Clients/LDAP/Rollen/Secrets).

**Nur gelesen (Soll-Quellen, nicht geändert)**
- Installer: `.../public/download/realm-edulution.json.template`,
  `webinstaller-api/app/main.py:687–810`.
- `apps/api/src/scripts/keycloak/*.ts` (6 Skripte + `utilities/`), `keycloakConfigScripts.ts`.
- `libs/src/ldapKeycloakSync/constants/{requiredUserAttributes,requiredGroupAttributes,schoolGroupsMapperName,globalGroupsMapperName,ldapProviderId,ldapStorageMapperType,keycloakUserStorageProvider}.ts`.
- `apps/api/.env.default` (Zeilen 40–86: `KEYCLOAK_*`, `LDAP_*`, `MAILCOW_*`).

## Quelle des Solls (main.js-Zeilenanker / upstream / Baseline)

- **Boot-Runner:** `main.js:57195–57217` (`ScriptsService`, `@Timeout(KEYCLOAK_STARTUP_TIMEOUT_MS)`),
  Skript-Array `main.js:57244–57260`; Einzelskripte `:57291` (removeRealmRoles), `:57353`
  (addMailcowSyncRoles), `:57439` (patchEduUiClient), `:57515` (addLdapGroupMappers ff.).
- **1.6-Source (identisch zu 2.0-Boot-Skripten):** `apps/api/src/scripts/keycloak/*.ts`.
- **Installer-Substitution:** `webinstaller-api/app/main.py:702–712` (Secret-Gen), `:726–765`
  (Realm-Mutation: Clients, LDAP-Component, `frontendUrl`), `:780/781/810` (Env-Secrets).
- **Template-Struktur:** `realm-edulution.json.template` — Realm `:3/30–32`; Clients `:670` (edu-api),
  `:776` (edu-mailcow-sync), `:880` (edu-ui); LDAP-Component `:1830`, LDAP-Config `:2195–2295`;
  Rollen `:49–72`.
- **Soll-Verhaltensreferenz:** Realm-Export der laufenden 2.0.200-Instanz (in T4 zu erfassen) —
  **nicht** aus `main.js` rekonstruierbar, deshalb Live-Export (`PLAN §3.6`: „Quelle: Realm-Export
  der laufenden crabbox-Instanz, nicht `main.js`").

## Datenmodell / API / Migrationen

- **Keine** Mongoose-Schemas, **keine** DB-Migration, **kein** `schemaVersion++`. Rein
  Ops-Analyse; kein Anfassen des `MigrationService`.
- **Contract-Drift-Achse (dokumentierend, nicht ändernd):** Realm ↔ Installer-Template ↔
  `apps/api/.env.default` ↔ Installer-`edulution.env`. Der Diff-Report macht diese Kopplung
  explizit (welche Client-IDs/Secrets/Realm-Namen in welcher Env-Var landen), ändert aber nichts.
- Keycloak-Admin-API (nur lesend im Export): `POST /realms/master/.../token` (admin-cli, ROPC),
  `POST /admin/realms/edulution/partial-export`, `GET /admin/realms/edulution/components`.

## Auth / Guards

- Es entstehen **keine** neuen NestJS-Routen/Controller → **keine** neuen Guards zu portieren.
- **Zu dokumentieren** (nicht zu ändern) sind die realm-seitigen Auth-Anker, damit der spätere Fork
  sie nicht versehentlich bricht:
  - `AuthGuard` verifiziert JWTs gegen einen **aus Datei** gelesenen Public Key
    (`PUBLIC_KEY_FILE_PATH='./data/edulution.pem'`, `main.js:55805`) — **kein** `jwks_uri`/`kid`.
    Signing-Key-Rotation im Realm bricht damit jeden Login (R9). → im Provisioning-Doc als Risiko.
  - `removeRealmRoles` entfernt `query-users`/`view-users`/`query-groups` aus
    `default-roles-edulution` → **Least-Privilege der Default-Rolle**; darf beim Nachbau nicht
    „zurückrutschen". Als Provisioning-Invariante festhalten.
  - `edu-api`/`edu-mailcow-sync` sind Service-Account-Clients mit realm-management-Rollen — die
    Rollen-Zuweisung (`addMailcowSyncRoles`) ist Teil des Provisioning-Vertrags.

## Externe Integrationen

- **Keycloak** (Admin-REST + `partial-export`) — Ziel des Exports.
- **LDAP/Samba-AD** (linuxmuster.net) — nur als **Struktur im Realm** relevant (User-Federation
  `providerId: ldap`, `vendor: ad`, `editMode: READ_ONLY`, `uuidLDAPAttribute: samaccountname`,
  Mapper `school-groups`/`global-groups` + User-Attribut-Mapper); keine direkte LDAP-Verbindung des
  Werkzeugs.
- Der Realm koppelt indirekt an **Mailcow** (Service-Account `edu-mailcow-sync`) — nur dokumentiert.

## Secrets / Env / master.key

- **Kein** `MASTER_ENCRYPT_KEY`-/gewrappte-User-Key-Bezug (`getMasterKey` `main.js:9214–9235`
  unberührt) — Realm-Provisioning fasst keine verschlüsselten User-Keys an.
- **Berührte Secrets (nur im Export, müssen gescrubbt werden):** `KEYCLOAK_EDU_UI_SECRET`,
  `KEYCLOAK_EDU_API_CLIENT_SECRET`, `KEYCLOAK_EDU_MAILCOW_SYNC_SECRET` (Installer-generiert
  `main.py:702–704`, im Template als `"secret":"**********"` maskiert), LDAP-`bindCredential`,
  `KEYCLOAK_ADMIN_PASSWORD` (nur im Export-Skript als Env-Eingabe, nie in Artefakten).
- **Guardrail:** Die committete Baseline **darf keinen** Klartext-Secret enthalten. Der Scrub setzt
  `secret`, `bindCredential` und KC-Schlüsselmaterial auf `REDACTED`; `--assert-scrubbed` erzwingt
  das und ist Verify-Bedingung jeder Artefakt-Task. `partial-export` maskiert Client-Secrets
  ohnehin als `**********` — trotzdem hart auf `REDACTED` normalisieren (defense-in-depth).
- **Rotationspfad (zu dokumentieren, `PLAN §2.6/§3.6`):** KC-Client-Secret neu → `edulution.env`
  (`KEYCLOAK_EDU_*_SECRET`) aktualisieren → API-Restart. `patchEduUiClient` patcht nur Flags, **nicht**
  das Secret → Secret-Drift zwischen KC und Env ist nicht selbstheilend.

## Trade-offs & Alternativen (mit Empfehlung)

1. **Export-Methode: Admin-API `partial-export` vs. `kc.sh export`.**
   `partial-export` läuft ohne Downtime gegen den **laufenden** Realm (spiegelt also Boot-Skript-
   Mutationen), liefert aber die User-Federation-Komponente nicht vollständig. `kc.sh export`
   (Container-`exec`) ist vollständiger, braucht aber ggf. Realm-Freeze.
   **Empfehlung:** `partial-export` als Primärquelle **plus** separater `GET /components`-Pull für die
   LDAP-Federation + Mapper (beides in `export-realm.sh`). `kc.sh export` nur als Fallback dokumentieren.
2. **Template-Vergleichsseite: In-Repo-Kopie vs. Installer-Checkout referenzieren.**
   Die crabbox synct nur **dieses** Repo → der Installer liegt dort nicht. Eine referenzierte
   Kopie macht den Diff on-box lauffähig, erzeugt aber eine Sync-Pflicht (Template ändert sich im
   Installer). **Empfehlung:** Referenzkopie `docs/keycloak/realm-template.reference.json` committen
   + Sync-Hinweis + Herkunftsnotiz; Single-Source-of-Truth bleibt der Installer.
3. **Werkzeug-Sprache: Bash+jq vs. Node-ESM.** jq-Verfügbarkeit auf der warmen Box ist ungewiss,
   Node 22 ist garantiert. **Empfehlung:** Export = Bash (nur `curl` nötig); Normalisierung/Diff/
   Assertions = Node-ESM (`node --test`, keine externen Deps) → verlässlich via `iter.sh cmd`.
4. **Ablageort Baseline: `docs/keycloak/` (committet) vs. `scratchpad/` (flüchtig).**
   Die Soll-Baseline ist ein **dauerhaftes** Referenzartefakt für spätere Diffs/CI.
   **Empfehlung:** committen (scrubbt), scratchpad nur für den Roh-Export.

## Risiken & Rollback

- **Secret-Leak in die committete Baseline** (höchstes Risiko). Gegenmaßnahme: `--assert-scrubbed`
  als harte Verify-Bedingung + Review; kein Roh-Export ins Repo (nur `scratchpad/`).
- **Reine additive Analyse** → kein Laufzeitpfad betroffen, **kein DB-/master.key-Rollback nötig**.
  Rollback = Dateien/Branch verwerfen (`git`), keine Datenmigration.
- **Baseline-Veraltung:** Export ist ein Zeit-Snapshot; bei KC-/Template-Änderungen neu erfassen.
  Der Snapshot ist explizit mit `2.0.200` versioniert.
- **Falsche Instanzquelle** (Fork-Deploy statt echtes 2.0.200) verfälscht das Soll → siehe offene
  Frage 1; im Report die Herkunft (Image-Tag, Datum) mit-dokumentieren.

## Doku-Impact (Augenmaß)

Dieses Paket **ist** überwiegend Doku: `docs/keycloak/realm-provisioning.md` (Provisioning-Referenz)
und `docs/keycloak/realm-diff-2.0.200.md` (Diff-Report). Interne Ops-/Dev-Doku, **Deutsch als
Primärsprache**. Kein `README`/`CHANGELOG`-Eintrag nötig (kein nutzersichtbares Feature). Später
speist die Baseline die P1b-Tracking-Pipeline (`PLAN §7f/§8`) — dort verlinken, nicht hier bauen.

## i18n-Impact (DE+EN)

**Keine** UI-i18n-Keys (kein Frontend, keine `libs/.../locales`-Änderung) → `npm run
check-translations` unberührt. Die Doku ist interne Ops-/Analyse-Doku und wird **DE** geführt; eine
EN-Fassung ist für ein internes Analyse-Ledger nicht erforderlich (siehe offene Frage 4).

## Offene Fragen

1. **Instanzquelle des Solls.** Aus welcher laufenden Instanz wird exportiert?
   (a) einmaliger Deploy des **echten Upstream-Images** `ghcr.io/edulution-io/edulution-api:2.0.200`
   auf der crabbox gegen echten LMN *(Empfehlung — spiegelt genau die 2.0-Boot-Skripte + Installer-
   Substitution als eingefrorenes Soll)*; (b) bestehende Prod-/Staging-2.0.200-Instanz; (c) der
   aktuelle Fork-Deploy. Klärt zugleich, ob T4 sofort ausführbar ist oder auf Deploy-Tooling
   (`scripts/crabbox/deploy.sh`, existiert noch nicht) wartet.
2. **Umfang der Roll-/Scope-Erfassung.** Nur `edu-*`-Clients + LDAP + Realm-Rollen (Task-Scope), oder
   auch die **custom Client-Scopes** `school` und `group-membership` (nicht-stock, tragen den
   `school`-Claim, den `AuthGuard`/Multi-Tenant nutzt)? *(Empfehlung: die zwei custom Scopes
   mitdokumentieren, Auth-Flows/Standard-Scopes weglassen.)*
3. **Reproduzierbarer Re-Export vs. Snapshot.** Reicht ein eingefrorener `2.0.200`-Snapshot, oder soll
   `export-realm.sh` schon jetzt Teil eines wiederholbaren Release-Checks werden (npm-Alias
   `realm:diff`)? *(Empfehlung: Snapshot jetzt (T4); npm-Alias + Doku (T8) vorbereiten, CI-Gate erst
   P1b.)*
4. **EN-Doku.** Bleibt die Provisioning-Referenz DE-only (interne Ops-Doku), oder wird trotz
   Analyse-Charakter eine EN-Fassung verlangt (Guardrail „i18n DE+EN")? *(Empfehlung: DE-only für
   interne Ops-Doku; Guardrail zielt auf UI-i18n-Keys, die hier fehlen.)*
5. **ParentChildPairing-Vorgriff.** Der Report notiert nur, **ob** 2.0.200 bereits ein Eltern-
   Attribut/eine Eltern-Rolle im Realm hat (`PLAN §3.6/P3`). Das Anlegen ist Nicht-Ziel — soll der
   Report darüber hinaus eine Empfehlung (neuer Scope/Mapper) skizzieren, oder strikt nur den
   Ist-Zustand? *(Empfehlung: nur Ist-Zustand + Flag „für P3 zu klären".)*
