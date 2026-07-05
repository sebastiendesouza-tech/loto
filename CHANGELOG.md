
## v3.0.4 - Scanner iPhone
- Ajout d’un mode compatible iPhone/Safari pour le scanner QR.
- Ajout de diagnostics visibles : HTTPS, caméra, BarcodeDetector, navigateur.
- Affichage des erreurs caméra au lieu d’un bouton silencieux.
- Conservation du mode scan continu avec anti double lecture.

# Changelog

## v3.0.2 - Carton de référence
- Format du carton fixé autour de cases 20 x 20 mm pour jetons de 17 mm.
- Mise en page A4 individuel 2 ou 3 cartons par page.
- Mise en page A3 paysage pour planches de 6 cartons.
- Identifiants métiers au format SDS-00001-00000001 et SDSP-00001-000001.
- QR Code court : il contient uniquement le code du carton.


## v2.2.12 - Loto by SdS / corrections / préparation cartons

- Renommage de l'application : **Loto by SdS**.
- Ajout des corrections de tirage côté animateur et commissaire :
  - annuler le dernier numéro ;
  - annuler un numéro déjà sorti ;
  - remplacer un mauvais numéro par le bon.
- Ajout des commandes vocales de correction :
  - "annule le dernier numéro" ;
  - "annule le numéro ..." ;
  - "remplace ... par ...".
- Préparation V3 : création de cartons depuis l'administration.
- Impression de planches A4 de 6 cartons.
- QR Code par carton, prévu pour le futur scan continu.
- Enregistrement des cartons générés dans Supabase.

## v2.2.13 - Correction remplacement numéro
- Lorsqu'un numéro est remplacé, le nouveau numéro conserve la position du numéro corrigé dans l'historique du tirage.
- Le remplacement n'est plus affiché comme dernier numéro tiré.
- Un message de correction est diffusé sur les écrans synchronisés.


## v3.0.0 - Production cartons + scanner QR

- Séparation entre cartons individuels A4 et planches A3.
- Cartons individuels imprimables en 1, 2 ou 3 par page A4.
- Planches A3 de 6 cartons.
- Nouveau dessin de carton : cases adaptées aux jetons de 17 mm, gros numéro, petit numéro de contrôle, cases vides avec rectangle gris.
- QR Code court par carton, basé sur l'identifiant `C000001`.
- Page de test scanner QR en mode scan continu avec bip et mesure de lecture.
- Base Supabase préparée pour les métadonnées V3 : `carton_code`, `grille`, `sheet_code`, `sheet_position`, `qr_payload`, `status`, `origine`.


## v3.0.1
- Ajout d'un espace Scan séparé dans le menu principal.
- Simplification de la rubrique Cartons : nombre de cartons + type individuel/planche.
- Cartons individuels A4 : choix 2 ou 3 par feuille.
- Planches A3 : génération par lots de 6 cartons.
- Bouton Générer PDF / imprimer pour tester les sorties avant de figer le format.
