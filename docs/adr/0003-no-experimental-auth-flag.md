<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Kevin Stenzel -->

# ADR 0003 — Kein `ENABLE_EXPERIMENTAL_AUTH`: die 2.1.0-Auth-Härtung gilt unbedingt

- **Status:** akzeptiert
- **Datum:** 2026-07-27
- **Betrifft:** `tasks/p6-auth-hardening.md` (T1–T34), alle daraus gebauten Commits

## Kontext

edulution 2.1.0 stellt drei Sicherheitsmassnahmen der Auth-Härtung unter ein Feature-Flag
(`isExperimentalAuthEnabled`, `main.js:67854`), das **per Default aus** ist:

| Massnahme | Bundle-Anker | Ohne Flag |
|---|---|---|
| TOTP-Replay-Schutz über `totpLastUsedCounter` | `main.js:67508–67513` | ein abgefangener Einmalcode bleibt im 30-s-Fenster gültig |
| `byUsername`-Throttle auf `POST /auth` | `main.js:68094` (via `enabledEnv`) | Password-Spraying nur pro IP gedrosselt, also mit IP-Rotation ungedrosselt |
| 404 auf `GET /auth/totp/:username` | `main.js:68051` | die Route bleibt ein Enumerations-Orakel |

Das Flag wird über `ThrottleConfig.enabledEnv` und den Helfer `isExperimentalAuthEnabled`
ausgewertet; beide sind eigene Bundle-Module.

## Entscheidung

Der Fork portiert **alle drei Massnahmen unbedingt** und übernimmt weder
`isExperimentalAuthEnabled` noch `ThrottleConfig.enabledEnv`.

## Begründung

1. **Eine Sicherheitsmassnahme hinter einem default-aus-Flag läuft in keiner Default-Installation.**
   Der Schutz existiert dann im Code, aber nicht im Betrieb. Für ein Schulnetz, das von Laien
   installiert wird, ist das der schlechtere Default.
2. **Upstream brauchte das Flag für einen gestaffelten Rollout über einen Bestand.** Dieser Fork hat
   auf 2.1.0 keinen Bestand — es gibt niemanden, für den der alte Flow erhalten bleiben müsste.
3. **Zwei Auth-Pfade verdoppeln die Testfläche** und zwingen das Frontend, beide Anmeldeflüsse zu
   können. Der Nutzen davon ist null, sobald Punkt 2 gilt.
4. **Jede neue Env ist Contract-Arbeit ohne Gegenwert:** der Installer müsste sie schreiben,
   `.env.default` sie führen, die Doku sie erklären — für ein Flag, das immer auf `true` stünde.

## Konsequenzen

**Bereits umgesetzt:**

- `POST /auth` trägt `byUsername` **und** `byIp` fest verdrahtet (`452240dc6`) — eine bewusste
  Verschärfung gegenüber 2.1.0, das dort nur `byUsername` setzt. Ein Angreifer, der Usernamen von
  einer IP durchprobiert, wäre sonst ungedrosselt.
- `ThrottleConfig` hat kein `enabledEnv`-Feld; der `ThrottleGuard` kennt keine Env-Abfrage.

**Noch offen, wenn die restlichen Tasks landen:**

- `GET /auth/totp/:username` wird **gelöscht** statt bei aktivem Flag zu 404en (T30). Eine Route,
  die immer 404 liefert, ist toter Code. **Reihenfolge bindend:** erst T28/T29 (Frontend holt den
  MFA-Status nicht mehr vorab), dann T30 — davor bricht jeder MFA-Login.
- Der TOTP-Replay-Schutz (T18) greift ohne Flag-Abfrage.

**Nicht portiert:** `isExperimentalAuthEnabled` (`main.js:67854`) und
`ThrottleConfig.enabledEnv` (`main.js:66984–66990`). Wer beim späteren Nachziehen weiterer
2.1.0-Teile auf eine `enabledEnv`-Referenz stösst, lässt sie ersatzlos weg.

## Verworfene Alternative

Das Flag zu portieren und im Installer auf `true` zu setzen. Das hätte denselben Effekt bei
zusätzlicher Env-, Doku- und Installer-Arbeit — und der Default im Code bliebe der unsichere,
was jede Handinstallation ohne Installer stillschweigend schwächer macht.
