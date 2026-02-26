-- ============================================================
-- La Petite Maison - Schema SQL (from scratch)
-- Compatible Supabase / PostgreSQL
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Fonction utilitaire: met à jour updated_at automatiquement
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Nettoyage (optionnel "from scratch")
-- ------------------------------------------------------------
-- Commenter ce bloc si vous ne voulez pas supprimer les tables existantes.
drop table if exists public.rentals cascade;
drop table if exists public.members cascade;
drop table if exists public.push_subscriptions cascade;

-- ------------------------------------------------------------
-- Table: members
-- ------------------------------------------------------------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  is_allowed boolean not null default false,
  label text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  role text not null default 'sub_member' check (role in ('admin', 'owner', 'sub_member')),
  is_editor boolean not null default false,
  email text,
  avatar_url text,
  address text,
  last_login timestamptz,
  owner_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_allow_requires_profile_chk check (
    is_allowed = false
    or (
      length(trim(label)) > 0
      and length(trim(first_name)) > 0
      and length(trim(last_name)) > 0
    )
  )
);

create index members_last_name_idx on public.members(last_name);
create index members_role_idx on public.members(role);
create index members_owner_id_idx on public.members(owner_id);
create index members_is_allowed_idx on public.members(is_allowed);
create unique index members_email_unique_idx on public.members(lower(email)) where email is not null;

create trigger trg_members_set_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Table: rentals
-- ------------------------------------------------------------
create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  start_date timestamptz not null,
  end_date timestamptz not null,
  owner_id uuid not null references public.members(id) on delete restrict,
  sub_member_id uuid references public.members(id) on delete set null,
  guest_count integer not null default 1 check (guest_count >= 1),
  price numeric(10,2) not null default 0 check (price >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'completed')),
  notes text,
  electricity_cost numeric,
  total_price numeric(10,2),
  actual_start_date timestamptz,
  actual_end_date   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rentals_date_order_chk check (end_date > start_date)
);

create index rentals_start_date_idx on public.rentals(start_date);
create index rentals_end_date_idx on public.rentals(end_date);
create index rentals_owner_id_idx on public.rentals(owner_id);
create index rentals_sub_member_id_idx on public.rentals(sub_member_id);
create index rentals_status_idx on public.rentals(status);

create trigger trg_rentals_set_updated_at
before update on public.rentals
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Table: push_subscriptions
-- ------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.members enable row level security;
alter table public.rentals enable row level security;
alter table public.push_subscriptions enable row level security;

-- Policies minimales de démarrage:
-- - utilisateur authentifié: CRUD complet
-- - adapter ensuite selon votre modèle de sécurité métier

create policy "members_select_authenticated"
on public.members
for select
using (auth.role() = 'authenticated');

create policy "members_insert_authenticated"
on public.members
for insert
with check (auth.role() = 'authenticated');

create policy "members_update_authenticated"
on public.members
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "members_delete_authenticated"
on public.members
for delete
using (auth.role() = 'authenticated');

create policy "rentals_select_authenticated"
on public.rentals
for select
using (auth.role() = 'authenticated');

create policy "rentals_insert_authenticated"
on public.rentals
for insert
with check (auth.role() = 'authenticated');

create policy "rentals_update_authenticated"
on public.rentals
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "rentals_delete_authenticated"
on public.rentals
for delete
using (auth.role() = 'authenticated');

create policy "Users manage own subscriptions"
on public.push_subscriptions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

commit;

-- Migration disponible: supabase/migrations/20260225_add_last_login.sql
-- SQL utile pour une base existante:
-- ALTER TABLE public.members ADD COLUMN IF NOT EXISTS last_login timestamptz;
