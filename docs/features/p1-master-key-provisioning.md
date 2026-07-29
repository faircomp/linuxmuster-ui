<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# P1 — Master-Key-Provisioning & Backup-Kopplung · Spec

Slug: `p1-master-key-provisioning` · Phase P1 · Abhängt von: `p1-installer-repoint`

> Sicherheitskritisch. Der Master-Key entschlüsselt (über die gewrappten `user.encryptKey`)
> **alle** gespeicherten Passwörter. Ein falsch provisionierter, rotierter oder nicht mitgesicherter
> Key = **irreversibler Totalverlust** aller gewrappten Passwörter. Dieses Paket liefert die
> **Provisioning-** und **DR-/Backup-Seite**; die API-seitige Wrapping-Portierung ist ein
> **eigenes** Paket (s. Ziel & Nicht-Ziele, Offene Fragen).

## Problem / Motivation

edulution 2.0 hält alle `user.encryptKey` (die wiederum `user.password` und
`useraccounts.accountPassword` per AES-GCM-256 entschlüsseln) mit einem **Master-Key** verschlüsselt
(„gewrappt", Prefix `wrapped:`). Der Master-Key wird zur Laufzeit von `getMasterKey()`
(`main.js:9214–9235`) beschafft:

1. Env `MASTER_ENCRYPT_KEY` gesetzt → dieser Wert;
2. sonst `./data/master.key` vorhanden → dessen Inhalt;
3. **sonst wird ein neuer Key generiert und still nach `./data/master.key` geschrieben**
   (`Logger.warn("No master key found. Generated new master key …")`, `main.js:9233`).

Der (Upstream-)Installer setzt `MASTER_ENCRYPT_KEY` **nirgends** (`createEdulutionEnvFile`,
`webinstaller-api/app/main.py:699–834` — kein `MASTER_ENCRYPT_KEY`). Produktiv landet der Key also
**immer** per Auto-Gen im `./data`-Bind-Mount. Daraus folgen zwei scharfe Risiken:

- **DR-Falle:** Die bisher dokumentierte Rollback-Prozedur sicherte nur `mongodump`. Ein DB-Restore
  **ohne** den passenden `./data/master.key` macht **alle** gewrappten Passwörter unlesbar
  (Plan §2.6/§5.6-DR/R4). „Neustart ohne persistentes `./data`+Env = Totalverlust."
- **Undurchsichtige Herkunft:** Der Key ist an einen einzelnen, leicht übersehbaren Datei-Pfad
  gebunden, statt deterministisch aus dem zentralen Secret-File `edulution.env` zu kommen (wo alle
  anderen Secrets bereits liegen und mitgesichert werden).

**Ziel dieses Pakets:** Der Installer erzeugt den Master-Key **deterministisch** und schreibt ihn als
`MASTER_ENCRYPT_KEY` in `edulution.env` (statt Auto-Gen der Laufzeit zu überlassen), erhält ihn beim
Re-Run, und die Backup-/Rollback-Kopplung `./data/master.key` **+** `mongodump` wird verbindlich
dokumentiert.

## Ziel & Nicht-Ziele (YAGNI)

**Ziele**

- Installer erzeugt `MASTER_ENCRYPT_KEY` als **64-stelligen Hex-String** (256-bit, format-kompatibel
  zu `generateEncryptKey()`/AES-GCM-256, `main.js:8340–8345`) und schreibt ihn in den
  `# edulution-api`-Block von `edulution.env`.
- Installer **überschreibt einen bereits vorhandenen** `MASTER_ENCRYPT_KEY` beim Re-Run **nicht**
  (Rotation = irreversibler Verlust).
- DR-/Backup-Runbook-Abschnitt: `./data/master.key`/`MASTER_ENCRYPT_KEY` **zwingend gemeinsam** mit
  `mongodump`, nie einzeln; Restore-Reihenfolge; Totalverlust-Warnung; Escrow-Hinweis.
- Contract-Verify: der provisionierte Key erreicht den `edulution-api`-Container (über
  `edulution.env`).

**Nicht-Ziele (bewusst ausgeklammert)**

- **API-seitige Wrapping-Portierung.** Das Fork-Base (1.6.266) besitzt die Master-Key-Verschlüsselung
  **nicht** (Beleg: `apps/api/src/users/users.service.ts:86,215,234` + `LoginPage.tsx:113` — der
  `encryptKey` wird client-seitig per CryptoJS erzeugt und **im Klartext** in `user.encryptKey`
  gespeichert; keine `master_key_util`, kein `wrapEncryptKey`, kein `MASTER_ENCRYPT_KEY` im Fork).
  Der Port von `master_key_util` (`main.js:9182–9270`), der Migration `000-wrap-encrypt-keys-with-
  master-key` und die Verdrahtung von `wrap/unwrap` in Users/Filesharing/Mail sind ein **separates,
  größeres Paket** (Migrations-/Verschlüsselungs-Track). Dieses Provisioning ist bis dahin ein
  **No-op** (unbekannte Env-Var wird ignoriert) — bewusst vorgezogen, weil (a) die DR-Doku sofort
  gebraucht wird und (b) die Auto-Gen-Falle für die spätere Wrapping-Aktivierung schon jetzt
  entschärft ist.
- **Voll-DR-Skript** (`mongodump` + `pg_dump` Keycloak-Postgres + `./data`-Tar, Restore-Drill) →
  Plan **§5.6-DR-Runbook** (eigener Cross-Cutting-Track). Hier nur der **Master-Key-Anteil** +
  verbindliche Kopplungs-Anforderung an das §5.6-Skript.
- **Key-Rotation-Werkzeug** (Re-Wrapping aller `encryptKey` bei Rotation) → gehört zum Wrapping-Paket.
- **API-Härtung von `getMasterKey`** (Hex-Validierung, Error-Log/Fail-Fast statt stiller Auto-Gen)
  → gehört zum Wrapping-Paket (dort existiert `master_key_util` erst). Hier nur als Offene Frage.
- **Env-/Secret-Inventar-Tabelle** (Plan §2.6) → eigener P0-Env-Inventar-Track; hier nur Cross-Ref.

## Betroffene Komponenten & Dateien (konkrete Pfade)

Cross-Repo: die Provisioning-Änderung liegt im **Installer-Repo** (`edulution-installer`), die Doku im
**Produkt-Repo** (`edulution-ui`).

- `edulution-installer/apps/webinstaller-api/app/main.py` — `createEdulutionEnvFile` (`:699–834`),
  Secret-Block (`:702–712`), env-Template `# edulution-api` (`:767–786`). **(T1, T2)**
- `edulution-ui/docs/ops/dr-master-key.md` — **neu**, DR-/Backup-Kopplungs-Doku (SPDX AGPL). **(T3)**
- Voll-Stack-Contract (kein Code): `edulution-api`-Service im **Prod-Stack-Compose** muss
  `edulution.env` durchreichen (Owner: `p1-installer-repoint`; Verify hier). **(T4)**

Nicht betroffen: `apps/api`, `apps/frontend`, `libs`, `appconfig`, DTOs, Realm — keine Route, kein
Schema, kein UI-String (der Key ist ein reines API-Laufzeit-Secret und wird **nirgends** in der
Webinstaller-UI angezeigt, Beleg: `edulution-installer/apps/webinstaller/src` enthält keinen
Secret-/Master-Key-Bezug).

## Quelle des Solls (main.js-Zeilenanker / upstream / Baseline)

- `main.js:9182–9270` — vollständiges `master_key_util`-Modul (Konstanten `MASTER_KEY_ENV =
  'MASTER_ENCRYPT_KEY'` `:9190`, `MASTER_KEY_FILE_PATH = './data/master.key'` `:9191`, `0o600`
  `:9192`, `WRAPPED_KEY_PREFIX = 'wrapped:'` `:9194`).
- `main.js:9214–9235` — `getMasterKey()` (Env-Zweig `:9218–9223`, Datei-Zweig `:9225–9229`,
  Auto-Gen-Zweig `:9230–9234`).
- `main.js:8340–8345` — `generateEncryptKey()` (32 Random-Bytes → `bytesToHex` = **64 Hex-Zeichen**;
  `KEY_LENGTH = 256`, `main.js:8328`); `importKey`/`encryptWithKey` konsumieren den Key als
  `keyHex` über `hexToBytes` (`:8329–8340`) → **belegt: der Env-Key MUSS Hex sein.**
- `main.js:7800/7814/8119` — `initializeMasterKey`/`wrap/unwrapEncryptKey`-Nutzung (Users);
  `25623/38665/66536` — weitere Wrap-Konsumenten (Filesharing/Shares/Mail) — nur Kontext, nicht
  dieses Paket.
- Installer-SOLL: `edulution-installer/apps/webinstaller-api/app/main.py:687–712` (`generateSecret`/
  `generateRandom` + Secret-Block), `:767–834` (env-Template + `open("…/edulution.env","w")`).
- Plan `PLAN-openedulution-fork.md`: §2.6 (Z. 109–110), §3.3/§5.6-DR (Z. 293), §6.2 (Z. 308),
  P1-Zeile (Z. 362), R4 (Z. 382), Audit-Item 2 (Z. 435), Item 12 (Z. 449).
- Baseline-Screenshots: **keine** (keine UI-Änderung).
- Cross-Ref: `docs/datenschutz/verschluesselung-master-key.md` (Datenfluss-Doku, Owner
  `p0-pii-inventory`), `docs/features/p0-migrations-inventory.md` (Backup-Kopplung Z. 176–207).

## Datenmodell / API / Migrationen (DB-Migration nötig? Contract-Drift?)

- **Keine DB-Migration in diesem Paket.** Es wird kein Mongoose-Schema und kein `schemaVersion`
  berührt. (Die Migration `000-wrap-encrypt-keys-with-master-key` — die alle `encryptKey` gewrappt in
  die DB migriert und `schemaVersion++` fährt — gehört zum **Wrapping-Paket**, nicht hierher.)
- **Contract-Drift, der zu wahren ist:**
  `edulution.env` (`MASTER_ENCRYPT_KEY`) ↔ **Prod-Compose** `edulution-api`-Service (`env_file:
  edulution.env`) ↔ `getMasterKey()` (`process.env.MASTER_ENCRYPT_KEY`, `main.js:9218`). Reicht der
  Prod-Compose `edulution.env` **nicht** an `edulution-api` durch, wird der provisionierte Key
  ignoriert und die Laufzeit fällt (sobald Wrapping aktiv) auf Auto-Gen zurück → T4 prüft genau das.
- `Env ↔ .env.default`: das Fork-Repo hat (aktuell) **keine** `.env.default`; die Env-Inventar-Tabelle
  ist ein separater P0-Track → dort `MASTER_ENCRYPT_KEY` als Zeile ergänzen (Offene Frage 5).

## Auth / Guards (welche mit-portieren)

- **Keine** neue Route, kein Controller → keine Guards in diesem Paket. (Beim späteren Wrapping-Paket
  gilt der Guardrail: `@Public`/Auth-Guards an allen Endpunkten mit-portieren, die `wrap/unwrap`
  berühren — Users, Filesharing-Shares, Mail — Cross-Ref, nicht hier.)

## Externe Integrationen

- Keine neuen. Der Key wird ausschließlich lokal (Installer schreibt Datei, API liest Env) verarbeitet
  und verlässt den Host **nie**. Kein Netzint-Lizenzserver, kein GitHub-Fetch, keine Companion-API.

## Secrets / Env / master.key

- **`MASTER_ENCRYPT_KEY`**: 256-bit-AES-GCM-Schlüssel in **64-Hex-Zeichen**-Form. Erzeugung via
  `secrets.token_hex(32)` (Python, bereits importiert — `main.py:8`). **Nicht** `generateSecret()`
  (base62, alphanumerisch) verwenden: dessen Ausgabe ist kein gültiger Hex-String; `hexToBytes`
  parst Nicht-Hex-Paare zu `NaN → 0` und ergäbe einen **degenerierten 16-Byte-Schlüssel** (128-bit,
  teils Null-Bytes) — kryptografisch kaputt, aber ohne Crash → still gefährlich.
- **`./data/master.key`**: 0600, im Bind-Mount; entsteht (Auto-Gen) nur, solange `MASTER_ENCRYPT_KEY`
  **nicht** gesetzt ist. Mit Provisioning ist die Env-Var die maßgebliche Quelle.
- **Nie ins Repo / nie unverschlüsselt offsite**: weder `master.key` noch `edulution.env`. `.gitignore`
  deckt `data/`/`*.env` bereits ab (prüfen). Backups mit dem Key gehören verschlüsselt/escrowed.
- **Kopplung (Kern des Pakets):** Backup/Rollback = `mongodump` **+** `./data/master.key`
  (bzw. `MASTER_ENCRYPT_KEY`) **gemeinsam**, nie einzeln. DB-Restore ohne passenden Key = unlesbare
  Passwörter.

## Trade-offs & Alternativen (mit Empfehlung)

1. **Provisioning-Ort: `edulution.env` vs. vorab `./data/master.key` schreiben vs. Docker-Secret.**
   `edulution.env` ist der zentrale Secret-Ort (alle anderen Secrets liegen dort, wird mit dem Stack
   gesichert), deterministisch und vom Installer ohnehin geschrieben. → **Empfehlung: `edulution.env`**
   (= Plan §2.6b). `./data/master.key` bleibt Fallback der Laufzeit.
2. **Key-Format: `token_hex(32)` vs. `generateSecret()`.** Kein echtes Wahlproblem — `generateSecret()`
   ist **falsch** (s. Secrets). → **Empfehlung/Pflicht: `token_hex(32)`** (64 Hex), format-identisch
   zu `generateEncryptKey()`.
3. **Re-Run: bestehenden Key erhalten vs. immer neu erzeugen.** Neu erzeugen rotiert den Key →
   irreversibel unlesbare Passwörter. → **Empfehlung: erhalten** (T2). Die übrigen Secrets rotiert der
   Installer heute ohnehin (bekannte Grenze; Re-Run ist grundsätzlich kein unterstützter Upgrade-Pfad
   — s. Offene Frage 3).
4. **Sequencing: Provisioning jetzt vs. erst mit dem Wrapping-Paket.** Jetzt = forward-kompatibler
   No-op, DR-Doku sofort verfügbar, Auto-Gen-Falle vorab entschärft. → **Empfehlung: jetzt** (vorgezogen).
5. **DR-Doku-Umfang: nur Master-Key-Abschnitt vs. volles DR-Skript.** Das volle Skript
   (`mongodump`+`pg_dump`+Tar) ist §5.6. → **Empfehlung: hier nur der Master-Key-Abschnitt** +
   verbindliche Kopplungs-Anforderung an §5.6.

## Risiken & Rollback

- **R: Nicht-Hex-Key** → degenerierte Krypto. **M:** `token_hex(32)` + Verify-Assertion `^[0-9a-f]{64}$`
  (T1).
- **R: Key-Clobber beim Re-Run** → Totalverlust. **M:** Erhalt-Logik (T2) + Verify (zweimal aufrufen,
  Key stabil).
- **R: Prod-Compose reicht `edulution.env` nicht an `edulution-api` durch** → Key ignoriert, stille
  Auto-Gen. **M:** T4 (`docker exec … printenv`) + Contract-Anforderung an `p1-installer-repoint`.
- **R: `master.key`/`edulution.env` leakt (Repo/Offsite-Backup)**. **M:** `.gitignore`-Check, Doku,
  Escrow-verschlüsselt.
- **Rollback dieses Pakets:** reiner Code-/Doku-Revert (Installer-Änderung hat **keinen** DB-Effekt,
  keine Migration). Achtung: sobald das Wrapping-Paket live ist, ist ein **falscher** Key kein
  Code-Rollback mehr, sondern DR-Fall — dafür existiert genau die T3-Doku.

## Doku-Impact (Augenmaß)

- Neues Ops-Dokument `docs/ops/dr-master-key.md` (das eigentliche Deliverable von T3).
- Kurzer Verweis aus dem Betriebsteil `README`/DR-Runbook auf dieses Dokument (bündelt mit
  `verschluesselung-master-key.md`). Kein `CHANGELOG`-Eintrag (kein nutzer-sichtbares Feature).

## i18n-Impact (DE+EN)

- **Keine** UI-Keys. `MASTER_ENCRYPT_KEY` ist ein internes API-Secret und wird in keiner UI angezeigt
  (Webinstaller-FE surface = 0). Der Guardrail „i18n DE+EN Pflicht" bezieht sich auf UI-Strings und
  greift hier nicht. Das Ops-Dokument ist ein internes Betreiber-Artefakt für einen deutschen
  Schulträger → **DE maßgeblich, EN zurückgestellt** (YAGNI, konsistent mit `p0-pii-inventory`;
  s. Offene Frage 1).

## Offene Fragen

1. **Doku-Sprache** DE vs. DE+EN für `dr-master-key.md` — Empfehlung DE, EN zurückstellen. Bestätigen.
2. **Prod-Stack-Compose-Contract:** Konsumiert der `edulution-api`-Service `edulution.env` via
   `env_file`? Der Prod-Compose liegt außerhalb beider hier sichtbaren Repos (Owner
   `p1-installer-repoint`). Falls **explizites** `environment:`-Mapping statt `env_file` → dort
   `MASTER_ENCRYPT_KEY` ergänzen (Folge-Task in `p1-installer-repoint`).
3. **Installer-Re-Run-Policy:** Muss der Installer sicheren Re-Run (idempotente Secrets) unterstützen,
   oder gilt „einmalig ausführen" mit dem Master-Key-Erhalt (T2) als **einziger** Ausnahme? Bestimmt
   den T2-Umfang.
4. **API-Härtung von `getMasterKey`** (Hex-Validierung, ERROR-Log/Fail-Fast statt stiller Auto-Gen in
   Prod): bewusste Divergenz vom Upstream einführen — im **Wrapping-Paket** (wo `master_key_util`
   entsteht), nicht hier. Entscheidung dort.
5. **Env-/Secret-Inventar:** `MASTER_ENCRYPT_KEY`-Zeile (Default = generiert · Pflicht · Ort
   `edulution.env`) in die P0-Env-Inventar-Tabelle aufnehmen — Owner/Ort bestätigen.
6. **Sequencing/Naming des Wrapping-Pakets** (Port `master_key_util` + Migration `000-wrap` +
   Verdrahtung): eigenes Paket unter dem Migrations-/Verschlüsselungs-Track — Name & Reihenfolge (nach
   P0-Migrations-Parität) festlegen.
