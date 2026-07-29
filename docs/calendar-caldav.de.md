# Kalender (CalDAV)

Das Kalendermodul spiegelt einen externen CalDAV-Server (z. B. SOGo) über die API in edulution.
Jeder Zugriff läuft mit dem Konto des angemeldeten Nutzers: Die API nimmt die E-Mail-Adresse aus
dem JWT und das (entschlüsselte) Nutzerpasswort und authentifiziert sich damit per Basic/Digest
gegen den CalDAV-Server. Ein Nutzer sieht dadurch genau die Kalender, die ihm auf dem CalDAV-Server
freigegeben sind.

## API-Route-Gruppe `calendar/*`

Alle Routen liegen hinter dem globalen JWT-Guard **und** dem App-Access-Guard (`RequireAppAccess`
für die App `calendar`). Ohne gültiges Token → `401`, ohne freigeschaltete Calendar-App → `403`.

| Methode & Pfad | Zweck |
| --- | --- |
| `GET calendars` | Alle für den Nutzer sichtbaren Kalender auflisten |
| `POST calendars` | Neuen Kalender anlegen |
| `PUT calendars/:id/tags` | Metadaten-Tags eines Kalenders ersetzen (`204`) |
| `GET events` | Termine in einem Zeitfenster (`from`/`to`, optional `calendarIds`) auflisten |
| `POST events` | Termin anlegen |
| `PUT events/:uid` | Termin ändern (inkl. Serien-Bearbeitungs-Scope) |
| `DELETE events/:uid` | Termin löschen (`204`, inkl. Serien-Scope) |

Serien-Bearbeitung (`PUT`/`DELETE events/:uid`) unterstützt über `recurrenceScope` +
`occurrenceStart` die Bereiche `THIS`, `THIS_AND_FOLLOWING` und `ALL`.

Alle Request-Bodies werden serverseitig gegen die DTO-Regeln validiert
(`ValidationPipe`, `whitelist` + `transform`), da der Fork keine globale Validierungs-Pipe besitzt.

## Konfiguration (App-Konfiguration → Kalender)

Einstellungen → App-Konfiguration → Kalender. Nur für Administratoren sichtbar (der gesamte
App-Konfigurationsbereich ist admin-geschützt). Die CalDAV-Anbindung wird über drei
Extended-Options gesteuert:

- **`CALENDAR_CALDAV_BASE_URL`** — Basis-URL des CalDAV-Servers (Pflicht; ohne sie liefert das
  Modul `503 Service Unavailable`).
- **`CALENDAR_CALDAV_AUTH_MODE`** — Authentifizierungsverfahren gegen den Server: `BASIC` oder
  `DIGEST`.
- **`CALENDAR_CALDAV_REJECT_UNAUTHORIZED`** — TLS-Zertifikatsprüfung. `true` erzwingt gültige
  Zertifikate; `false` erlaubt selbstsignierte Server (nur für Test-/Interne Umgebungen).

Es werden keine zusätzlichen Umgebungsvariablen benötigt; die Werte liegen in der
App-Konfiguration. Nutzerpasswörter werden ausschließlich zur Laufzeit für die CalDAV-Auth genutzt
und niemals geloggt.
