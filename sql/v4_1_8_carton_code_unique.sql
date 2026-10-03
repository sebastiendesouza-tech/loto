-- À exécuter après avoir supprimé les doublons existants.
-- Empêche définitivement la création de deux cartons avec le même carton_code.
create unique index if not exists loto_cartons_carton_code_unique
on public.loto_cartons (carton_code)
where carton_code is not null and carton_code <> '';
