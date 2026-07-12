# Loto by SdS v4.1.1

## Bon de validation caisse

Le scanner vendeur reconnaît directement les QR codes au format :

`C:1;P4:0;P6:2;P8:0`

Les espaces et les minuscules sont acceptés. Chaque segment doit utiliser l'un des codes `C`, `P4`, `P6` ou `P8`, séparés par des points-virgules.

Après lecture, l'écran affiche le contenu du bon et le nombre total de cartons correspondant. La vente n'est enregistrée qu'après scan de tous les supports prévus et validation du panier.
