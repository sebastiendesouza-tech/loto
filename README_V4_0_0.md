# Loto by SdS v4.0.0

## Nouveautés

- Tableau de bord dynamique sur la page d'accueil : loto actif, date, parties, tirage, suivi des ventes, cartons de l'application et état de synchronisation.
- Contrôle d'intégrité informatif et non bloquant : doublons, QR codes, grilles, origines et cartons archivés.
- Nouveau cycle de génération des cartons :
  1. générer le PDF ;
  2. vérifier le PDF ;
  3. valider la génération pour enregistrer les cartons dans Supabase ;
  4. ou annuler sans créer de carton.

Aucune migration SQL supplémentaire n'est nécessaire par rapport à la v3.9.3.
