# Calendar (CalDAV)

The calendar module mirrors an external CalDAV server (e.g. SOGo) into edulution through the API.
Every access runs as the signed-in user: the API takes the email address from the JWT and the
(decrypted) user password and authenticates against the CalDAV server using Basic/Digest. A user
therefore sees exactly the calendars shared with them on the CalDAV server.

## API route group `calendar/*`

Every route sits behind the global JWT guard **and** the app-access guard (`RequireAppAccess` for
the `calendar` app). No valid token → `401`; the calendar app not enabled → `403`.

| Method & path | Purpose |
| --- | --- |
| `GET calendars` | List all calendars visible to the user |
| `POST calendars` | Create a new calendar |
| `PUT calendars/:id/tags` | Replace a calendar's metadata tags (`204`) |
| `GET events` | List events in a time window (`from`/`to`, optional `calendarIds`) |
| `POST events` | Create an event |
| `PUT events/:uid` | Update an event (including the recurrence edit scope) |
| `DELETE events/:uid` | Delete an event (`204`, including the recurrence scope) |

Recurrence editing (`PUT`/`DELETE events/:uid`) supports the ranges `THIS`, `THIS_AND_FOLLOWING`
and `ALL` via `recurrenceScope` + `occurrenceStart`.

All request bodies are validated server-side against the DTO rules (`ValidationPipe`, `whitelist` +
`transform`), because the fork has no global validation pipe.

## Configuration (App configuration → Calendar)

Settings → App configuration → Calendar. Visible to administrators only (the whole app-configuration
area is admin-protected). The CalDAV connection is driven by three extended options:

- **`CALENDAR_CALDAV_BASE_URL`** — base URL of the CalDAV server (required; without it the module
  returns `503 Service Unavailable`).
- **`CALENDAR_CALDAV_AUTH_MODE`** — authentication scheme against the server: `BASIC` or `DIGEST`.
- **`CALENDAR_CALDAV_REJECT_UNAUTHORIZED`** — TLS certificate verification. `true` enforces valid
  certificates; `false` allows self-signed servers (test/internal environments only).

No additional environment variables are needed; the values live in the app configuration. User
passwords are used only at runtime for CalDAV auth and are never logged.
