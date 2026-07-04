# CHANGELOG

## v2.2.0-dev

### Ajouts
- Extraction des cartons historiques depuis `scripts.js`.
- Fichier `data/cartons-standard.json` intégré au projet.
- Administration > Cartons : import des cartons STANDARD dans Supabase.
- Administration > Cartons : compteur, suppression de série et test d’un carton.
- Le commissaire peut contrôler les cartons depuis la table `loto_cartons`.

### Note
- 1 999 cartons ont été extraits : série 101000 à 102999, avec le numéro 101311 absent dans le fichier source.

## v2.1.5-dev

### Corrections
- Micro PC plus reactif : traitement des resultats intermediaires sans attendre la fin complete de la phrase.
- Affichage public des 3 lots de la partie avec progression visuelle.
- Les lots deja gagnes sont estompes.
- Le lot en cours est mis en evidence.
- QR Code public reduit, sans URL longue affichee.
- Effet tableau lumineux : numeros non tires discrets, numeros tires allumes.

## v2.1.4-dev

### Corrections
- Correction du micro PC sur l'affichage public.
- La reconnaissance vocale traite maintenant correctement une annonce répétée dans une seule phrase : `le 22 le 22`.
- La reconnaissance vocale traite aussi les annonces répétées en deux résultats séparés.
- Meilleure reconnaissance des nombres français : vingt-deux, soixante-douze, quatre-vingt-dix, etc.
- Suppression de l'URL longue sous le QR Code public.
- QR Code public généré en image pour améliorer l'affichage sur GitHub Pages.

### Rappel de fonctionnement
- Le micro est géré uniquement sur le PC, depuis la page Affichage public.
- L'animateur ne pilote pas le micro.
- Le bouton Micro PC est vert quand le micro est arrêté et rouge quand il écoute.
