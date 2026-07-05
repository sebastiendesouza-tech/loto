# Changelog

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
