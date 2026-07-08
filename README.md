# Loto by SdS v3.4.13

Corrections :
- QR import admin affiché en image intégrée base64 : plus de message “QR en préparation”.
- QR GitHub fixe vers scan.html?mode=saisie-cartons.
- Pseudo-carton forcé en 3 lignes x 9 colonnes.
- Communication scan_queue conservée.

Loto by SdS - v3.4.13

Version de stabilisation du module import par scan_queue.


## V3.4.11

- Ajout du bouton téléphone **Envoyer GRILLE TEST**.
- Envoi d’un message `draft_grid` dans `scan_queue`.
- Le pseudo-carton de l’administration se remplit avec une grille 3 x 9.
- Architecture `scan_queue` conservée.
