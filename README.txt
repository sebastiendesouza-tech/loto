LOTO Comité des Fêtes - V2 GitHub Pages + Supabase

OBJECTIF
- Une seule adresse web GitHub Pages.
- PC : affichage public + reconnaissance vocale si autorisée.
- Tablette animateur : micro ON/OFF, tirage manuel, annulation, nouvelle partie.
- Tablette commissaire : contrôle des cartons et affichage public.
- Synchronisation en temps réel par Supabase.

1) SUPABASE
Dans Supabase > SQL Editor :
- ouvrir un nouveau script
- copier/coller sql/supabase.sql
- cliquer Run

Si Supabase affiche que la table est déjà dans supabase_realtime, ce n'est pas bloquant.

2) GITHUB
Mettre tous les fichiers de ce dossier à la racine du dépôt GitHub loto :
- index.html
- public.html
- animateur.html
- commissaire.html
- config.js
- css/
- js/
- sql/
- README.txt

Puis attendre que GitHub Pages republie le site.

3) UTILISATION
Sur le PC vidéoprojecteur :
- ouvrir https://sebastiendesouza-tech.github.io/loto/
- saisir ou générer un code session
- choisir Affichage public
- cliquer une fois sur Autoriser micro PC si reconnaissance vocale souhaitée

Sur la tablette animateur :
- même adresse
- même code session
- choisir Animateur

Sur la tablette commissaire :
- même adresse
- même code session
- choisir Commissaire

4) REGLE VOCALE
- Le numéro doit être dit deux fois.
- Exemple : "le 22" puis "le 22".
- Après double annonce, le numéro passe en prévalidation.
- Il est validé automatiquement après quelques secondes.
- Le mot "erreur" annule la saisie vocale en attente ou le numéro prévalidé.
- "annuler dernier" retire le dernier numéro validé.
- "fermer affichage carton" ferme l'affichage public des cartons.

5) LIMITATION MICRO
Le micro du PC ne peut pas être activé à distance sans autorisation locale du navigateur.
Il faut donc cliquer une fois sur Autoriser micro PC sur l'affichage public.
Ensuite la tablette animateur peut demander Micro actif / inactif.
