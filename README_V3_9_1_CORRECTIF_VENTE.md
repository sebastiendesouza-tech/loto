# Loto by SdS v3.9.1

Correctif du scanner de vente :

- les cartons generes par les anciennes versions sont acceptes, meme si leur champ `origine` est vide ou ancien ;
- la recherche se fait avec le code imprime dans le QR (`carton_code`) ;
- les cartons saisis ou importes restent refuses pour le suivi des ventes ;
- les messages distinguent un carton introuvable d'un carton importe.
