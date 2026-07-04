# CHANGELOG - LOTO SDS

## v2.0.6-dev
- Correctif affichage public : les 90 numéros restent visibles.
- Correctif page joueur : grille adaptée téléphone en portrait et paysage.
- Suppression de l'effet de rognage qui limitait l'affichage à une partie des numéros.

## v2.0.5-dev
- Administration des parties corrigée : chaque partie possède maintenant un mode de jeu (`À la ligne` ou `Au carton plein`).
- Les lots sont désormais saisis comme `Lot 1`, `Lot 2`, `Lot 3`.
- Suppression de la logique fixe `Ligne / Deux lignes / Carton plein` dans la préparation des lots.
- Affichage du mode de jeu sur l'écran animateur et sur l'affichage public.

## v2.0.4-dev
- Ajout de l'icône PWA pour tablette et ajout à l'écran d'accueil.
- Ajout du fichier `manifest.json`.
- Administration enrichie : nom du loto, date, nombre de parties, lots ligne / deux lignes / carton plein.
- Options Bingo : activation et affichage public.
- Mode simulation : tirage automatique toutes les X secondes pour tests et formation.
- Affichage public : bandeau lot en cours si l'option d'affichage des lots est activée.
- Animateur : boutons `Gagnant` et `Lot suivant`.
- Bingo : ajout automatique d'un numéro Bingo à chaque numéro validé si l'option est activée.

## v2.0.3-dev
- Stabilisation de la grille animateur compacte.
- 90 numéros visibles.

## v2.0.0-dev
- Socle GitHub Pages + Supabase.
