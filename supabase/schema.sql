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

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select lower(nullif(auth.jwt()->>'email', ''));
$$;

create or replace function public.is_current_user_member_row(target_auth_user_id uuid, target_email text)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
    and (
      target_auth_user_id = auth.uid()
      or (
        target_email is not null
        and public.current_auth_email() is not null
        and lower(target_email) = public.current_auth_email()
      )
    );
$$;

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members m
  where public.is_current_user_member_row(m.auth_user_id, m.email)
  order by case when m.auth_user_id = auth.uid() then 0 else 1 end
  limit 1;
$$;

create or replace function public.current_member_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.members m
  where m.id = public.current_member_id()
  limit 1;
$$;

create or replace function public.current_member_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.owner_id
  from public.members m
  where m.id = public.current_member_id()
  limit 1;
$$;

create or replace function public.current_member_is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(m.is_editor, false)
  from public.members m
  where m.id = public.current_member_id()
  limit 1;
$$;

create or replace function public.current_member_is_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(m.is_allowed, false)
  from public.members m
  where m.id = public.current_member_id()
  limit 1;
$$;

create or replace function public.current_member_is_admin()
returns boolean
language sql
stable
as $$
  select public.current_member_is_allowed() and public.current_member_role() = 'admin';
$$;

create or replace function public.current_member_is_owner_editor()
returns boolean
language sql
stable
as $$
  select public.current_member_is_allowed()
    and public.current_member_role() = 'owner'
    and public.current_member_is_editor();
$$;

create or replace function public.member_self_metadata_update_is_safe(
  target_id uuid,
  new_auth_user_id uuid,
  new_email text,
  new_is_allowed boolean,
  new_label text,
  new_first_name text,
  new_last_name text,
  new_role text,
  new_owner_id uuid,
  new_is_editor boolean,
  new_address text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_row public.members;
begin
  select *
  into current_row
  from public.members
  where id = target_id
  limit 1;

  if current_row.id is null then
    return false;
  end if;

  if not public.is_current_user_member_row(current_row.auth_user_id, current_row.email) then
    return false;
  end if;

  if new_auth_user_id is distinct from auth.uid() then
    return false;
  end if;

  if public.current_auth_email() is not null and lower(coalesce(new_email, '')) <> public.current_auth_email() then
    return false;
  end if;

  return new_is_allowed is not distinct from current_row.is_allowed
    and new_label is not distinct from current_row.label
    and new_first_name is not distinct from current_row.first_name
    and new_last_name is not distinct from current_row.last_name
    and new_role is not distinct from current_row.role
    and new_owner_id is not distinct from current_row.owner_id
    and new_is_editor is not distinct from current_row.is_editor
    and new_address is not distinct from current_row.address;
end;
$$;

create or replace function public.owner_editor_member_update_is_safe(
  target_id uuid,
  new_role text,
  new_is_allowed boolean
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_row public.members;
begin
  select *
  into current_row
  from public.members
  where id = target_id
  limit 1;

  if current_row.id is null then
    return false;
  end if;

  if current_row.role = 'admin' then
    return false;
  end if;

  return new_role <> 'admin'
    and new_is_allowed is not distinct from current_row.is_allowed;
end;
$$;

create or replace function public.auto_rental_price(
  calc_start_date timestamptz,
  calc_end_date timestamptz,
  calc_guest_count integer
)
returns numeric
language sql
stable
as $$
  select greatest(1, round(extract(epoch from (calc_end_date - calc_start_date)) / 86400.0))::numeric
    * greatest(calc_guest_count, 1)::numeric
    * 5::numeric;
$$;

create or replace function public.restricted_rental_insert_is_safe(
  new_start_date timestamptz,
  new_end_date timestamptz,
  new_guest_count integer,
  new_price numeric,
  new_status text,
  new_electricity_cost numeric,
  new_total_price numeric,
  new_actual_start_date timestamptz,
  new_actual_end_date timestamptz,
  new_is_paid boolean
)
returns boolean
language sql
stable
as $$
  select coalesce(new_status, '') = 'pending'
    and coalesce(new_is_paid, false) = false
    and new_price is not distinct from public.auto_rental_price(new_start_date, new_end_date, new_guest_count)
    and new_electricity_cost is null
    and new_total_price is null
    and (new_actual_start_date is null or new_actual_start_date = new_start_date)
    and (new_actual_end_date is null or new_actual_end_date = new_end_date);
$$;

create or replace function public.restricted_rental_update_is_safe(
  target_id uuid,
  new_start_date timestamptz,
  new_end_date timestamptz,
  new_guest_count integer,
  new_owner_id uuid,
  new_sub_member_id uuid,
  new_price numeric,
  new_status text,
  new_electricity_cost numeric,
  new_total_price numeric,
  new_actual_start_date timestamptz,
  new_actual_end_date timestamptz,
  new_is_paid boolean
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_row public.rentals;
  expected_price numeric;
begin
  select *
  into current_row
  from public.rentals
  where id = target_id
  limit 1;

  if current_row.id is null then
    return false;
  end if;

  expected_price := public.auto_rental_price(
    case
      when current_row.status = 'completed' then coalesce(new_actual_start_date, new_start_date)
      else new_start_date
    end,
    case
      when current_row.status = 'completed' then coalesce(new_actual_end_date, new_end_date)
      else new_end_date
    end,
    new_guest_count
  );

  return (
      new_price is not distinct from expected_price
      or (
        new_price is not distinct from current_row.price
        and new_start_date is not distinct from current_row.start_date
        and new_end_date is not distinct from current_row.end_date
        and new_guest_count is not distinct from current_row.guest_count
      )
    )
    and new_owner_id is not distinct from current_row.owner_id
    and new_sub_member_id is not distinct from current_row.sub_member_id
    and new_status is not distinct from current_row.status
    and new_electricity_cost is not distinct from current_row.electricity_cost
    and new_total_price is not distinct from current_row.total_price
    and new_actual_start_date is not distinct from current_row.actual_start_date
    and new_actual_end_date is not distinct from current_row.actual_end_date
    and new_is_paid is not distinct from current_row.is_paid;
end;
$$;

-- ------------------------------------------------------------
-- Nettoyage (optionnel "from scratch")
-- ------------------------------------------------------------
-- Commenter ce bloc si vous ne voulez pas supprimer les tables existantes.
drop table if exists public.rentals cascade;
drop table if exists public.members cascade;
drop table if exists public.user_notifications cascade;
drop table if exists public.push_subscriptions cascade;

-- ------------------------------------------------------------
-- Table: members
-- ------------------------------------------------------------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  is_allowed boolean not null default false,
  label text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  role text not null default 'sub_member' check (role in ('admin', 'owner', 'sub_member')),
  is_editor boolean not null default false,
  email text,
  auth_provider text,
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
create unique index members_auth_user_id_unique_idx on public.members(auth_user_id) where auth_user_id is not null;
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
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rentals_date_order_chk check (end_date > start_date)
);

create index rentals_start_date_idx on public.rentals(start_date);
create index rentals_end_date_idx on public.rentals(end_date);
create index rentals_owner_id_idx on public.rentals(owner_id);
create index rentals_sub_member_id_idx on public.rentals(sub_member_id);
create index rentals_status_idx on public.rentals(status);
create index rentals_is_paid_idx on public.rentals(is_paid);

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
-- Table: user_notifications
-- ------------------------------------------------------------
create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('rental_created', 'rental_confirmed', 'rental_rejected', 'rental_reminder', 'rental_completed', 'rental_deleted', 'rental_paid', 'request_pending', 'app_updated')),
  title text not null,
  body text not null,
  url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index user_notifications_user_id_idx
  on public.user_notifications(user_id);

create index user_notifications_user_id_created_at_idx
  on public.user_notifications(user_id, created_at desc);

create index user_notifications_user_id_is_read_idx
  on public.user_notifications(user_id, is_read);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.members enable row level security;
alter table public.rentals enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.user_notifications enable row level security;

create policy "members_select_allowed_users"
on public.members
for select
using (public.current_member_is_allowed());

create policy "members_select_own_bootstrap_row"
on public.members
for select
using (public.is_current_user_member_row(auth_user_id, email));

create policy "members_insert_own_bootstrap_row"
on public.members
for insert
with check (
  auth.role() = 'authenticated'
  and public.is_current_user_member_row(auth_user_id, email)
  and is_allowed = false
  and role = 'sub_member'
  and is_editor = false
  and owner_id is null
);

create policy "members_update_own_metadata"
on public.members
for update
using (public.is_current_user_member_row(auth_user_id, email))
with check (
  public.member_self_metadata_update_is_safe(
    id,
    auth_user_id,
    email,
    is_allowed,
    label,
    first_name,
    last_name,
    role,
    owner_id,
    is_editor,
    address
  )
);

create policy "members_admin_insert"
on public.members
for insert
with check (public.current_member_is_admin());

create policy "members_admin_update"
on public.members
for update
using (public.current_member_is_admin())
with check (public.current_member_is_admin());

create policy "members_admin_delete"
on public.members
for delete
using (public.current_member_is_admin());

create policy "members_owner_editor_insert_non_admin"
on public.members
for insert
with check (
  public.current_member_is_owner_editor()
  and role <> 'admin'
  and is_allowed = false
);

create policy "members_owner_editor_update_non_admin"
on public.members
for update
using (
  public.current_member_is_owner_editor()
  and role <> 'admin'
)
with check (
  public.current_member_is_owner_editor()
  and public.owner_editor_member_update_is_safe(id, role, is_allowed)
);

create policy "members_owner_editor_delete_non_admin"
on public.members
for delete
using (
  public.current_member_is_owner_editor()
  and role <> 'admin'
);

create policy "members_owner_insert_own_sub_member"
on public.members
for insert
with check (
  public.current_member_is_allowed()
  and public.current_member_role() = 'owner'
  and role = 'sub_member'
  and owner_id = public.current_member_id()
  and is_allowed = false
  and is_editor = false
);

create policy "rentals_select_allowed_users"
on public.rentals
for select
using (public.current_member_is_allowed());

create policy "rentals_admin_insert"
on public.rentals
for insert
with check (public.current_member_is_admin());

create policy "rentals_admin_update"
on public.rentals
for update
using (public.current_member_is_admin())
with check (public.current_member_is_admin());

create policy "rentals_admin_delete"
on public.rentals
for delete
using (public.current_member_is_admin());

create policy "rentals_owner_editor_insert_own_scope"
on public.rentals
for insert
with check (
  public.current_member_is_owner_editor()
);

create policy "rentals_owner_insert_own_scope"
on public.rentals
for insert
with check (
  public.current_member_is_allowed()
  and public.current_member_role() = 'owner'
  and not public.current_member_is_editor()
  and owner_id = public.current_member_id()
  and (
    sub_member_id is null
    or exists (
      select 1
      from public.members m
      where m.id = sub_member_id
      and m.role = 'sub_member'
      and m.owner_id = public.current_member_id()
    )
  )
  and public.restricted_rental_insert_is_safe(
    start_date,
    end_date,
    guest_count,
    price,
    status,
    electricity_cost,
    total_price,
    actual_start_date,
    actual_end_date,
    is_paid
  )
);

create policy "rentals_owner_editor_update_own_scope"
on public.rentals
for update
using (
  public.current_member_is_owner_editor()
)
with check (
  public.current_member_is_owner_editor()
);

create policy "rentals_owner_update_own_scope"
on public.rentals
for update
using (
  public.current_member_is_allowed()
  and public.current_member_role() = 'owner'
  and not public.current_member_is_editor()
  and owner_id = public.current_member_id()
)
with check (
  public.current_member_is_allowed()
  and public.current_member_role() = 'owner'
  and not public.current_member_is_editor()
  and owner_id = public.current_member_id()
  and public.restricted_rental_update_is_safe(
    id,
    start_date,
    end_date,
    guest_count,
    owner_id,
    sub_member_id,
    price,
    status,
    electricity_cost,
    total_price,
    actual_start_date,
    actual_end_date,
    is_paid
  )
);

create policy "rentals_owner_delete_own_scope"
on public.rentals
for delete
using (
  public.current_member_is_allowed()
  and public.current_member_role() = 'owner'
  and (
    public.current_member_is_editor()
    or owner_id = public.current_member_id()
  )
);

create policy "rentals_sub_member_insert_own_scope"
on public.rentals
for insert
with check (
  public.current_member_is_allowed()
  and public.current_member_role() = 'sub_member'
  and sub_member_id = public.current_member_id()
  and owner_id = public.current_member_owner_id()
  and public.restricted_rental_insert_is_safe(
    start_date,
    end_date,
    guest_count,
    price,
    status,
    electricity_cost,
    total_price,
    actual_start_date,
    actual_end_date,
    is_paid
  )
);

create policy "rentals_sub_member_update_own_scope"
on public.rentals
for update
using (
  public.current_member_is_allowed()
  and public.current_member_role() = 'sub_member'
  and sub_member_id = public.current_member_id()
)
with check (
  public.current_member_is_allowed()
  and public.current_member_role() = 'sub_member'
  and sub_member_id = public.current_member_id()
  and owner_id = public.current_member_owner_id()
  and public.restricted_rental_update_is_safe(
    id,
    start_date,
    end_date,
    guest_count,
    owner_id,
    sub_member_id,
    price,
    status,
    electricity_cost,
    total_price,
    actual_start_date,
    actual_end_date,
    is_paid
  )
);

create policy "rentals_sub_member_delete_own_scope"
on public.rentals
for delete
using (
  public.current_member_is_allowed()
  and public.current_member_role() = 'sub_member'
  and sub_member_id = public.current_member_id()
);

create policy "Users manage own allowed subscriptions"
on public.push_subscriptions
for all
using (
  auth.uid() = user_id
  and public.current_member_is_allowed()
)
with check (
  auth.uid() = user_id
  and public.current_member_is_allowed()
);

create policy "Users read own allowed notifications"
on public.user_notifications
for select
using (
  auth.uid() = user_id
  and public.current_member_is_allowed()
);

create policy "Users update own allowed notifications"
on public.user_notifications
for update
using (
  auth.uid() = user_id
  and public.current_member_is_allowed()
)
with check (
  auth.uid() = user_id
  and public.current_member_is_allowed()
);

create policy "Users delete own allowed notifications"
on public.user_notifications
for delete
using (
  auth.uid() = user_id
  and public.current_member_is_allowed()
);

-- ------------------------------------------------------------
-- Table: public_page (singleton — contenu de la page publique)
-- ------------------------------------------------------------
drop table if exists public.public_page_images cascade;
drop table if exists public.public_page cascade;

create table public.public_page (
  id integer primary key default 1 check (id = 1),
  title text not null default 'La Petite Maison',
  subtitle text,
  description text,
  practical_info text,
  updated_at timestamptz not null default now()
);

create trigger trg_public_page_set_updated_at
before update on public.public_page
for each row
execute function public.set_updated_at();

-- Seed du singleton
insert into public.public_page (id, title)
values (1, 'La Petite Maison')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Table: public_page_images
-- ------------------------------------------------------------
create table public.public_page_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index public_page_images_position_idx
  on public.public_page_images(position);

-- ------------------------------------------------------------
-- Storage: bucket public-page-images
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('public-page-images', 'public-page-images', true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- RLS: public_page + public_page_images
-- ------------------------------------------------------------
alter table public.public_page enable row level security;
alter table public.public_page_images enable row level security;

create policy "public_page_select_all"
  on public.public_page for select
  using (true);

create policy "public_page_update_owners"
  on public.public_page for update
  using (
    public.current_member_is_allowed()
    and exists (
      select 1 from public.members m
      where m.id = public.current_member_id()
      and m.role in ('admin', 'owner')
    )
  )
  with check (
    public.current_member_is_allowed()
    and exists (
      select 1 from public.members m
      where m.id = public.current_member_id()
      and m.role in ('admin', 'owner')
    )
  );

create policy "public_page_images_select_all"
  on public.public_page_images for select
  using (true);

create policy "public_page_images_insert_owners"
  on public.public_page_images for insert
  with check (
    public.current_member_is_allowed()
    and exists (
      select 1 from public.members m
      where m.id = public.current_member_id()
      and m.role in ('admin', 'owner')
    )
  );

create policy "public_page_images_delete_owners"
  on public.public_page_images for delete
  using (
    public.current_member_is_allowed()
    and exists (
      select 1 from public.members m
      where m.id = public.current_member_id()
      and m.role in ('admin', 'owner')
    )
  );

create policy "public_page_images_update_owners"
  on public.public_page_images for update
  using (
    public.current_member_is_allowed()
    and exists (
      select 1 from public.members m
      where m.id = public.current_member_id()
      and m.role in ('admin', 'owner')
    )
  )
  with check (
    public.current_member_is_allowed()
    and exists (
      select 1 from public.members m
      where m.id = public.current_member_id()
      and m.role in ('admin', 'owner')
    )
  );

-- ------------------------------------------------------------
-- Storage policies: public-page-images
-- ------------------------------------------------------------
create policy "Public page images accessible to all"
  on storage.objects for select
  using (bucket_id = 'public-page-images');

create policy "Owners can upload public page images"
  on storage.objects for insert
  with check (
    bucket_id = 'public-page-images'
    and public.current_member_is_allowed()
    and exists (
      select 1 from public.members m
      where m.id = public.current_member_id()
      and m.role in ('admin', 'owner')
    )
  );

create policy "Owners can delete public page images"
  on storage.objects for delete
  using (
    bucket_id = 'public-page-images'
    and public.current_member_is_allowed()
    and exists (
      select 1 from public.members m
      where m.id = public.current_member_id()
      and m.role in ('admin', 'owner')
    )
  );

commit;

-- Migration disponible: supabase/migrations/20260225_add_last_login.sql
-- SQL utile pour une base existante:
-- ALTER TABLE public.members ADD COLUMN IF NOT EXISTS last_login timestamptz;
-- ALTER TABLE public.members ADD COLUMN IF NOT EXISTS auth_user_id uuid references auth.users(id) on delete set null;
-- CREATE UNIQUE INDEX IF NOT EXISTS members_auth_user_id_unique_idx ON public.members(auth_user_id) WHERE auth_user_id is not null;
