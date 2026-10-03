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
  carton_code text unique,
  serie text default 'STANDARD',
  lignes jsonb not null,
  grille jsonb,
  sheet_code text,
  sheet_position integer,
  qr_payload text,
  status text default 'disponible',
  origine text default 'Loto by SdS',
  actif boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.loto_cartons add column if not exists carton_code text;
alter table public.loto_cartons add column if not exists grille jsonb;
alter table public.loto_cartons add column if not exists sheet_code text;
alter table public.loto_cartons add column if not exists sheet_position integer;
alter table public.loto_cartons add column if not exists support_type varchar(3) not null default 'C';
alter table public.loto_cartons add column if not exists qr_payload text;
alter table public.loto_cartons add column if not exists status text default 'disponible';
alter table public.loto_cartons add column if not exists origine text default 'Loto by SdS';
alter table public.loto_cartons add column if not exists updated_at timestamptz default now();

create index if not exists loto_cartons_carton_code_idx on public.loto_cartons(carton_code);
create index if not exists loto_cartons_sheet_code_idx on public.loto_cartons(sheet_code);
create index if not exists loto_cartons_status_idx on public.loto_cartons(status);

alter table public.loto_cartons enable row level security;

drop policy if exists "loto_cartons_select" on public.loto_cartons;
drop policy if exists "loto_cartons_insert" on public.loto_cartons;
drop policy if exists "loto_cartons_update" on public.loto_cartons;
drop policy if exists "loto_cartons_delete" on public.loto_cartons;

create policy "loto_cartons_select" on public.loto_cartons for select to anon using (true);
create policy "loto_cartons_insert" on public.loto_cartons for insert to anon with check (true);
create policy "loto_cartons_update" on public.loto_cartons for update to anon using (true) with check (true);
create policy "loto_cartons_delete" on public.loto_cartons for delete to anon using (true);

-- Ajout Realtime idempotent : évite l'erreur si la table est déjà publiée.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'loto_app_sessions'
  ) then
    execute 'alter publication supabase_realtime add table public.loto_app_sessions';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'loto_cartons'
  ) then
    execute 'alter publication supabase_realtime add table public.loto_cartons';
  end if;
end $$;


-- V3.2.0 - suivi optionnel des cartons vendus par loto
alter table public.loto_cartons add column if not exists association_id text;
alter table public.loto_cartons add column if not exists sale_loto_id text;
alter table public.loto_cartons add column if not exists sold_at timestamptz;
alter table public.loto_cartons add column if not exists sold_by text;
alter table public.loto_cartons add column if not exists ocr_quality integer;

create table if not exists public.loto_carton_sales (
  loto_id text not null,
  loto_title text,
  numero integer not null,
  carton_code text,
  seller text,
  status text default 'vendu',
  sold_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (loto_id, numero)
);

alter table public.loto_carton_sales enable row level security;

drop policy if exists "loto_carton_sales_select" on public.loto_carton_sales;
drop policy if exists "loto_carton_sales_insert" on public.loto_carton_sales;
drop policy if exists "loto_carton_sales_update" on public.loto_carton_sales;
drop policy if exists "loto_carton_sales_delete" on public.loto_carton_sales;

create policy "loto_carton_sales_select" on public.loto_carton_sales for select to anon using (true);
create policy "loto_carton_sales_insert" on public.loto_carton_sales for insert to anon with check (true);
create policy "loto_carton_sales_update" on public.loto_carton_sales for update to anon using (true) with check (true);
create policy "loto_carton_sales_delete" on public.loto_carton_sales for delete to anon using (true);

create index if not exists loto_carton_sales_loto_idx on public.loto_carton_sales(loto_id);
create index if not exists loto_carton_sales_numero_idx on public.loto_carton_sales(numero);

-- Ajout Realtime idempotent : évite l'erreur si la table est déjà publiée.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'loto_carton_sales'
  ) then
    execute 'alter publication supabase_realtime add table public.loto_carton_sales';
  end if;
end $$;

-- V3.2.4 - creation cartons simplifiee et anti-doublons
alter table public.loto_cartons add column if not exists card_order integer;
alter table public.loto_cartons add column if not exists numbers_signature text;
create index if not exists loto_cartons_association_order_idx on public.loto_cartons(association_id, card_order);
create unique index if not exists loto_cartons_numbers_signature_uidx on public.loto_cartons(numbers_signature) where numbers_signature is not null;

-- v3.2.6 - texte OCR brut pour diagnostic saisie cartons
alter table public.loto_cartons add column if not exists ocr_text text;


-- v3.2.7 - identification des cartons importes
alter table public.loto_cartons add column if not exists external_code text;
alter table public.loto_cartons add column if not exists external_code_type text;
alter table public.loto_cartons add column if not exists external_ocr_quality integer;
create unique index if not exists loto_cartons_external_code_uidx on public.loto_cartons(external_code) where external_code is not null;
create index if not exists loto_cartons_qr_payload_idx on public.loto_cartons(qr_payload);

-- v3.8.0 - historique permanent des ventes et retours
create table if not exists public.loto_carton_movements (
  id bigint generated by default as identity primary key,
  loto_id text not null,
  loto_title text,
  numero integer not null,
  carton_code text,
  action text not null check (action in ('vente','retour')),
  source text default 'scanner',
  created_at timestamptz not null default now()
);
create index if not exists loto_carton_movements_loto_idx on public.loto_carton_movements(loto_id);
create index if not exists loto_carton_movements_numero_idx on public.loto_carton_movements(numero);
alter table public.loto_carton_movements enable row level security;
drop policy if exists "loto_carton_movements_select" on public.loto_carton_movements;
drop policy if exists "loto_carton_movements_insert" on public.loto_carton_movements;
create policy "loto_carton_movements_select" on public.loto_carton_movements for select to anon using (true);
create policy "loto_carton_movements_insert" on public.loto_carton_movements for insert to anon with check (true);
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loto_carton_movements'
  ) then
    execute 'alter publication supabase_realtime add table public.loto_carton_movements';
  end if;
end $$;
