# Loto by SdS

Application web PWA pour l'animation d'un loto associatif.

Version : v2.2.12.

## Nouveautés principales

- Corrections de tirage côté animateur et commissaire.
- Commandes vocales de correction.
- Création de cartons depuis l'administration.
- Planche imprimable de 6 cartons avec QR Code.

## Supabase

La table `loto_cartons` existante est utilisée pour les cartons générés.
Les cartons créés sont enregistrés avec :

- `numero`
- `serie`
- `lignes`
- `actif`

Le QR Code imprimé contient l'identifiant rapide du carton : `LBS:<numero>`.
