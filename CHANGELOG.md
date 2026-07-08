# V20 - Scanner carton géométrique

- Remplacement du mode OCR direct de saisie cartons par une V20 de test.
- Capture caméra avec cadre paysage.
- Découpe de la zone cadrée.
- Tentative de détection des coins/bords du carton.
- Redressement en canvas 900 x 300.
- Aucun OCR et aucun enregistrement Supabase dans cette version.

# Loto by SdS v3.4.3

## v3.4.3

- Ajout du bouton téléphone **Envoyer GRILLE TEST**.
- Envoi d’une grille 3 x 9 de test via `scan_queue`.
- Remplissage automatique du pseudo-carton côté administration.
- Conservation du QR et de la communication validés en v3.4.2.

# Loto by SdS v3.4.3

Corrections :
- QR import admin affiché en image intégrée base64 : plus de message “QR en préparation”.
- QR GitHub fixe vers scan.html?mode=saisie-cartons.
- Pseudo-carton forcé en 3 lignes x 9 colonnes.
- Communication scan_queue conservée.

# v3.4.3

- QR scan_queue genere en JavaScript, compatible local et GitHub Pages.
- URL du scanner affichee sous le QR.
- Etat telephone connecte via scan_queue.
- Test HELLO conserve.
- Pseudo-carton corrige en 3 lignes x 9 colonnes.
