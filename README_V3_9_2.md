# Loto by SdS v3.9.2

Exécuter `sql/supabase.sql` dans Supabase SQL Editor avant les tests.

Le script ajoute `generated_by_app` à `loto_cartons` et classe automatiquement les données existantes :
- `origine = Loto by SdS` : carton généré par l’application ;
- toutes les autres origines : carton importé ou saisi.

Les nouvelles créations enregistrent directement ce champ.
