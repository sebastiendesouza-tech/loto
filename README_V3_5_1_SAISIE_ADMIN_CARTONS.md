# V3.5.1 - Saisie rapide des cartons dans Administration

La saisie rapide se trouve dans :

Administration > Cartons > Enregistrer / corriger un carton

## Fonctionnement

Saisir les 15 numéros ligne par ligne :

24.36.50.61.90
4.14.42.54.74
28.38.43.66.83

Ou les 15 numéros à la suite :

24.36.50.61.90.4.14.42.54.74.28.38.43.66.83

Le logiciel reconstruit automatiquement la grille 3 x 9 en insérant des 0 dans les cases vides.

Exemple enregistré :

0 0 24 36 0 50 61 0 90
4 14 0 0 42 54 0 74 0
0 0 28 38 43 0 66 0 83

## Contrôles

- 15 numéros exactement
- 5 numéros par ligne
- numéros entre 1 et 90
- aucun doublon
- lignes croissantes
- colonnes cohérentes selon les dizaines
- au moins un numéro par colonne
- colonnes croissantes de haut en bas

Le scan n'est pas utilisé pour cette saisie : il reste pour le commissaire.
