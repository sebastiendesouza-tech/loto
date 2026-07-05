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


## V3 - Cartons et scanner

La V3 ajoute la production de cartons :

- cartons individuels A4 ;
- planches A3 ;
- QR Code court par carton ;
- scanner QR de test en mode continu ;
- préparation de la base pour la vente, le retour, l'échange et le contrôle des cartons.

Avant d'utiliser les métadonnées V3 en production, appliquer `sql/supabase.sql` dans Supabase. Si ce SQL n'est pas encore appliqué, l'enregistrement des cartons reste compatible en mode minimal.
