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

create or replace function public.financial_payment_date_from_notes(note_text text)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  match_parts text[];
  candidate_date date;
  payment_date date;
begin
  for match_parts in
    select regexp_matches(
      coalesce(note_text, ''),
      'Payé le ([0-9]{2}/[0-9]{2}/[0-9]{4})',
      'g'
    )
  loop
    begin
      candidate_date := to_date(match_parts[1], 'DD/MM/YYYY');
      if to_char(candidate_date, 'DD/MM/YYYY') = match_parts[1] then
        payment_date := candidate_date;
      end if;
    exception
      when datetime_field_overflow or invalid_datetime_format then
        null;
    end;
  end loop;

  return payment_date;
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
drop table if exists public.financial_transactions cascade;
drop table if exists public.owner_contribution_schedules cascade;
drop table if exists public.financial_categories cascade;
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
  last_inactive_reminder_at timestamptz,
  owner_id uuid references public.members(id) on delete set null,
  email_notifications_enabled boolean not null default false,
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
create index members_last_inactive_reminder_at_idx on public.members(last_inactive_reminder_at);
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
-- Finances
-- ------------------------------------------------------------
create table public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  name text not null check (length(trim(name)) > 0),
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, transaction_type)
);

create unique index financial_categories_name_unique_idx
  on public.financial_categories(transaction_type, lower(name));

create table public.owner_contribution_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.members(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  frequency text not null check (frequency in ('monthly', 'quarterly', 'annual')),
  start_date date not null,
  end_date date not null,
  payment_day smallint not null default 1 check (payment_day between 1 and 31),
  is_active boolean not null default true,
  deactivated_at date,
  created_by_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owner_contribution_schedules_date_order_chk check (end_date >= start_date)
);

create index owner_contribution_schedules_owner_idx
  on public.owner_contribution_schedules(owner_id, start_date, end_date);

create or replace function public.prevent_overlapping_owner_contribution_schedules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.owner_id::text));

  if new.is_active and exists (
    select 1
    from public.owner_contribution_schedules existing
    where existing.owner_id = new.owner_id
      and existing.id <> new.id
      and daterange(
        existing.start_date,
        case when existing.is_active then existing.end_date else coalesce(existing.deactivated_at, existing.end_date) end,
        '[]'
      ) && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'Ce propriétaire a déjà une configuration de versements active sur cette période.';
  end if;

  return new;
end;
$$;

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  amount numeric(12, 2) not null,
  transaction_date date,
  category_id uuid not null,
  description text not null default '',
  source text not null default 'manual' check (source in ('manual', 'rental')),
  owner_id uuid references public.members(id) on delete set null,
  rental_id uuid references public.rentals(id) on delete set null,
  rental_component text,
  contribution_schedule_id uuid references public.owner_contribution_schedules(id) on delete restrict,
  contribution_due_date date,
  recorded_by_member_id uuid references public.members(id) on delete set null,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_transactions_category_type_fk
    foreign key (category_id, transaction_type)
    references public.financial_categories(id, transaction_type)
    on update restrict
    on delete restrict,
  constraint financial_transactions_amount_chk
    check (amount >= 0 and (amount > 0 or source = 'rental')),
  constraint financial_transactions_date_chk
    check (source = 'rental' or transaction_date is not null),
  constraint financial_transactions_source_link_chk
    check (
      (
        source = 'rental'
        and transaction_type = 'income'
        and rental_component is not null
        and rental_component in ('rent', 'electricity')
        and contribution_schedule_id is null
        and contribution_due_date is null
      )
      or (
        source = 'manual'
        and rental_id is null
        and rental_component is null
        and ((contribution_schedule_id is null) = (contribution_due_date is null))
        and (contribution_schedule_id is null or transaction_type = 'income')
      )
    )
);

create index financial_transactions_date_idx
  on public.financial_transactions(transaction_date)
  where voided_at is null;
create index financial_transactions_category_idx
  on public.financial_transactions(category_id);
create index financial_transactions_rental_idx
  on public.financial_transactions(rental_id)
  where rental_id is not null;
create unique index financial_transactions_active_rental_component_unique_idx
  on public.financial_transactions(rental_id, rental_component)
  where source = 'rental'
    and rental_id is not null
    and rental_component is not null
    and voided_at is null;
create unique index financial_transactions_active_contribution_unique_idx
  on public.financial_transactions(contribution_schedule_id, contribution_due_date)
  where source = 'manual'
    and contribution_schedule_id is not null
    and voided_at is null;

create trigger trg_financial_categories_set_updated_at
before update on public.financial_categories
for each row
execute function public.set_updated_at();

create or replace function public.guard_financial_category_identity()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id
    or new.transaction_type is distinct from old.transaction_type
    or new.is_system is distinct from old.is_system then
    raise exception 'L’identifiant, le type et le statut système d’une catégorie ne peuvent pas être modifiés.';
  end if;

  return new;
end;
$$;

create trigger trg_financial_categories_guard_identity
before update of id, transaction_type, is_system on public.financial_categories
for each row
execute function public.guard_financial_category_identity();

create trigger trg_owner_contribution_schedules_set_updated_at
before update on public.owner_contribution_schedules
for each row
execute function public.set_updated_at();

create or replace function public.guard_owner_contribution_schedule_deactivation()
returns trigger
language plpgsql
as $$
begin
  if old.is_active = false and new.is_active = true then
    raise exception 'Une configuration de versements désactivée ne peut pas être réactivée.';
  end if;

  if old.is_active = true and new.is_active = false then
    new.deactivated_at := (now() at time zone 'Europe/Paris')::date;
  end if;

  if old.is_active = false and new.deactivated_at is distinct from old.deactivated_at then
    raise exception 'La date de désactivation d’une configuration historique ne peut pas être modifiée.';
  end if;

  return new;
end;
$$;

create trigger trg_owner_contribution_schedules_guard_deactivation
before update on public.owner_contribution_schedules
for each row
execute function public.guard_owner_contribution_schedule_deactivation();

create trigger trg_owner_contribution_schedules_prevent_overlap
before insert or update on public.owner_contribution_schedules
for each row
execute function public.prevent_overlapping_owner_contribution_schedules();

create trigger trg_financial_transactions_set_updated_at
before update on public.financial_transactions
for each row
execute function public.set_updated_at();

create or replace function public.validate_financial_transaction_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  linked_owner_id uuid;
begin
  if new.rental_id is not null then
    select owner_id
    into linked_owner_id
    from public.rentals
    where id = new.rental_id;

    if linked_owner_id is not null then
      new.owner_id := linked_owner_id;
    end if;
  elsif new.contribution_schedule_id is not null then
    select owner_id
    into linked_owner_id
    from public.owner_contribution_schedules
    where id = new.contribution_schedule_id;

    if linked_owner_id is null then
      raise exception 'La configuration de versements est introuvable.';
    end if;

    if new.owner_id is not null and new.owner_id <> linked_owner_id then
      raise exception 'Le propriétaire ne correspond pas à la configuration de versements.';
    end if;

    new.owner_id := linked_owner_id;
  elsif new.owner_id is not null and not exists (
    select 1
    from public.members eligible_owner
    where eligible_owner.id = new.owner_id
      and eligible_owner.role = 'owner'
      and eligible_owner.is_allowed = true
  ) then
    raise exception 'Le propriétaire sélectionné n’est pas autorisé.';
  end if;

  return new;
end;
$$;

create trigger trg_financial_transactions_validate_owner
before insert or update of owner_id, rental_id, contribution_schedule_id
on public.financial_transactions
for each row
execute function public.validate_financial_transaction_owner();

insert into public.financial_categories (transaction_type, name, is_system)
values
  ('income', 'Locations', true),
  ('income', 'Versements des propriétaires', true),
  ('income', 'Autres revenus', true),
  ('expense', 'Électricité', true),
  ('expense', 'Impôts et taxes', true),
  ('expense', 'Achats et équipements', true),
  ('expense', 'Entretien et réparations', true),
  ('expense', 'Autres dépenses', true);

create or replace function public.sync_rental_financial_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  location_category_id uuid;
  owner_label text;
  create_payment boolean;
  total_amount numeric(12, 2);
  electricity_amount numeric(12, 2);
  rental_amount numeric(12, 2);
  payment_date date;
begin
  select id
  into location_category_id
  from public.financial_categories
  where transaction_type = 'income'
    and lower(name) = lower('Locations')
  limit 1;

  if location_category_id is null then
    raise exception 'La catégorie financière « Locations » est introuvable.';
  end if;

  select label
  into owner_label
  from public.members
  where id = new.owner_id;

  if tg_op = 'INSERT' then
    if not new.is_paid then
      return new;
    end if;
    create_payment := true;
  else
    if old.is_paid and not new.is_paid then
      update public.financial_transactions
      set voided_at = now()
      where rental_id = new.id
        and source = 'rental'
        and voided_at is null;
      return new;
    end if;

    if not new.is_paid then
      return new;
    end if;

    create_payment := not old.is_paid;
  end if;

  total_amount := greatest(coalesce(new.total_price, 0), 0);
  electricity_amount := least(total_amount, greatest(round(coalesce(new.electricity_cost, 0), 2), 0));
  rental_amount := total_amount - electricity_amount;

  if create_payment then
    payment_date := (now() at time zone 'Europe/Paris')::date;
  else
    select transaction_date
    into payment_date
    from public.financial_transactions
    where rental_id = new.id
      and source = 'rental'
      and rental_component = 'rent'
      and voided_at is null
    limit 1;

    payment_date := coalesce(payment_date, (now() at time zone 'Europe/Paris')::date);
  end if;

  if create_payment then
    insert into public.financial_transactions (
      transaction_type,
      amount,
      transaction_date,
      category_id,
      description,
      source,
      rental_id,
      rental_component,
      recorded_by_member_id
    )
    values (
      'income',
      rental_amount,
      payment_date,
      location_category_id,
      concat('Paiement de location — ', coalesce(owner_label, 'Propriétaire'), ' — ', to_char(new.start_date at time zone 'Europe/Paris', 'DD/MM/YYYY')),
      'rental',
      new.id,
      'rent',
      public.current_member_id()
    )
    on conflict (rental_id, rental_component)
      where source = 'rental' and rental_id is not null and rental_component is not null and voided_at is null
    do update set
      amount = excluded.amount,
      description = excluded.description,
      voided_at = null;
  else
    update public.financial_transactions
    set amount = rental_amount
    where rental_id = new.id
      and source = 'rental'
      and rental_component = 'rent'
      and voided_at is null;
  end if;

  if electricity_amount > 0 then
    insert into public.financial_transactions (
      transaction_type,
      amount,
      transaction_date,
      category_id,
      description,
      source,
      rental_id,
      rental_component,
      recorded_by_member_id
    )
    values (
      'income',
      electricity_amount,
      payment_date,
      location_category_id,
      concat('Électricité de location — ', coalesce(owner_label, 'Propriétaire'), ' — ', to_char(new.start_date at time zone 'Europe/Paris', 'DD/MM/YYYY')),
      'rental',
      new.id,
      'electricity',
      public.current_member_id()
    )
    on conflict (rental_id, rental_component)
      where source = 'rental' and rental_id is not null and rental_component is not null and voided_at is null
    do update set
      amount = excluded.amount,
      description = excluded.description,
      voided_at = null;
  else
    update public.financial_transactions
    set voided_at = now()
    where rental_id = new.id
      and source = 'rental'
      and rental_component = 'electricity'
      and voided_at is null;
  end if;

  return new;
end;
$$;

create trigger trg_sync_rental_financial_transaction
after insert or update of is_paid, price, electricity_cost, total_price
on public.rentals
for each row
execute function public.sync_rental_financial_transaction();


-- ------------------------------------------------------------
-- Table: feedback_messages
-- ------------------------------------------------------------
create table public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.members(id) on delete set null,
  category text not null check (category in ('equipment', 'rentals', 'local', 'rules', 'other')),
  body text not null check (length(trim(body)) > 0),
  parent_id uuid references public.feedback_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index feedback_messages_category_idx on public.feedback_messages(category);
create index feedback_messages_author_id_idx on public.feedback_messages(author_id);
create index feedback_messages_parent_id_idx on public.feedback_messages(parent_id);
create index feedback_messages_created_at_idx on public.feedback_messages(created_at);

create trigger trg_feedback_messages_set_updated_at
before update on public.feedback_messages
for each row
execute function public.set_updated_at();

create or replace function public.feedback_message_parent_is_top_level()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    if exists (
      select 1 from public.feedback_messages p
      where p.id = new.parent_id
      and p.parent_id is not null
    ) then
      raise exception 'Une réponse ne peut pas avoir de parent qui est lui-même une réponse';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_feedback_messages_parent_top_level
before insert or update on public.feedback_messages
for each row
execute function public.feedback_message_parent_is_top_level();

create table public.feedback_votes (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.feedback_messages(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (message_id, member_id)
);

create index feedback_votes_message_id_idx on public.feedback_votes(message_id);
create index feedback_votes_member_id_idx on public.feedback_votes(member_id);

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
alter table public.financial_categories enable row level security;
alter table public.owner_contribution_schedules enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.user_notifications enable row level security;
alter table public.feedback_messages enable row level security;
alter table public.feedback_votes enable row level security;

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

create policy "financial_categories_select_owners_admins"
on public.financial_categories
for select
using (
  public.current_member_is_allowed()
  and public.current_member_role() in ('admin', 'owner')
);

create policy "financial_categories_insert_editors"
on public.financial_categories
for insert
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and is_system = false
  and created_by_member_id = public.current_member_id()
);

create policy "financial_categories_update_editors"
on public.financial_categories
for update
using (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and not (
    transaction_type = 'income'
    and lower(trim(name)) in (lower('Locations'), lower('Versements des propriétaires'))
  )
)
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and not (
    transaction_type = 'income'
    and lower(trim(name)) in (lower('Locations'), lower('Versements des propriétaires'))
  )
);

create policy "financial_categories_delete_editors"
on public.financial_categories
for delete
using (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and is_system = false
);

create policy "owner_contribution_schedules_select_owners_admins"
on public.owner_contribution_schedules
for select
using (
  public.current_member_is_allowed()
  and public.current_member_role() in ('admin', 'owner')
);

create policy "owner_contribution_schedules_insert_editors"
on public.owner_contribution_schedules
for insert
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and created_by_member_id = public.current_member_id()
  and exists (
    select 1
    from public.members eligible_owner
    where eligible_owner.id = owner_contribution_schedules.owner_id
      and eligible_owner.role = 'owner'
      and eligible_owner.is_allowed = true
  )
);

create policy "owner_contribution_schedules_update_editors"
on public.owner_contribution_schedules
for update
using (public.current_member_is_admin() or public.current_member_is_owner_editor())
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and exists (
    select 1
    from public.members eligible_owner
    where eligible_owner.id = owner_contribution_schedules.owner_id
      and eligible_owner.role = 'owner'
      and eligible_owner.is_allowed = true
  )
);

create policy "financial_transactions_select_owners_admins"
on public.financial_transactions
for select
using (
  public.current_member_is_allowed()
  and public.current_member_role() in ('admin', 'owner')
);

create policy "financial_transactions_insert_editors"
on public.financial_transactions
for insert
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and source = 'manual'
  and rental_id is null
  and transaction_date is not null
  and recorded_by_member_id = public.current_member_id()
  and (
    owner_id is null
    or exists (
      select 1
      from public.members eligible_owner
      where eligible_owner.id = financial_transactions.owner_id
        and eligible_owner.role = 'owner'
        and eligible_owner.is_allowed = true
    )
  )
  and (
    contribution_schedule_id is null
    or exists (
      select 1
      from public.owner_contribution_schedules schedule
      where schedule.id = financial_transactions.contribution_schedule_id
        and schedule.owner_id = financial_transactions.owner_id
    )
  )
  and exists (
    select 1
    from public.financial_categories category
    where category.id = category_id
      and category.transaction_type = financial_transactions.transaction_type
      and category.is_active = true
      and lower(trim(category.name)) <> lower('Locations')
  )
);

create policy "financial_transactions_update_editors"
on public.financial_transactions
for update
using (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and source = 'manual'
  and rental_id is null
)
with check (
  (public.current_member_is_admin() or public.current_member_is_owner_editor())
  and source = 'manual'
  and rental_id is null
  and transaction_date is not null
  and (
    owner_id is null
    or exists (
      select 1
      from public.members eligible_owner
      where eligible_owner.id = financial_transactions.owner_id
        and eligible_owner.role = 'owner'
        and eligible_owner.is_allowed = true
    )
  )
  and (
    contribution_schedule_id is null
    or exists (
      select 1
      from public.owner_contribution_schedules schedule
      where schedule.id = financial_transactions.contribution_schedule_id
        and schedule.owner_id = financial_transactions.owner_id
    )
  )
  and exists (
    select 1
    from public.financial_categories category
    where category.id = category_id
      and category.transaction_type = financial_transactions.transaction_type
      and category.is_active = true
      and lower(trim(category.name)) <> lower('Locations')
  )
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
