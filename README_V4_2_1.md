# Loto by SdS v4.2.1

Correctif urgent du scanner Commissaire.

- La session Supabase est maintenant chargée avant toute ouverture de caméra ou tout contrôle de carton.
- Le bouton de scan reste désactivé tant que le loto actif n'est pas chargé.
- Le contrôle utilise donc les vrais numéros sortis et le dernier numéro du loto en cours.
- La page de scan ne peut plus sauvegarder un état vide et effacer le loto actif.
- Aucune modification SQL n'est nécessaire.
