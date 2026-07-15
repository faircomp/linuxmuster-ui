<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# Verschlüsselung at-rest & master.key-Datenfluss

Belege: `main.js:8323-8365` (Krypto), `9190-9265` (master.key), `9299-9330` (Migration 000),
`8793` (USER_DB_PROJECTION). Ergänzt das [PII-Inventar](./pii-inventar.md).

## Verschlüsselungs-Verfahren

**AES-GCM-256 über WebCrypto** (`crypto.subtle.encrypt`/`decrypt`, 256-Bit-Key, per-Wert-`iv`).
Verschlüsselt werden: `user.password`, `useraccounts.accountPassword`, Share-`password`,
`mailproviders`-Secrets. Nicht verschlüsselt: alle übrigen PII-Felder (Namen, Mail, Chat-Inhalte,
Survey-Antworten — s. Inventar).

## master.key-Kette

```
MASTER_ENCRYPT_KEY (Env)  ODER  ./data/master.key (Datei, 0600, Auto-Gen beim Erststart)
        │  getMasterKey()
        ▼
   wrap/unwrap  ──►  user.encryptKey  (im Klartext-DB-Feld NICHT lesbar: 'wrapped:'-Prefix,
        │                              WRAPPED_KEY_PREFIX)
        ▼
   user.encryptKey (entwrappt)  ──►  AES-GCM-256  ──►  user.password / accountPassword
```

- **`getMasterKey`** liest zuerst `MASTER_ENCRYPT_KEY` (Env), sonst `./data/master.key` (Bind-Mount,
  Datei-Modus `0600`, wird beim Erststart erzeugt).
- **`wrapEncryptKey`** wrappt jede `user.encryptKey` mit dem master.key; das DB-Feld trägt den
  `wrapped:`-Prefix (`WRAPPED_KEY_PREFIX`) → ohne master.key nicht entwrappbar.
- **Migration `000-wrap-encrypt-keys-with-master-key`** (`main.js:9299-9330`) zieht Bestandsdaten
  nach (jede unwrapped `encryptKey` wird gewrappt) — s. [Migrations-Inventar](../migrations/upgrade-1.6-to-2.0.md).
- **`USER_DB_PROJECTION`** (`main.js:8793`) blendet `password`/`encryptKey` aus Read-Responses aus.

## Backup-/DR-Kopplung (nicht neu erfinden — spiegelt §2.6/§5.6-DR)

**`master.key` und `mongodump` gehören IMMER ins selbe Backup-Set.** Ein Restore der Mongo **ohne
die passende `master.key`** lässt alle gewrappten Werte (`user.password`, `accountPassword`,
Share-`password`) **unlesbar** → faktischer Datenverlust. Rollback/DR = Dump **+** `./data/master.key`
**+** Vor-Image (Details: DR-Runbook `p1-dr-runbook`, Migrations-Guardrails). **Der master.key darf
nie ins Repo, nie in Logs** (Projekt-Guardrail).
