create table if not exists public.loto_app_sessions (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.loto_app_sessions enable row level security;

drop policy if exists "loto_app_sessions_select" on public.loto_app_sessions;
drop policy if exists "loto_app_sessions_insert" on public.loto_app_sessions;
drop policy if exists "loto_app_sessions_update" on public.loto_app_sessions;

create policy "loto_app_sessions_select" on public.loto_app_sessions
for select to anon using (true);

create policy "loto_app_sessions_insert" on public.loto_app_sessions
for insert to anon with check (true);

create policy "loto_app_sessions_update" on public.loto_app_sessions
for update to anon using (true) with check (true);

alter publication supabase_realtime add table public.loto_app_sessions;
