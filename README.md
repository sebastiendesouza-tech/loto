# LOTO SDS v2.0.0-dev

Application web GitHub Pages + Supabase pour le Comité des Fêtes.

## Installation

1. Copier tous les fichiers à la racine du dépôt GitHub `loto`.
2. Vérifier `config.js`.
3. Dans Supabase, exécuter `sql/supabase.sql`.
4. Activer Realtime sur `loto_app_sessions` et `loto_cartons` si nécessaire.
5. Ouvrir `https://sebastiendesouza-tech.github.io/loto/`.

## Pages

- `index.html` : accueil équipe.
- `public.html` : affichage public vidéoprojecteur.
- `animateur.html` : tablette animateur.
- `commissaire.html` : tablette commissaire.
- `joueur.html` : page libre pour les joueurs.
- `impressions.html` : PDF QR Code.
- `administration.html` : préparation du loto.

## PIN par défaut

`2580`, modifiable dans `config.js`.
