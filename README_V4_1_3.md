# V4.1.3 — Correctif lecture du bon de validation

- Lecture tolérante du QR caisse `C:1;P4:0;P6:2;P8:0`.
- Accepte espaces, retours à la ligne, `;`, virgules, barres verticales, caractères `:`/`;` Unicode et contenu URL-encodé.
- Accepte également un préfixe descriptif tel que `BON DE VALIDATION`.
- En cas de refus, le scanner affiche le contenu réellement lu afin de faciliter le diagnostic.
