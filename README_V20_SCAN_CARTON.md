# V20 - Scan carton

Objectif de cette version : tester la lecture géométrique d'un carton avant toute tentative d'OCR.

## Ce qui est inclus

- Conservation de la base webapp existante.
- Conservation du mode commissaire.
- Mode `saisie_cartons` remplacé par un test scanner carton.
- Caméra téléphone.
- Bouton `Photographier le carton`.
- Image capturée affichée sous la caméra.
- 4 coins ajustables au doigt ou à la souris.
- Bouton `Redresser`.
- Résultat redressé en 900 x 300.
- Aucun OCR.
- Aucun enregistrement de numéros.

## Test

1. Ouvrir la page de scan en mode saisie cartons.
2. Cliquer sur `Démarrer caméra`.
3. Mettre le téléphone en paysage.
4. Cadrer tout le carton.
5. Cliquer sur `Photographier le carton`.
6. Ajuster les 4 coins si besoin.
7. Cliquer sur `Redresser`.
8. Vérifier si le carton redressé est propre.

Si le redressement est bon, la prochaine version pourra découper les 27 cases.
