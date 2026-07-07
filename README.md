# Loto by SdS

Application web PWA pour l'animation d'un loto associatif.

Version : v3.1.7.

## Nouveautés principales

- Corrections de tirage côté animateur et commissaire.
- Commandes vocales de correction.
- Création de cartons depuis l'administration.
- Cartons individuels : 3 par A4.
- Planches : 6 cartons par A3.
- PDF de calibration impression.
- Scanner QR en mode continu.

## Supabase

La table `loto_cartons` existante est utilisée pour les cartons générés.
Les cartons créés sont enregistrés avec :

- `numero`
- `serie`
- `lignes`
- `actif`

Le QR Code imprimé contient uniquement le code métier du carton, par exemple `SDS-15-0001`.


## V3 - Cartons et scanner

La V3 ajoute la production de cartons :

- cartons individuels A4 ;
- planches A3 ;
- QR Code court par carton ;
- scanner QR de test en mode continu ;
- préparation de la base pour la vente, le retour, l'échange et le contrôle des cartons.

Avant d'utiliser les métadonnées V3 en production, appliquer `sql/supabase.sql` dans Supabase. Si ce SQL n'est pas encore appliqué, l'enregistrement des cartons reste compatible en mode minimal.


## Réglage micro / enceinte V3.1.7

La reconnaissance vocale se coupe automatiquement 1 seconde après l’acceptation d’un numéro, puis reprend. Le même numéro est aussi ignoré pendant 5 secondes pour éviter la reprise du son par l’enceinte.
