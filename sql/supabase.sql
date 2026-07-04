create table if not exists public.loto_app_sessions (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.loto_app_sessions enable row level security;

drop policy if exists "loto_app_sessions_select" on public.loto_app_sessions;
drop policy if exists "loto_app_sessions_insert" on public.loto_app_sessions;
drop policy if exists "loto_app_sessions_update" on public.loto_app_sessions;

create policy "loto_app_sessions_select" on public.loto_app_sessions for select to anon using (true);
create policy "loto_app_sessions_insert" on public.loto_app_sessions for insert to anon with check (true);
create policy "loto_app_sessions_update" on public.loto_app_sessions for update to anon using (true) with check (true);

create table if not exists public.loto_cartons (
  numero integer primary key,
  serie text default 'STANDARD',
  lignes jsonb not null,
  actif boolean default true,
  created_at timestamptz default now()
);

alter table public.loto_cartons enable row level security;

drop policy if exists "loto_cartons_select" on public.loto_cartons;
drop policy if exists "loto_cartons_insert" on public.loto_cartons;
drop policy if exists "loto_cartons_update" on public.loto_cartons;
drop policy if exists "loto_cartons_delete" on public.loto_cartons;

create policy "loto_cartons_select" on public.loto_cartons for select to anon using (true);
create policy "loto_cartons_insert" on public.loto_cartons for insert to anon with check (true);
create policy "loto_cartons_update" on public.loto_cartons for update to anon using (true) with check (true);
create policy "loto_cartons_delete" on public.loto_cartons for delete to anon using (true);

-- Si cette ligne provoque une erreur parce que la table est déjà dans Realtime, ce n'est pas bloquant.
alter publication supabase_realtime add table public.loto_app_sessions;
alter publication supabase_realtime add table public.loto_cartons;
