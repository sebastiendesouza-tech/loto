# Loto by SdS v3.9.3

Cette version corrige la détection des cartons créés par l’application.

## Règle utilisée

Un carton est considéré comme généré par l’application uniquement lorsque :

```text
origine = Loto by SdS
```

Le champ `generated_by_app` n’est plus utilisé ni requis.

## Éléments corrigés

- scanner Vente ;
- statistiques de l’onglet Vente ;
- création des cartons ;
- réimpression ;
- archivage et restauration.

Aucune modification SQL supplémentaire n’est nécessaire si la colonne `origine` existe déjà.
