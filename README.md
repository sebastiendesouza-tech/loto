# Loto by SdS

Application web PWA pour l'animation d'un loto associatif.

Version : v3.2.9.

## Nouveautés principales

- Corrections de tirage côté animateur et commissaire.
- Commandes vocales de correction.
- Création de cartons depuis l'administration.
- Cartons individuels : 3 par A4.
- Planches : 6 cartons par A3.
- PDF de calibration impression.
- Scanner QR en mode continu.

## V3.2.3 - Cartons scannés à valider
- Le mode Scanner saisie cartons enregistre maintenant les cartons au statut À enregistrer.
- Dans Administration > Cartons, les cartons scannés peuvent être modifiés dans une grille 3 × 9 puis validés.
- La validation passe le carton en Validé / disponible.

## Scanner V3.2.1

Le scanner existant propose maintenant deux modes :

- **Scanner commissaire** : lecture QR / code-barres pour contrôle pendant le loto.
- **Scanner saisie cartons** : lecture du code carton, saisie manuelle de la grille, validation puis enregistrement Supabase.

Le scanner de saisie cartons ne bloque pas le fonctionnement du loto. Il sert à préparer ou corriger les cartons enregistrés.

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


## Réglage micro / enceinte V3.2.0

La reconnaissance vocale se coupe automatiquement 1 seconde après l’acceptation d’un numéro, puis reprend. Le même numéro est aussi ignoré pendant 5 secondes pour éviter la reprise du son par l’enceinte.

### v3.2.9 - Cartons et scan autonome
La création de cartons demande seulement l'ID association et le nombre de cartons. L'application calcule automatiquement le prochain numéro disponible pour cette association, vérifie les doublons d'identifiant et les doublons de grille, puis génère le PDF. La page `scan.html` est autonome et peut être ouverte directement par QR code.


### v3.2.9 - Scanner commissaire opérationnel

Le mode commissaire de `scan.html` contrôle automatiquement le carton dès lecture du QR, ferme la caméra, revient sur `commissaire.html` et publie le résultat sur l’affichage public.


### v3.2.9 - QR codes intégrés
Les QR codes de scan sont générés automatiquement depuis l'URL courante de l'application. Ils fonctionnent donc sur GitHub Pages et en local.
