# Calendar (P5) — Feature-Spec

> Kalibrierung (P5): Dies ist ein **solides, geerdetes Rekonstruktions-Ledger**, kein
> wochengenauer Ausführungsplan. Die Task-Granularität — vor allem im Frontend
> (Grid, Wiederholungs-Editor) — **schärft sich nach der P0-Basis-Drift-/Migrations-Analyse
> und dem Chat-Piloten (p2-chat)**. Alle Backend-Anker sind aus dem un-minifizierten
> `main.js` verifiziert; das FE ist Live-Referenz-getrieben (kein Rescue-Branch, kein
> Baseline-Screenshot für Calendar vorhanden).

## Problem / Motivation
Calendar ist ein in edulution 2.0 **neu** hinzugekommenes Modul (in 1.6 nicht vorhanden:
weder `apps/api/src/calendar` noch `libs/src/calendar`, kein Eintrag `APPS.CALENDAR`). Für
Feature-Parität des Forks braucht es einen nativen Kalender: mehrere Kalender pro Nutzer
(eigene + geteilte/abonnierte), Ereignis-CRUD inkl. Wiederholungen, Ganztagestermine,
Teilnehmer, Klassifikation/Transparenz und ein „timetable"-Tag zur Kennzeichnung von
Stundenplan-Kalendern. Das Backend spricht **CalDAV** (SOGo) über `tsdav`, parst/serialisiert
iCalendar über `ical.js`; die Wiederholungs-Expansion passiert **clientseitig** über `rrule`.
App-seitige Metadaten (Freigaben, Tags, Owner) liegen zusätzlich in einer eigenen
Mongo-Collection.

## Ziel & Nicht-Ziele (YAGNI)
**Ziel (Parität zu 2.0.200):**
- BE `CalendarModule/Controller/Service` mit **7 Routen** (2× calendars, 1× tags, 4× events).
- CalDAV-Anbindung an SOGo über `tsdav` + `undici`-Agent (TLS-Kontrolle für self-signed),
  iCal-Mapping über `ical.js` inkl. **Wiederholungs-Edit-Engine** (Scopes THIS /
  THIS_AND_FOLLOWING / ALL: EXDATE, RECURRENCE-ID-Override, RRULE-Clip + Serien-Fork).
- Mongo-Schema `CalendarMetadata` (+ eingebettetes `CalendarShareEntry`).
- appconfig-Anbindung: `APPS.CALENDAR`, `CALENDAR_CALDAV_*`-ExtendedOptions (Config-Page).
- FE: Eigenbau-Grid (Monat/Woche/Tag) + Event-Dialog + `rrule`-Wiederholungs-Editor +
  Kalender-Verwaltung (anlegen/teilen/taggen); Zustand-Store mit `eduApi`.

**Nicht-Ziele (bewusst raus):**
- Kein eigener CalDAV-/SOGo-Server-Betrieb im Fork — SOGo wird über die bestehende
  DockerService-/Mail-Companion-Kette (P4) bereitgestellt; Calendar nutzt nur den
  konfigurierten CalDAV-Endpunkt.
- Keine serverseitige Wiederholungs-Expansion (2.0 expandiert **client-seitig** per `rrule`,
  s. DTO-Kommentar `main.js:35472`).
- Kein Free/Busy-Scheduling-Server, keine iTIP/iMIP-Mail-Einladungen (Attendee-Feld wird nur
  transportiert/gespeichert, keine Versand-Logik im Modul).
- Keine `timetable`-Sonderroute: `CALENDAR_TIMETABLE_PATH_SEGMENT` existiert als Konstante,
  ist aber im 2.0-Controller **nicht** als Route verdrahtet — Stundenplan wird nur über das
  `timetable`-Tag markiert. Nicht spekulativ nachbauen.
- Keine `fr`-Übersetzung erzwingen (Best-Effort); Pflicht ist DE+EN.

## Betroffene Komponenten & Dateien (konkrete Pfade)
**Neu — libs (shared, FE+BE):** `libs/src/calendar/`
- `constants/calendar-endpoint.ts` (`CALENDAR_ENDPOINT='calendar'`, `CALENDAR_TAGS_PATH_SEGMENT`,
  `CALENDAR_TIMETABLE_PATH_SEGMENT`)
- `constants/calendar-error-messages.ts` (9 `calendar.errors.*`-Keys)
- `constants/recurrenceEditScope.ts`, `calendarEventClassification.ts`,
  `calendarEventTransparency.ts`, `calendarTag.ts`, `calendarSharePermission.ts`,
  `calendarShareSubjectType.ts`, `calDavAuthMode.ts` (const-Objekte, keine enums — AGENTS.md)
- `types/*.ts` (Event-/Calendar-/Share-/Attendee-/RecurrenceEdit-Interfaces, geteilt von DTO+FE)

**Neu — appconfig (libs):**
- `libs/src/appconfig/constants/apps.ts` → `CALENDAR: 'calendar'`
- `libs/src/appconfig/constants/extendedOptionKeys.ts` → `CALENDAR_CALDAV_BASE_URL`,
  `CALENDAR_CALDAV_AUTH_MODE`, `CALENDAR_CALDAV_REJECT_UNAUTHORIZED`
- `libs/src/appconfig/constants/appConfigSectionsKeys.ts` → `calendar: 'calendar'`
- `libs/src/appconfig/constants/extendedOptions/calendarCaldavExtendedOptions.ts` (neu)
- `libs/src/appconfig/constants/defaultAppConfig.ts` → CALENDAR-Eintrag (Fresh-Install)

**Neu — api:** `apps/api/src/calendar/`
- `calendar.module.ts`, `calendar.controller.ts`, `calendar.service.ts`
- `dto/` (8 DTOs, s. u.), `calendar-metadata.schema.ts`, `calendar-share-entry.schema.ts`
- `ical.mapper.ts` (+ `ical.mapper.spec.ts`), `*.spec.ts` für Controller/Service
- `apps/api/src/app.module.ts` → `CalendarModule` importieren

**Neu — frontend:** `apps/frontend/src/pages/Calendar/`
- `CalendarPage.tsx`, Grid-Komponenten (Monat/Woche/Tag), `EventDialog`, `RecurrenceEditor`,
  `CalendarManagementDialog`, `useCalendarStore.ts` (Zustand + `eduApi`)
- `apps/frontend/src/components/structure/layout/NativeAppPageManager.tsx` →
  `[APPS.CALENDAR]: <CalendarPage/>`
- `apps/frontend/src/pages/Settings/AppConfig/appConfigOptions.ts` → CALENDAR-Config-Eintrag
  (CalDAV-ExtendedOptions-Sektion) + Icon
- `apps/frontend/src/locales/{de,en}/translation.json` → `calendar.*`, `calendar.errors.*`,
  `appExtendedOptions.*`

**Root:** `package.json` → `tsdav`, `ical.js`, `undici` (BE) + `rrule` (FE) hinzufügen.

## Quelle des Solls (Rekonstruktion — kein Rescue-Branch)
`main.js` (un-minifiziert, Originalnamen), zentrale Anker:
- Module/Controller/Endpoint: `CalendarModule` **33176–33190**, `CalendarController`
  **33235–33381** (7 Route-Dekoratoren), Endpoint-Konstanten **33409–33412**.
- Service: `CalendarService` **33515ff**; Backend-Config `updateBackendConfig` **33530–33543**;
  `listCalendars` **33676**, `createCalendar` **33719**, `setCalendarTags` **33711**,
  `listEvents` **33787**, `mapObjectToEvents` **33811**, `createEvent` **33853**,
  `updateEvent` **33873**, `deleteEvent` **33950**, `buildCanonicalEvent` **33847**.
- iCal-Mapper: `IcalMapper` **34194ff** (Methoden: `parseIcsToEvent`, `serializeEventToIcs`,
  `extractUid`, `mapVeventToEventFields`, `parseAttendee`, `applyFullSeriesEdit`,
  `upsertOccurrenceOverride`, `clipRrule`, `buildForkedSeriesIcs`, `addExdate`,
  `occurrenceBeforeIso`, `icalTimeToIso`, `toIcalTime`).
- Schemas: `CalendarMetadata` **34666–34692**, `CalendarShareEntry` **34726–34752**.
- Enums: `CalDavAuthMode` **34055**, `CalendarTag` **34154**, `CalendarErrorMessages`
  **34086–34096**, `CalendarSharePermission` **34779**, `CalendarShareSubjectType` **34813**,
  `RecurrenceEditScope` **33439–33443**, `CalendarEventClassification` **35661**,
  `CalendarEventTransparency` **35693**.
- DTOs: `CalendarResponseDto` **35267**, `CalendarShareBodyDto` **35364**,
  `CalendarEventResponseDto` **35420**, `CalendarEventBodyDto` **35517**,
  `CalendarEventAttendeeDto` **35772**, `RecurrenceEditDto` **35728**,
  `CreateCalendarBodyDto` **35835**, `CalendarTagsBodyDto` **35911**.
- appconfig-Keys: `CALENDAR_CALDAV_*` **2085–2087**.
- FE-Referenz: **laufende 2.0.200-crabbox** (kein Calendar-Baseline-Screenshot vorhanden,
  kein `scratchpad/real/*calendar*`); `rrule` als 2.0-Dep bestätigt (Root-pkg `main.js:59729`).
- Wiring-Vorlagen 1.6: `apps/api/src/bulletinboard/bulletinboard.controller.ts` (Guards),
  `apps/frontend/src/pages/BulletinBoard/*` (Native-Page + Store-Pattern),
  `libs/src/appconfig/constants/extendedOptions/onlyOffice.ts` (ExtendedOptions-Pattern).

## Datenmodell / API / Migrationen
**Routen (Basis `calendar`), alle Controller-weit auth-gated:**
| Methode | Pfad | Handler | Query/Body |
|---|---|---|---|
| GET | `calendars` | listCalendars | — |
| POST | `calendars` | createCalendar | `CreateCalendarBodyDto` |
| PUT | `calendars/:id/tags` | setCalendarTags | `CalendarTagsBodyDto` (204) |
| GET | `events` | listEvents | `from`, `to`, `calendarIds?` (CSV) |
| POST | `events` | createEvent | `CalendarEventBodyDto` |
| PUT | `events/:uid` | updateEvent | `CalendarEventBodyDto` |
| DELETE | `events/:uid` | deleteEvent | `calendarId`, `recurrenceScope?`, `occurrenceStart?` (204) |

**DTOs:** CalendarResponseDto (id/displayName/color/description/ctag/readOnly/isSubscribed/url/
shares/tags), CreateCalendarBodyDto, CalendarShareBodyDto (subjectId/subjectType/label/permission),
CalendarTagsBodyDto, CalendarEventResponseDto (uid/calendarId/etag/summary/description/location/
start/end/allDay/rrule/color), CalendarEventBodyDto (+classification/transparency/attendees/
organizer/exdate/recurrenceEdit), CalendarEventAttendeeDto, RecurrenceEditDto (scope/occurrenceStart).

**Mongo-Schema `CalendarMetadata`** (`timestamps:true`): `calendarId` (String, required, **unique,
index**), `ownerUsername` (String, optional), `shares` (`[CalendarShareEntry]`, default `[]`),
`tags` (`[String]`, default `[]`). `CalendarShareEntry` (`_id:false`): `subjectId`, `subjectType`
(default USER), `label` (default `''`), `permission` (default VIEW).

**DB-Migration:** Voraussichtlich **keine Daten-Migration** nötig — `calendarmetadata` ist eine
**neue** Collection (Mongoose legt sie beim ersten Write an), und der `CALENDAR`-appConfig-Eintrag
kommt für Fresh-Installs aus `defaultAppConfig`, für Bestands-Installs opt-in über App-Store/Config.
Es wird **kein** bestehendes Schema geändert → kein `schemaVersion++` an Fremd-Modellen.
**Zu bestätigen** gegen die P0-Basis-Drift-/Migrations-Paritäts-Analyse (offene Frage), ob die
Fork-Konvention „forward-only über alle Modelle" trotzdem einen No-op-/Seed-Migrationsschritt für
die appConfig-Collection verlangt.

**Contract-Drift-Punkte (synchron halten):** API-Route ↔ `calendar-endpoint.ts` ↔ FE-Store-Calls
↔ `appConfigOptions.ts`; DTO ↔ shared `libs/src/calendar/types`; Schema ↔ (keine) Migration;
`APPS.CALENDAR` ↔ `defaultAppConfig` ↔ `NativeAppPageManager` ↔ Sidebar/Menü;
`CALENDAR_CALDAV_*` ↔ ExtendedOptions-Definition ↔ i18n `appExtendedOptions.*`.

## Auth / Guards (mit-portieren, nie weglassen)
Der 2.0-Controller ist klassen-weit dekoriert mit `@ApiAuth()` (`main.js` Modul 231),
`@RequireAppAccess(APPS.CALENDAR)` (Modul 382), `@ApiTags`, `@Controller(CALENDAR_ENDPOINT)`.
Pro Handler: `@GetCurrentUsername()` (Modul 262) + `@GetUsersEmailAddress()` (Modul 435).
**Fork-Rekonstruktion nach 1.6-Pattern** (vgl. `bulletinboard.controller.ts`): `@ApiBearerAuth()`
+ `@RequireAppAccess(APPS.CALENDAR)` (existiert: `apps/api/src/common/decorators/requireAppAccess.decorator.ts`)
+ globaler Auth-Guard; `@GetCurrentUsername` existiert bereits
(`apps/api/src/common/decorators/getCurrentUsername.decorator.ts`). `@GetUsersEmailAddress`:
prüfen, ob 1.6 diesen Decorator schon hat — falls nicht, **mit-portieren** (leitet die
Mail-Adresse aus dem JWT/User ab). Das CalDAV-Login nutzt Username+Passwort:
`UsersService.getPassword(username)` (existiert in 1.6, `apps/api/src/users/users.service.ts`)
liefert das (gewrappte) Nutzer-Passwort für die Basic/Digest-Auth gegen SOGo — Guard-Bypass
hier = fremder Kalenderzugriff, daher Guards zwingend vollständig.

## Externe Integrationen
- **SOGo/CalDAV** über `tsdav` `DAVClient` (`serverUrl`=`CALENDAR_CALDAV_BASE_URL`,
  `authMethod` Basic|Digest je `CALENDAR_CALDAV_AUTH_MODE`, Credentials aus Username +
  `getPassword`). TLS-Kontrolle über `undici.Agent({connect:{rejectUnauthorized}})` gesteuert
  durch `CALENDAR_CALDAV_REJECT_UNAUTHORIZED` (self-signed SOGo-Zertifikate).
- **SOGo-Backend-Bereitstellung** liegt bei der Mail-/DockerService-Kette (P4). Calendar setzt
  einen erreichbaren CalDAV-Endpunkt **voraus** und ist ohne SOGo nicht integrations-verifizierbar
  (Voll-Stack-Verify braucht SOGo, s. Risiken).
- **SOGo-Theme-CSS-Mirror** (`main.js:25091–25092`) ist ein **Mail-P4-Guardrail**, kein
  Calendar-Task; hier nur als Abhängigkeit vermerkt (Calendar rendert Eigenbau-Grid, kein
  SOGo-Iframe → Theming-Fetch irrelevant für die Calendar-UI selbst).
- `iCal`/CalDAV-Verhalten (Namespaces, `supported-calendar-component-set`, ctag/etag) aus
  `main.js` verifiziert; RFC-Referenz (iCalendar 5545, CalDAV 4791, RFC 7986 COLOR) nur zur
  Kontrolle, nicht als Quelle.

## Secrets / Env / master.key
- **Neue Env-Vars: keine.** Die CalDAV-Config liegt in `appConfig.extendedOptions`
  (`CALENDAR_CALDAV_*`), nicht in `.env` (anders als Mail-`process.env.*`). Kein neuer
  Keycloak-Client, kein neues Secret im Repo.
- **master.key-Kopplung: indirekt.** Das für CalDAV genutzte Nutzer-Passwort kommt aus
  `UsersService.getPassword`, das gewrappte User-Keys/`MASTER_ENCRYPT_KEY` berührt — **keine
  neue** Kopplung durch Calendar, aber Rollback/DR erben die bestehende master.key-Abhängigkeit.
- Kein `secret`-Feld in den Calendar-ExtendedOptions (BaseUrl/AuthMode/Bool sind nicht sensibel);
  daher kein `password`-ExtendedOptionField nötig.

## Trade-offs & Alternativen (mit Empfehlung)
1. **Eigenbau-Grid vs. Fremd-Bibliothek (FullCalendar o. ä.).** 2.0 baut das Grid selbst
   (kein Kalender-Grid-Paket in der Root-pkg außer `rrule`/`dayjs`/`react-day-picker`).
   **Empfehlung: Eigenbau** mit `dayjs` (vorhanden) für Datums-Arithmetik + `rrule` für
   Expansion — hält Parität, vermeidet neue schwere Abhängigkeit, matcht die Live-Referenz.
2. **Wiederholungs-Edit-Engine im BE (`IcalMapper`) vs. FE.** 2.0 macht die ICS-Serien-Chirurgie
   (EXDATE/Fork/Clip) **im BE**, die reine Expansion im FE. **Empfehlung: 1:1 übernehmen** — die
   Serien-Semantik ist heikel (Zeitzonen, all-day, DTSTART-Anker); BE-Zentralisierung ist die
   getestete 2.0-Wahl.
3. **`react-day-picker` (v8 vorhanden) für Mini-Monats-Navigator** wiederverwenden statt
   eigenem Datepicker. **Empfehlung: ja** für den Seiten-Navigator; das Haupt-Grid bleibt Eigenbau.

## Risiken & Rollback
- **R (Serien-Semantik):** Die THIS/THIS_AND_FOLLOWING/ALL-Logik ist der fehleranfälligste Teil
  (RECURRENCE-ID-Overrides, RRULE-`UNTIL`-Clipping, all-day vs. timed, EXDATE). Gegenmaßnahme:
  `ical.mapper.spec.ts` mit ICS-Fixtures **zuerst** grün, bevor Service-Event-Ops gebaut werden.
- **R (SOGo-Verfügbarkeit):** Ohne laufendes SOGo ist nur Unit-/Mock-Verify möglich; echte
  CalDAV-Runden brauchen die Voll-Stack-crabbox gegen SOGo (P4-Abhängigkeit).
- **R (FE-Umfang):** Grid + Wiederholungs-Editor ohne Source/Screenshot → höchster Swing.
  Gegenmaßnahme: fein geschnittene FE-Tasks (Monat zuerst, dann Woche/Tag, dann Dialoge).
- **Rollback:** additiv → Deaktivieren = `CalendarModule` aus `AppModule` nehmen +
  CALENDAR-appConfig-Eintrag entfernen; `calendarmetadata`-Collection kann verwaist bleiben
  (keine Fremd-Daten berührt). DB-Rollback allgemein = Dump + `master.key` + vorheriger
  Image-Tag (keine irreversible Migration in diesem Paket).

## Doku-Impact (Augenmaß)
Ein knapper `docs/`-Abschnitt (DE+EN): Calendar aktivieren + `CALENDAR_CALDAV_*` in der
App-Config setzen (BaseUrl auf SOGo-DAV, AuthMode, RejectUnauthorized), Hinweis auf
SOGo-Voraussetzung. Neue Env-Vars: keine → kein `.env.default`-Eintrag. Neue Route-Gruppe
`calendar/*` in einer etwaigen API-Übersicht ergänzen.

## i18n-Impact (DE+EN Pflicht)
- `calendar.*` (Modul-Titel, Ansichten Monat/Woche/Tag, „Heute", Navigation, Neuer Termin/
  Kalender, Ganztägig, Teilnehmer, Ort, Wiederholung, Serie-Bearbeiten-Scopes, Teilen,
  Timetable-Tag, leere Zustände).
- `calendar.errors.*` (9 Keys 1:1 zu `CalendarErrorMessages`: CalDavConnectionFailed,
  CalendarNotFound, EventNotFound, CreateEventFailed, UpdateEventFailed, DeleteEventFailed,
  CreateCalendarFailed, CalendarBackendNotConfigured, SetTagsFailed).
- `appExtendedOptions.*` (Titel/Beschreibung der drei CalDAV-Config-Felder).
`npm run check-translations` erzwingt DE/EN-Parität; `fr` best-effort.

## Offene Fragen (Design-Gate)
1. **Migrations-Konvention:** Verlangt die Fork-„forward-only über alle Modelle"-Regel einen
   No-op-/Seed-Migrationsschritt (appConfig) für Calendar, obwohl rein additiv + neue Collection?
   → gegen P0-Basis-Drift-Analyse entscheiden (Default-Annahme: **keine** Migration).
2. **Fresh-Install-Fidelity:** Soll CALENDAR im `defaultAppConfig`-Seed enthalten sein (zeigt 2.0
   frisch die Calendar-Kachel?)? Gegen den 2.0-`defaultAppConfig` (`main.js:2380–2468`) diffen.
3. **`@GetUsersEmailAddress`:** existiert der Decorator in 1.6 bereits, oder mit-portieren?
   (Klären beim Controller-Task; ändert nur Task-Umfang, nicht das Design.)
4. **FE-Feinschnitt:** Endgültige Aufteilung Grid ↔ Dialoge ↔ Recurrence wird nach dem
   Chat-Piloten (p2-chat) fixiert — dieser Ledger schneidet vorläufig.
5. **Kalender-Verwaltung Scope:** Volles Freigabe-UI (User/Gruppe × NONE/FREE_BUSY/VIEW/MODIFY/
   ADMIN) sofort, oder MVP nur „anlegen + Farbe + timetable-Tag" und Freigaben nachziehen?
   (Empfehlung: MVP zuerst, Freigabe-UI als eigene FE-Task T18.)
