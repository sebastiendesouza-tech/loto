# V4.1.0 — Bon de validation optionnel

- Option par loto : utiliser ou non un bon de validation provenant de la caisse.
- Sans bon : vente directe identique aux versions précédentes.
- Avec bon : scan du bon, scan des supports, contrôle C/P4/P6/P8, puis validation du panier.
- Le mode retour reste direct.
- Le générateur enregistre `support_type` : C, P4, P6 ou P8.
- `sheet_code` continue d’identifier les cartons appartenant à une même planche.

Format du QR du bon : `C:2;P4:1;P6:2;P8:0`. Les éléments à zéro peuvent être omis.
