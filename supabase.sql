create table if not exists public.loto_sessions (
  id text primary key,
  title text not null default 'Loto Comité des Fêtes',
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.loto_sessions enable row level security;

drop policy if exists "loto_sessions_select" on public.loto_sessions;
drop policy if exists "loto_sessions_insert" on public.loto_sessions;
drop policy if exists "loto_sessions_update" on public.loto_sessions;

drop policy if exists "loto_sessions_delete" on public.loto_sessions;

create policy "loto_sessions_select" on public.loto_sessions
for select to anon using (true);

create policy "loto_sessions_insert" on public.loto_sessions
for insert to anon with check (true);

create policy "loto_sessions_update" on public.loto_sessions
for update to anon using (true) with check (true);

-- Optionnel : garder les anciennes sessions. Suppression non autorisee par defaut.

-- Activer Realtime pour la table.
alter publication supabase_realtime add table public.loto_sessions;
