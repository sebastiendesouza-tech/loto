# v3.4.13 - cadrage OCR stabilisé

- Reprise de la base v3.4.11 / v3.4.6.
- OCR grille lance uniquement quand le carton est détecté et stable dans le grand cadre.
- Grande zone conservée pour la grille.
- Petite zone utilisée uniquement pour l'identifiant.
- Identifiant alphanumérique avec / et - conservé.

# V3.4.11 - OCR fiable + identifiant alphanumérique

- Reprise de la V3.4.6 validée.
- OCR de grille conservé tel qu’il fonctionnait.
- Identifiant compatible chiffres, lettres, / et -.
- Aucun changement sur le remplissage des cases.

# V3.4.11 - OCR partiel progressif import cartons

- Envoi des numéros détectés au PC au fur et à mesure.
- Le pseudo-carton se remplit progressivement sans attendre les 15 numéros.
- Les cases manquantes peuvent être complétées à la main côté administration.
- Heartbeat téléphone rendu discret : le message connecté ne perturbe plus le scan.
- Bouton téléphone : Passer à l’identifiant après une grille partielle.

# V3.4.11 - OCR réel import cartons

- Ajout de la lecture OCR réelle de la grille depuis la caméra téléphone.
- La grille OCR est envoyée au PC via `scan_queue` avec le type `draft_grid`.
- L'identifiant est envoyé via `draft_identifier`.
- Les boutons TEST restent disponibles uniquement pour diagnostic.
- L'administration conserve la grille reçue même si l'identifiant arrive après.

# Loto by SdS v3.4.11

## v3.4.11

- Ajout du bouton téléphone **Envoyer GRILLE TEST**.
- Envoi d’une grille 3 x 9 de test via `scan_queue`.
- Remplissage automatique du pseudo-carton côté administration.
- Conservation du QR et de la communication validés en v3.4.2.

# Loto by SdS v3.4.11

Corrections :
- QR import admin affiché en image intégrée base64 : plus de message “QR en préparation”.
- QR GitHub fixe vers scan.html?mode=saisie-cartons.
- Pseudo-carton forcé en 3 lignes x 9 colonnes.
- Communication scan_queue conservée.

# v3.4.11

- QR scan_queue genere en JavaScript, compatible local et GitHub Pages.
- URL du scanner affichee sous le QR.
- Etat telephone connecte via scan_queue.
- Test HELLO conserve.
- Pseudo-carton corrige en 3 lignes x 9 colonnes.
