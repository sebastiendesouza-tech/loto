## v3.3.7 - Import cartons : inbox Supabase global

- Ajout d'une inbox Supabase globale `IMPORT_CARTONS_INBOX` pour transmettre les brouillons du téléphone vers le PC.
- L'administration lit maintenant cette inbox en Realtime et par relecture de secours.
- Le scan téléphone conserve les messages après envoi.
- Version v3.3.7.

# Changelog

## v3.3.5
- Pseudo carton vierge affiché dans Administration > Cartons.
- Champ identifiant du carton visible et vide avant scan.
- Après scan, le champ se remplit si QR/code-barres/numéro lu.
- Synchronisation renforcée via Supabase session + table cartons.
- Rafraîchissement automatique des brouillons côté administration.
- Messages téléphone ajoutés après chaque étape du scan.
