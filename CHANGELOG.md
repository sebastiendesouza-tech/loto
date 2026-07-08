# V3.3.6

- QR Administration intégré en base64 : plus d'image cassée.
- Brouillon affichable côté PC même si l'écriture table Supabase échoue.
- Synchronisation renforcée via session Supabase + polling 2 s + Realtime.
- Message diagnostic dans le pseudo-carton si la table `loto_cartons` n'est pas écrite.

# Changelog

## v3.3.6
- Pseudo carton vierge affiché dans Administration > Cartons.
- Champ identifiant du carton visible et vide avant scan.
- Après scan, le champ se remplit si QR/code-barres/numéro lu.
- Synchronisation renforcée via Supabase session + table cartons.
- Rafraîchissement automatique des brouillons côté administration.
- Messages téléphone ajoutés après chaque étape du scan.
