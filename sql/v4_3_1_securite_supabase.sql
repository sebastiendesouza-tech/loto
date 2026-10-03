-- V4.3.1 : protection de la base publique.
-- À exécuter dans Supabase > SQL Editor, après avoir créé les comptes équipe
-- dans Authentication > Users. Remplace les deux adresses ci-dessous.

create table if not exists public.loto_team_users (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Remplacer ces adresses par celles du PC principal, de l'animateur
-- et du commissaire, puis relancer uniquement ces INSERT si nécessaire.
insert into public.loto_team_users (email) values
  ('pc-principal@example.com'),
  ('animateur@example.com'),
  ('commissaire@example.com')
on conflict (email) do nothing;

create or replace function public.loto_is_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.loto_team_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- La page joueur garde l'accès anonyme, uniquement pour lire l'état du tirage.
drop policy if exists "loto_app_sessions_select" on public.loto_app_sessions;
drop policy if exists "loto_app_sessions_insert" on public.loto_app_sessions;
drop policy if exists "loto_app_sessions_update" on public.loto_app_sessions;
create policy "loto_app_sessions_select" on public.loto_app_sessions for select to anon, authenticated using (true);
create policy "loto_app_sessions_insert_team" on public.loto_app_sessions for insert to authenticated with check (public.loto_is_team());
create policy "loto_app_sessions_update_team" on public.loto_app_sessions for update to authenticated using (public.loto_is_team()) with check (public.loto_is_team());

-- Cartons, ventes et mouvements : jamais accessibles à un joueur anonyme.
drop policy if exists "loto_cartons_select" on public.loto_cartons;
drop policy if exists "loto_cartons_insert" on public.loto_cartons;
drop policy if exists "loto_cartons_update" on public.loto_cartons;
drop policy if exists "loto_cartons_delete" on public.loto_cartons;
create policy "loto_cartons_team_select" on public.loto_cartons for select to authenticated using (public.loto_is_team());
create policy "loto_cartons_team_insert" on public.loto_cartons for insert to authenticated with check (public.loto_is_team());
create policy "loto_cartons_team_update" on public.loto_cartons for update to authenticated using (public.loto_is_team()) with check (public.loto_is_team());
create policy "loto_cartons_team_delete" on public.loto_cartons for delete to authenticated using (public.loto_is_team());

drop policy if exists "loto_carton_sales_select" on public.loto_carton_sales;
drop policy if exists "loto_carton_sales_insert" on public.loto_carton_sales;
drop policy if exists "loto_carton_sales_update" on public.loto_carton_sales;
drop policy if exists "loto_carton_sales_delete" on public.loto_carton_sales;
create policy "loto_carton_sales_team_select" on public.loto_carton_sales for select to authenticated using (public.loto_is_team());
create policy "loto_carton_sales_team_insert" on public.loto_carton_sales for insert to authenticated with check (public.loto_is_team());
create policy "loto_carton_sales_team_update" on public.loto_carton_sales for update to authenticated using (public.loto_is_team()) with check (public.loto_is_team());
create policy "loto_carton_sales_team_delete" on public.loto_carton_sales for delete to authenticated using (public.loto_is_team());

drop policy if exists "loto_carton_movements_select" on public.loto_carton_movements;
drop policy if exists "loto_carton_movements_insert" on public.loto_carton_movements;
create policy "loto_carton_movements_team_select" on public.loto_carton_movements for select to authenticated using (public.loto_is_team());
create policy "loto_carton_movements_team_insert" on public.loto_carton_movements for insert to authenticated with check (public.loto_is_team());

revoke all on public.loto_team_users from anon, authenticated;
grant execute on function public.loto_is_team() to anon, authenticated;
