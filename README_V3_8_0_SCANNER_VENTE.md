# v3.8.0 - Scanner de vente sur téléphone

## Mise à jour Supabase obligatoire

Dans Supabase > SQL Editor, exécuter le fichier complet `sql/supabase.sql` afin de créer la table `loto_carton_movements` et d'activer son accès temps réel.

## Utilisation

1. Charger et lancer le loto dans Administration.
2. Cocher « Activer le suivi des cartons vendus pour ce loto ».
3. Ouvrir « Suivi des ventes » sur le PC ou la tablette.
4. Scanner avec le téléphone le QR code affiché.
5. Sur le téléphone, choisir Mode Vente ou Mode Retour, puis démarrer la caméra.
6. En fin de loto, utiliser « Libérer tous les cartons » depuis le tableau de suivi.

Seuls les cartons générés par Loto by SdS (`origine = Loto by SdS`) sont acceptés par le scanner de vente.
