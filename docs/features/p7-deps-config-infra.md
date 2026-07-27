<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# p7 — Dependencies, Konfiguration, Infrastruktur

## Secret-Maskierung in `GET /appconfig` ist konstruktiv

Bis `f7f5484f4` lieferte die Nicht-Admin-Antwort **alle** `extendedOptions` und löschte per Hand
genau zwei Schlüssel (`ONLY_OFFICE_JWT_SECRET`, `COLLABORA_WOPI_SECRET`). Jedes neu hinzugefügte
Passwortfeld wäre damit an jeden angemeldeten Nutzer gegangen, ohne dass irgendetwas fehlschlägt.

Seither gilt eine Allowlist plus ein abgeleiteter Secret-Filter:

- `SECRET_EXTENDED_OPTION_KEYS` wird aus den Options-Definitionen erzeugt — alles mit
  `type: ExtendedOptionField.password` ist automatisch geheim. Ein neues Passwortfeld ist ab dem
  Moment geschützt, in dem es definiert wird.
- `NON_ADMIN_EXTENDED_OPTION_KEYS` listet, was ein Nicht-Admin überhaupt sehen darf.
- `pickSafeExtendedOptions` schneidet beides: erlaubt **und** nicht geheim.

Der Admin-Zweig ist unberührt und liefert weiterhin die vollständige Konfiguration.

### Abweichungen von 2.1.0

Die Vorlage (`main.js:2770–2788`) listet 17 Schlüssel. Der Fork übernimmt 15 davon —
`EURO_OFFICE_URL` und `MAIL_SIGNATURE` existieren hier nicht — und ergänzt zwei, die es upstream
nicht gibt bzw. die dort nicht gebraucht werden:

| Schlüssel | Warum nötig |
|---|---|
| `ACTIVE_MAIL_CLIENT` | `MailPage.tsx` und `NativeFrameManager.tsx` entscheiden daran, welcher Mail-Frame gerendert wird. Fehlt er, fällt jeder Nicht-Admin auf den SOGo-Default zurück. |
| `OVERRIDE_FILE_SHARING_DOCUMENT_VENDOR_MS_WITH_OO` | `getDocumentVendor` (in `libs/`) entscheidet daran ODF gegen MS-Office. Fehlt er, erzeugt jeder Nicht-Admin still wieder `.docx` statt `.odt`. |

Beide sind durch je einen Test festgenagelt, der den Leser im Testnamen nennt.

**Wer die Allowlist anfasst, prüft die Leser so** — der naheliegende Grep greift zu kurz, weil
Leser auch in `libs/` liegen und über `getExtendedOptionsValue()` gehen statt über
`extendedOptions[...]`:

```
grep -rn "ExtendedOptionKeys\." libs/src apps/frontend/src --include=*.ts --include=*.tsx \
  | grep -v "\.spec\." | grep -v "/pages/Settings/AppConfig/" | grep -v "/pages/Settings/GlobalSettings/"
```
