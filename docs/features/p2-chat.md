<!--
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Kevin Stenzel
-->

# P2 — Chat (nativer Gruppen-Chat) — Feature-Spec

> PILOT-Paket (`slug: p2-chat`, Phase P2, Abhängt-von: `p1-installer-repoint`).
> Ziel dieses Pakets ist **doppelt**: (a) den nativen Gruppen-Chat aus edulution 2.0.200
> rekonstruieren und (b) damit das komplette „neue native App"-Rezept validieren
> (BE → FE → Locales → appconfig-Seed → crabbox-Deploy → Visual-Diff). Die hier gefundene
> Detailtiefe ist bewusst hoch (P2 = voll ausführbar).

## Problem / Motivation
Der Fork basiert auf 1.6.266; das Chat-Modul existiert in `2.0.200`, fehlt aber im aktuellen
`main`-Baum vollständig (`apps/api/src/chat`, `libs/src/chat` sowie die FE-Seite existieren
nicht). Chat ist im Master-Plan (§Modul-Tabelle Zeile 144 / §216 / §364) als **Pilot** gesetzt,
weil geretteter FE+BE-Source vorliegt (`origin/upstream/1851-add-chat-page`) und das Modul mit
6 Routen + SSE-Realtime klein genug ist, um das gesamte Nachbau-Rezept end-to-end zu validieren,
bevor die teuren Module (Wiki/Calendar/Mail) starten.

Chat ist ein **Gruppen-Chat**: pro Schulklasse (`adminclass`) und pro Projekt (`project`) genau
eine Konversation, deren Teilnehmer sich aus der LDAP-/Sophomorix-Gruppenmitgliedschaft ergeben.
Realtime läuft über den **bestehenden SSE-Kanal** (kein WebSocket-Gateway), Benachrichtigungen
über den bestehenden `NotificationsService`.

## Ziel & Nicht-Ziele (YAGNI)

**Ziel**
- Nativer Gruppen-Chat mit den 6 geshippten Routen (`groups`, `unread-counts`, `read-status`,
  `read`, `messages` GET/POST), Realtime via SSE, Push-/Inbox-Notifications.
- FE-Seite gemäß Baseline `scratchpad/real/11-chat.png`: Titel „Chat", Sidebar-Sektionen
  „School Classes" (expandierbar) + „Projects", Empty-State „Select conversation" mit
  „Refresh groups", Nachrichtenliste + Composer.
- Datenmodell (`conversation` / `chatMessage` / `chatreadstatuses`), Locales DE+EN,
  appconfig-Seed für Fresh-Install-Fidelity.
- Validierung des Rezepts inkl. crabbox-Deploy + Playwright-Visual-Diff.

**Nicht-Ziele (bewusst raus)**
- **AI-/KI-Chat / Chatbot / MCP-Tooling** (`aichat`-Slug, `origin/upstream/1572/1597/1689/1691/
  1698/1947/1962/1966`) — im Master-Plan explizit out of scope (§28).
- **Detachable-/Pop-out-Window** (`origin/upstream/1687-chat-add-detachable-window`) — nicht in
  der Baseline `11-chat.png` sichtbar, nicht in der Primärquelle `1851`. → Offene Frage, vorerst
  zurückgestellt.
- **Generischer dritter Gruppentyp** (`genericChatGroupType`): das geshippte BE kennt ihn
  (`ALLOWED_CONVERSATION_TYPES`, `getUserGroupsAndProjects → { classes, projects, groups }`),
  die Baseline-UI zeigt aber nur Klassen + Projekte. → FE nur Klassen+Projekte; generische
  Gruppen out of scope (Offene Frage).
- **Rate-Limiting-Guard** (`throttle_guard` in `main.js`, existiert im Fork-Baum nicht) — Auth
  läuft über den globalen JWT-Guard + `verifyGroupAccess` im Service; Rate-Limiting ist optional.
  → Offene Frage.
- Editieren/Löschen von Nachrichten, Datei-Anhänge, Direktnachrichten 1:1, Suche.

## Betroffene Komponenten & Dateien (konkrete Pfade)

**Neu — libs (shared Contract, von BE+FE konsumiert)**
- `libs/src/chat/constants/`: `chatTypes.ts`, `chatRoles.ts`, `chatPaths.ts`,
  `chatApiEndpoints.ts`, `chatMessageMaxLength.ts`, `chatMessagesDefaultLimit.ts`,
  `allowedConversationTypes.ts`, `genericChatGroupType.ts`, `allowedChatSophomorixTypes.ts`,
  `groupTypeToLocation.ts`, `chatRole.ts` *(const-Objekt, kein enum — AGENTS.md)*
- `libs/src/chat/types/`: `chatType.ts`, `chatRole.ts`, `conversationType.ts`,
  `allowedConversationType.ts`, `allowedChatSophomorixType.ts`, `chatMessage.ts`,
  `createMessageDto.ts`, `chatGroup.ts`, `userChatGroups.ts`, `groupTypeLocation.ts`,
  `chatMessageSsePayload.ts`, `chatErrorMessages.ts`, `chatUnreadCount.ts`, `chatReadReceipt.ts`
- `libs/src/chat/utils/`: `isAllowedChatSophomorixType.ts`, `toChatRoute.ts`

**Neu — apps/api**
- `apps/api/src/chat/chat.module.ts`, `chat.controller.ts`, `chat.service.ts`
- `apps/api/src/chat/schemas/conversation.schema.ts`, `chatMessage.schema.ts`,
  `chatReadStatus.schema.ts`
- `apps/api/src/chat/pipes/validateConversationType.pipe.ts`
- Specs: `chat.service.spec.ts`, `chat.controller.spec.ts`

**Geändert — apps/api (Abhängigkeiten der Chat-Routen)**
- `apps/api/src/groups/groups.service.ts` — neue Methode `getUserGroupsAndProjects(username)`
  → `{ classes, projects, groups }` (Quelle: `main.js:68446` Controller-Delegation)
- `apps/api/src/notifications/notifications.service.ts` — neue Methode
  `markNotificationReadBySource(sourceType, sourceId, username)` (von `markChatAsRead` genutzt)
- `apps/api/src/app/app.module.ts` — `ChatModule` registrieren

**Geändert — libs (Infra-Konstanten)**
- `libs/src/common/constants/sseMessageType.ts` (+ `types/sseMessageType.ts`) — Keys
  `CHAT_NEW_MESSAGE: 'chat_new_message'`, `CHAT_READ_STATUS_UPDATED: 'chat_read_status_updated'`
- `libs/src/notification/constants/pushNotificationChannelId.ts` — Key `CHAT: 'chat'`
  (falls nicht vorhanden). `notificationSourceType.ts` (`CHAT`) und `sourceTypeToApp.ts`
  (`[CHAT]: APPS.CHAT`) existieren **bereits**.
- `libs/src/appconfig/constants/defaultAppConfig.ts` — CHAT-Eintrag (Fresh-Install-Seed)

**Neu — apps/frontend**
- `apps/frontend/src/pages/Chat/ChatPage.tsx`, `ChatMenuBarFooter.tsx`, `useChatMenu.ts`,
  `useRegisterChatSections.ts`
- `apps/frontend/src/pages/Chat/components/`: `ChatView.tsx`, `ChatContent.tsx`,
  `ChatMessages.tsx`, `ChatBubble.tsx`, `ChatInput.tsx`, `ChatEmptyState.tsx`
- `apps/frontend/src/pages/Chat/hooks/useGroupChat.ts`
- `apps/frontend/src/store/useChatStore.ts` (+ `useChatStore.spec.ts`)

**Geändert — apps/frontend**
- `apps/frontend/src/components/structure/layout/NativeAppPageManager.tsx` —
  `[APPS.CHAT]: <ChatPage />` in `nativeAppPages`
- `apps/frontend/src/locales/de/translation.json` + `en/translation.json` — `chat`-Block
  erweitern (existiert minimal: `{ title, sidebar }`)

**appconfig-Slug** `CHAT: 'chat'` existiert bereits (`libs/src/appconfig/constants/apps.ts:26`).

## Quelle des Solls (bei Rekonstruktion)

Primärquelle-Rangfolge: **echter Rescue-Source `1851` > `main.js`-Rekonstruktion > `1866`**.
`1851` datiert **vor** dem 1.6→2.0-Merge und ist diverged → gegen `main.js` **abgleichen**,
nicht copy-pasten (echte Arbeit).

| Baustein | Soll |
|---|---|
| ChatModule | `main.js:68378` · `origin/upstream/1851:apps/api/src/chat/chat.module.ts` |
| ChatController (6 Routen) | `main.js:68438–68475` (`groups`/`unread-counts`/`conversations/:conversationType/:groupName/{read-status,read,messages}`) · `1851:.../chat.controller.ts` |
| ChatService core | `main.js:68779–68912` (`getAuthorizedMessages` 68797, `getOrCreateAuthorizedConversation` 68862, `sendMessage` 68871, `notifyGroupMembers` 68913) · `1851:.../chat.service.ts` |
| ChatService read-status | `main.js:68938` `getUnreadCounts`, `~68990` `getReadReceipts`, `~69018` `markChatAsRead` (nur `main.js`, in `1851` nicht vorhanden) |
| `verifyGroupAccess` / `getVerifiedGroup` (Auth) | `1851:chat.service.ts` (`verifyGroupAccess`, Cache `GROUP_WITH_MEMBERS_CACHE_KEY`) + `main.js` |
| Conversation-Schema | `main.js:69227–69261` (Felder `type,groupName,conversationType,lastMessageAt,schemaVersion`; unique-Index `{groupName,conversationType}`) |
| ChatMessage-Schema | `main.js:69382–69430` (`conversationId,content,role,createdBy,createdByUserFirstName,createdByUserLastName,schemaVersion`; Indizes `{conversationId,createdAt:-1}`, `{conversationId,createdBy,createdAt:-1}`) |
| ChatReadStatus-Schema | `main.js:69487–69512` (`conversationId,username,readAt,schemaVersion`; collection `chatreadstatuses`; unique `{conversationId,username}`) |
| `ALLOWED_CONVERSATION_TYPES` | `main.js:69344` (`ADMIN_CLASS`, `PROJECT`, `genericChatGroupType`) |
| `CHAT_ERROR_MESSAGES` | `main.js:69127` (`chat.errors.conversationNotFound`, `invalidGroupType`, `unauthorizedAccess`) |
| FE Seite/Store/Routes/Sections | `origin/upstream/1851`: `pages/Chat/*`, `store/useChatStore.ts`, `router/routes/getChatRoutes.tsx`, `pages/Chat/useRegisterChatSections.ts` |
| libs-Contract | `origin/upstream/1851`: `libs/src/chat/*` (Enttypen `sophomorixType`→`conversationType` abgleichen) |
| Verhaltens-/Design-Baseline | `scratchpad/real/11-chat.png` |

## Datenmodell / API / Migrationen

**Neue Mongoose-Schemas** (3 neue Collections, `strict:true`, `timestamps:true`, `schemaVersion`
default 1, `toJSON.virtuals:true`):
- `Conversation` — 1 Doc pro `(groupName, conversationType)`, unique-Index darauf; `type` fix
  `'group'` (`CHAT_TYPES.GROUP`); `conversationType ∈ ALLOWED_CONVERSATION_TYPES`;
  `lastMessageAt` (indexiert).
- `ChatMessage` — `conversationId` ref `Conversation`; `role` fix `'user'` (`CHAT_ROLES.USER`);
  Denormalisierung `createdBy/createdByUserFirstName/createdByUserLastName`.
- `ChatReadStatus` — collection `chatreadstatuses`; unique `{conversationId, username}`.

**API-Routen** (Basis-Prefix = appconfig-Slug `chat`, konsumiert via `eduApi`):
1. `GET  chat/groups` → `{ classes, projects[, groups] }` (delegiert an `GroupsService`)
2. `GET  chat/unread-counts` → `[{ groupName, conversationType, count }]`
3. `GET  chat/conversations/:conversationType/:groupName/read-status` → Read-Receipts pro Member
4. `POST chat/conversations/:conversationType/:groupName/read` → markiert gelesen (204)
5. `GET  chat/conversations/:conversationType/:groupName/messages?limit&offset&sort&before`
6. `POST chat/conversations/:conversationType/:groupName/messages` (Body `CreateMessageDto{content}`)

`:conversationType` wird durch `validateConversationType.pipe` gegen `ALLOWED_CONVERSATION_TYPES`
validiert (BadRequest sonst). `limit` default = `CHAT_MESSAGES_DEFAULT_LIMIT`, `sort` default
`SORT_DIRECTION.ASC`.

**Contract-Drift-Achtung (API ↔ DTO ↔ FE ↔ appconfig):**
- Der geretteten FE-Store (`1851`) verwendet `sophomorixType` in Pfaden + `UserChatGroups` nur
  `{ classes, projects }`; das geshippte BE verwendet `conversationType`. **Reconciliation
  Pflicht:** FE-Route-Param `:groupType` = Location-Alias (`classes`/`projects`), gemappt via
  `groupTypeToLocation`/`allowedChatSophomorixTypes` auf den API-`conversationType`
  (`adminclass`/`project`, aus `SOPHOMORIX_GROUP_TYPES`). Beim Nachbau die geshippte
  `conversationType`-Nomenklatur führen.

**DB-Migration nötig?** **Nein** für die Chat-Collections — sie sind neu, es existieren keine
Alt-Dokumente in einer 1.6-DB, `schemaVersion` startet bei 1 (forward-only-Konvention bleibt
gewahrt: der erste Migrations-Bedarf entsteht erst bei künftigen Schema-Änderungen). **Aber:**
der `defaultAppConfig`-Seed betrifft nur Fresh-Installs (`initializeCollection`, `main.js:2335`);
ob bestehende 1.6→2.0-Upgrades den Chat-App-Eintrag automatisch bekommen sollen (appconfig-
Migration) ist eine **Offene Frage** (Default: nein, Admin aktiviert via App-Store/Settings).

## Auth / Guards (welche mit-portieren)

- **Global JWT-/Keycloak-Guard**: alle 6 Chat-Routen sind **nicht `@Public`** → sie erben den
  globalen Auth-Guard (authentifizierter `JwtUser` Pflicht). **Kein `@Public` setzen** (Bypass-
  Risiko). `currentUser` via `@GetCurrentUser`-Decorator (`apps/api/src/common/decorators/
  getCurrentUser.decorator.ts`).
- **Fachliche Autorisierung im Service** (mit-portieren, zentral): `verifyGroupAccess(groupName,
  conversationType, username)` prüft über den Cache `GROUP_WITH_MEMBERS_CACHE_KEY`, ob der User
  Mitglied der Gruppe ist → sonst `403 UNAUTHORIZED_ACCESS`; ungültiger Typ → `400
  INVALID_GROUP_TYPE`; fehlende Konversation → `404 CONVERSATION_NOT_FOUND`. Jede
  gruppengebundene Route ruft `verifyGroupAccess`/`getVerifiedGroup` auf.
- **Rate-Limiting (`throttle_guard`)**: im geshippten `main.js` als `@UseGuards` auf allen
  Routen; existiert im Fork-Baum nicht. Optional nachziehen — **Offene Frage** (nicht auth-
  kritisch, da Auth über JWT + `verifyGroupAccess` läuft).

## Externe Integrationen
- **LDAP/Sophomorix** (indirekt über `GroupsService` + Gruppen-Cache
  `GROUP_WITH_MEMBERS_CACHE_KEY`) — Quelle der Klassen-/Projekt-Mitgliedschaft. Keine neue
  externe Schnittstelle; nutzt vorhandene `GroupsService`-Infrastruktur.
- **SSE** (bestehender `SseService.sendEventToUsers`) — Realtime-Push neuer Nachrichten +
  Read-Status.
- **Notifications** (bestehender `NotificationsService.upsertNotificationForSource` +
  neu `markNotificationReadBySource`) — Inbox-/Push-Notifications.
Kein neuer Companion-Container, kein GitHub-Laufzeit-Fetch, kein Lizenzserver-Bezug.

## Secrets / Env / master.key
- **Keine** neuen Env-Vars, **kein** neuer Keycloak-Client/Secret, **keine** Berührung von
  `MASTER_ENCRYPT_KEY`/gewrappten User-Keys. Chat-Inhalte werden im Klartext in Mongo
  gespeichert (wie im geshippten 2.0.200; keine feldweise Verschlüsselung).
- **PII-Hinweis** (Master-Plan §115, R12): `conversation`/`chatMessage`/`chatreadstatuses`
  enthalten Schul-PII inkl. Minderjährigen-Klartext. Auf crabbox **nur synthetische Fixtures**,
  keine echten Schüler-PII. Retention-/Löschkonzept ist ein Betreiber-Thema (nicht Teil dieses
  Codepakets), hier nur als Risiko gespiegelt.

## Trade-offs & Alternativen (mit Empfehlung)

1. **Read-Status/Unread-Counts jetzt oder deferren?** Sie sind Teil der geshippten 6-Routen-
   Oberfläche, aber in `1851` nicht enthalten (reiner `main.js`-Nachbau) und in der Baseline
   `11-chat.png` (Empty-State) nicht sichtbar. → **Empfehlung: jetzt mitbauen**, aber als klar
   getrennte, nachgelagerte Tasks (T10, T18), damit der Kern (Gruppen + Nachrichten + SSE) früh
   unabhängig verifizierbar/shippbar ist. Deferren möglich, falls der Pilot schneller schließen
   muss (Offene Frage).
2. **FE-Mount: `NativeAppPageManager`-Registry vs. `getChatRoutes`.** Das geshippte 2.0.200
   mountet native Apps über `NativeAppPageManager` (`nativeAppPages[slug]`, Pfad `chat/*`); `1851`
   nutzte ein separates `getChatRoutes` mit Nested-Routes. → **Empfehlung: `NativeAppPageManager`
   (`[APPS.CHAT]: <ChatPage />`)** verwenden (konsistent mit dem geshippten Ansatz), `ChatPage`
   liest `:groupType/:groupName` via `useParams`. `getChatRoutes` aus `1851` nicht übernehmen.
3. **libs-Contract: eine Scaffold-Task vs. viele Mikro-Tasks.** Die ~28 `libs/src/chat`-Dateien
   sind reine Deklarationen (0 Logik). → **Empfehlung: 1 Contract-Task** (T1), abweichend von der
   ≤3-Dateien-Heuristik, da die Heuristik auf logiktragende Änderungen zielt; die Deklarationen
   sind eine kohärente, gemeinsam reviewbare Einheit (wie in `1851` in einem Rutsch hinzugefügt).

## Risiken & Rollback
- **R-Chat-1: `GroupsService.getUserGroupsAndProjects` verändert eine Bestandsdatei.** Fehler
  könnten Gruppen-Funktionalität außerhalb Chat berühren. Mitigation: additive Methode, Spec/Test
  dazu, kein Umbau bestehender Methoden.
- **R-Chat-2: SSE-/Notification-Konstanten (`sseMessageType`, `pushNotificationChannelId`) sind
  geteilte Contracts.** Neue Keys additiv → geringes Regressionsrisiko; `check-translations`/
  Typecheck fangen Drift.
- **R-Chat-3: Aggregation-Pipelines** (`getAuthorizedMessages`, `getUnreadCounts`) sind komplex;
  falsches `$toString`/`$lt`-Handling → falsche/leere Ergebnisse. Mitigation: 1:1 aus `main.js`
  übernehmen, Service-Unit-Tests mit In-Memory-/gemockten Modellen.
- **Rollback**: rein additiv (neue Collections, neuer Code, additive Konstanten). Rollback =
  vorheriger Image-Tag; kein Datenverlust, da keine Bestandsdaten migriert werden. Trotzdem gilt
  die Standard-Prozedur DB-Dump **+ `master.key`** + vorheriger Tag (Fork-Guardrail).

## Doku-Impact (mit Augenmaß)
- Kurzer Nutzer-/Betreiber-Abschnitt „Chat" (DE+EN) in `docs/`: was das Modul kann (Gruppen-Chat
  Klassen/Projekte), dass Sichtbarkeit über die Gruppenmitgliedschaft gesteuert wird, PII-Hinweis.
- `CHANGELOG.md`: „Nativer Gruppen-Chat (rekonstruiert aus 2.0.200)". Kein README-Betriebsschritt
  (keine neuen Ports/Env/Companions).

## i18n-Impact (DE+EN Pflicht)
Bestehender Block `chat` (`de`/`en/translation.json`) ist minimal (`title: "CHAT"`,
`sidebar: "Chat"`) und wird erweitert. Neue Keys (Namen final in T13 festzuzurren), u. a.:
- `chat.selectConversation`, `chat.selectConversationDescription`, `chat.refreshGroups`
- `chat.schoolClasses`, `chat.projects`
- `chat.inputPlaceholder`, `chat.send`, `chat.noMessages`, `chat.loadingMessages`
- `chat.errors.conversationNotFound`, `chat.errors.invalidGroupType`,
  `chat.errors.unauthorizedAccess` (müssen zu `CHAT_ERROR_MESSAGES` aus `main.js:69127` passen —
  Contract zwischen BE-Fehlerschlüssel und FE-Übersetzung).
`npm run check-translations` erzwingt DE/EN-Parität.

## Offene Fragen (Design-Gate)
1. **Read-Status/Unread-Counts** im Pilot mitbauen (Empfehlung: ja, T10/T18) oder deferren?
2. **Rate-Limiting-Guard** (`throttle_guard`) nachziehen oder weglassen (Empfehlung: weglassen im
   Pilot, Auth ist über JWT + `verifyGroupAccess` gedeckt)?
3. **appconfig auf Upgrade-Installs**: Chat-App bei 1.6→2.0-Upgrade automatisch aktivieren
   (appconfig-Migration) oder Admin-gesteuert lassen (Empfehlung: Admin-gesteuert)?
4. **Detachable-Window** (`1687`) — dauerhaft raus oder später als Enhancement? (Empfehlung: raus,
   nicht in Baseline.)
5. **Generischer dritter Gruppentyp** (`genericChatGroupType`) — FE-Sektion ergänzen oder out of
   scope? (Empfehlung: out of scope, Baseline zeigt nur Klassen+Projekte.)
6. **Fresh-Install-Default**: soll Chat im `defaultAppConfig` **aktiv** (sichtbar) oder nur
   **verfügbar** sein? Gegen `main.js:2380–2468` (`defaultAppConfig`) abgleichen.
