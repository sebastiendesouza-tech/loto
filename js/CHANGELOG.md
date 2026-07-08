V3.4.18 - OCR avec regles metier

- Suppression de la double lecture trop lente.
- Filtrage des chiffres parasites trop proches.
- Verrouillage d une ligne si 5 numeros strictement croissants sont lus.
- Conservation du verrouillage ligne par ligne et du scan de l identifiant.

# Changelog

## v3.4.17
- OCR import : verrouillage de ligne apres 2 lectures identiques.
- Conserve le verrouillage ligne par ligne.
- Evite le verrouillage trop rapide quand des chiffres sont coupes ou mal espaces.
- Workflow scan_queue inchange.
