# V3.4.4 - OCR réel import cartons

- Ajout de la lecture OCR réelle de la grille depuis la caméra téléphone.
- La grille OCR est envoyée au PC via `scan_queue` avec le type `draft_grid`.
- L'identifiant est envoyé via `draft_identifier`.
- Les boutons TEST restent disponibles uniquement pour diagnostic.
- L'administration conserve la grille reçue même si l'identifiant arrive après.

# Loto by SdS v3.4.4

## v3.4.4

- Ajout du bouton téléphone **Envoyer GRILLE TEST**.
- Envoi d’une grille 3 x 9 de test via `scan_queue`.
- Remplissage automatique du pseudo-carton côté administration.
- Conservation du QR et de la communication validés en v3.4.2.

# Loto by SdS v3.4.4

Corrections :
- QR import admin affiché en image intégrée base64 : plus de message “QR en préparation”.
- QR GitHub fixe vers scan.html?mode=saisie-cartons.
- Pseudo-carton forcé en 3 lignes x 9 colonnes.
- Communication scan_queue conservée.

# v3.4.4

- QR scan_queue genere en JavaScript, compatible local et GitHub Pages.
- URL du scanner affichee sous le QR.
- Etat telephone connecte via scan_queue.
- Test HELLO conserve.
- Pseudo-carton corrige en 3 lignes x 9 colonnes.
