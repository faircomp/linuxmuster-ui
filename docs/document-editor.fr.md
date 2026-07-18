# Choisir l'éditeur de documents (OnlyOffice ou Collabora)

edulution peut ouvrir les documents office dans OnlyOffice ou Collabora Online. Un administrateur choisit l'éditeur par instance.

## Où le configurer

Paramètres → Configuration des applications → Partage de fichiers → « Éditeur de documents ». La section n'est visible que par les administrateurs.

## Fonctions

- **Éditeur de documents** : sélectionne l'éditeur qui ouvre les documents office — OnlyOffice (par défaut) ou Collabora Online. Le choix s'applique aux documents nouvellement ouverts.
- **URL Collabora** : l'URL de base de votre instance Collabora Online (utilisée uniquement lorsque Collabora est sélectionné).
- **Secret WOPI Collabora** : le secret partagé utilisé pour signer les jetons d'accès WOPI que Collabora présente lorsqu'il rappelle edulution.

## Contrat avec le conteneur Collabora

Le secret WOPI Collabora doit correspondre au secret configuré dans le conteneur `edulution-collabora` (déployé via l'app store). Si les deux diffèrent, les rappels WOPI de Collabora sont rejetés et les documents ne s'ouvrent pas. Le secret n'est jamais exposé aux utilisateurs non administrateurs.

## Remarques

- Changer d'éditeur ne modifie que le visualiseur qui ouvre les documents office ; les fichiers existants ne sont pas touchés.
- Sélectionner Collabora sans URL Collabora configurée revient à OnlyOffice.
- OnlyOffice et Collabora sont configurés indépendamment dans leurs propres sections ; modifier l'un n'affecte pas l'autre.
- Aucune nouvelle valeur par défaut de variable d'environnement n'est introduite ; les valeurs se trouvent dans la configuration de l'application.
