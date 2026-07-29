# Administration Mailcow

L'administration Mailcow permet aux administrateurs de gérer les boîtes aux lettres Mailcow directement depuis edulution.

## Où la trouver

Paramètres → Configuration des applications → Mail → « Administration Mailcow ». Le panneau n'est visible que par les administrateurs, car toute la zone de configuration des applications leur est réservée.

## Fonctions

- Liste les domaines de messagerie configurés et toutes les boîtes aux lettres (adresse, nom, domaine, stockage, statut).
- **Créer** une boîte aux lettres : partie locale, domaine, nom d'affichage, quota de stockage (Mo) et un mot de passe initial. Le client valide la saisie selon les mêmes règles que l'API applique (caractères autorisés dans la partie locale, longueur et complexité du mot de passe, confirmation correspondante, limites de quota).
- **Modifier** une boîte aux lettres : nom d'affichage, quota et état actif ; le mot de passe n'est modifié que lorsque les deux champs de mot de passe sont remplis.
- **Supprimer** une boîte aux lettres après confirmation.
- **Autorisations (ACL)** : gère les autorisations utilisateur de la boîte aux lettres. Mailcow ne renvoie pas les autorisations actuelles ; l'éditeur ne peut donc pas afficher l'état réel : toutes les options sont présélectionnées et l'enregistrement **remplace** les autorisations réelles de la boîte aux lettres par les options sélectionnées. Vérifiez la sélection avant d'enregistrer.

## Configuration

L'API communique avec Mailcow via deux variables d'environnement du service API :

- `MAILCOW_API_URL` — URL de base de l'instance Mailcow.
- `MAILCOW_API_TOKEN` — clé d'API Mailcow (ne jamais committer cette valeur).

## Remarques

- Le commutateur actif est à deux états ; modifier une boîte aux lettres dans l'état Mailcow « entrant uniquement » la normalise en inactive.
- Une boîte aux lettres avec un quota illimité (0) doit recevoir un quota fini avant de pouvoir être modifiée ici.
- Les délégations de boîtes aux lettres et les boîtes partagées ne font pas encore partie de ce panneau.
