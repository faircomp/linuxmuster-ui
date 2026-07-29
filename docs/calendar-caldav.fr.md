# Calendrier (CalDAV)

Le module calendrier reflète un serveur CalDAV externe (par ex. SOGo) dans edulution via l'API.
Chaque accès s'exécute avec le compte de l'utilisateur connecté : l'API prend l'adresse e-mail du
JWT et le mot de passe (déchiffré) de l'utilisateur, puis s'authentifie auprès du serveur CalDAV en
Basic/Digest. Un utilisateur voit donc exactement les calendriers qui lui sont partagés sur le
serveur CalDAV.

## Groupe de routes API `calendar/*`

Toutes les routes sont protégées par le guard JWT global **et** le guard d'accès applicatif
(`RequireAppAccess` pour l'application `calendar`). Sans jeton valide → `401` ; application
calendrier non activée → `403`.

| Méthode et chemin | Objet |
| --- | --- |
| `GET calendars` | Lister tous les calendriers visibles par l'utilisateur |
| `POST calendars` | Créer un nouveau calendrier |
| `PUT calendars/:id/tags` | Remplacer les tags de métadonnées d'un calendrier (`204`) |
| `GET events` | Lister les événements dans une plage (`from`/`to`, `calendarIds` optionnel) |
| `POST events` | Créer un événement |
| `PUT events/:uid` | Modifier un événement (y compris la portée d'édition de série) |
| `DELETE events/:uid` | Supprimer un événement (`204`, portée de série incluse) |

L'édition de séries (`PUT`/`DELETE events/:uid`) prend en charge les portées `THIS`,
`THIS_AND_FOLLOWING` et `ALL` via `recurrenceScope` + `occurrenceStart`.

Tous les corps de requête sont validés côté serveur selon les règles des DTO (`ValidationPipe`,
`whitelist` + `transform`), car le fork ne possède pas de pipe de validation globale.

## Configuration (Configuration des applications → Calendrier)

Paramètres → Configuration des applications → Calendrier. Visible uniquement par les
administrateurs (toute la zone de configuration des applications est protégée). La connexion CalDAV
est pilotée par trois options étendues :

- **`CALENDAR_CALDAV_BASE_URL`** — URL de base du serveur CalDAV (obligatoire ; sans elle le module
  renvoie `503 Service Unavailable`).
- **`CALENDAR_CALDAV_AUTH_MODE`** — schéma d'authentification auprès du serveur : `BASIC` ou
  `DIGEST`.
- **`CALENDAR_CALDAV_REJECT_UNAUTHORIZED`** — vérification du certificat TLS. `true` impose des
  certificats valides ; `false` autorise les serveurs auto-signés (environnements de test/internes
  uniquement).

Aucune variable d'environnement supplémentaire n'est nécessaire ; les valeurs se trouvent dans la
configuration des applications. Les mots de passe des utilisateurs ne servent qu'à l'exécution pour
l'authentification CalDAV et ne sont jamais journalisés.
